import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  FileText,
  File,
  Image as ImageIcon,
  Archive,
  Download,
  Eye,
  Plus,
  Search,
  FolderTree,
  Filter,
  Trash2,
  Edit3,
  UploadCloud,
  X,
  AlertCircle,
  Layers,
  FolderPlus,
  HardDrive,
  FileCode,
  Tag,
  Clock,
  Check
} from 'lucide-react';
import api from '../services/api';
import ModalPortal from '../components/ui/ModalPortal';
import ViewToggle from '../components/ui/ViewToggle';
import SearchableSelect from '../components/ui/SearchableSelect';
import type { DataSheet, DataSheetCategory, DataSheetStats } from '../types/datasheet';

// Formats file sizes safely without RTL reversal issues
function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

// Arabic Date Formatter
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// File Type Visual Configurations
function getFileTypeConfig(fileType: string, extension: string) {
  const ext = (extension || '').toLowerCase();
  switch (fileType) {
    case 'pdf':
      return {
        label: 'PDF',
        icon: FileText,
        badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        iconColor: 'text-rose-500',
        glow: 'hover:border-rose-500/50 hover:shadow-rose-500/5'
      };
    case 'excel':
      return {
        label: ext ? ext.toUpperCase() : 'EXCEL',
        icon: FileSpreadsheet,
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        iconColor: 'text-emerald-500',
        glow: 'hover:border-emerald-500/50 hover:shadow-emerald-500/5'
      };
    case 'word':
      return {
        label: ext ? ext.toUpperCase() : 'WORD',
        icon: FileText,
        badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
        iconColor: 'text-sky-500',
        glow: 'hover:border-sky-500/50 hover:shadow-sky-500/5'
      };
    case 'image':
      return {
        label: ext ? ext.toUpperCase() : 'صورة',
        icon: ImageIcon,
        badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
        iconColor: 'text-purple-500',
        glow: 'hover:border-purple-500/50 hover:shadow-purple-500/5'
      };
    case 'archive':
      return {
        label: ext ? ext.toUpperCase() : 'أرشيف',
        icon: Archive,
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        iconColor: 'text-amber-500',
        glow: 'hover:border-amber-500/50 hover:shadow-amber-500/5'
      };
    case 'text':
      return {
        label: ext ? ext.toUpperCase() : 'بيانات',
        icon: FileCode,
        badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
        iconColor: 'text-teal-500',
        glow: 'hover:border-teal-500/50 hover:shadow-teal-500/5'
      };
    default:
      return {
        label: ext ? ext.toUpperCase() : 'ملف',
        icon: File,
        badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
        iconColor: 'text-slate-500',
        glow: 'hover:border-slate-500/50 hover:shadow-slate-500/5'
      };
  }
}

