import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  Package,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Archive,
  Download,
  Eye,
  Plus,
  Search,
  Trash2,
  Edit3,
  UploadCloud,
  X,
  Check,
  Building2,
  Globe2,
  Calendar,
  FileCode,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Truck,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';
import ModalPortal from '../components/ui/ModalPortal';
import ViewToggle from '../components/ui/ViewToggle';
import type { Container, ContainerFile, ContainerStatus, PaginatedContainers, ContainerStats } from '../types/container';

// Helper: Formats file sizes safely
function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

// Helper: Arabic Date Formatter
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
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

// Status visual configurations
const STATUS_CONFIG: Record<ContainerStatus, { label: string; icon: any; badge: string; border: string }> = {
  SHIPPING: {
    label: 'قيد الشحن 🚢',
    icon: Truck,
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    border: 'border-blue-500/30'
  },
  ARRIVED: {
    label: 'وصلت 📦',
    icon: Package,
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/30'
  },
  UNLOADING: {
    label: 'قيد التفريغ 🔄',
    icon: RotateCcw,
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    border: 'border-amber-500/30'
  },
  COMPLETED: {
    label: 'مكتملة ومستلمة ✅',
    icon: Check,
    badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    border: 'border-purple-500/30'
  }
};

// File type visual helper
function getFileTypeBadge(fileType: string, extension: string) {
  const ext = (extension || '').toLowerCase();
  switch (fileType) {
    case 'pdf':
      return {
        label: 'PDF',
        icon: FileText,
        badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        iconColor: 'text-rose-500'
      };
    case 'excel':
      return {
        label: ext ? ext.toUpperCase() : 'EXCEL',
        icon: FileSpreadsheet,
        badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        iconColor: 'text-emerald-500'
      };
    case 'word':
      return {
        label: ext ? ext.toUpperCase() : 'WORD',
        icon: FileText,
        badgeBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
        iconColor: 'text-sky-500'
      };
    case 'image':
      return {
        label: ext ? ext.toUpperCase() : 'صورة',
        icon: ImageIcon,
        badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
        iconColor: 'text-purple-500'
      };
    case 'archive':
      return {
        label: ext ? ext.toUpperCase() : 'أرشيف',
        icon: Archive,
        badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        iconColor: 'text-amber-500'
      };
    default:
      return {
        label: ext ? ext.toUpperCase() : 'ملف',
        icon: FileCode,
        badgeBg: 'bg-secondary text-muted-foreground border-border/80',
        iconColor: 'text-muted-foreground'
      };
  }
}

