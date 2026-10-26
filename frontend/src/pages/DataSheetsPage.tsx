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
  Edit2,
  Upload,
  X,
  AlertCircle,
  Layers,
  FolderPlus,
  HardDrive,
  FileCode,
  Tag,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import api from '../services/api';
import ModalPortal from '../components/ui/ModalPortal';
import ViewToggle from '../components/ui/ViewToggle';
import type { DataSheet, DataSheetCategory, DataSheetStats } from '../types/datasheet';

// Helper to format bytes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper to format date
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

// File Type Colors & Icons
function getFileTypeConfig(fileType: string, extension: string) {
  const ext = (extension || '').toLowerCase();
  switch (fileType) {
    case 'pdf':
      return {
        label: 'PDF',
        icon: FileText,
        badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        iconColor: 'text-rose-500',
        cardGlow: 'hover:border-rose-500/40'
      };
    case 'excel':
      return {
        label: ext.toUpperCase() || 'EXCEL',
        icon: FileSpreadsheet,
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconColor: 'text-emerald-500',
        cardGlow: 'hover:border-emerald-500/40'
      };
    case 'word':
      return {
        label: ext.toUpperCase() || 'WORD',
        icon: FileText,
        badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        iconColor: 'text-blue-500',
        cardGlow: 'hover:border-blue-500/40'
      };
    case 'image':
      return {
        label: ext.toUpperCase() || 'صورة',
        icon: ImageIcon,
        badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        iconColor: 'text-purple-500',
        cardGlow: 'hover:border-purple-500/40'
      };
    case 'archive':
      return {
        label: ext.toUpperCase() || 'أرشيف',
        icon: Archive,
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconColor: 'text-amber-500',
        cardGlow: 'hover:border-amber-500/40'
      };
    case 'text':
      return {
        label: ext.toUpperCase() || 'نص',
        icon: FileCode,
        badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        iconColor: 'text-cyan-500',
        cardGlow: 'hover:border-cyan-500/40'
      };
    default:
      return {
        label: ext.toUpperCase() || 'ملف',
        icon: File,
        badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        iconColor: 'text-slate-500',
        cardGlow: 'hover:border-slate-500/40'
      };
  }
}