export default function DataSheetsPage() {
  const queryClient = useQueryClient();

  // Search & Filters State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | 'ALL'>('ALL');
  const [selectedFileType, setSelectedFileType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('latest');

  // Modals State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DataSheet | null>(null);
  const [editingFile, setEditingFile] = useState<DataSheet | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategoryId, setUploadCategoryId] = useState<number | ''>('');
  const [uploadSubcategoryId, setUploadSubcategoryId] = useState<number | ''>('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [editSubcategoryId, setEditSubcategoryId] = useState<number | ''>('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');

  // Category Manager State
  const [categoryAddMode, setCategoryAddMode] = useState<'main' | 'sub'>('main');
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<number | ''>('');
  const [inlineSubCatParentId, setInlineSubCatParentId] = useState<number | null>(null);
  const [inlineSubCatName, setInlineSubCatName] = useState('');
  const [catActionError, setCatActionError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Categories & Subcategories
  const { data: categories = [] } = useQuery<DataSheetCategory[]>({
    queryKey: ['datasheet-categories'],
    queryFn: async () => {
      const res = await api.get('/datasheet-categories');
      return res.data;
    },
    staleTime: 30000,
  });

  // 2. Fetch DataSheets List & Statistics
  const { data: dataSheetsResponse, isLoading: isDataSheetsLoading } = useQuery<{ datasheets: DataSheet[]; stats: DataSheetStats }>({
    queryKey: ['datasheets', searchQuery, selectedCategory, selectedSubcategory, selectedFileType, sortBy],
    queryFn: async () => {
      const params: any = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory !== 'ALL') params.category_id = selectedCategory;
      if (selectedSubcategory !== 'ALL') params.subcategory_id = selectedSubcategory;
      if (selectedFileType !== 'ALL') params.file_type = selectedFileType;
      if (sortBy) params.sort_by = sortBy;

      const res = await api.get('/datasheets', { params });
      return res.data;
    },
  });

  const datasheets = dataSheetsResponse?.datasheets || [];
  const stats = dataSheetsResponse?.stats || { total_count: 0, total_size: 0, type_counts: {} };

  // Subcategories available based on the currently selected category tab
  const activeSubcategories = useMemo(() => {
    if (selectedCategory === 'ALL') return [];
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.subcategories || [];
  }, [categories, selectedCategory]);

  // Subcategories available in Upload modal based on uploadCategoryId
  const uploadAvailableSubcategories = useMemo(() => {
    if (!uploadCategoryId) return [];
    const cat = categories.find((c) => c.id === Number(uploadCategoryId));
    return cat?.subcategories || [];
  }, [categories, uploadCategoryId]);

  // Subcategories available in Edit modal based on editCategoryId
  const editAvailableSubcategories = useMemo(() => {
    if (!editCategoryId) return [];
    const cat = categories.find((c) => c.id === Number(editCategoryId));
    return cat?.subcategories || [];
  }, [categories, editCategoryId]);

  // Options for Category SearchableSelects
  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({
      value: c.id,
      label: c.name,
      badge: `${c.datasheets_count ?? 0} ملف`,
    }));
  }, [categories]);

  const uploadSubcategoryOptions = useMemo(() => {
    return uploadAvailableSubcategories.map((s) => ({
      value: s.id,
      label: s.name,
      badge: `${s.datasheets_count ?? 0} ملف`,
    }));
  }, [uploadAvailableSubcategories]);

  const editSubcategoryOptions = useMemo(() => {
    return editAvailableSubcategories.map((s) => ({
      value: s.id,
      label: s.name,
      badge: `${s.datasheets_count ?? 0} ملف`,
    }));
  }, [editAvailableSubcategories]);

  // 3. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/datasheets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasheets'] });
      queryClient.invalidateQueries({ queryKey: ['datasheet-categories'] });
      setIsUploadOpen(false);
      resetUploadForm();
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.message || 'حدث خطأ أثناء رفع الملف. يرجى التأكد من نوع الملف وحجمه.');
    },
  });

  // 4. Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/datasheets/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasheets'] });
      queryClient.invalidateQueries({ queryKey: ['datasheet-categories'] });
      setEditingFile(null);
    },
  });

  // 5. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/datasheets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasheets'] });
      queryClient.invalidateQueries({ queryKey: ['datasheet-categories'] });
      setDeleteConfirmId(null);
    },
  });

  // 6. Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; parent_id?: number | null }) => {
      const res = await api.post('/datasheet-categories', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasheet-categories'] });
      setNewCatName('');
      setNewCatParentId('');
      setInlineSubCatParentId(null);
      setInlineSubCatName('');
      setCatActionError('');
    },
    onError: (err: any) => {
      setCatActionError(err.response?.data?.message || 'حدث خطأ أثناء إضافة التصنيف.');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/datasheet-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasheet-categories'] });
      queryClient.invalidateQueries({ queryKey: ['datasheets'] });
    },
    onError: (err: any) => {
      setCatActionError(err.response?.data?.message || 'تعذر حذف التصنيف.');
    },
  });

  // Handlers
  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadCategoryId(selectedCategory !== 'ALL' ? selectedCategory : '');
    setUploadSubcategoryId(selectedSubcategory !== 'ALL' ? selectedSubcategory : '');
    setUploadDescription('');
    setUploadTags('');
    setUploadProgress(0);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (file: globalThis.File) => {
    setUploadFile(file);
    const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    if (!uploadTitle) {
      setUploadTitle(cleanName);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('يرجى اختيار ملف لرفعه');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('يرجى إدخال اسم أو عنوان للملف');
      return;
    }

    setUploadError('');
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle.trim());
    if (uploadCategoryId) formData.append('category_id', String(uploadCategoryId));
    if (uploadSubcategoryId) formData.append('subcategory_id', String(uploadSubcategoryId));
    if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());
    if (uploadTags.trim()) formData.append('tags', uploadTags.trim());

    uploadMutation.mutate(formData);
  };

  const openEditModal = (file: DataSheet) => {
    setEditingFile(file);
    setEditTitle(file.title);
    setEditCategoryId(file.category_id || '');
    setEditSubcategoryId(file.subcategory_id || '');
    setEditDescription(file.description || '');
    setEditTags(file.tags || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile || !editTitle.trim()) return;

    updateMutation.mutate({
      id: editingFile.id,
      data: {
        title: editTitle.trim(),
        category_id: editCategoryId || null,
        subcategory_id: editSubcategoryId || null,
        description: editDescription.trim(),
        tags: editTags.trim(),
      },
    });
  };

  const handleDownload = (file: DataSheet) => {
    const link = document.createElement('a');
    link.href = file.file_path;
    link.setAttribute('download', file.original_name);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    api.get(`/datasheets/${file.id}/download`).catch(() => {});
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1750px] mx-auto min-h-screen font-sans">
      
      {/* ── 1. Hero Header Banner ── */}
      <div className="relative overflow-hidden bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#f97316]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Title & Description */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] flex items-center justify-center text-white shadow-xl shadow-orange-500/25 shrink-0">
              <FileSpreadsheet className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight">
                  ملفات الداتا شير (Data Sheets)
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
                  مكتبة المواصفات والكتالوجات
                </span>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                رفع وتنظيم ومشاركة ملفات المواصفات الفنية، المخططات الهندسية، والكتالوجات مع فلاتر هرمية وبحث فوري بالاسم.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-3 shrink-0">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-secondary/70 text-xs sm:text-sm font-bold text-foreground transition-all shadow-sm"
            >
              <FolderTree className="w-4 h-4 text-primary" />
              <span>إدارة التصنيفات والفئات</span>
            </button>

            <button
              onClick={() => {
                resetUploadForm();
                setIsUploadOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>رفع ملف داتا شير جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Stat Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Total Files */}
        <div className="relative overflow-hidden bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">إجمالي الملفات المرفوعة</span>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <File className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{stats.total_count}</span>
            <span className="text-xs text-muted-foreground font-semibold">ملف</span>
          </div>
        </div>

        {/* Total Storage Size */}
        <div className="relative overflow-hidden bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">المساحة التخزينية المستهلكة</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-foreground font-mono" dir="ltr">
              {formatFileSize(stats.total_size)}
            </span>
          </div>
        </div>

        {/* PDF Documents */}
        <div className="relative overflow-hidden bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">ملفات PDF والكتالوجات</span>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{stats.type_counts?.pdf || 0}</span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">كتالوج ومخطط</span>
          </div>
        </div>

        {/* Excel & Data Sheets */}
        <div className="relative overflow-hidden bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">جداول Excel والبيانات</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-foreground">
              {(stats.type_counts?.excel || 0) + (stats.type_counts?.text || 0)}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">شيت ومستند</span>
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Category Pills Bar ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
        
        {/* Main Categories Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>التصنيفات الرئيسية (Categories)</span>
            </span>

            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ إدارة وإضافة فئات</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* "All" Category Pill */}
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedSubcategory('ALL');
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                selectedCategory === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]'
                  : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50'
              }`}
            >
              <span>جميع التصنيفات</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-background text-foreground'
              }`}>
                {stats.total_count}
              </span>
            </button>

            {/* Dynamic Main Categories */}
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory('ALL');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]'
                      : 'bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-background text-foreground'
                  }`}>
                    {cat.datasheets_count ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subcategories Row */}
        {activeSubcategories.length > 0 && (
          <div className="pt-3 border-t border-border/50 space-y-2 animate-in fade-in duration-200">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-primary" />
              <span>التصنيفات الفرعية التابعة:</span>
            </span>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedSubcategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSubcategory === 'ALL'
                    ? 'bg-secondary text-foreground border border-primary/40 font-bold shadow-xs'
                    : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                الكل
              </button>

              {activeSubcategories.map((sub) => {
                const isSelected = selectedSubcategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubcategory(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-secondary text-primary border border-primary font-bold shadow-xs'
                        : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span>{sub.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({sub.datasheets_count ?? 0})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Unified Command & Search Bar ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
        
        {/* Top Search Input & Controls */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Main Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث بالاسم، كود الموديل، اسم الملف الأصلي، الوصف، أو الكلمات الدلالية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Themed Searchable Sort Dropdown & View Mode */}
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-between md:justify-start">
            
            {/* Themed Searchable Sort Dropdown */}
            <div className="w-44 shrink-0">
              <SearchableSelect
                options={[
                  { value: 'latest', label: 'الأحدث إضافة' },
                  { value: 'oldest', label: 'الأقدم إضافة' },
                  { value: 'title_asc', label: 'الاسم (أ - ي)' },
                  { value: 'title_desc', label: 'الاسم (ي - أ)' },
                  { value: 'size_desc', label: 'الأكبر حجماً' },
                  { value: 'size_asc', label: 'الأصغر حجماً' },
                ]}
                value={sortBy}
                onChange={(val) => setSortBy(String(val))}
                placeholder="ترتيب حسب..."
                searchPlaceholder="بحث في الترتيب..."
                buttonClassName="h-10 rounded-xl px-3 text-xs font-bold bg-secondary/50"
              />
            </div>

            {/* View Toggle */}
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>

        {/* Bottom Quick File-Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-border/40">
          <span className="text-xs font-bold text-muted-foreground ml-2 shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-primary" />
            <span>نوع الملف:</span>
          </span>

          {[
            { id: 'ALL', label: 'جميع الصيغ', icon: File },
            { id: 'pdf', label: 'PDF', icon: FileText, color: 'text-rose-500' },
            { id: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-500' },
            { id: 'word', label: 'Word', icon: FileText, color: 'text-sky-500' },
            { id: 'image', label: 'صور', icon: ImageIcon, color: 'text-purple-500' },
            { id: 'other', label: 'أخرى', icon: Archive, color: 'text-amber-500' },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = selectedFileType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedFileType(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary-foreground' : t.color}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. File Content Area (Grid or Table) ── */}
      {isDataSheetsLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-bold">جاري تحميل ملفات الداتا شير...</p>
        </div>
      ) : datasheets.length === 0 ? (
        
        /* ── Modern Empty State & Direct Dropzone ── */
        <div className="bg-card border-2 border-dashed border-border/80 rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5 shadow-inner">
            <UploadCloud className="w-10 h-10 stroke-[1.75]" />
          </div>

          <h3 className="text-lg sm:text-xl font-black text-foreground">
            {searchQuery || selectedCategory !== 'ALL' || selectedFileType !== 'ALL'
              ? 'لم يتم العثور على ملفات تطابق الفلتر'
              : 'لم يتم رفع أي ملفات داتا شير حتى الآن'}
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
            {searchQuery || selectedCategory !== 'ALL' || selectedFileType !== 'ALL'
              ? 'جرب البحث بكلمة مختلفة أو قم بإلغاء الفلاتر المحددة لعرض كافة الملفات.'
              : 'ابدأ الآن برفع ملفات المواصفات والكتالوجات والمخططات الهندسية بصيغ PDF أو Excel لتنظيمها وتسهيل مشاركتها.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {(searchQuery || selectedCategory !== 'ALL' || selectedFileType !== 'ALL') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedSubcategory('ALL');
                  setSelectedFileType('ALL');
                }}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all shadow-sm"
              >
                إعادة ضبط كافة الفلاتر
              </button>
            ) : (
              <button
                onClick={() => {
                  resetUploadForm();
                  setIsUploadOpen(true);
                }}
                className="px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md shadow-primary/25 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>رفع أول ملف داتا شير الآن</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* ── Grid View Cards ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {datasheets.map((file) => {
            const config = getFileTypeConfig(file.file_type, file.file_extension);
            const Icon = config.icon;

            return (
              <div
                key={file.id}
                className={`group bg-card border border-border/80 rounded-2xl p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-200 ${config.glow}`}
              >
                <div>
                  {/* Card Header: Type Badge + Original Ext + Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${config.badgeBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase font-mono ${config.badgeBg}`}>
                          {config.label}
                        </span>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5" dir="ltr">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Menu */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(file)}
                        title="تعديل التفاصيل"
                        className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(file.id)}
                        title="حذف الملف"
                        className="p-1.5 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1.5">
                    {file.title}
                  </h3>

                  {/* Original File Name */}
                  <p className="text-xs text-muted-foreground font-mono truncate mb-3" title={file.original_name} dir="ltr">
                    📎 {file.original_name}
                  </p>

                  {/* Category & Subcategory Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {file.category && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/25">
                        {file.category.name}
                      </span>
                    )}
                    {file.subcategory && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                        {file.subcategory.name}
                      </span>
                    )}
                  </div>

                  {/* Description snippet */}
                  {file.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 bg-secondary/30 p-2.5 rounded-xl border border-border/40 leading-relaxed">
                      {file.description}
                    </p>
                  )}

                  {/* Tags */}
                  {file.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {file.tags.split(',').map((tag, idx) => (
                        <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer: Date + Actions */}
                <div className="pt-3.5 border-t border-border/60 flex items-center justify-between gap-2 mt-2">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-muted-foreground/80" />
                    {formatDate(file.created_at)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>معاينة</span>
                    </button>

                    <button
                      onClick={() => handleDownload(file)}
                      title="تحميل الملف"
                      className="p-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        /* ── List / Table View ── */
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">نوع الملف</th>
                  <th className="py-3.5 px-4">اسم الملف / العنوان</th>
                  <th className="py-3.5 px-4">التصنيف الرئيسي</th>
                  <th className="py-3.5 px-4">التصنيف الفرعي</th>
                  <th className="py-3.5 px-4">الحجم</th>
                  <th className="py-3.5 px-4">تاريخ الإضافة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datasheets.map((file) => {
                  const config = getFileTypeConfig(file.file_type, file.file_extension);
                  const Icon = config.icon;

                  return (
                    <tr key={file.id} className="hover:bg-secondary/30 transition-colors group">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${config.badgeBg}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border uppercase font-mono ${config.badgeBg}`}>
                            {config.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-xs sm:max-w-md">
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {file.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate" title={file.original_name} dir="ltr">
                            📎 {file.original_name}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {file.category ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {file.category.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {file.subcategory ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                            {file.subcategory.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap" dir="ltr">
                        {formatFileSize(file.file_size)}
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap text-xs font-medium">
                        {formatDate(file.created_at)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 hover:bg-secondary rounded-lg text-foreground transition-colors"
                            title="معاينة"
                          >
                            <Eye className="w-4 h-4 text-primary" />
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                            title="تحميل"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(file)}
                            className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(file.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal 1: Upload New DataSheet (With Searchable Themed Dropdowns) ── */}
      <ModalPortal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <div className="bg-card border border-border rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl relative z-10 space-y-5 animate-in zoom-in-95 duration-150">
          
          <div className="flex items-center justify-between pb-3.5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-foreground">رفع ملف داتا شير جديد</h2>
                <p className="text-xs text-muted-foreground">اختر الملف وحدد اسمه وتصنيفاته الفنية</p>
              </div>
            </div>
            <button
              onClick={() => setIsUploadOpen(false)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            
            {/* Drag & Drop File Box */}
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">
                الملف المطلوب رفعه <span className="text-rose-500">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  uploadFile
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-secondary/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <File className="w-6 h-6" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">
                        {formatFileSize(uploadFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 rounded-full hover:bg-rose-500/20 text-rose-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-primary">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      اسحب وأفلت الملف هنا، أو <span className="text-primary underline">استعرض جهازك</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      يدعم ملفات PDF، Excel، Word، الصور، المخططات الهندسية (الحد الأقصى 50 ميغابايت)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block">
                اسم الملف / العنوان التوضيحي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: داتا شيت محرك 50 ك.واط ثلاثي الطور"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              />
            </div>

            {/* Searchable Themed Category & Subcategory Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block flex items-center justify-between">
                  <span>التصنيف الرئيسي (Category)</span>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    + فئة جديدة
                  </button>
                </label>
                <SearchableSelect
                  options={categoryOptions}
                  value={uploadCategoryId}
                  onChange={(val) => {
                    setUploadCategoryId(val ? Number(val) : '');
                    setUploadSubcategoryId('');
                  }}
                  placeholder="اختر التصنيف الرئيسي..."
                  searchPlaceholder="ابحث في التصنيفات..."
                  clearable
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">
                  التصنيف الفرعي (Subcategory)
                </label>
                <SearchableSelect
                  options={uploadSubcategoryOptions}
                  value={uploadSubcategoryId}
                  onChange={(val) => setUploadSubcategoryId(val ? Number(val) : '')}
                  placeholder={
                    !uploadCategoryId
                      ? 'اختر تصنيف رئيسي أولاً'
                      : uploadAvailableSubcategories.length === 0
                      ? 'لا توجد فئات فرعية'
                      : 'اختر التصنيف الفرعي...'
                  }
                  searchPlaceholder="ابحث في التصنيفات الفرعية..."
                  disabled={!uploadCategoryId || uploadAvailableSubcategories.length === 0}
                  clearable
                />
              </div>
            </div>

            {/* Description & Tags */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">
                  الوصف / ملاحظات فنية
                </label>
                <textarea
                  rows={2}
                  placeholder="أدخل أي أرقام موديلات أو معلومات إضافية عن الملف..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-secondary/50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span>الكلمات الدلالية للبحث (مفصولة بفواصل)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: محرك، 380V، 50Hz، كوري"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="w-full px-3.5 py-2 bg-secondary/50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                />
              </div>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Progress Bar */}
            {uploadMutation.isPending && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-muted-foreground font-mono">
                  <span>جاري الرفع والمعالجة...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-bold hover:bg-secondary/70 transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={uploadMutation.isPending || !uploadFile}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
              >
                {uploadMutation.isPending ? 'جاري الرفع...' : 'رفع وحفظ الملف'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* ── Modal 2: Edit DataSheet Details (With Searchable Themed Dropdowns) ── */}
      <ModalPortal isOpen={!!editingFile} onClose={() => setEditingFile(null)}>
        <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative z-10 space-y-4 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3.5 border-b border-border">
            <h2 className="text-base sm:text-lg font-black text-foreground">تعديل تفاصيل الملف</h2>
            <button
              onClick={() => setEditingFile(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">اسم الملف / العنوان</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">التصنيف الرئيسي</label>
                <SearchableSelect
                  options={categoryOptions}
                  value={editCategoryId}
                  onChange={(val) => {
                    setEditCategoryId(val ? Number(val) : '');
                    setEditSubcategoryId('');
                  }}
                  placeholder="اختر التصنيف الرئيسي..."
                  searchPlaceholder="ابحث في التصنيفات..."
                  clearable
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">التصنيف الفرعي</label>
                <SearchableSelect
                  options={editSubcategoryOptions}
                  value={editSubcategoryId}
                  onChange={(val) => setEditSubcategoryId(val ? Number(val) : '')}
                  placeholder={
                    !editCategoryId
                      ? 'اختر تصنيف رئيسي أولاً'
                      : editAvailableSubcategories.length === 0
                      ? 'لا توجد فئات فرعية'
                      : 'اختر التصنيف الفرعي...'
                  }
                  searchPlaceholder="ابحث في التصنيفات الفرعية..."
                  disabled={!editCategoryId || editAvailableSubcategories.length === 0}
                  clearable
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">الوصف / ملاحظات</label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-secondary/50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">الكلمات الدلالية (Tags)</label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full px-3.5 py-2 bg-secondary/50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingFile(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-bold hover:bg-secondary/70 transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all"
              >
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* ── Modal 3: Preview Modal ── */}
      <ModalPortal isOpen={!!previewFile} onClose={() => setPreviewFile(null)}>
        <div className="bg-card border border-border rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground truncate max-w-xl">
                {previewFile?.title}
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">
                {previewFile?.original_name} • {formatFileSize(previewFile?.file_size || 0)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {previewFile && (
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل الملف</span>
                </button>
              )}
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Viewer */}
          <div className="flex-1 overflow-y-auto py-3 min-h-[420px] flex items-center justify-center bg-secondary/30 rounded-2xl my-2 border border-border/50">
            {previewFile?.file_type === 'pdf' ? (
              <iframe
                src={`${previewFile.file_path}#toolbar=1`}
                className="w-full h-[620px] rounded-xl border border-border"
                title={previewFile.title}
              />
            ) : previewFile?.file_type === 'image' ? (
              <img
                src={previewFile.file_path}
                alt={previewFile.title}
                className="max-h-[620px] max-w-full object-contain rounded-xl shadow-md"
              />
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-primary">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">معاينة الملف المباشرة</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                    هذا الملف بصيغة ({previewFile?.file_extension?.toUpperCase()}). يمكنك تنزيله مباشرة بضغطة زر واحدة وعرضه عبر البرامج المكتبية.
                  </p>
                </div>
                {previewFile && (
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الملف الآن ({formatFileSize(previewFile.file_size)})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </ModalPortal>

      {/* ── Modal 4: Category & Subcategory Management (Ultra Usable & Intuitive) ── */}
      <ModalPortal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)}>
        <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 sm:p-7 shadow-2xl relative z-10 space-y-5 animate-in zoom-in-95 duration-150">
          
          <div className="flex items-center justify-between pb-3.5 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-foreground">شجرة التصنيفات والفئات الفرعية</h2>
                <p className="text-xs text-muted-foreground">تنظيم فئات ملفات الداتا شير والمواصفات بسهولة تامة</p>
              </div>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Intuitive Segmented Add Form */}
          <div className="bg-secondary/50 border border-border/80 p-4 sm:p-5 rounded-2xl space-y-4 shrink-0">
            
            {/* Mode Toggle Pills: Main Category vs Subcategory */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-primary" />
                <span>إضافة جديدة:</span>
              </span>

              <div className="inline-flex p-1 bg-background/80 border border-border/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryAddMode('main');
                    setNewCatParentId('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    categoryAddMode === 'main'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📁 تصنيف رئيسي جديد
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryAddMode('sub')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    categoryAddMode === 'sub'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ↳ تصنيف فرعي تابع
                </button>
              </div>
            </div>

            {/* Form Fields based on Mode */}
            {categoryAddMode === 'main' ? (
              
              /* Mode A: Main Category */
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="اسم التصنيف الرئيسي الجديد (مثال: محركات كهربائية، أنظمة تحكم...)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCatName.trim()) {
                      e.preventDefault();
                      createCategoryMutation.mutate({ name: newCatName.trim(), parent_id: null });
                    }
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <button
                  type="button"
                  disabled={!newCatName.trim() || createCategoryMutation.isPending}
                  onClick={() => {
                    createCategoryMutation.mutate({ name: newCatName.trim(), parent_id: null });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>إضافة التصنيف</span>
                </button>
              </div>
            ) : (
              
              /* Mode B: Subcategory (With Searchable Orange Dropdown) */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
                      اختر التصنيف الرئيسي الأب:
                    </label>
                    <SearchableSelect
                      options={categoryOptions}
                      value={newCatParentId}
                      onChange={(val) => setNewCatParentId(val ? Number(val) : '')}
                      placeholder="ابحث واختر التصنيف الأب..."
                      searchPlaceholder="بحث في التصنيفات الرئيسية..."
                      buttonClassName="h-10 rounded-xl px-3 bg-background border border-border text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
                      اسم التصنيف الفرعي الجديد:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="مثال: محركات تيار مستمر DC..."
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCatName.trim() && newCatParentId) {
                            e.preventDefault();
                            createCategoryMutation.mutate({
                              name: newCatName.trim(),
                              parent_id: Number(newCatParentId),
                            });
                          }
                        }}
                        className="flex-1 px-3.5 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 h-10"
                      />

                      <button
                        type="button"
                        disabled={!newCatName.trim() || !newCatParentId || createCategoryMutation.isPending}
                        onClick={() => {
                          createCategoryMutation.mutate({
                            name: newCatName.trim(),
                            parent_id: Number(newCatParentId),
                          });
                        }}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1 shrink-0 h-10"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>إضافة</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {catActionError && (
              <p className="text-xs text-rose-500 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{catActionError}</span>
              </p>
            )}
          </div>

          {/* List of Existing Categories with Direct Inline Subcategory Add */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              التصنيفات المتاحة حالياً ({categories.length})
            </h4>

            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد تصنيفات بعد.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
                  
                  {/* Category Header */}
                  <div className="p-3.5 bg-secondary/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{cat.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                        {cat.datasheets_count ?? 0} ملف
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Direct inline subcategory adder trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setInlineSubCatParentId(inlineSubCatParentId === cat.id ? null : cat.id);
                          setInlineSubCatName('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-background hover:bg-secondary text-primary border border-primary/20 text-xs font-bold flex items-center gap-1 transition-all"
                        title="إضافة فرع سريع تحت هذا التصنيف"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                        <span>+ إضافة فرع هنا</span>
                      </button>

                      <button
                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                        className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded-lg transition-colors"
                        title="حذف التصنيف بالكامل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Subcategory Input if Active */}
                  {inlineSubCatParentId === cat.id && (
                    <div className="p-3 bg-primary/5 border-t border-primary/20 flex items-center gap-2 animate-in fade-in duration-150">
                      <span className="text-xs font-bold text-primary shrink-0">↳ اسم الفرع:</span>
                      <input
                        autoFocus
                        type="text"
                        placeholder="مثال: فئة فرعية جديدة..."
                        value={inlineSubCatName}
                        onChange={(e) => setInlineSubCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && inlineSubCatName.trim()) {
                            createCategoryMutation.mutate({
                              name: inlineSubCatName.trim(),
                              parent_id: cat.id,
                            });
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        disabled={!inlineSubCatName.trim() || createCategoryMutation.isPending}
                        onClick={() => {
                          createCategoryMutation.mutate({
                            name: inlineSubCatName.trim(),
                            parent_id: cat.id,
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>حفظ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInlineSubCatParentId(null)}
                        className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}

                  {/* Subcategories List */}
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="p-2.5 bg-card/60 divide-y divide-border/40">
                      {cat.subcategories.map((sub) => (
                        <div key={sub.id} className="py-2 px-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-bold">↳</span>
                            <span className="font-semibold text-foreground">{sub.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({sub.datasheets_count ?? 0} ملف)
                            </span>
                          </div>

                          <button
                            onClick={() => deleteCategoryMutation.mutate(sub.id)}
                            className="p-1 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded transition-colors"
                            title="حذف التصنيف الفرعي"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </ModalPortal>

      {/* ── Modal 5: Delete Confirmation ── */}
      <ModalPortal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <div className="bg-card border border-border rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl relative z-10 animate-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">تأكيد حذف الملف</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا الملف نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-bold hover:bg-secondary/70 transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، تأكيد الحذف'}
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
