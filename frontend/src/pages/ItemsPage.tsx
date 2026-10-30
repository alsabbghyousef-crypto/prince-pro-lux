import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Tag, Package, ImageIcon, Loader2, Save, X, Pencil, Trash2, AlertTriangle, Search, History, Upload, Download, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import InventoryReport from '../components/InventoryReport';
import FinancialReport from '../components/FinancialReport';
import ModalPortal from '../components/ui/ModalPortal';
import ViewToggle from '../components/ui/ViewToggle';
import SearchableSelect from '../components/ui/SearchableSelect';
import ProductProfileModal from '../components/ui/ProductProfileModal';

// ─── Shared Types ────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  price: number;
  cost_price?: number;
  currency?: string;
  units_per_carton?: number;
  model?: string;
  color?: string;
  stock: number;
  category_id: number | null;
  category: string;
  image?: string;
  min_threshold?: number;
  reorder_level?: number;
}

interface Category {
  id: number;
  name: string;
}

// ─── Confirm Delete Modal ────────────────────────────────────────────────────
const ConfirmDeleteModal = React.memo(({
  isOpen, title, description, onConfirm, onCancel, isLoading
}: {
  isOpen: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void; isLoading?: boolean;
}) => {
  return (
    <ModalPortal isOpen={isOpen} onClose={onCancel}>
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="vercel-button bg-secondary text-foreground hover:bg-secondary/80 flex-1">إلغاء</button>
          <button onClick={onConfirm} disabled={isLoading} className="vercel-button bg-destructive hover:bg-destructive/90 flex-1">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'حذف'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
});

// ─── Product Profile Modal ───────────────────────────────────────────────────

const COLOR_DICTIONARY: Record<string, string> = {
  '3000K': 'أصفر دافئ',
  '4000K': 'طبيعي',
  '6000K': 'أبيض',
  '3CCT': 'ثلاثة ألوان',
  'CH': 'كروم',
  'FGD': 'ذهبي فرنسي',
  'GD': 'ذهبي',
  'BK': 'أسود',
  'WH': 'أبيض',
  'BINK': 'زهري'
};


const renderStockDisplay = (stock: number, unitsPerCarton?: number) => {
  const stockNum = stock || 0;
  if (!unitsPerCarton || unitsPerCarton <= 0) return <span className="font-bold">{stockNum}</span>;
  
  const cartons = Math.floor(stockNum / unitsPerCarton);
  const pieces = stockNum % unitsPerCarton;
  
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="font-black text-lg">{stockNum} قطعة</span>
      <span className="text-[10px] text-muted-foreground font-bold whitespace-nowrap bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-lg mt-0.5">
        {cartons} كرتونة {pieces > 0 ? `و ${pieces} ق` : ''} (سعة {unitsPerCarton})
      </span>
    </div>
  );
};

const ItemsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);

  // Query: User
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => (await api.get('/user')).data,
    staleTime: Infinity
  });
  const isAdmin = user?.role === 'ADMIN';

  // Query: Products (Two-Tier Data Fetching: Dynamic Core Sync)
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
    refetchInterval: 3000, // Silent background poll every 3s
  });

  // Query: Categories (Two-Tier Data Fetching: Mostly Static)
  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data,
    staleTime: 60000,
    refetchInterval: 3000,
  });

  const loading = loadingProducts || loadingCategories;

  const [searchParams, setSearchParams] = useSearchParams();
  const urlStockFilter = searchParams.get('stockFilter');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>(
    (urlStockFilter === 'low_stock' || urlStockFilter === 'out_of_stock' || urlStockFilter === 'in_stock')
      ? urlStockFilter
      : 'all'
  );

  useEffect(() => {
    const s = searchParams.get('stockFilter');
    if (s === 'low_stock' || s === 'out_of_stock' || s === 'in_stock') {
      setStockFilter(s);
    } else if (!s) {
      setStockFilter('all');
    }
  }, [searchParams]);

  const handleStockFilterChange = (filter: 'all' | 'low_stock' | 'out_of_stock' | 'in_stock') => {
    setStockFilter(filter);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (filter === 'all') {
      newParams.delete('stockFilter');
    } else {
      newParams.set('stockFilter', filter);
    }
    setSearchParams(newParams, { replace: true });
  };

  const stockCounts = useMemo(() => {
    let low = 0;
    let out = 0;
    let healthy = 0;
    products.forEach(p => {
      const s = Number(p.stock || 0);
      const th = Number(p.reorder_level ?? p.min_threshold ?? 5);
      if (s <= 0) {
        out++;
      } else if (s <= th) {
        low++;
      } else {
        healthy++;
      }
    });
    return { all: products.length, low, out, healthy };
  }, [products]);

  // Memoized Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === "all" || String(p.category_id) === selectedCategory;
      if (!matchSearch || !matchCategory) return false;

      const s = Number(p.stock || 0);
      const th = Number(p.reorder_level ?? p.min_threshold ?? 5);
      if (stockFilter === 'low_stock') return s > 0 && s <= th;
      if (stockFilter === 'out_of_stock') return s <= 0;
      if (stockFilter === 'in_stock') return s > th;
      return true;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  // Report Modals State
  const [isInventoryReportOpen, setIsInventoryReportOpen] = useState(false);
  const [isFinancialReportOpen, setIsFinancialReportOpen] = useState(false);

  // Product Modals State
  const [profileProductId, setProfileProductId] = useState<number | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  
  const [productForm, setProductForm] = useState({
    name: '', model: '', color: '', price: '', cost_price: '', currency: 'SYP', units_per_carton: '', category_id: '', stock: '0', reorder_level: '5', addedStock: '', addedCartons: '', addedPieces: '', manualCartons: '', manualPieces: '', imageFile: null as File | null
  });
  const [autoCalcPrices, setAutoCalcPrices] = useState(true);

  // Category Modals State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ─── Optimistic Mutations ──────────────────────────────────────────────────

  // Save Product Mutation
  const saveProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const formData = new FormData();
      Object.keys(payload).forEach(key => {
        if (payload[key] !== undefined && payload[key] !== null && key !== 'imageFile') {
          formData.append(key, payload[key]);
        }
      });
      if (payload.imageFile) {
        formData.append('image_file', payload.imageFile);
      }
      
      if (editingProduct) {
        formData.append('_method', 'PUT');
        return api.post(`/products/${editingProduct.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousProducts = queryClient.getQueryData<Product[]>(['products']);
      
      // Optimsitic UI Update (0ms)
      queryClient.setQueryData<Product[]>(['products'], old => {
        if (!old) return [];
        const catName = categories.find(c => String(c.id) === String(newProduct.category_id))?.name || '—';
        const optimisticProd = { 
          id: editingProduct?.id || Date.now(), // Fake ID for new
          name: newProduct.name, 
          price: Number(newProduct.price), 
          cost_price: newProduct.cost_price ? Number(newProduct.cost_price) : undefined,
          currency: newProduct.currency,
          units_per_carton: newProduct.units_per_carton ? Number(newProduct.units_per_carton) : undefined,
          stock: Number(newProduct.stock || 0), 
          category_id: Number(newProduct.category_id),
          category: catName,
          min_threshold: Number(newProduct.reorder_level || newProduct.min_threshold || 5),
          reorder_level: Number(newProduct.reorder_level || newProduct.min_threshold || 5)
        };

        if (editingProduct) {
          return old.map(p => p.id === editingProduct.id ? { ...p, ...optimisticProd } : p);
        }
        return [optimisticProd as Product, ...old];
      });

      return { previousProducts };
    },
    onError: (_err, _newProduct, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      alert('حدث خطأ ولم يتم حفظ المنتج. تم التراجع عن التعديل.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Delete Product Mutation
  
  const bulkImportMutation = useMutation({
    mutationFn: async (products: any[]) => {
      const response = await api.post('/products/bulk', { products });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      alert('تم استيراد المنتجات بنجاح!');
    },
    onError: (err: any) => {
      console.error(err);
      alert('حدث خطأ أثناء الاستيراد!');
    }
  });

  const getBase64ImageFromUrl = async (imageUrl: string) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      return null;
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('المنتجات');

      worksheet.columns = [
        { header: 'الصنف', key: 'name', width: 25 },
        { header: 'التصنيف', key: 'category', width: 20 },
        { header: 'سعة الكرتونة', key: 'units_per_carton', width: 15 },
        { header: 'الكراتين', key: 'cartons', width: 15 },
        { header: 'رأس المال', key: 'cost_price', width: 15 },
        { header: 'المبيع', key: 'price', width: 15 },
        { header: 'الكمية (قطع)', key: 'stock', width: 15 },
        { header: 'صورة المنتج', key: 'image', width: 25 }
      ];

      // Formatting headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      for (let i = 0; i < filteredProducts.length; i++) {
        const p = filteredProducts[i];
        const cartonsText = p.units_per_carton ? `${Math.floor((p.stock || 0) / p.units_per_carton)} كرتونة ${(p.stock || 0) % p.units_per_carton > 0 ? `و ${(p.stock || 0) % p.units_per_carton} ق` : ''}` : '—';
        
        const row = worksheet.addRow({
          name: p.name,
          category: p.category || '—',
          units_per_carton: p.units_per_carton || '—',
          cartons: cartonsText,
          cost_price: p.cost_price ? `${p.cost_price} ${p.currency || 'SYP'}` : '—',
          price: `${p.price} ${p.currency || 'SYP'}`,
          stock: p.stock || 0,
        });

        // Add Image
        if (p.image) {
          const imgUrl = (api.defaults.baseURL?.replace('/api', '') || '') + p.image;
          const base64 = await getBase64ImageFromUrl(imgUrl);
          if (base64) {
            const imageId = workbook.addImage({
              base64: base64,
              extension: 'png', // or jpeg
            });
            worksheet.addImage(imageId, {
              tl: { col: 7, row: row.number - 1 },
              ext: { width: 100, height: 100 }
            });
            row.height = 80;
          }
        } else {
            row.height = 30;
        }
        
        row.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'products.xlsx');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      let headerRowIndex = 0;
      let nameIdx = -1, modelIdx = -1, colorIdx = -1, priceIdx = -1, costIdx = -1, stockIdx = -1;

      for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;
        
        const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('سعر') || rowStr.includes('اسم') || rowStr.includes('صنف') || rowStr.includes('موديل') || rowStr.includes('تعبئة') || rowStr.includes('price')) {
          headerRowIndex = i;
          row.forEach((col, idx) => {
            if (!col) return;
            const cName = String(col).toLowerCase().trim();
            if (cName.includes('اسم') || cName.includes('صنف') || cName === 'name') nameIdx = idx;
            else if (cName.includes('موديل') || cName.includes('كود') || cName === 'model') modelIdx = idx;
            else if (cName.includes('لون') || cName.includes('مواصفات') || cName === 'color') colorIdx = idx;
            else if (cName.includes('سعر') || cName.includes('مبيع') || cName === 'price') priceIdx = idx;
            else if (cName.includes('تكلفة') || cName.includes('مال') || cName === 'cost') costIdx = idx;
            else if (cName.includes('كمية') || cName.includes('تعبئة') || cName === 'stock') stockIdx = idx;
          });
          break;
        }
      }

      if (priceIdx === -1 && nameIdx === -1) {
         alert('لم يتعرف النظام على الأعمدة (الرجاء التأكد من وجود كلمات مثل: السعر، الصنف، الموديل، التعبئة في الصف الأول)');
         return;
      }

      const mappedProducts: any[] = [];
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row) || row.length === 0) continue;
        
        let priceStr = String(row[priceIdx] || '0').replace(/[^0-9.]/g, '');
        let price = priceStr ? Number(priceStr) : 0;
        
        // Skip if price is 0 and no name
        if (price === 0 && !row[nameIdx]) continue;

        let color = colorIdx !== -1 ? String(row[colorIdx] || '') : '';
        const colorWords = color.split(' ');
        color = colorWords.map(w => COLOR_DICTIONARY[w.toUpperCase()] || w).join(' ');

        let costStr = costIdx !== -1 ? String(row[costIdx] || '0').replace(/[^0-9.]/g, '') : '';
        let cost = costStr && Number(costStr) > 0 ? Number(costStr) : (price * 0.8);
        
        let stockStr = stockIdx !== -1 ? String(row[stockIdx] || '1').replace(/[^0-9.]/g, '') : '1';
        let stock = stockStr ? Number(stockStr) : 1;
        if(isNaN(stock) || stock <= 0) stock = 1;

        let model = modelIdx !== -1 ? String(row[modelIdx] || '') : '';
        
        let name = nameIdx !== -1 ? String(row[nameIdx] || '') : '';
        if (name.trim() === '') name = model || 'منتج إضاءة';

        mappedProducts.push({
          name,
          model,
          color,
          price,
          cost_price: cost,
          currency: 'USD',
          stock
        });
      }

      if (mappedProducts.length > 0) {
         if(confirm(`سيتم استيراد ${mappedProducts.length} منتج، هل أنت متأكد؟`)) {
            bulkImportMutation.mutate(mappedProducts);
         }
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await api.post('/products/bulk-delete', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedIds([]);
      setPage(1);
    },
    onError: (err) => {
      console.error(err);
      alert('حدث خطأ أثناء الحذف');
    }
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((page - 1) * 20, page * 20);
  }, [filteredProducts, page]);
  const totalPages = Math.ceil(filteredProducts.length / 20);

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/products/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousProducts = queryClient.getQueryData<Product[]>(['products']);
      queryClient.setQueryData<Product[]>(['products'], old => old?.filter(p => p.id !== id) || []);
      return { previousProducts };
    },
    onError: (_err, _id, context) => {
      if (context?.previousProducts) queryClient.setQueryData(['products'], context.previousProducts);
      alert('فشل الحذف. تم التراجع.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  // Save Category Mutation
  const saveCategoryMutation = useMutation({
    mutationFn: async (payload: {name: string}) => {
      if (editingCategory) return api.put(`/categories/${editingCategory.id}`, payload);
      return api.post('/categories', payload);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  });

  // Delete Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/categories/${id}`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });


  // ─── Handlers ─────────────────────────────────────────────────────────────
  
  const openEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      model: product.model || '',
      color: product.color || '',
      price: String(product.price),
      cost_price: product.cost_price ? String(product.cost_price) : '',
      currency: product.currency || 'SYP',
      units_per_carton: product.units_per_carton ? String(product.units_per_carton) : '',
      category_id: String(product.category_id || ''),
      stock: String(product.stock || '0'),
      reorder_level: String(product.reorder_level ?? product.min_threshold ?? 5),
      addedStock: '',
      addedCartons: '',
      addedPieces: '',
      manualCartons: '',
      manualPieces: '',
      imageFile: null
    });
    setShowProductModal(true);
  }, []);

  const openNewProduct = useCallback(() => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      model: '',
      color: '',
      price: '',
      cost_price: '',
      currency: 'SYP',
      units_per_carton: '',
      category_id: '',
      stock: '0',
      reorder_level: '5',
      addedStock: '',
      addedCartons: '',
      addedPieces: '',
      manualCartons: '',
      manualPieces: '',
      imageFile: null
    });
    setShowProductModal(true);
  }, []);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setShowProductModal(false); // 0ms Close Window
    
    // Calculate final stock
    let finalStock = Number(productForm.stock);
    if (editingProduct && productForm.addedStock && Number(productForm.addedStock) > 0) {
        finalStock = Number(editingProduct.stock || 0) + Number(productForm.addedStock);
    }

    const reorderVal = Number(productForm.reorder_level || 5);

    // Trigger mutation in background
    saveProductMutation.mutate({
      ...productForm,
      price: Number(productForm.price),
      cost_price: productForm.cost_price ? Number(productForm.cost_price) : undefined,
      units_per_carton: productForm.units_per_carton ? Number(productForm.units_per_carton) : undefined,
      category_id: productForm.category_id ? Number(productForm.category_id) : undefined,
      stock: finalStock,
      reorder_level: reorderVal,
      min_threshold: reorderVal
    });
  };

  const openEditCategory = useCallback((cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setShowCategoryModal(true);
  }, []);

  const openNewCategory = useCallback(() => {
    setEditingCategory(null);
    setCategoryName('');
    setShowCategoryModal(true);
  }, []);

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setShowCategoryModal(false);
    saveCategoryMutation.mutate({ name: categoryName });
  };

  const formatCurrency = (num: number, currency?: string) => new Intl.NumberFormat('en-US').format(num) + ' ' + (currency === 'SYP' ? 'ل.س' : 'USD');

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Title and Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المنتجات والمخزون</h1>
          <p className="text-muted-foreground mt-1">إدارة المنتجات والتصنيفات بسلاسة وسرعة لحظية.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openNewProduct} className="vercel-button bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> منتج جديد
          </button>
          
          <button onClick={openNewCategory} className="vercel-button bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold flex items-center gap-2">
            <Tag className="w-4 h-4" /> تصنيف جديد
          </button>

          <div className="h-6 w-[1px] bg-border mx-1"></div>
          
          <label className="vercel-button bg-secondary text-foreground hover:bg-secondary/80 text-sm font-bold flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            {bulkImportMutation.isPending ? 'جاري الاستيراد...' : 'استيراد إكسيل'}
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} className="hidden" disabled={bulkImportMutation.isPending} />
          </label>
          
          <button onClick={handleExportExcel} disabled={isExporting} className="vercel-button bg-secondary text-foreground hover:bg-secondary/80 text-sm font-bold flex items-center gap-2">
            <Download className="w-4 h-4" />
            {isExporting ? 'جاري التصدير...' : 'تصدير إكسيل'}
          </button>

          <div className="h-6 w-[1px] bg-border mx-1"></div>

          <button onClick={() => setIsInventoryReportOpen(true)} className="vercel-button bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-sm border-none flex items-center gap-2">
            <Package className="w-4 h-4" />
            تقرير المخزون
          </button>
          
          <button onClick={() => setIsFinancialReportOpen(true)} className="vercel-button bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-sm border-none flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            التقرير المالي
          </button>
        </div>
      </div>

      {/* Toolbar: Tabs, Search, ViewToggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 mb-6">
        {/* Tabs */}
        <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-bold">
              إجمالي المنتجات: {products.length}
            </span>
            {selectedIds.length > 0 && (
              <button 
                onClick={() => {
                  if(confirm(`هل أنت متأكد من حذف ${selectedIds.length} منتج؟`)) {
                    bulkDeleteMutation.mutate(selectedIds);
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1"
              >
                {bulkDeleteMutation.isPending ? 'جاري الحذف...' : `حذف المحدد (${selectedIds.length})`}
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl w-full sm:w-fit">
          {[
            { key: 'products', label: `المنتجات (${products.length})` },
            { key: 'categories', label: `التصنيفات (${categories.length})` }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
          {activeTab === 'products' && (
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          )}
          {activeTab === 'products' && (
            <div className="w-full sm:w-48">
              <SearchableSelect
                options={[
                  { label: 'كل التصنيفات', value: 'all' },
                  ...categories.map(cat => ({ label: cat.name, value: String(cat.id) }))
                ]}
                value={selectedCategory}
                onChange={(v) => setSelectedCategory(String(v))}
              />
            </div>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="بحث عن منتج..." 
              className="w-full bg-background border border-border h-11 rounded-lg ps-10 pe-4 text-sm font-bold outline-none transition-all shadow-sm focus:border-primary focus:ring-1 focus:ring-primary" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Stock Health Filter Tabs */}
      {activeTab === 'products' && (
        <div className="flex flex-wrap items-center gap-2 px-1 py-1">
          <span className="text-xs font-bold text-muted-foreground me-1 flex items-center gap-1">
            تصفية المخزون:
          </span>
          <button
            onClick={() => handleStockFilterChange('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              stockFilter === 'all'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 hover:bg-secondary text-secondary-foreground"
            )}
          >
            <span>جميع المنتجات</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 font-bold">
              {stockCounts.all}
            </span>
          </button>
          
          <button
            onClick={() => handleStockFilterChange('low_stock')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              stockFilter === 'low_stock'
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/30"
                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>⚠️ أوشكت على النفاد (حد إعادة الطلب)</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-black",
              stockFilter === 'low_stock' ? "bg-white/20 text-white" : "bg-amber-500/25 text-amber-900 dark:text-amber-100"
            )}>
              {stockCounts.low}
            </span>
          </button>

          <button
            onClick={() => handleStockFilterChange('out_of_stock')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              stockFilter === 'out_of_stock'
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-500/30"
                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
            )}
          >
            <span>🛑 نفذت من المخزون</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-black",
              stockFilter === 'out_of_stock' ? "bg-white/20 text-white" : "bg-rose-500/25 text-rose-900 dark:text-rose-100"
            )}>
              {stockCounts.out}
            </span>
          </button>

          <button
            onClick={() => handleStockFilterChange('in_stock')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              stockFilter === 'in_stock'
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-secondary/60 hover:bg-secondary text-secondary-foreground"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>متوفرة بوفرة</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 font-bold">
              {stockCounts.healthy}
            </span>
          </button>
        </div>
      )}

      {/* Tables Area - No flashing loading spinner once data is fetched initially */}
      {loading && products.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : activeTab === 'products' ? (
        viewMode === 'list' ? (
          /* ── Products Table ── */
          <div className="vercel-card p-0 overflow-hidden shadow-sm border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-secondary/50 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 w-10">
                        <input type="checkbox" className="w-4 h-4 rounded border-border" checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0} onChange={handleSelectAll} />
                      </th>
                      <th className="px-6 py-4 font-semibold">الصنف</th>
                      <th className="px-6 py-4 font-semibold">التصنيف</th>
                      <th className="px-6 py-4 font-semibold">سعة الكرتونة</th>
                      <th className="px-6 py-4 font-semibold">الكراتين (المخزون)</th>
                    <th className="px-6 py-4 font-semibold">رأس المال</th>
                    <th className="px-6 py-4 font-semibold">المبيع</th>
                    <th className="px-6 py-4 font-semibold">الكمية (قطع)</th>
                    <th className="px-6 py-4 font-semibold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedProducts.map(product => {
                    const stockNum = Number(product.stock || 0);
                    const threshold = Number(product.reorder_level ?? product.min_threshold ?? 5);
                    const isOut = stockNum <= 0;
                    const isLow = !isOut && stockNum <= threshold;

                    return (
                    <tr
                      key={product.id}
                      className={cn(
                        "transition-all duration-150",
                        isOut
                          ? "bg-rose-500/[0.06] hover:bg-rose-500/10 border-r-4 border-r-rose-500"
                          : isLow
                          ? "bg-amber-500/[0.08] hover:bg-amber-500/15 border-r-4 border-r-amber-500"
                          : "hover:bg-secondary/30"
                      )}
                    >
                      <td className="px-6 py-4">
                          <input type="checkbox" className="w-4 h-4 rounded border-border" 
                            checked={selectedIds.includes(product.id)}
                            onChange={() => handleSelect(product.id)} />
                        </td>
                        <td className="px-6 py-4 font-bold flex items-center gap-3">
                        {product.image ? (
                          <img 
                            src={(api.defaults.baseURL?.replace('/api', '') || '') + (product.image.startsWith('/') ? product.image : '/' + product.image)} 
                            alt={product.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0 cursor-pointer border border-border shadow-sm hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(product.image as string); }}
                          />
                        ) : (
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                            isOut ? "bg-rose-500/20 text-rose-600" : isLow ? "bg-amber-500/20 text-amber-600" : "bg-primary/10 text-primary"
                          )}>
                            {isLow ? <AlertTriangle className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{product.name}</span>
                            {isLow && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                                ⚠️ أوشك على النفاد
                              </span>
                            )}
                            {isOut && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                🛑 نفذ من المخزون
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            حد إعادة الطلب: {threshold} قطعة
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <span className="bg-secondary px-2 py-0.5 rounded text-xs font-semibold">{product.category || '—'}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-muted-foreground">
                        {product.units_per_carton || '—'}
                      </td>
                      <td className="px-6 py-4 font-bold text-muted-foreground">
                        {product.units_per_carton ? (
                            <span className="bg-secondary/50 px-2 py-1 rounded-md text-xs font-bold">
                              {Math.floor((product.stock || 0) / product.units_per_carton)} كرتونة {(product.stock || 0) % product.units_per_carton > 0 ? `و ${(product.stock || 0) % product.units_per_carton} ق` : ''}
                            </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 font-bold text-muted-foreground" dir="ltr">{product.cost_price ? `${product.cost_price.toLocaleString()} ${product.currency || 'SYP'}` : '—'}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(product.price, product.currency)}</td>
                      <td className="px-6 py-4 font-bold">
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-base font-black flex items-center gap-1",
                            isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-primary"
                          )}>
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                            {product.stock || 0} قطعة
                          </span>
                          {isLow && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              (أقل من أو يساوي {threshold})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setProfileProductId(product.id)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="الملف الشخصي">
                            <History className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditProduct(product)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeletingProduct(product)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );})}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-muted-foreground font-semibold">
                      لا توجد منتجات تطابق بحثك.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Products Grid ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedProducts.map(product => {
              const stockNum = Number(product.stock || 0);
              const threshold = Number(product.reorder_level ?? product.min_threshold ?? 5);
              const isOut = stockNum <= 0;
              const isLow = !isOut && stockNum <= threshold;

              return (
              <div
                key={product.id}
                className={cn(
                  "vercel-card p-4 flex flex-col gap-3 shadow-sm border transition-all duration-150",
                  isOut
                    ? "border-rose-500/40 bg-rose-500/[0.03] opacity-80"
                    : isLow
                    ? "border-amber-500/60 bg-amber-500/[0.04] ring-1 ring-amber-500/30 hover:shadow-md"
                    : "border-border hover:shadow-md"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {product.image ? (
                      <img 
                        src={(api.defaults.baseURL?.replace('/api', '') || '') + (product.image.startsWith('/') ? product.image : '/' + product.image)} 
                        alt={product.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 cursor-pointer border border-border shadow-sm hover:opacity-80 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setSelectedImage(product.image as string); }}
                      />
                    ) : (
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        isOut ? "bg-rose-500/20 text-rose-600" : isLow ? "bg-amber-500/20 text-amber-600" : "bg-primary/10 text-primary"
                      )}>
                        {isLow ? <AlertTriangle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold">{product.name}</h3>
                        {isLow && (
                          <span className="bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-500/30">
                            ⚠️ أوشك على النفاد
                          </span>
                        )}
                        {isOut && (
                          <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-500/30">
                            🛑 نفذ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-secondary px-2 py-0.5 rounded text-xs font-semibold text-muted-foreground inline-block">
                          {product.category || '—'}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          حد الطلب: {threshold}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">التكلفة</span>
                    <span className="font-bold text-muted-foreground text-sm" dir="ltr">{product.cost_price ? `${product.cost_price.toLocaleString()} ${product.currency || 'SYP'}` : '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">المبيع</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(product.price, product.currency)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground mb-1">الكمية</span>
                    <div className={`${product.stock === 0 ? 'text-red-500' : 'text-primary'}`} dir="rtl">
                      {renderStockDisplay(product.stock, product.units_per_carton)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-border">
                  <button onClick={() => setProfileProductId(product.id)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex-1 flex justify-center" title="الملف الشخصي">
                    <History className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEditProduct(product)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex-1 flex justify-center">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeletingProduct(product)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-1 flex justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );})}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground font-semibold bg-secondary/20 rounded-xl border border-dashed border-border">
                لا توجد منتجات تطابق بحثك.
              </div>
            )}
          </div>
        )
      ) : (
        /* ── Categories Table ── */
        <div className="vercel-card p-0 overflow-hidden shadow-sm border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-secondary/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">#</th>
                  <th className="px-6 py-4 font-semibold">اسم التصنيف</th>
                  <th className="px-6 py-4 font-semibold">عدد المنتجات</th>
                  <th className="px-6 py-4 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((cat, i) => {
                  const count = products.filter(p => String(p.category_id) === String(cat.id) || p.category === cat.name).length;
                  return (
                    <tr key={cat.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{i + 1}</td>
                      <td className="px-6 py-4 font-bold flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />{cat.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{count} منتج</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditCategory(cat)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeletingCategory(cat)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {categories.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-16 text-center text-muted-foreground font-semibold">لا توجد تصنيفات.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Product Modal (Create / Edit) via Portal ── */}
      <ModalPortal isOpen={showProductModal} onClose={() => setShowProductModal(false)}>
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl w-full max-w-lg rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-white/30 dark:border-white/10 p-8 transform transition-all max-h-[90vh] overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-foreground tracking-tight">{editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
            <button onClick={() => setShowProductModal(false)} className="text-muted-foreground hover:text-foreground bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSaveProduct} className="space-y-6">
            
            {/* Minimalist Info Card */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2 text-muted-foreground/80 pl-1">اسم المنتج</label>
                <input required autoFocus type="text" className="w-full bg-black/5 dark:bg-white/5 border-none h-14 rounded-2xl px-5 text-base font-semibold focus:ring-2 focus:ring-primary focus:bg-transparent outline-none transition-all" value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-muted-foreground/80 pl-1">صورة المنتج</label>
                <div className="flex items-center gap-4">
                  {editingProduct && editingProduct.image && !productForm.imageFile && (
                      <img src={(api.defaults.baseURL?.replace('/api', '') || '') + editingProduct.image} alt="Current" className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                  )}
                  <label className="cursor-pointer flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-2xl h-14 px-5 w-full transition-all">
                      <input type="file" accept="image/*" className="hidden" onChange={e => setProductForm({...productForm, imageFile: e.target.files?.[0] || null})} />
                      <ImageIcon className="w-5 h-5 text-muted-foreground ml-3" />
                      <span className="text-sm text-foreground font-semibold">{productForm.imageFile ? productForm.imageFile.name : 'اختيار صورة جديدة...'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Apple Card 2: Pricing & Category */}
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-muted-foreground/80 pl-1">التصنيف</label>
                  <SearchableSelect
                    options={categories.map(cat => ({ label: cat.name, value: String(cat.id) }))}
                    value={productForm.category_id}
                    onChange={(v) => setProductForm({ ...productForm, category_id: String(v) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-muted-foreground/80 pl-1">العملة</label>
                  <SearchableSelect
                    options={[
                      { label: 'ل.س (SYP)', value: 'SYP' },
                      { label: 'دولار (USD)', value: 'USD' }
                    ]}
                    value={productForm.currency || 'SYP'}
                    onChange={(v) => setProductForm({ ...productForm, currency: String(v) })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-emerald-600/80 pl-1">سعر المبيع</label>
                    <input required type="number" className="w-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-none h-14 rounded-2xl px-5 text-lg font-black focus:ring-2 focus:ring-emerald-500 focus:bg-transparent outline-none transition-all text-left" dir="ltr" value={productForm.price}
                      onChange={e => {
                        const val = e.target.value;
                        if (autoCalcPrices) {
                            const cost = val ? (Number(val) * 0.8).toFixed(2).replace(/\.00$/, '') : '';
                            setProductForm({ ...productForm, price: val, cost_price: cost });
                        } else {
                            setProductForm({ ...productForm, price: val });
                        }
                      }} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-muted-foreground/80 pl-1">رأس المال (التكلفة)</label>
                    <input type="number" className="w-full bg-black/5 dark:bg-white/5 border-none h-14 rounded-2xl px-5 text-lg font-bold focus:ring-2 focus:ring-primary focus:bg-transparent outline-none transition-all text-left" dir="ltr" value={productForm.cost_price}
                      onChange={e => {
                        const val = e.target.value;
                        if (autoCalcPrices) {
                            const price = val ? (Number(val) / 0.8).toFixed(2).replace(/\.00$/, '') : '';
                            setProductForm({ ...productForm, cost_price: val, price: price });
                        } else {
                            setProductForm({ ...productForm, cost_price: val });
                        }
                      }} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-fit px-1">
                    <input type="checkbox" checked={autoCalcPrices} onChange={e => setAutoCalcPrices(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary border-border" />
                    <span className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">تفعيل حساب التكلفة/المبيع التلقائي (هامش 20%)</span>
                </label>
              </div>

              
            </div>

            {/* Apple Card 3: Stock & Restock */}
            {isAdmin && (
              <div className="pt-2 border-t border-white/10 dark:border-white/5 space-y-4">
                <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 border border-primary/20 space-y-4">
                  <h4 className="text-sm font-black text-primary text-center mb-2">إدارة المخزون والكراتين</h4>
                  
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <label className="block text-xs font-bold mb-2 text-primary/80 text-center">الكمية داخل الكرتونة الواحدة</label>
                      <input type="number" min="1" className="w-full bg-white dark:bg-black/20 border border-primary/20 h-12 rounded-xl px-2 text-lg font-bold text-center focus:ring-2 focus:ring-primary outline-none transition-all" 
                      placeholder="مثال: 12"
                      value={productForm.units_per_carton} onChange={e => {
                        const u = e.target.value;
                        setProductForm(prev => {
                           const cNum = Number(prev.manualCartons || '0');
                           const pNum = Number(prev.manualPieces || '0');
                           const total = (cNum * Number(u)) + pNum;
                           return { ...prev, units_per_carton: u, [editingProduct ? 'addedStock' : 'stock']: String(total) };
                        });
                      }} />
                      <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-muted-foreground/70 pointer-events-none">إذا كان الصنف بالكرتونة</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <label className="block text-xs font-bold mb-2 text-muted-foreground text-center">عدد الكراتين {editingProduct ? '(كمية مُضافة)' : '(رصيد افتتاحي)'}</label>
                      <input type="number" min="0" className="w-full bg-white dark:bg-black/20 border border-border h-12 rounded-xl px-2 text-lg font-bold text-center focus:ring-2 focus:ring-primary outline-none transition-all" 
                      placeholder="كراتين"
                      value={productForm.manualCartons} onChange={e => {
                        const cartons = e.target.value;
                        const pieces = productForm.manualPieces || '0';
                        const u = Number(productForm.units_per_carton || '1');
                        const total = (Number(cartons) * u) + Number(pieces);
                        setProductForm({...productForm, manualCartons: cartons, [editingProduct ? 'addedStock' : 'stock']: String(total)});
                      }} />
                    </div>
                    <div className="flex-1 relative">
                      <label className="block text-xs font-bold mb-2 text-muted-foreground text-center">قطع إضافية {editingProduct ? '(كمية مُضافة)' : '(رصيد افتتاحي)'}</label>
                      <input type="number" min="0" className="w-full bg-white dark:bg-black/20 border border-border h-12 rounded-xl px-2 text-lg font-bold text-center focus:ring-2 focus:ring-primary outline-none transition-all" 
                      placeholder="قطع"
                      value={productForm.manualPieces} onChange={e => {
                        const pieces = e.target.value;
                        const cartons = productForm.manualCartons || '0';
                        const u = Number(productForm.units_per_carton || '1');
                        const total = (Number(cartons) * u) + Number(pieces);
                        setProductForm({...productForm, manualPieces: pieces, [editingProduct ? 'addedStock' : 'stock']: String(total)});
                      }} />
                    </div>
                  </div>

                  <div className="bg-primary text-primary-foreground rounded-xl py-3 text-center shadow-inner mt-2">
                    <span className="text-xs opacity-80 block mb-1">الرصيد {editingProduct ? 'المُضاف' : 'الافتتاحي'} الإجمالي:</span>
                    <span className="text-2xl font-black">{editingProduct ? (productForm.addedStock || '0') : (productForm.stock || '0')} قطعة</span>
                  </div>
                  
                  {editingProduct && (
                    <div className="pt-4 mt-4 border-t border-primary/20">
                      <label className="block text-xs font-bold mb-2 text-red-500/90 text-center">أو تعديل الرصيد يدوياً (تجاهل الكراتين)</label>
                      <input type="number" className="w-full bg-white dark:bg-black/20 border border-red-500/30 h-12 rounded-xl px-5 text-lg font-bold text-center focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                      placeholder="تعديل الرصيد الحالي (بالقطعة)"
                      value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value, addedStock: '', manualCartons: '', manualPieces: ''})} />
                    </div>
                  )}

                  <div className="pt-4 mt-3 border-t border-amber-500/30 bg-amber-500/5 -mx-4 -mb-4 p-4 rounded-b-2xl">
                    <label className="block text-xs font-bold mb-1.5 text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>حد إعادة الطلب (تنبيه نقص المخزون)</span>
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">تنبيه عند وصول الرصيد لهذا الحد أو أقل</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-white dark:bg-black/40 border border-amber-500/40 h-12 rounded-xl px-4 text-lg font-bold text-right focus:ring-2 focus:ring-amber-500 outline-none transition-all pe-16"
                        placeholder="مثال: 5"
                        value={productForm.reorder_level}
                        onChange={e => setProductForm({...productForm, reorder_level: e.target.value})}
                      />
                      <span className="absolute start-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                        قطعة
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      💡 عندما يقل المخزون عن هذا الحد، سيظهر المنتج بلون مميز في القائمة ونقطة البيع، وستصلك إشعارات تنبيهية تلقائية.
                    </p>
                  </div>

                </div>
              </div>
            )}

            <button type="submit" disabled={saveProductMutation.isPending} className="w-full mt-6 py-4 bg-primary text-primary-foreground font-black text-lg rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center">
              <Save className="w-5 h-5 ml-2" /> {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
          </form>
        </div>
      </ModalPortal>

      {/* ── Category Modal (Create / Edit) via Portal ── */}
      <ModalPortal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)}>
        <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">{editingCategory ? 'تعديل التصنيف' : 'تصنيف جديد'}</h3>
            <button onClick={() => setShowCategoryModal(false)} className="text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary p-1.5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div className="bg-secondary/20 p-4 rounded-2xl border border-border/50 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-muted-foreground">اسم التصنيف</label>
                <input required autoFocus type="text" className="vercel-input w-full bg-background" value={categoryName}
                  onChange={e => setCategoryName(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={saveCategoryMutation.isPending} className="vercel-button w-full mt-2 py-3.5 text-base rounded-xl">
              <Save className="w-5 h-5 ml-2" /> {editingCategory ? 'حفظ التعديلات' : 'إضافة التصنيف'}
            </button>
          </form>
        </div>
      </ModalPortal>

      {/* ── Confirm Delete Modals ── */}
      <ConfirmDeleteModal
        isOpen={!!deletingProduct}
        title="حذف المنتج"
        description={`هل أنت متأكد من حذف "${deletingProduct?.name}"؟`}
        onConfirm={() => {
          deleteProductMutation.mutate(deletingProduct!.id);
          setDeletingProduct(null);
        }}
        onCancel={() => setDeletingProduct(null)}
        isLoading={deleteProductMutation.isPending}
      />
      <ConfirmDeleteModal
        isOpen={!!deletingCategory}
        title="حذف التصنيف"
        description={`هل أنت متأكد من حذف تصنيف "${deletingCategory?.name}"؟`}
        onConfirm={() => {
          deleteCategoryMutation.mutate(deletingCategory!.id);
          setDeletingCategory(null);
        }}
        onCancel={() => setDeletingCategory(null)}
        isLoading={deleteCategoryMutation.isPending}
      />

      {/* Reports Modals via Portal */}
      <ModalPortal isOpen={isInventoryReportOpen} onClose={() => setIsInventoryReportOpen(false)}>
         <InventoryReport onClose={() => setIsInventoryReportOpen(false)} />
      </ModalPortal>
      
      <ModalPortal isOpen={isFinancialReportOpen} onClose={() => setIsFinancialReportOpen(false)}>
         <FinancialReport onClose={() => setIsFinancialReportOpen(false)} />
      </ModalPortal>

      {profileProductId && (
        <ProductProfileModal 
          productId={profileProductId} 
          onClose={() => setProfileProductId(null)} 
        />
      )}

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <ModalPortal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-card rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e: any) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground transition-colors z-10 shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={(api.defaults.baseURL?.replace('/api', '') || '') + (selectedImage.startsWith('/') ? selectedImage : '/' + selectedImage)} 
                alt="Product Large" 
                className="w-full h-auto max-h-[85vh] object-contain block"
              />
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm mt-4">
          <span className="text-sm text-muted-foreground font-medium">
            صفحة {page} من {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-border/50 hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-border/50 hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsPage;