export default function DataSheetsPage() {
  const queryClient = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | 'ALL'>('ALL');
  const [selectedFileType, setSelectedFileType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('latest');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DataSheet | null>(null);
  const [editingFile, setEditingFile] = useState<DataSheet | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Upload Form state
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategoryId, setUploadCategoryId] = useState<number | ''>('');
  const [uploadSubcategoryId, setUploadSubcategoryId] = useState<number | ''>('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Edit Form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [editSubcategoryId, setEditSubcategoryId] = useState<number | ''>('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');

  // Category Manager Form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<number | ''>('');
  const [catActionError, setCatActionError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Categories
  const { data: categories = [] } = useQuery<DataSheetCategory[]>({
    queryKey: ['datasheet-categories'],
    queryFn: async () => {
      const res = await api.get('/datasheet-categories');
      return res.data;
    },
    staleTime: 60000,
  });

  // 2. Fetch DataSheets
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

  // Subcategories available based on selected category in filters
  const currentSubcategories = useMemo(() => {
    if (selectedCategory === 'ALL') {
      const allSubs: DataSheetCategory[] = [];
      categories.forEach((cat) => {
        if (cat.subcategories && cat.subcategories.length > 0) {
          allSubs.push(...cat.subcategories);
        }
      });
      return allSubs;
    }
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
    setUploadCategoryId('');
    setUploadSubcategoryId('');
    setUploadDescription('');
    setUploadTags('');
    setUploadProgress(0);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (file: globalThis.File) => {
    setUploadFile(file);
    // Auto-generate clean title by stripping extension
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
    // Direct link trigger
    const link = document.createElement('a');
    link.href = file.file_path;
    link.setAttribute('download', file.original_name);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Call API to increment count
    api.get(`/datasheets/${file.id}/download`).catch(() => {});
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto min-h-screen">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                ملفات الداتا شير (Data Sheets)
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20">
                مكتبة الملفات والمواصفات
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              رفع وتصنيف ومشاركة ملفات المواصفات الفنية والمخططات والكتالوجات والبحث السريع بالاسم
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border hover:bg-secondary/60 text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <FolderTree className="w-4 h-4 text-primary" />
            <span>إدارة التصنيفات والفئات</span>
          </button>

          <button
            onClick={() => {
              resetUploadForm();
              setIsUploadOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-md shadow-primary/25 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>رفع ملف داتا شير جديد</span>
          </button>
        </div>
      </div>

      {/* ── Stats Overview Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">إجمالي الملفات</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">{stats.total_count}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <File className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">الحجم الكلي المخزن</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">{formatFileSize(stats.total_size)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">ملفات PDF ومواصفات</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">{stats.type_counts?.pdf || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium">جداول Excel والبيانات</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
              {(stats.type_counts?.excel || 0) + (stats.type_counts?.text || 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Filters & Search Controls Bar ── */}
      <div className="bg-card border border-border/60 p-4 rounded-2xl space-y-4 shadow-sm">
        
        {/* Top Row: Search Input + Sorting + ViewToggle */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث بالاسم، العنوان، اسم الملف الأصلي، الوصف، أو الكلمات الدلالية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-secondary/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-muted-foreground shrink-0">
              <ArrowUpDown className="w-4 h-4 text-primary" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer"
              >
                <option value="latest">الأحدث إضافة</option>
                <option value="oldest">الأقدم إضافة</option>
                <option value="title_asc">الاسم (أ - ي)</option>
                <option value="title_desc">الاسم (ي - أ)</option>
                <option value="size_desc">الأكبر حجماً</option>
                <option value="size_asc">الأصغر حجماً</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>

        {/* Second Row: Category & Subcategory Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-border/40">
          
          {/* Main Category Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>التصنيف الرئيسي (Category)</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setSelectedCategory(val);
                setSelectedSubcategory('ALL'); // Reset subcategory when category changes
              }}
              className="px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">جميع التصنيفات الرئيسية ({stats.total_count})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.datasheets_count ?? 0})
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-primary" />
              <span>التصنيف الفرعي (Subcategory)</span>
            </label>
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              disabled={currentSubcategories.length === 0}
              className="px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option value="ALL">
                {currentSubcategories.length === 0
                  ? 'لا توجد تصنيفات فرعية متاحة'
                  : 'جميع التصنيفات الفرعية'}
              </option>
              {currentSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.datasheets_count ?? 0})
                </option>
              ))}
            </select>
          </div>

          {/* File Type Filter Pills */}
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>نوع الملف (File Type)</span>
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'pdf', label: 'PDF', color: 'hover:text-rose-500' },
                { id: 'excel', label: 'Excel', color: 'hover:text-emerald-500' },
                { id: 'word', label: 'Word', color: 'hover:text-blue-500' },
                { id: 'image', label: 'صور', color: 'hover:text-purple-500' },
                { id: 'other', label: 'أخرى', color: 'hover:text-amber-500' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedFileType(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedFileType === t.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/60 text-muted-foreground hover:bg-secondary ' + t.color
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content View (Grid or List) ── */}
      {isDataSheetsLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">جاري تحميل ملفات الداتا شير...</p>
        </div>
      ) : datasheets.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl py-16 px-4 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground mb-4">
            <FileSpreadsheet className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="text-base font-bold text-foreground">لا توجد ملفات تطابق البحث أو الفلتر</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            لم نتمكن من العثور على أي ملف داتا شير وفق المعايير المحددة. جرب تغيير كلمة البحث أو قم برفع ملف جديد.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedSubcategory('ALL');
              setSelectedFileType('ALL');
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {datasheets.map((file) => {
            const config = getFileTypeConfig(file.file_type, file.file_extension);
            const Icon = config.icon;

            return (
              <div
                key={file.id}
                className={`group bg-card border border-border/70 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-200 ${config.cardGlow}`}
              >
                <div>
                  {/* Card Header: Icon + Type Badge + Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.badgeBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${config.badgeBg}`}>
                          {config.label}
                        </span>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Menu Actions */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(file)}
                        title="تعديل تفاصيل الملف"
                        className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
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
                  <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1.5">
                    {file.title}
                  </h3>

                  {/* Original File Name */}
                  <p className="text-[11px] text-muted-foreground font-mono truncate mb-3" title={file.original_name}>
                    📎 {file.original_name}
                  </p>

                  {/* Category & Subcategory Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {file.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {file.category.name}
                      </span>
                    )}
                    {file.subcategory && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                        {file.subcategory.name}
                      </span>
                    )}
                  </div>

                  {/* Description Snippet if present */}
                  {file.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 bg-secondary/30 p-2 rounded-lg border border-border/40">
                      {file.description}
                    </p>
                  )}

                  {/* Tags if present */}
                  {file.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {file.tags.split(',').map((tag, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer: Metadata + Action Buttons */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 mt-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(file.created_at)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Preview / View button */}
                    <button
                      onClick={() => setPreviewFile(file)}
                      title="معاينة الملف"
                      className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>معاينة</span>
                    </button>

                    {/* Download button */}
                    <button
                      onClick={() => handleDownload(file)}
                      title="تحميل الملف"
                      className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all"
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
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">النوع</th>
                  <th className="py-3 px-4">اسم الملف / العنوان</th>
                  <th className="py-3 px-4">التصنيف الرئيسي</th>
                  <th className="py-3 px-4">التصنيف الفرعي</th>
                  <th className="py-3 px-4">الحجم</th>
                  <th className="py-3 px-4">تاريخ الإضافة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {datasheets.map((file) => {
                  const config = getFileTypeConfig(file.file_type, file.file_extension);
                  const Icon = config.icon;

                  return (
                    <tr key={file.id} className="hover:bg-secondary/30 transition-colors group">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.badgeBg}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${config.badgeBg}`}>
                            {config.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="max-w-xs sm:max-w-md">
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {file.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate" title={file.original_name}>
                            📎 {file.original_name}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {file.category ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {file.category.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {file.subcategory ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                            {file.subcategory.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {formatFileSize(file.file_size)}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-xs">
                        {formatDate(file.created_at)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 hover:bg-secondary rounded-lg text-foreground transition-colors"
                            title="معاينة"
                          >
                            <Eye className="w-4 h-4" />
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
                            <Edit2 className="w-4 h-4" />
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

      {/* ── Modal 1: Upload New DataSheet ── */}
      <ModalPortal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 shadow-2xl relative z-10 space-y-5 animate-in zoom-in-95 duration-150">
          
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">رفع ملف داتا شير جديد</h2>
                <p className="text-xs text-muted-foreground">اختر الملف وحدد اسمه وتصنيفاته</p>
              </div>
            </div>
            <button
              onClick={() => setIsUploadOpen(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            
            {/* Drag & Drop File Zone */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
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
                    : 'border-border hover:border-primary/40 hover:bg-secondary/40'
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
                    <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground truncate max-w-xs">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
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
                      className="p-1 rounded-full hover:bg-rose-500/20 text-rose-500 mr-auto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      اسحب وأفلت الملف هنا، أو <span className="text-primary underline">استعرض الملفات</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      يدعم ملفات PDF، Excel، Word، الصور، المخططات الهندسية (الحد الأقصى 50 ميغابايت)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* File Name / Title */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                اسم الملف / العنوان التوضيحي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: داتا شيت محرك 50 ك.واط موديل 2026"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-secondary/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Category & Subcategory Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  التصنيف الرئيسي (Category)
                </label>
                <select
                  value={uploadCategoryId}
                  onChange={(e) => {
                    setUploadCategoryId(e.target.value === '' ? '' : Number(e.target.value));
                    setUploadSubcategoryId('');
                  }}
                  className="w-full px-3 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- بدون تصنيف رئيسي --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  التصنيف الفرعي (Subcategory)
                </label>
                <select
                  value={uploadSubcategoryId}
                  onChange={(e) => setUploadSubcategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={uploadAvailableSubcategories.length === 0}
                  className="w-full px-3 py-2.5 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">
                    {uploadAvailableSubcategories.length === 0
                      ? 'اختر تصنيف رئيسي أولاً'
                      : '-- بدون تصنيف فرعي --'}
                  </option>
                  {uploadAvailableSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description & Tags */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  الوصف / ملاحظات فنية حول الملف
                </label>
                <textarea
                  rows={2}
                  placeholder="أدخل أي تفاصيل أو أرقام موديلات أو معلومات إضافية..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>الكلمات الدلالية للبحث (مفصولة بفواصل)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: محرك، ثلاثي الطور، 380V، 2026"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Error banner */}
            {uploadError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Progress Bar */}
            {uploadMutation.isPending && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>جاري الرفع...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold hover:bg-secondary/70 transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={uploadMutation.isPending || !uploadFile}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
              >
                {uploadMutation.isPending ? 'جاري الرفع...' : 'رفع وحفظ الملف'}
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* ── Modal 2: Edit DataSheet Details ── */}
      <ModalPortal isOpen={!!editingFile} onClose={() => setEditingFile(null)}>
        <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative z-10 space-y-4 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-base font-bold text-foreground">تعديل تفاصيل الملف</h2>
            <button
              onClick={() => setEditingFile(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">اسم الملف / العنوان</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">التصنيف الرئيسي</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => {
                    setEditCategoryId(e.target.value === '' ? '' : Number(e.target.value));
                    setEditSubcategoryId('');
                  }}
                  className="w-full px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- بدون تصنيف رئيسي --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">التصنيف الفرعي</label>
                <select
                  value={editSubcategoryId}
                  onChange={(e) => setEditSubcategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={editAvailableSubcategories.length === 0}
                  className="w-full px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  <option value="">-- بدون تصنيف فرعي --</option>
                  {editAvailableSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">الوصف / ملاحظات</label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">الكلمات الدلالية (Tags)</label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFile(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-semibold hover:bg-secondary/70 transition-all"
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
        <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
            <div>
              <h2 className="text-base font-bold text-foreground truncate max-w-xl">
                {previewFile?.title}
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {previewFile?.original_name} • {formatFileSize(previewFile?.file_size || 0)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {previewFile && (
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل</span>
                </button>
              )}
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Viewer */}
          <div className="flex-1 overflow-y-auto py-4 min-h-[400px] flex items-center justify-center bg-secondary/20 rounded-xl my-2">
            {previewFile?.file_type === 'pdf' ? (
              <iframe
                src={`${previewFile.file_path}#toolbar=1`}
                className="w-full h-[600px] rounded-lg border border-border"
                title={previewFile.title}
              />
            ) : previewFile?.file_type === 'image' ? (
              <img
                src={previewFile.file_path}
                alt={previewFile.title}
                className="max-h-[600px] max-w-full object-contain rounded-lg shadow-sm"
              />
            ) : (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-primary">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">معاينة الملف المباشرة</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    هذا الملف بصيغة ({previewFile?.file_extension?.toUpperCase()}). يمكنك تنزيله مباشرة وعرضه في البرنامج المخصص له.
                  </p>
                </div>
                {previewFile && (
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 transition-all inline-flex items-center gap-2"
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

      {/* ── Modal 4: Category & Subcategory Management ── */}
      <ModalPortal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)}>
        <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 shadow-2xl relative z-10 space-y-5 animate-in zoom-in-95 duration-150">
          
          <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">إدارة التصنيفات والتصنيفات الفرعية</h2>
                <p className="text-xs text-muted-foreground">تنظيم شجرة الفئات لملفات الداتا شير</p>
              </div>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Add Category / Subcategory Form */}
          <div className="bg-secondary/40 border border-border/80 p-4 rounded-xl space-y-3 shrink-0">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-primary" />
              <span>إضافة تصنيف جديد أو تصنيف فرعي</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="اسم التصنيف الجديد..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={newCatParentId}
                  onChange={(e) => setNewCatParentId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">(تصنيف رئيسي جديد)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      تصنيف فرعي تابع لـ: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  disabled={!newCatName.trim() || createCategoryMutation.isPending}
                  onClick={() => {
                    createCategoryMutation.mutate({
                      name: newCatName.trim(),
                      parent_id: newCatParentId ? Number(newCatParentId) : null,
                    });
                  }}
                  className="w-full py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>

            {catActionError && (
              <p className="text-xs text-rose-500 font-medium">{catActionError}</p>
            )}
          </div>

          {/* List of Existing Categories & Subcategories */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              التصنيفات الحالية في النظام ({categories.length})
            </h4>

            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد تصنيفات بعد.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="border border-border/80 rounded-xl overflow-hidden bg-card">
                  {/* Category Row */}
                  <div className="p-3 bg-secondary/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">{cat.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {cat.datasheets_count ?? 0} ملف
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                        className="p-1 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 rounded-lg transition-colors"
                        title="حذف التصنيف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="p-2.5 bg-card/50 divide-y divide-border/40">
                      {cat.subcategories.map((sub) => (
                        <div key={sub.id} className="py-1.5 px-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/60 text-sm">↳</span>
                            <span className="font-medium text-foreground">{sub.name}</span>
                            <span className="text-[10px] text-muted-foreground">
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
        <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl relative z-10 text-center space-y-4 animate-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">تأكيد حذف الملف</h3>
            <p className="text-xs text-muted-foreground mt-1">
              هل أنت متأكد من حذف هذا الملف نهائياً؟ لا يمكن التراجع عن هذه العملية بعد الحذف.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-semibold hover:bg-secondary/70 transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، حذف الملف'}
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
