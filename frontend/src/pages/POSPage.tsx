import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Package,
  ShoppingCart,
  Trash2,

  Minus,
  CheckCircle2,
  X,
  Loader2,
  Printer,
  AlertCircle,
  ZoomIn
} from 'lucide-react';
import ModalPortal from '../components/ui/ModalPortal';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import cn from 'clsx';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  category_id?: string;
  image?: string;
  stock: number;
  units_per_carton?: number;
}

interface CartItem extends Product {
  quantity: number;
  originalPrice?: number;
}

const SuccessOverlay: React.FC<{
  orderData: any;
  onClose: () => void;
}> = ({ orderData, onClose }) => {
  if (!orderData) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md print:bg-white print:backdrop-blur-none"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-card border border-white/10 dark:border-white/5 rounded-[32px] p-8 max-w-md w-[95vw] md:w-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] space-y-6 print:border-none print:shadow-none print:p-0 print:text-black print:bg-white max-h-[90vh] overflow-y-auto scrollbar-hide printable-receipt print-container"
      >
        {/* Header */}
        <div className="text-center pb-6 border-b border-dashed border-border print:border-gray-400">
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent print:text-black">Prince Pro Lux</h2>
          <p className="text-muted-foreground print:text-gray-500 text-sm font-bold">نظام نقاط البيع</p>
          <div className="mt-4 inline-flex flex-col items-center justify-center bg-secondary/50 print:bg-transparent px-4 py-2 rounded-2xl">
            <p className="text-foreground font-black print:text-black">طلب رقم #{orderData.id}</p>
            <p className="text-muted-foreground print:text-gray-500 text-xs font-bold mt-1">{new Date().toLocaleString('ar-SY')}</p>
          </div>
        </div>

        {/* Customer Info */}
        {orderData.customerName && (
          <div className="text-sm font-bold border-b border-dashed border-border print:border-gray-400 pb-4 text-right flex justify-between items-center">
            <span className="text-muted-foreground print:text-gray-500">العميل</span>
            <span className="text-foreground print:text-black text-base">{orderData.customerName}</span>
          </div>
        )}

        {/* Items */}
        <div className="space-y-4 pb-6 border-b border-dashed border-border print:border-gray-400 text-right text-sm">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-bold mb-2">
            <span>الصنف</span>
            <span>المجموع</span>
          </div>
          {orderData.items?.map((item: any, i: number) => {
            return (
              <div key={i} className="flex justify-between items-start">
                <div className="flex flex-col text-right">
                  <span className="font-bold text-base text-foreground print:text-black">{item.productName || item.name || 'مجهول'}</span>
                  <div className="flex items-center gap-2 mt-1 justify-start">
                    <span className="text-xs font-bold text-muted-foreground print:text-gray-500 bg-secondary/50 print:bg-transparent px-2 py-0.5 rounded-lg">{(item.price).toLocaleString()} × {item.quantity}</span>
                  </div>
                </div>
                <div className="font-black text-base text-foreground print:text-black mt-0.5">
                  {((item.price) * (item.quantity)).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="space-y-3 font-bold text-sm border-b border-dashed border-border print:border-gray-400 pb-6 text-right">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground print:text-gray-500">الإجمالي (الصافي)</span>
            <span className="text-lg text-foreground print:text-black">{(orderData.total || orderData.total_usd || 0).toLocaleString()} {orderData.currency === 'SYP' ? 'ل.س' : '$'}</span>
          </div>
          {(orderData.discountAmount || 0) > 0 && (
            <div className="flex justify-between items-center text-emerald-500">
              <span className="opacity-80">الخصم</span>
              <span>- {(orderData.discountAmount || 0).toLocaleString()} {orderData.currency === 'SYP' ? 'ل.س' : '$'}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-primary pt-2">
            <span>المدفوع</span>
            <span className="text-xl font-black">{(orderData.paidAmount || orderData.paid_amount || orderData.total || orderData.total_usd || 0).toLocaleString()} {orderData.currency === 'SYP' ? 'ل.س' : '$'}</span>
          </div>
          {(orderData.debtAmount || orderData.debt_amount || 0) > 0 && (
            <div className="flex justify-between items-center text-rose-500">
              <span>المتبقي (دين)</span>
              <span className="text-lg font-black">{(orderData.debtAmount || orderData.debt_amount || 0).toLocaleString()} {orderData.debt_currency === 'SYP' ? 'ل.س' : '$'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground print:text-gray-500 font-bold">
          <p>شكراً لزيارتكم!</p>
        </div>

        {/* Actions (Hidden in Print) */}
        <div className="print:hidden flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-sm font-bold bg-secondary/80 text-foreground hover:bg-secondary rounded-2xl transition-colors"
          >
            طلب جديد
          </button>
          <button
            onClick={() => window.print()}
            className="flex-[2] py-4 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Printer className="w-5 h-5" />
            طباعة الفاتورة
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const POSPage = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH'|'CARD'>('CASH');
  
  // CRM & Discount States
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paidSyp, setPaidSyp] = useState<string>('');
  const [paidUsd, setPaidUsd] = useState<string>('');
    
  const { data: currentExchangeRate = 15000 } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async () => (await api.get('/settings/exchange-rate')).data.exchangeRate,
  });
  
  const [discountType, setDiscountType] = useState<'NONE'|'FIXED'|'PERCENTAGE'>('NONE');
  const [debtCurrency, setDebtCurrency] = useState<'SYP'|'USD'>('SYP');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [itemPaidStatus, setItemPaidStatus] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
    refetchInterval: 3000,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<{ id: string, name: string }[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data,
    refetchInterval: 3000,
  });

  const { data: customersList = [], isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data,
    refetchInterval: 3000,
  });

  const loading = isLoadingProducts || isLoadingCategories || isLoadingCustomers;


  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(`لا يوجد مخزون كافٍ من ${product.name}. المتوفر: ${product.stock}`);
          return prev;
        }
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (product.stock < 1) {
        showToast(`لا يوجد مخزون كافٍ من ${product.name}. المتوفر: ${product.stock}`);
        return prev;
      }
      return [...prev, { ...product, quantity: 1, originalPrice: product.price }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        if (newQ > item.stock) {
          showToast(`لا يوجد مخزون كافٍ. المتوفر: ${item.stock}`);
          return item;
        }
        return { ...item, quantity: Math.max(0, newQ) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateItemPrice = (id: string, newPrice: number) => {
    const safePrice = Math.max(0, isNaN(newPrice) ? 0 : newPrice);
    setCart(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, price: safePrice } : item
      );
      if (isCheckoutOpen) {
        const checkedTotal = updated.reduce((sum, item) => {
          return sum + ((itemPaidStatus[item.id] ?? true) ? item.price * item.quantity : 0);
        }, 0);
        let disc = 0;
        if (discountType === 'FIXED') {
          disc = Number(discountValue) || 0;
        } else if (discountType === 'PERCENTAGE') {
          disc = (checkedTotal * (Number(discountValue) || 0)) / 100;
        }
        const newGrandTotal = Math.max(0, checkedTotal - disc);
        if (!paidUsd || Number(paidUsd) === 0) {
          setPaidSyp(String(Math.round(newGrandTotal * currentExchangeRate)));
        } else {
          const remainingUsd = Math.max(0, newGrandTotal - Number(paidUsd));
          setPaidSyp(String(Math.round(remainingUsd * currentExchangeRate)));
        }
      }
      return updated;
    });
  };

  const updateItemTotalPrice = (id: string, newTotal: number) => {
    const safeTotal = Math.max(0, isNaN(newTotal) ? 0 : newTotal);
    const targetItem = cart.find(i => i.id === id);
    if (!targetItem || targetItem.quantity <= 0) return;
    const newUnitPrice = Number((safeTotal / targetItem.quantity).toFixed(2));
    updateItemPrice(id, newUnitPrice);
  };

  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);
  
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);
  
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = React.useMemo(() => {
    return filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate discount
  let calculatedDiscount = 0;
  if (discountType === 'FIXED') {
    calculatedDiscount = Number(discountValue) || 0;
  } else if (discountType === 'PERCENTAGE') {
    calculatedDiscount = (cartTotal * (Number(discountValue) || 0)) / 100;
  }
  
  const grandTotal = Math.max(0, cartTotal - calculatedDiscount);

  // Update itemPaidStatus when cart changes or checkout opens
  useEffect(() => {
    if (isCheckoutOpen) {
      const initial: Record<string, boolean> = {};
      cart.forEach(c => {
        initial[c.id] = itemPaidStatus[c.id] ?? true;
      });
      setItemPaidStatus(initial);
      
      // Auto calc paid amount based on checks if not manually set
      const checkedTotal = cart.reduce((sum, item) => {
        return sum + (initial[item.id] ? item.price * item.quantity : 0);
      }, 0);
      // applying proportional discount to paid amount is complex, so we just set raw paid
      setPaidUsd(''); setPaidSyp(String(Math.max(0, (checkedTotal - calculatedDiscount) * currentExchangeRate)));
    }
  }, [isCheckoutOpen]);

  const handleItemCheck = (id: string, checked: boolean) => {
    const newStatus = { ...itemPaidStatus, [id]: checked };
    setItemPaidStatus(newStatus);
    
    // Auto update paid amount
    const checkedTotal = cart.reduce((sum, item) => {
      return sum + (newStatus[item.id] ? item.price * item.quantity : 0);
    }, 0);
    setPaidUsd(''); setPaidSyp(String(Math.max(0, (checkedTotal - calculatedDiscount) * currentExchangeRate)));
  };

  const saveOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/orders', payload);
      return response.data;
    },
    onMutate: () => {
      setIsCheckoutOpen(false); // Optimistic UI: close instantly
    },
    onSuccess: (data, variables: any) => {
      setSuccessOrder({ 
        ...variables, 
        id: data.id,
        discountAmount: calculatedDiscount,
        total: grandTotal, // for receipt
        items: cart.map(item => ({
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            isPaid: itemPaidStatus[item.id] ?? true
        }))
      });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setSelectedCustomerId('');
      setPaidSyp(''); setPaidUsd('');
      setDiscountValue('');
      setNotes('');
      setDiscountType('NONE');
      setDebtCurrency('SYP');
      setPaymentMethod('CASH');
      
      queryClient.invalidateQueries({ queryKey: ['ordersHistory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // refresh stock
      showToast('تم حفظ الطلب بنجاح');
    },
    onError: (err: any) => {
      setIsCheckoutOpen(true); // Re-open if failed
      showToast(err?.response?.data?.error || 'حدث خطأ في إرسال الطلب.');
    }
  });

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const totalPaidInUsd = Number(paidUsd || 0) + (Number(paidSyp || 0) / currentExchangeRate);
    const debtInUsd = Math.max(0, grandTotal - totalPaidInUsd);
    const calculatedDebt = debtCurrency === 'SYP' ? debtInUsd * currentExchangeRate : debtInUsd;
    const finalPaymentMethod = calculatedDebt > 0 ? 'DEBT' : paymentMethod;

    const payload = {
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        isPaid: itemPaidStatus[item.id] ?? true
      })),
      total: cartTotal, // sending original total, backend handles discount
      currency: 'USD',
      source: 'SHOP',
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
      customerId: selectedCustomerId || null,
      paymentMethod: finalPaymentMethod,
      paidSyp: Number(paidSyp || 0),
      paidUsd: Number(paidUsd || 0),
      debtAmount: calculatedDebt,
      debtCurrency: debtCurrency,
      discountType: discountType === 'NONE' ? null : discountType,
      discountValue: Number(discountValue) || 0,
      notes: notes
    };

    saveOrderMutation.mutate(payload);
  };
  
  // also need to change isSubmitting in template to saveOrderMutation.isPending
  const isSubmitting = saveOrderMutation.isPending;

  const handleSuccessClose = () => {
    setSuccessOrder(null);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full min-w-0 h-full flex-1 min-h-0 animate-fade-in relative">

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-destructive text-destructive-foreground font-bold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-destructive/20"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successOrder && (
          <SuccessOverlay
            orderData={successOrder}
            onClose={handleSuccessClose}
          />
        )}
      </AnimatePresence>

      {/* ── Products Panel ── */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        {/* Header */}
        <div className="space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">نقطة البيع</h1>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث عن منتج..."
                className="w-full bg-secondary/50 border-transparent focus:border-border h-9 rounded-md ps-10 pe-4 text-sm outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 hover:bg-secondary text-secondary-foreground'
              )}
            >
              الكل
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 hover:bg-secondary text-secondary-foreground'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
          
          
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4 pr-1">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
            {paginatedProducts.map((product) => {
              const inCartItem = cart.find(item => item.id === product.id);
              const isOutOfStock = product.stock <= 0;
              const imageUrl = product.image
                ? (api.defaults.baseURL?.replace('/api', '') || '') + (product.image.startsWith('/') ? product.image : '/' + product.image)
                : null;

              return (
                <motion.div
                  key={product.id}
                  layoutId={`product-${product.id}`}
                  onClick={() => addToCart(product)}
                  whileHover={!isOutOfStock ? { y: -3 } : undefined}
                  whileTap={!isOutOfStock ? { scale: 0.98 } : undefined}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-200 select-none cursor-pointer bg-card overflow-hidden",
                    isOutOfStock
                      ? "opacity-60 cursor-not-allowed border-dashed border-border"
                      : "hover:shadow-lg hover:border-primary/50 border-border/70",
                    inCartItem && "ring-2 ring-primary border-primary/40 bg-primary/[0.02]"
                  )}
                >
                  {/* Top Bar: Stock Badge & Add / In-Cart Quantity */}
                  <div className="flex items-center justify-between gap-1.5 w-full mb-2 z-10">
                    <span
                      className={cn(
                        "text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-lg truncate max-w-[80%] flex items-center gap-1",
                        isOutOfStock
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : product.stock < 5
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-secondary text-foreground/80 border border-border/50"
                      )}
                      title={`مخزون: ${product.stock}`}
                    >
                      {isOutOfStock ? (
                        'نفذت الكمية'
                      ) : (
                        <>
                          <span className="font-semibold">مخزون:</span>
                          <span dir="ltr" className="font-black">{product.stock}</span>
                          {product.units_per_carton && product.units_per_carton > 0 ? (
                            <span className="text-[9px] opacity-80 ms-0.5">
                              ({Math.floor(product.stock / product.units_per_carton)} كرتونة{product.stock % product.units_per_carton > 0 ? ` و ${product.stock % product.units_per_carton} ق` : ''})
                            </span>
                          ) : null}
                        </>
                      )}
                    </span>

                    {inCartItem ? (
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shrink-0 shadow-sm" title={`الكمية في السلة: ${inCartItem.quantity}`}>
                        {inCartItem.quantity}
                      </span>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center shrink-0 transition-colors shadow-sm">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Image Frame: 100% Clear, Dedicated Container, Full Aspect Ratio */}
                  <div className="w-full h-24 sm:h-28 xl:h-32 rounded-xl bg-white dark:bg-zinc-900/50 border border-border/40 flex items-center justify-center p-2 mb-2 relative overflow-hidden group-hover:border-primary/30 transition-colors">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(imageUrl);
                          }}
                          title="تكبير الصورة"
                          className="absolute bottom-1.5 start-1.5 w-6 h-6 rounded-md bg-background/80 hover:bg-background text-foreground/70 hover:text-foreground backdrop-blur-sm shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                        <Package className="w-8 h-8 stroke-[1.5]" />
                      </div>
                    )}
                  </div>

                  {/* Product Details: Separated, High Contrast, Under Image */}
                  <div className="w-full flex flex-col justify-between flex-1 gap-1 text-start">
                    <h3
                      className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug min-h-[2rem]"
                      title={product.name}
                    >
                      {product.name}
                    </h3>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-auto">
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">السعر</span>
                      <span className="text-primary font-black text-sm sm:text-base tracking-tight" dir="ltr">
                        {new Intl.NumberFormat('en-US').format(product.price)} USD
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2.5 pb-1 border-t border-border/40 shrink-0">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-card border border-border hover:bg-secondary disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNumber = i + 1;
                  // Show max 5 pages around current page
                  if (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-bold transition-all ${currentPage === pageNumber ? 'bg-primary text-primary-foreground shadow-md scale-110' : 'bg-card border border-border hover:bg-secondary'}`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                    return <span key={pageNumber} className="px-1 text-muted-foreground">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-card border border-border hover:bg-secondary disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
        )}
      </div>

      {/* ── Cart Panel ── */}
      <div className="w-full lg:w-80 xl:w-96 bg-card border border-border/50 rounded-2xl shadow-sm flex flex-col overflow-hidden shrink-0 h-[50vh] lg:h-full">
        <div className="p-4 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2>سلة المشتريات</h2>
          </div>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-md">
            {cart.length} أصناف
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          <AnimatePresence initial={false}>
            {cart.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-3 bg-secondary/20 p-3 rounded-xl border border-border/50 relative group"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate pr-6" title={item.name}>{item.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">سعر القطعة:</span>
                    <div className="relative inline-flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.price === 0 ? '' : item.price}
                        placeholder="0"
                        onChange={(e) => updateItemPrice(item.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-16 h-6 px-1.5 text-xs font-black bg-background border border-border/80 focus:border-primary rounded outline-none text-primary text-center"
                        title="تعديل سعر القطعة"
                      />
                      <span className="text-[10px] font-bold text-muted-foreground me-1">$</span>
                    </div>
                    {item.originalPrice !== undefined && item.price !== item.originalPrice && (
                      <button
                        type="button"
                        onClick={() => updateItemPrice(item.id, item.originalPrice!)}
                        className="text-[10px] text-primary hover:underline font-semibold"
                        title={`استعادة السعر الأصلي: ${item.originalPrice}$`}
                      >
                        ({item.originalPrice}$)
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 bg-background rounded-lg border border-border p-1">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-black text-sm">{new Intl.NumberFormat('en-US').format(item.price * item.quantity)}</span>
                </div>

                <button
                  onClick={() => updateQuantity(item.id, -item.quantity)}
                  className="absolute top-3 start-3 text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-background rounded-full border border-border shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
              <ShoppingCart className="w-12 h-12" />
              <p className="font-medium">السلة فارغة</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-secondary/20 border-t border-border/50 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">المجموع الفرعي</span>
            <span className="font-bold">{new Intl.NumberFormat('en-US').format(cartTotal)} USD</span>
          </div>
          
          <div className="flex justify-between items-center text-xl font-black">
            <span>الإجمالي</span>
            <span className="text-primary">{new Intl.NumberFormat('en-US').format(cartTotal)} USD</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="vercel-button w-full py-4 text-base font-bold bg-primary text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
          >
            إتمام الطلب
            <span className="translate-x-1">→</span>
          </button>
        </div>
      </div>

      {/* ── Checkout Modal ── */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => { if (!isSubmitting) setIsCheckoutOpen(false); }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="vercel-card w-[95%] max-w-2xl bg-card relative z-10 p-5 md:p-8 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">تأكيد الطلب والدفع</h2>
                {!isSubmitting && (
                  <button onClick={() => setIsCheckoutOpen(false)} className="p-1 hover:bg-secondary rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {/* Customer Selection */}
                <div className="bg-secondary/20 p-4 rounded-xl border border-border">
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">العميل (للدين)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث أو ادخل اسم عميل جديد..."
                      value={customerName}
                      onChange={e => {
                        setCustomerName(e.target.value);
                        setSelectedCustomerId('');
                      }}
                      className="w-full bg-background border border-border h-11 rounded-lg px-4 font-medium outline-none focus:border-primary transition-colors"
                    />
                    
                    {customerName.length > 0 && !selectedCustomerId && (
                      <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1">رقم الهاتف (اختياري)</label>
                          <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-background border border-border h-10 rounded-lg px-3 font-medium outline-none focus:border-primary transition-colors" placeholder="رقم الهاتف" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1">العنوان (اختياري)</label>
                          <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="w-full bg-background border border-border h-10 rounded-lg px-3 font-medium outline-none focus:border-primary transition-colors" placeholder="المنطقة أو العنوان" />
                        </div>
                      </div>
                    )}
                    {/* Simple dropdown for existing customers if typing */}
                    {customerName.length > 0 && !selectedCustomerId && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {customersList.filter(c => c.name.includes(customerName)).map(c => (
                          <div 
                            key={c.id} 
                            className="px-4 py-2 hover:bg-secondary cursor-pointer font-bold"
                            onClick={() => {
                              setSelectedCustomerId(String(c.id));
                              setCustomerName(c.name);
                            }}
                          >
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Paid Checklist & Custom Pricing */}
                <div className="bg-secondary/20 p-4 rounded-xl border border-border space-y-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase">القطع والمحاسبة</p>
                    <span className="text-[11px] text-primary/80 font-bold">يمكنك تحديد/تعديل سعر أي منتج هنا</span>
                  </div>
                  {cart.map(item => (
                    <div 
                      key={item.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-background rounded-xl border border-border/80 hover:border-primary/40 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-primary cursor-pointer shrink-0"
                          checked={itemPaidStatus[item.id] ?? true}
                          onChange={(e) => handleItemCheck(item.id, e.target.checked)}
                          title="حالة المحاسبة"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center text-xs font-bold text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-md">
                              الكمية: {item.quantity}
                            </span>
                            {item.originalPrice !== undefined && item.price !== item.originalPrice && (
                              <button
                                type="button"
                                onClick={() => updateItemPrice(item.id, item.originalPrice!)}
                                className="text-[11px] text-primary hover:underline font-semibold"
                                title={`استعادة السعر الأصلي: ${item.originalPrice}$`}
                              >
                                (الأصلي: {item.originalPrice}$)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pricing Section */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {item.quantity > 1 ? (
                          <div className="flex items-center gap-2">
                            {/* Unit Price */}
                            <div className="flex items-center gap-1.5 bg-secondary/40 px-2.5 py-1.5 rounded-lg border border-border/70">
                              <span className="text-xs font-bold text-muted-foreground">للقطعة:</span>
                              <div className="relative inline-flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.price === 0 ? '' : item.price}
                                  placeholder="0"
                                  onChange={(e) => updateItemPrice(item.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  className="w-16 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 text-xs font-black text-primary outline-none text-center"
                                  title="تعديل سعر القطعة الواحدة"
                                />
                                <span className="text-[11px] font-bold text-muted-foreground me-1">$</span>
                              </div>
                            </div>

                            {/* Total for this line */}
                            <div className="flex items-center gap-1.5 bg-secondary/40 px-2.5 py-1.5 rounded-lg border border-border/70">
                              <span className="text-xs font-bold text-muted-foreground">الإجمالي:</span>
                              <div className="relative inline-flex items-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={(item.price * item.quantity) === 0 ? '' : Number((item.price * item.quantity).toFixed(2))}
                                  placeholder="0"
                                  onChange={(e) => updateItemTotalPrice(item.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  className="w-20 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 text-xs font-black text-foreground outline-none text-center"
                                  title="تعديل إجمالي سعر البند"
                                />
                                <span className="text-[11px] font-bold text-muted-foreground me-1">$</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Single item price */
                          <div className="flex items-center gap-1.5 bg-secondary/40 px-3 py-1.5 rounded-lg border border-border/70">
                            <span className="text-xs font-bold text-muted-foreground">السعر:</span>
                            <div className="relative inline-flex items-center">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.price === 0 ? '' : item.price}
                                placeholder="0"
                                onChange={(e) => updateItemPrice(item.id, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                className="w-24 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded px-2 py-1 text-sm font-black text-primary outline-none text-center"
                                title="تحديد سعر هذا المنتج"
                              />
                              <span className="text-xs font-bold text-muted-foreground me-1">USD</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Discounts */}
                <div className="bg-secondary/20 p-4 rounded-xl border border-border space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">الخصم</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDiscountType('NONE')} className={cn("px-4 py-2 rounded-lg text-sm font-bold border", discountType === 'NONE' ? "bg-primary text-primary-foreground" : "bg-background")}>بلا</button>
                    <button onClick={() => setDiscountType('FIXED')} className={cn("px-4 py-2 rounded-lg text-sm font-bold border", discountType === 'FIXED' ? "bg-primary text-primary-foreground" : "bg-background")}>مبلغ ثابت</button>
                    <button onClick={() => setDiscountType('PERCENTAGE')} className={cn("px-4 py-2 rounded-lg text-sm font-bold border", discountType === 'PERCENTAGE' ? "bg-primary text-primary-foreground" : "bg-background")}>نسبة %</button>
                  </div>
                  {discountType !== 'NONE' && (
                    <input
                      type="number"
                      min="0"
                      placeholder={discountType === 'FIXED' ? 'مبلغ الخصم (USD)' : 'النسبة المئوية (%)'}
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                      className="w-full bg-background border border-border h-11 rounded-lg px-4 font-bold text-primary outline-none focus:border-primary transition-colors text-lg"
                    />
                  )}
                </div>

                {/* Totals & Payments */}
                <div className="bg-secondary/40 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center font-bold">
                    <span>الإجمالي:</span>
                    <span>{new Intl.NumberFormat('en-US').format(cartTotal)} USD</span>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="flex justify-between items-center font-bold text-green-600">
                      <span>الخصم:</span>
                      <span>- {new Intl.NumberFormat('en-US').format(calculatedDiscount)} USD</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xl font-black pt-2 border-t border-border">
                      <span>المطلوب:</span>
                      <div className="flex flex-col items-end">
                        <span className="text-primary">{new Intl.NumberFormat('en-US').format(grandTotal)} USD</span>
                        <span className="text-sm font-bold text-muted-foreground mt-1 text-right" dir="ltr">{new Intl.NumberFormat('en-US').format(grandTotal * currentExchangeRate)} SYP</span>
                      </div>
                    </div>
                  
                  <div className="pt-4 border-t border-border flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase mb-1">
                             <span>المدفوع سوري (ل.س)</span>
                             <button type="button" onClick={() => {
                                 const currentUsd = Number(paidUsd || 0);
                                 const remainingUsd = Math.max(0, grandTotal - currentUsd);
                                 if (remainingUsd > 0) {
                                     setPaidSyp(String(remainingUsd * currentExchangeRate));
                                 }
                             }} className="text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded">تسديد الباقي</button>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={paidSyp}
                            onChange={e => setPaidSyp(e.target.value)}
                          className="w-full bg-background border border-border h-11 rounded-lg px-4 font-black text-primary outline-none focus:border-primary transition-colors text-xl placeholder-muted-foreground"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="flex justify-between items-center text-xs font-bold text-emerald-600 uppercase mb-1">
                             <span>المدفوع دولار ($)</span>
                             <button type="button" onClick={() => {
                                 const currentSyp = Number(paidSyp || 0);
                                 const remainingUsd = Math.max(0, grandTotal - (currentSyp / currentExchangeRate));
                                 if (remainingUsd > 0) {
                                     setPaidUsd(String(Number(remainingUsd.toFixed(2))));
                                 }
                             }} className="text-emerald-700 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded">تسديد الباقي</button>
                          </label>
                        <input
                          type="number"
                          min="0"
                          value={paidUsd}
                          onChange={e => setPaidUsd(e.target.value)}
                          className="w-full bg-emerald-50 border border-emerald-200 h-11 rounded-lg px-4 font-black text-emerald-600 outline-none focus:border-emerald-500 transition-colors text-xl placeholder-emerald-300"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    {(() => {
                      const totalPaid = Number(paidUsd || 0) + (Number(paidSyp || 0) / currentExchangeRate);
                      const diff = grandTotal - totalPaid;
                      if (diff > 0) {
                            const debtVal = debtCurrency === 'SYP' ? diff * currentExchangeRate : diff;
                            return (
                                <div className="mt-2 space-y-2">
                                    <div className="flex justify-center gap-2">
                                        <button type="button" onClick={() => setDebtCurrency('SYP')} className={`px-3 py-1 rounded-full text-xs font-bold border ${debtCurrency === 'SYP' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}>تسجيل الدين (ل.س)</button>
                                        <button type="button" onClick={() => setDebtCurrency('USD')} className={`px-3 py-1 rounded-full text-xs font-bold border ${debtCurrency === 'USD' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}>تسجيل الدين (USD)</button>
                                    </div>
                                    <p className="text-sm font-bold text-destructive bg-destructive/10 p-2 rounded-lg text-center">المتبقي (دين): {new Intl.NumberFormat('en-US').format(debtVal)} {debtCurrency}</p>
                                </div>
                            );
                        }
                      if (diff === 0 && totalPaid > 0) return <p className="text-sm font-bold text-emerald-600 mt-1 bg-emerald-500/10 p-2 rounded-lg text-center">تم التسديد بالكامل ✓</p>;
                      if (diff < 0) return <p className="text-sm font-bold text-emerald-600 mt-1 bg-emerald-500/10 p-2 rounded-lg text-center">الفائض للعميل: {new Intl.NumberFormat('en-US').format(Math.abs(diff))} USD</p>;
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className={cn(
                  'mt-4 w-full py-4 font-black rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl text-lg',
                  isSubmitting
                    ? 'bg-primary/60 text-primary-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-95'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    جاري الترحيل...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    تأكيد الطلب نهائياً
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Image Preview Modal */}
      <ModalPortal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)}>
        <div className="bg-card p-4 rounded-[32px] max-w-lg w-[92vw] border border-border shadow-2xl relative flex flex-col items-center animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between w-full pb-3 border-b border-border/50 mb-3 px-2">
            <span className="text-sm font-bold text-muted-foreground">معاينة صورة المنتج</span>
            <button
              onClick={() => setSelectedImage(null)}
              className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedImage && (
            <div className="w-full max-h-[70vh] flex items-center justify-center p-2 bg-white dark:bg-zinc-900/60 rounded-2xl border border-border/40 overflow-hidden">
              <img
                src={selectedImage}
                alt="معاينة المنتج"
                className="w-full h-full max-h-[65vh] object-contain rounded-xl"
              />
            </div>
          )}
        </div>
      </ModalPortal>

    </div>
  );
};


export default POSPage;