export default function ContainersPage() {
  const queryClient = useQueryClient();

  // Filter & Pagination States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'number_asc' | 'number_desc'>('latest');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(12);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isNewContainerModalOpen, setIsNewContainerModalOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [isUploadFileModalOpen, setIsUploadFileModalOpen] = useState(false);
  const [targetContainer, setTargetContainer] = useState<Container | null>(null);
  const [previewFile, setPreviewFile] = useState<ContainerFile | null>(null);

  // Quick Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Containers Query with Pagination
  const { data, isLoading, refetch } = useQuery<{ containers: PaginatedContainers; stats: ContainerStats }>({
    queryKey: ['containers', { search, statusFilter, sortBy, page, perPage }],
    queryFn: async () => {
      const res = await api.get('/containers', {
        params: {
          search: search || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          sort_by: sortBy,
          page,
          per_page: perPage
        }
      });
      return res.data;
    }
  });

  const containersData = data?.containers;
  const stats = data?.stats;
  const containersList = containersData?.data || [];

  // 2. Container Form State (New / Edit)
  const [containerNumber, setContainerNumber] = useState('');
  const [containerTitle, setContainerTitle] = useState('');
  const [containerStatus, setContainerStatus] = useState<ContainerStatus>('ARRIVED');
  const [containerSupplier, setContainerSupplier] = useState('');
  const [containerOrigin, setContainerOrigin] = useState('');
  const [containerShippingDate, setContainerShippingDate] = useState('');
  const [containerArrivalDate, setContainerArrivalDate] = useState('');
  const [containerNotes, setContainerNotes] = useState('');
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [initialFileTitle, setInitialFileTitle] = useState('');
  const initialFileInputRef = useRef<HTMLInputElement>(null);

  const openNewContainerModal = () => {
    setEditingContainer(null);
    setContainerNumber('');
    setContainerTitle('');
    setContainerStatus('ARRIVED');
    setContainerSupplier('');
    setContainerOrigin('');
    setContainerShippingDate('');
    setContainerArrivalDate('');
    setContainerNotes('');
    setInitialFile(null);
    setInitialFileTitle('');
    setIsNewContainerModalOpen(true);
  };

  const openEditContainerModal = (c: Container) => {
    setEditingContainer(c);
    setContainerNumber(c.container_number);
    setContainerTitle(c.title);
    setContainerStatus(c.status);
    setContainerSupplier(c.supplier || '');
    setContainerOrigin(c.origin || '');
    setContainerShippingDate(c.shipping_date || '');
    setContainerArrivalDate(c.arrival_date || '');
    setContainerNotes(c.notes || '');
    setInitialFile(null);
    setIsNewContainerModalOpen(true);
  };

  // 3. File Upload Modal State
  const [uploadContainerNumber, setUploadContainerNumber] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileTitle, setUploadFileTitle] = useState('');
  const [uploadFileDescription, setUploadFileDescription] = useState('');
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  const openUploadModal = (c?: Container) => {
    if (c) {
      setTargetContainer(c);
      setUploadContainerNumber(c.container_number);
    } else {
      setTargetContainer(null);
      setUploadContainerNumber('');
    }
    setUploadFile(null);
    setUploadFileTitle('');
    setUploadFileDescription('');
    setIsUploadFileModalOpen(true);
  };

  // 4. Mutations
  const saveContainerMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('container_number', containerNumber);
      if (containerTitle) formData.append('title', containerTitle);
      formData.append('status', containerStatus);
      if (containerSupplier) formData.append('supplier', containerSupplier);
      if (containerOrigin) formData.append('origin', containerOrigin);
      if (containerShippingDate) formData.append('shipping_date', containerShippingDate);
      if (containerArrivalDate) formData.append('arrival_date', containerArrivalDate);
      if (containerNotes) formData.append('notes', containerNotes);

      if (editingContainer) {
        return (await api.put(`/containers/${editingContainer.id}`, {
          container_number: containerNumber,
          title: containerTitle,
          status: containerStatus,
          supplier: containerSupplier,
          origin: containerOrigin,
          shipping_date: containerShippingDate || null,
          arrival_date: containerArrivalDate || null,
          notes: containerNotes
        })).data;
      } else {
        if (initialFile) {
          formData.append('file', initialFile);
          if (initialFileTitle) formData.append('file_title', initialFileTitle);
        }
        return (await api.post('/containers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })).data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      setIsNewContainerModalOpen(false);
      showToast(editingContainer ? 'تم تعديل بيانات الحاوية بنجاح' : 'تم إنشاء الحاوية بنجاح');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء حفظ الحاوية';
      showToast(`خطأ: ${msg}`);
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error('يرجى اختيار ملف');
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadFileTitle) formData.append('title', uploadFileTitle);
      if (uploadFileDescription) formData.append('description', uploadFileDescription);

      if (targetContainer) {
        return (await api.post(`/containers/${targetContainer.id}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })).data;
      } else {
        if (!uploadContainerNumber.trim()) throw new Error('يرجى تحديد رقم الحاوية');
        formData.append('container_number', uploadContainerNumber.trim());
        return (await api.post('/containers/quick-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })).data;
      }
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      setIsUploadFileModalOpen(false);
      showToast(res.message || 'تم إرفاق الملف بالحاوية بنجاح');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'فشل رفع الملف';
      showToast(`خطأ: ${msg}`);
    }
  });

  const deleteContainerMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await api.delete(`/containers/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      showToast('تم حذف الحاوية وجميع ملفاتها بنجاح');
    },
    onError: (err: any) => {
      showToast(`خطأ في الحذف: ${err.response?.data?.message || err.message}`);
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return (await api.delete(`/container-files/${fileId}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      showToast('تم حذف الملف بنجاح');
    },
    onError: (err: any) => {
      showToast(`خطأ: ${err.response?.data?.message || err.message}`);
    }
  });

  // Download Trigger
  const handleDownloadFile = (file: ContainerFile) => {
    const apiBase = (api.defaults.baseURL || '/backend/api').replace(/\/+$/, '');
    const downloadUrl = `${apiBase}/container-files/${file.id}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', file.original_name);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Preview File URL
  const getPreviewUrl = (file: ContainerFile) => {
    const apiBase = (api.defaults.baseURL || '/backend/api').replace(/\/+$/, '');
    return `${apiBase}/container-files/${file.id}/preview`;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 start-6 z-50 bg-foreground text-background px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm border border-border animate-in slide-in-from-bottom-5">
          <Check className="w-5 h-5 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header & Stats Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">الحاويات والشحنات</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                أرشفة ومتابعة بضائع الحاويات والملفات والمستندات المرفقة لكل حاوية
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => openUploadModal()}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-black text-xs sm:text-sm rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-md hover:shadow-primary/20"
          >
            <UploadCloud className="w-4 h-4" />
            <span>رفع ملف لحاوية</span>
          </button>

          <button
            onClick={openNewContainerModal}
            className="px-4 py-2.5 bg-secondary text-foreground font-bold text-xs sm:text-sm rounded-xl hover:bg-secondary/80 border border-border transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>حاوية جديدة</span>
          </button>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="vercel-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">إجمالي الحاويات</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
              {stats?.total_containers || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="vercel-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">الملفات المرفقة</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
              {stats?.total_files || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="vercel-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">حاويات قيد الشحن</p>
            <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
              {stats?.status_counts?.['SHIPPING'] || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="vercel-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground">الحجم الإجمالي للملفات</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
              {formatFileSize(stats?.total_size || 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search, Status Filters, View Toggle ───────────────────── */}
      <div className="vercel-card p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث برقم الحاوية (مثلاً: 120)، اسم البضاعة، المورد، أو اسم الملف..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-background border border-border h-10 rounded-xl ps-9 pe-8 text-xs sm:text-sm font-bold outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Tools: Sort, View Toggle, Refresh */}
          <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setPage(1);
              }}
              className="bg-background border border-border h-10 rounded-xl px-3 text-xs font-bold text-foreground outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="latest">الأحدث تاريخاً</option>
              <option value="oldest">الأقدم أولاً</option>
              <option value="number_asc">رقم الحاوية (تصاعدي)</option>
              <option value="number_desc">رقم الحاوية (تنازلي)</option>
            </select>

            <ViewToggle viewMode={viewMode === 'table' ? 'list' : 'grid'} setViewMode={(m) => setViewMode(m === 'list' ? 'table' : 'grid')} />

            <button
              onClick={() => refetch()}
              className="h-10 px-3 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl border border-border text-xs font-bold transition-all flex items-center gap-1.5"
              title="تحديث البيانات"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-border/50 text-xs font-bold no-scrollbar">
          {[
            { id: 'ALL', label: 'كافة الحاويات' },
            { id: 'SHIPPING', label: 'قيد الشحن 🚢' },
            { id: 'ARRIVED', label: 'وصلت 📦' },
            { id: 'UNLOADING', label: 'قيد التفريغ 🔄' },
            { id: 'COMPLETED', label: 'مكتملة ومستلمة ✅' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
              {tab.id !== 'ALL' && stats?.status_counts?.[tab.id] !== undefined && (
                <span className="ms-1.5 px-1.5 py-0.2 bg-background/30 rounded-full text-[10px]">
                  {stats.status_counts[tab.id] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content View (Grid or Table) ──────────────────────────────────── */}
      {isLoading ? (
        <div className="vercel-card py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-bold">جاري تحميل بيانات الحاويات والملفات...</p>
        </div>
      ) : containersList.length === 0 ? (
        <div className="vercel-card py-20 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center text-muted-foreground">
            <Boxes className="w-8 h-8 opacity-40" />
          </div>
          <div>
            <h3 className="font-black text-base text-foreground">لا توجد حاويات مطابقة</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search
                ? `لم يتم العثور على أي حاوية أو ملف يطابق "${search}".`
                : 'لم تقم بإضافة أي حاويات بعد. يمكنك إضافة حاوية جديدة أو رفع ملف برقم الحاوية مباشرة.'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => openUploadModal()}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>رفع ملف لحاوية</span>
            </button>
            <button
              onClick={openNewContainerModal}
              className="px-4 py-2 bg-secondary text-foreground text-xs font-bold rounded-xl hover:bg-secondary/80 border border-border transition-all"
            >
              إضافة حاوية
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid Cards View ─────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {containersList.map(container => {
            const statusConfig = STATUS_CONFIG[container.status] || STATUS_CONFIG.ARRIVED;
            const files = container.files || [];

            return (
              <div
                key={container.id}
                className="vercel-card p-5 flex flex-col justify-between border border-border/80 hover:border-primary/50 transition-all shadow-sm hover:shadow-md space-y-4 rounded-2xl group"
              >
                {/* Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-sm tracking-wide">
                        الحاوية #{container.container_number}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-black ${statusConfig.badge}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditContainerModal(container)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="تعديل بيانات الحاوية"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف الحاوية رقم ${container.container_number} وجميع ملفاتها؟`)) {
                            deleteContainerMutation.mutate(container.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                        title="حذف الحاوية بالكامل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-black text-base text-foreground leading-snug line-clamp-2">
                    {container.title}
                  </h3>

                  {/* Supplier & Origin & Dates */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {container.supplier && (
                      <span className="inline-flex items-center gap-1 bg-secondary/50 px-2.5 py-1 rounded-lg border border-border/60 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        <span>{container.supplier}</span>
                      </span>
                    )}
                    {container.origin && (
                      <span className="inline-flex items-center gap-1 bg-secondary/50 px-2.5 py-1 rounded-lg border border-border/60 font-bold">
                        <Globe2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{container.origin}</span>
                      </span>
                    )}
                    {container.arrival_date && (
                      <span className="inline-flex items-center gap-1 bg-secondary/50 px-2.5 py-1 rounded-lg border border-border/60 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>الوصول: {formatDate(container.arrival_date)}</span>
                      </span>
                    )}
                  </div>

                  {/* Notes snippet */}
                  {container.notes && (
                    <p className="text-xs text-muted-foreground/90 bg-secondary/30 p-2.5 rounded-xl border border-border/40 font-medium leading-relaxed line-clamp-2">
                      {container.notes}
                    </p>
                  )}
                </div>

                {/* Attached Files List */}
                <div className="pt-3 border-t border-border/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <span>الملفات المرفقة</span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                        {files.length} ملفات · {formatFileSize(container.total_files_size)}
                      </span>
                    </p>
                    <button
                      onClick={() => openUploadModal(container)}
                      className="text-[11px] font-black text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إرفاق ملف</span>
                    </button>
                  </div>

                  {files.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border/80">
                      لا توجد ملفات مرفقة بهذه الحاوية بعد.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                      {files.map(file => {
                        const fileBadge = getFileTypeBadge(file.file_type, file.file_extension);
                        const FileIcon = fileBadge.icon;

                        return (
                          <div
                            key={file.id}
                            className="p-2 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/60 transition-colors flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={`w-7 h-7 rounded-lg ${fileBadge.badgeBg} flex items-center justify-center shrink-0`}>
                                <FileIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-foreground truncate" title={file.title || file.original_name}>
                                  {file.title || file.original_name}
                                </p>
                                <span className="text-[10px] text-muted-foreground" dir="ltr">
                                  {formatFileSize(file.file_size)}
                                </span>
                              </div>
                            </div>

                            {/* Actions for File */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setPreviewFile(file)}
                                className="p-1 rounded-md hover:bg-background text-muted-foreground hover:text-primary transition-colors"
                                title="معاينة الملف"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="p-1 rounded-md hover:bg-background text-muted-foreground hover:text-emerald-600 transition-colors"
                                title="تحميل الملف"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`حذف الملف "${file.title || file.original_name}"؟`)) {
                                    deleteFileMutation.mutate(file.id);
                                  }
                                }}
                                className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                                title="حذف الملف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ──────────────────────────────────────────────────── */
        <div className="vercel-card overflow-hidden p-0 border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-secondary/50 border-b border-border text-muted-foreground font-bold uppercase">
                <tr>
                  <th className="p-3.5">رقم الحاوية</th>
                  <th className="p-3.5">وصف الشحنة</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">المورد والمنشأ</th>
                  <th className="p-3.5">تاريخ الوصول</th>
                  <th className="p-3.5">الملفات المرفقة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {containersList.map(container => {
                  const statusConfig = STATUS_CONFIG[container.status] || STATUS_CONFIG.ARRIVED;
                  const files = container.files || [];

                  return (
                    <tr key={container.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3.5 whitespace-nowrap font-black">
                        <span className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs shadow-sm">
                          #{container.container_number}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-foreground max-w-xs">
                        <p className="truncate">{container.title}</p>
                        {container.notes && (
                          <p className="text-[10px] text-muted-foreground truncate">{container.notes}</p>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-black ${statusConfig.badge}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-medium">
                        <div>{container.supplier || '—'}</div>
                        <div className="text-[10px] text-muted-foreground/80">{container.origin || ''}</div>
                      </td>
                      <td className="p-3.5 text-muted-foreground whitespace-nowrap font-medium">
                        {formatDate(container.arrival_date)}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {files.slice(0, 3).map(f => {
                            const badge = getFileTypeBadge(f.file_type, f.file_extension);
                            const Icon = badge.icon;
                            return (
                              <button
                                key={f.id}
                                onClick={() => setPreviewFile(f)}
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${badge.badgeBg}`}
                                title={`${f.title || f.original_name} (${formatFileSize(f.file_size)})`}
                              >
                                <Icon className="w-3 h-3" />
                                <span className="max-w-[70px] truncate">{f.title || f.original_name}</span>
                              </button>
                            );
                          })}
                          {files.length > 3 && (
                            <span className="text-[10px] font-black text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                              +{files.length - 3}
                            </span>
                          )}
                          <button
                            onClick={() => openUploadModal(container)}
                            className="p-1 rounded-md bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="إرفاق ملف"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditContainerModal(container)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="تعديل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`حذف الحاوية رقم ${container.container_number}؟`)) {
                                deleteContainerMutation.mutate(container.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ── Pagination Bar ("بيجنت") ────────────────────────────────────────── */}
      {containersData && containersData.last_page > 0 && (
        <div className="vercel-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-border shadow-sm">
          {/* Results Summary */}
          <div className="text-xs text-muted-foreground font-bold">
            عرض{' '}
            <span className="text-foreground font-black">{containersData.from || 0}</span>
            {' '}إلى{' '}
            <span className="text-foreground font-black">{containersData.to || 0}</span>
            {' '}من أصل{' '}
            <span className="text-primary font-black">{containersData.total || 0}</span>
            {' '}حاوية
          </div>

          {/* Page Buttons Stepper */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Previous Page */}
            <button
              onClick={() => {
                if (containersData.current_page > 1) {
                  setPage(containersData.current_page - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={containersData.current_page <= 1}
              className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-bold text-foreground transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {/* Direct Page Numbers */}
            {Array.from({ length: containersData.last_page }, (_, i) => i + 1)
              .filter(p => {
                // Show first, last, and pages close to current
                const cur = containersData.current_page;
                return p === 1 || p === containersData.last_page || Math.abs(p - cur) <= 2;
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && (
                      <span className="px-1 text-muted-foreground font-bold select-none">...</span>
                    )}
                    <button
                      onClick={() => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`min-w-[34px] h-[34px] px-2 rounded-xl text-xs font-black transition-all ${
                        containersData.current_page === p
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary/60 hover:bg-secondary text-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            {/* Next Page */}
            <button
              onClick={() => {
                if (containersData.current_page < containersData.last_page) {
                  setPage(containersData.current_page + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={containersData.current_page >= containersData.last_page}
              className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-bold text-foreground transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Items Per Page Selector */}
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span>لكل صفحة:</span>
            <select
              value={perPage}
              onChange={e => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="bg-background border border-border h-8 rounded-lg px-2 text-xs font-bold text-foreground outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="6">6</option>
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="48">48</option>
              <option value="96">96</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Modal 1: New / Edit Container ──────────────────────────────────── */}
      <ModalPortal isOpen={isNewContainerModalOpen} onClose={() => setIsNewContainerModalOpen(false)}>
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-4 mx-2">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-foreground">
                      {editingContainer ? 'تعديل بيانات الحاوية' : 'إضافة حاوية جديدة'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {editingContainer ? `الحاوية #${editingContainer.container_number}` : 'أدخل رقم الحاوية وتفاصيل شحنة البضائع'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewContainerModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-bold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-muted-foreground mb-1.5">
                      رقم الحاوية <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 120 أو MSKU12345"
                      value={containerNumber}
                      onChange={e => setContainerNumber(e.target.value)}
                      className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-black text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1.5">حالة الحاوية</label>
                    <select
                      value={containerStatus}
                      onChange={e => setContainerStatus(e.target.value as any)}
                      className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-bold text-xs cursor-pointer"
                    >
                      <option value="SHIPPING">قيد الشحن 🚢</option>
                      <option value="ARRIVED">وصلت إلى المستودع / الميناء 📦</option>
                      <option value="UNLOADING">قيد التفريغ والفحص 🔄</option>
                      <option value="COMPLETED">مكتملة ومستلمة ✅</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1.5">عنوان أو وصف الشحنة</label>
                  <input
                    type="text"
                    placeholder="مثال: بضاعة إنارة ليد وسبوت لايت - شحنة تشرين"
                    value={containerTitle}
                    onChange={e => setContainerTitle(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-bold text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-muted-foreground mb-1.5">المورد أو المصنع</label>
                    <input
                      type="text"
                      placeholder="مثال: Guangzhou Lighting Co."
                      value={containerSupplier}
                      onChange={e => setContainerSupplier(e.target.value)}
                      className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1.5">بلد المصدر / المنشأ</label>
                    <input
                      type="text"
                      placeholder="مثال: الصين أو تركيا"
                      value={containerOrigin}
                      onChange={e => setContainerOrigin(e.target.value)}
                      className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-muted-foreground mb-1.5">تاريخ الشحن</label>
                    <input
                      type="date"
                      value={containerShippingDate}
                      onChange={e => setContainerShippingDate(e.target.value)}
                      className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1.5">تاريخ الوصول المتوقع / الفعلي</label>
                    <input
                      type="date"
                      value={containerArrivalDate}
                      onChange={e => setContainerArrivalDate(e.target.value)}
                      className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1.5">ملاحظات إضافية حول البضاعة</label>
                  <textarea
                    rows={2}
                    placeholder="ملاحظات حول عدد الكراتين، الأصناف، أرقام الفواتير..."
                    value={containerNotes}
                    onChange={e => setContainerNotes(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary p-3 rounded-xl outline-none font-medium text-xs resize-none"
                  />
                </div>

                {/* Optional File upload when creating a new container */}
                {!editingContainer && (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <label className="block text-muted-foreground">إرفاق ملف أولي مع الحاوية (اختياري)</label>
                    <input
                      type="file"
                      ref={initialFileInputRef}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setInitialFile(f);
                          if (!initialFileTitle) setInitialFileTitle(f.name.replace(/\.[^/.]+$/, ''));
                        }
                      }}
                      className="hidden"
                    />

                    {initialFile ? (
                      <div className="p-3 bg-secondary/50 rounded-xl border border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-xs truncate">{initialFile.name}</p>
                            <span className="text-[10px] text-muted-foreground" dir="ltr">{formatFileSize(initialFile.size)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInitialFile(null)}
                          className="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => initialFileInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-border/80 hover:border-primary/50 rounded-xl bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground text-xs font-bold transition-all flex flex-col items-center justify-center gap-1"
                      >
                        <UploadCloud className="w-5 h-5 text-primary" />
                        <span>انقر هنا لاختيار ملف (Excel, PDF, Word, صور...)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewContainerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={saveContainerMutation.isPending || !containerNumber.trim()}
                  onClick={() => saveContainerMutation.mutate()}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {saveContainerMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{editingContainer ? 'حفظ التعديلات' : 'إنشاء الحاوية'}</span>
                </button>
              </div>
          </div>
        </ModalPortal>

      {/* ── Modal 2: Upload File to Container ──────────────────────────────── */}
      <ModalPortal isOpen={isUploadFileModalOpen} onClose={() => setIsUploadFileModalOpen(false)}>
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col my-4 mx-2">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-foreground">رفع ملف لحاوية</h3>
                    <p className="text-xs text-muted-foreground">
                      إرفاق مستند أو كشف بضاعة لحاوية محددة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadFileModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-4 sm:p-5 space-y-4 text-xs font-bold">
                {/* Target Container Number */}
                <div>
                  <label className="block text-muted-foreground mb-1.5">
                    رقم الحاوية <span className="text-rose-500">*</span>
                  </label>
                  {targetContainer ? (
                    <div className="p-3 bg-secondary/50 rounded-xl border border-border flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-sm text-foreground">
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary text-primary-foreground text-xs">
                          #{targetContainer.container_number}
                        </span>
                        <span>{targetContainer.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTargetContainer(null)}
                        className="text-[11px] text-primary hover:underline font-bold"
                      >
                        تغيير
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        placeholder="أدخل رقم الحاوية (مثلاً: 120)"
                        value={uploadContainerNumber}
                        onChange={e => setUploadContainerNumber(e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-black text-sm"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                        إذا لم تكن الحاوية موجودة، سيقوم النظام بإنشائها فوراً وإرفاق الملف بها.
                      </p>
                    </div>
                  )}
                </div>

                {/* File Drop/Select */}
                <div>
                  <label className="block text-muted-foreground mb-1.5">
                    الملف المطلوب رفعه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="file"
                    ref={uploadFileInputRef}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploadFile(f);
                        if (!uploadFileTitle) {
                          setUploadFileTitle(f.name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                    className="hidden"
                  />

                  {uploadFile ? (
                    <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-6 h-6 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-black text-foreground text-xs truncate">{uploadFile.name}</p>
                          <span className="text-[10px] text-muted-foreground font-bold" dir="ltr">
                            {formatFileSize(uploadFile.size)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadFile(null)}
                        className="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => uploadFileInputRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground text-xs font-bold transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <UploadCloud className="w-8 h-8 text-primary" />
                      <span className="font-black text-foreground">اضغط هنا لاختيار الملف</span>
                      <span className="text-[11px] text-muted-foreground">PDF، ملف إكسل، وورد، أرشيف ZIP، أو صور</span>
                    </button>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-muted-foreground mb-1.5">عنوان الملف / الوصف</label>
                  <input
                    type="text"
                    placeholder="مثال: كشف البضاعة والتعبئة (Packing List)"
                    value={uploadFileTitle}
                    onChange={e => setUploadFileTitle(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary h-10 px-3 rounded-xl outline-none font-bold text-xs"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-muted-foreground mb-1.5">ملاحظات حول الملف (اختياري)</label>
                  <input
                    type="text"
                    placeholder="ملاحظات توضيحية..."
                    value={uploadFileDescription}
                    onChange={e => setUploadFileDescription(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary h-9 px-3 rounded-xl outline-none font-medium text-xs"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadFileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={uploadFileMutation.isPending || !uploadFile || (!targetContainer && !uploadContainerNumber.trim())}
                  onClick={() => uploadFileMutation.mutate()}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {uploadFileMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>رفع وإرفاق الملف</span>
                </button>
              </div>
          </div>
        </ModalPortal>

      {/* ── Modal 3: File Preview Modal ────────────────────────────────────── */}
      <ModalPortal isOpen={!!previewFile} onClose={() => setPreviewFile(null)}>
        {previewFile && (
          <div className="bg-card w-[92vw] max-w-4xl h-[88vh] rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col my-4">
              {/* Preview Header */}
              <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between bg-secondary/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-foreground truncate" title={previewFile.title || previewFile.original_name}>
                      {previewFile.title || previewFile.original_name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                      <span>{previewFile.original_name}</span>
                      <span>·</span>
                      <span dir="ltr">{formatFileSize(previewFile.file_size)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownloadFile(previewFile)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">تحميل</span>
                  </button>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 bg-background/50 overflow-auto flex items-center justify-center p-2 sm:p-4">
                {previewFile.file_type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(previewFile.file_extension?.toLowerCase()) ? (
                  <img
                    src={getPreviewUrl(previewFile)}
                    alt={previewFile.title}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-border"
                  />
                ) : previewFile.file_type === 'pdf' || previewFile.file_extension?.toLowerCase() === 'pdf' ? (
                  <iframe
                    src={getPreviewUrl(previewFile)}
                    title={previewFile.title}
                    className="w-full h-full rounded-xl border border-border bg-background"
                  />
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <FileCode className="w-16 h-16 mx-auto text-muted-foreground opacity-40" />
                    <p className="text-sm font-bold text-foreground">
                      لا تتوفر معاينة مباشرة لهذا النوع من الملفات ({previewFile.file_extension?.toUpperCase()})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      يمكنك تحميل الملف وفتحه على جهازك مباشرة.
                    </p>
                    <button
                      onClick={() => handleDownloadFile(previewFile)}
                      className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل الملف الآن</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalPortal>
    </div>
  );
}
