import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingCart, 
  Printer, 
  ShieldCheck, 
  Volume2, 
  Coins, 
  SlidersHorizontal,
  RefreshCw,
  UserCheck,
  Plus,
  Trash2,
  Lock,
  LayoutDashboard,
  FileText,
  Package,
  FileSpreadsheet,
  Boxes,
  Users,
  TrendingDown,
  DollarSign,
  UserCog,
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';
import api from '../services/api';

// Dedicated RTL Switch component (OFF on the right, ON slides to the left)
const RTLSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  activeColor?: string;
  disabled?: boolean;
}> = ({ checked, onChange, activeColor = 'bg-primary', disabled = false }) => {
  return (
    <div
      onClick={e => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      dir="rtl"
      role="switch"
      aria-checked={checked}
      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out flex-shrink-0 select-none relative ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${
        checked ? activeColor : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
          checked ? '-translate-x-5' : 'translate-x-0'
        }`}
      />
    </div>
  );
};

interface SettingsState {
  exchange_rate: string;
  pos_default_currency: 'USD' | 'SYP';
  pos_default_payment: 'CASH' | 'DEBT';
  pos_allow_negative_stock: boolean;
  pos_low_stock_threshold: number;
  receipt_auto_print: boolean;
  receipt_paper_size: '80mm' | '58mm' | 'A4';
  receipt_show_dual_currency: boolean;
  receipt_footer_note: string;
  syp_rounding_rule: 'none' | '100' | '500' | '1000';
  sound_effects_enabled: boolean;
  confirm_order_cancel: boolean;
  cart_autosave: boolean;
}

interface RoleActionPermissions {
  pos_edit_price: boolean;
  pos_apply_discount: boolean;
  inventory_edit: boolean;
  orders_delete: boolean;
  view_profits: boolean;
}

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
  allowed_pages: string[];
  actions: RoleActionPermissions;
}

const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'لوحة التحكم', desc: 'نظرة عامة على الإحصائيات والأداء والمبيعات', icon: LayoutDashboard },
  { id: 'sales', name: 'نقطة البيع (POS)', desc: 'تسجيل المبيعات واختيار المنتجات وإتمام الفواتير', icon: ShoppingCart },
  { id: 'orders', name: 'سجل المبيعات', desc: 'استعراض الطلبات السابقة وتفاصيل الفواتير والطباعة', icon: FileText },
  { id: 'items', name: 'المنتجات والمخزون', desc: 'إدارة الأصناف والأسعار وتحديث كميات المستودع', icon: Package },
  { id: 'containers', name: 'الحاويات والشحنات', desc: 'أرشفة ومتابعة الحاويات وبضائع الشحن والملفات المرفقة', icon: Boxes },
  { id: 'datasheets', name: 'ملفات الداتا شيت', desc: 'استعراض ومشاركة الكتالوجات والملفات الفنية', icon: FileSpreadsheet },
  { id: 'customers', name: 'العملاء والديون', desc: 'إدارة حسابات العملاء وتسجيل الديون والدفعات', icon: Users },
  { id: 'expenses', name: 'المصروفات التشغيلية', desc: 'تسجيل النفقات والمصاريف وتصنيفاتها', icon: TrendingDown },
  { id: 'exchange-rates', name: 'سجل سعر الصرف', desc: 'متابعة تغيرات أسعار العملات وتحديث سعر الصرف', icon: DollarSign },
  { id: 'users', name: 'الموظفين والمستخدمين', desc: 'إدارة حسابات الكادر، الرواتب، الإجازات وأوقات الدوام', icon: UserCog },
  { id: 'settings', name: 'إعدادات النظام', desc: 'التحكم بقواعد العمل، الطباعة، والصلاحيات', icon: SettingsIcon },
];

const AVAILABLE_ACTIONS = [
  { 
    key: 'pos_edit_price' as keyof RoleActionPermissions, 
    title: 'تعديل أسعار المنتجات عند البيع', 
    desc: 'السماح للموظف بتحديد وتعديل سعر القطعة يدوياً أثناء البيع في الـ POS ونافذة الدفع' 
  },
  { 
    key: 'pos_apply_discount' as keyof RoleActionPermissions, 
    title: 'تطبيق خصومات على الفاتورة', 
    desc: 'إمكانية إدخال خصم مبلغ ثابت أو نسبة مئوية على إجمالي الفاتورة' 
  },
  { 
    key: 'inventory_edit' as keyof RoleActionPermissions, 
    title: 'إدارة وتعديل المخزون والمنتجات', 
    desc: 'صلاحية إضافة أصناف جديدة، تعديل كميات المستودع والأسعار، وحذف المنتجات' 
  },
  { 
    key: 'orders_delete' as keyof RoleActionPermissions, 
    title: 'إلغاء وحذف الفواتير المسجلة', 
    desc: 'السماح بإلغاء أو حذف الطلبات السابقة وإرجاع المنتجات للمخزون' 
  },
  { 
    key: 'view_profits' as keyof RoleActionPermissions, 
    title: 'الاطلاع على أرباح المبيعات وهامش الربح', 
    desc: 'إظهار مؤشرات الأرباح وصافي الدخل في التقارير وسجل الطلبات' 
  },
];

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'POS' | 'ROLES'>('POS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General Settings State
  const [settings, setSettings] = useState<SettingsState>({
    exchange_rate: '13800',
    pos_default_currency: 'USD',
    pos_default_payment: 'CASH',
    pos_allow_negative_stock: false,
    pos_low_stock_threshold: 5,
    receipt_auto_print: false,
    receipt_paper_size: '80mm',
    receipt_show_dual_currency: true,
    receipt_footer_note: 'شكراً لتعاملكم مع Prince Pro Lux - البضاعة المباعة تستبدل خلال 3 أيام بشرط وجود الفاتورة وبحالتها الأصلية',
    syp_rounding_rule: '500',
    sound_effects_enabled: true,
    confirm_order_cancel: true,
    cart_autosave: true,
  });

  // Roles & Permissions State
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('ADMIN');
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchRoles();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      const data = res.data;
      setSettings({
        exchange_rate: String(data.exchangeRate || 13800),
        pos_default_currency: data.posDefaultCurrency || 'USD',
        pos_default_payment: data.posDefaultPayment || 'CASH',
        pos_allow_negative_stock: Boolean(data.posAllowNegativeStock),
        pos_low_stock_threshold: Number(data.posLowStockThreshold ?? 5),
        receipt_auto_print: Boolean(data.receiptAutoPrint),
        receipt_paper_size: data.receiptPaperSize || '80mm',
        receipt_show_dual_currency: data.receiptShowDualCurrency !== false,
        receipt_footer_note: data.receiptFooterNote || 'شكراً لتعاملكم مع Prince Pro Lux - البضاعة المباعة تستبدل خلال 3 أيام بشرط وجود الفاتورة وبحالتها الأصلية',
        syp_rounding_rule: data.sypRoundingRule || '500',
        sound_effects_enabled: data.soundEffectsEnabled !== false,
        confirm_order_cancel: data.confirmOrderCancel !== false,
        cart_autosave: data.cartAutosave !== false,
      });
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/settings/roles-permissions');
      if (res.data?.roles) {
        setRoles(res.data.roles);
        if (!selectedRoleId && res.data.roles.length > 0) {
          setSelectedRoleId(res.data.roles[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load roles and permissions', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/settings', {
        exchangeRate: Number(settings.exchange_rate),
        posDefaultCurrency: settings.pos_default_currency,
        posDefaultPayment: settings.pos_default_payment,
        posAllowNegativeStock: settings.pos_allow_negative_stock,
        posLowStockThreshold: Number(settings.pos_low_stock_threshold),
        receiptAutoPrint: settings.receipt_auto_print,
        receiptPaperSize: settings.receipt_paper_size,
        receiptShowDualCurrency: settings.receipt_show_dual_currency,
        receiptFooterNote: settings.receipt_footer_note,
        sypRoundingRule: settings.syp_rounding_rule,
        soundEffectsEnabled: settings.sound_effects_enabled,
        confirmOrderCancel: settings.confirm_order_cancel,
        cartAutosave: settings.cart_autosave,
      });

      localStorage.setItem('prince_pos_currency', settings.pos_default_currency);
      localStorage.setItem('prince_receipt_size', settings.receipt_paper_size);
      localStorage.setItem('prince_sound_fx', settings.sound_effects_enabled ? '1' : '0');

      setMessage({ type: 'success', text: 'تم حفظ كافة إعدادات النظام بنجاح' });
      setTimeout(() => setMessage(null), 3500);
      fetchSettings();
    } catch (err) {
      console.error('Save settings error', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة ثانيةً' });
    } finally {
      setSaving(false);
    }
  };

  // ── Roles & Permissions Handlers ──
  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoleName.trim();
    if (!trimmed) return;

    const roleId = 'ROLE_' + Date.now();
    const newRole: RoleDefinition = {
      id: roleId,
      name: trimmed,
      description: `مسمى وظيفي مخصص (${trimmed})`,
      is_system: false,
      allowed_pages: ['sales', 'orders'],
      actions: {
        pos_edit_price: false,
        pos_apply_discount: false,
        inventory_edit: false,
        orders_delete: false,
        view_profits: false,
      }
    };

    setRoles([...roles, newRole]);
    setSelectedRoleId(roleId);
    setNewRoleName('');
    setMessage({ type: 'success', text: `تمت إضافة المسمى "${trimmed}". اضغط "حفظ الصلاحيات" لتأكيد التغييرات.` });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDeleteRole = (id: string) => {
    const roleToDelete = roles.find(r => r.id === id);
    if (!roleToDelete || roleToDelete.is_system || roleToDelete.id === 'ADMIN') {
      alert('لا يمكن حذف المسمى النظامي الأساسي.');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف المسمى الوظيفي "${roleToDelete.name}"؟`)) {
      const updated = roles.filter(r => r.id !== id);
      setRoles(updated);
      setSelectedRoleId('ADMIN');
      setMessage({ type: 'success', text: `تم حذف المسمى "${roleToDelete.name}". اضغط "حفظ الصلاحيات" لتأكيد الحذف.` });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleTogglePage = (pageId: string) => {
    const selectedRole = roles.find(r => r.id === selectedRoleId);
    if (!selectedRole || selectedRole.id === 'ADMIN') return;

    const currentPages = selectedRole.allowed_pages || [];
    const isAllowed = currentPages.includes(pageId);
    const newPages = isAllowed 
      ? currentPages.filter(p => p !== pageId)
      : [...currentPages, pageId];

    setRoles(roles.map(r => r.id === selectedRoleId ? { ...r, allowed_pages: newPages } : r));
  };

  const handleToggleAction = (actionKey: keyof RoleActionPermissions) => {
    const selectedRole = roles.find(r => r.id === selectedRoleId);
    if (!selectedRole || selectedRole.id === 'ADMIN') return;

    const currentActions = selectedRole.actions || {
      pos_edit_price: false,
      pos_apply_discount: false,
      inventory_edit: false,
      orders_delete: false,
      view_profits: false,
    };

    const newActions = {
      ...currentActions,
      [actionKey]: !currentActions[actionKey]
    };

    setRoles(roles.map(r => r.id === selectedRoleId ? { ...r, actions: newActions } : r));
  };

  const handleUpdateRoleMeta = (field: 'name' | 'description', val: string) => {
    setRoles(roles.map(r => r.id === selectedRoleId ? { ...r, [field]: val } : r));
  };

  const handleSaveRoles = async () => {
    setSavingRoles(true);
    setMessage(null);
    try {
      await api.put('/settings/roles-permissions', { roles });
      setMessage({ type: 'success', text: 'تم حفظ كافة المسميات الوظيفية والصلاحيات بنجاح' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Save roles error', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الصلاحيات، يرجى المحاولة ثانيةً' });
    } finally {
      setSavingRoles(false);
    }
  };

  const currentRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground">جاري تحميل إعدادات النظام...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-28">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm">
            <SlidersHorizontal className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">إعدادات النظام</h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium">
              التحكم في قواعد نقطة البيع (POS)، خيارات الفواتير والطباعة، وإدارة المسميات والصلاحيات
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { fetchSettings(); fetchRoles(); }}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary transition-all flex items-center gap-2 border border-border/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث الإعدادات
        </button>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex bg-secondary/30 p-1.5 rounded-2xl border border-border/60 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('POS')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 ${
            activeTab === 'POS'
              ? 'bg-background text-foreground shadow-sm border border-border/40'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-primary" />
          <span>إعدادات المتجر ونقاط البيع</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ROLES')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 ${
            activeTab === 'ROLES'
              ? 'bg-background text-foreground shadow-sm border border-border/40'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="w-4 h-4 text-primary" />
          <span>المسميات الوظيفية وتحديد الصلاحيات</span>
        </button>
      </div>

      {/* Notification Toast */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 shadow-lg ${
          message.type === 'success' 
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p className="font-bold text-sm">{message.text}</p>
        </div>
      )}

      {/* TAB 1: General POS & Store Settings */}
      {activeTab === 'POS' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1. POS Operations Card */}
            <div className="vercel-card space-y-5 border border-border/60 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
                <div className="p-1.5 bg-primary/10 rounded-xl text-primary">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">إعدادات نقطة البيع والمبيعات (POS)</h3>
                  <p className="text-[11px] text-muted-foreground">تخصيص سلوك الكاشير وتسهيل تجربة البيع السريع</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Default Currency */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">العملة الافتراضية عند البيع</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pos_default_currency: 'USD' })}
                      className={`h-11 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 border ${
                        settings.pos_default_currency === 'USD'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      دولار ($ USD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pos_default_currency: 'SYP' })}
                      className={`h-11 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 border ${
                        settings.pos_default_currency === 'SYP'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      ليرة (SYP)
                    </button>
                  </div>
                </div>

                {/* Default Payment Method */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">طريقة الدفع الافتراضية</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pos_default_payment: 'CASH' })}
                      className={`h-11 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border ${
                        settings.pos_default_payment === 'CASH'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary'
                      }`}
                    >
                      نقدي (كاش)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pos_default_payment: 'DEBT' })}
                      className={`h-11 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border ${
                        settings.pos_default_payment === 'DEBT'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary'
                      }`}
                    >
                      آجل (دين)
                    </button>
                  </div>
                </div>

                {/* Low Stock Threshold */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">حد التنبيه بنقص المخزون</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={settings.pos_low_stock_threshold}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setSettings({ ...settings, pos_low_stock_threshold: Number(val || 0) });
                      }}
                      className="vercel-input w-full h-11 pl-12 font-black"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      قطعة
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">تنبيه الكاشير عندما تصل الكمية المتوفرة إلى هذا العدد أو أقل.</p>
                </div>

                {/* Allow Negative Stock Toggle */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">البيع عند نفاذ المخزون</label>
                  <div 
                    onClick={() => setSettings({ ...settings, pos_allow_negative_stock: !settings.pos_allow_negative_stock })}
                    className={`h-11 px-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      settings.pos_allow_negative_stock
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400'
                        : 'bg-secondary/30 border-border/60 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xs font-bold">
                      {settings.pos_allow_negative_stock ? 'مسموح بالبيع (رصيد سالب)' : 'غير مسموح (إيقاف البيع)'}
                    </span>
                    <RTLSwitch
                      checked={settings.pos_allow_negative_stock}
                      onChange={() => setSettings({ ...settings, pos_allow_negative_stock: !settings.pos_allow_negative_stock })}
                      activeColor="bg-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">منع أو إتاحة إتمام الطلبات في حال كانت الكمية بالمستودع صفراً.</p>
                </div>
              </div>
            </div>

            {/* 2. Receipts & Printing Settings Card */}
            <div className="vercel-card space-y-5 border border-border/60 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
                <div className="p-1.5 bg-blue-500/10 rounded-xl text-blue-600">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">إعدادات الفواتير والطباعة</h3>
                  <p className="text-[11px] text-muted-foreground">تخصيص شكل وحجم الإيصال المطبوع للزبون ومحتواه</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Paper Size */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">قياس ورق الفاتورة الافتراضي</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '80mm', label: 'حراري 80mm' },
                      { id: '58mm', label: 'حراري 58mm' },
                      { id: 'A4', label: 'عادي A4' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, receipt_paper_size: opt.id as any })}
                        className={`h-11 rounded-xl font-bold text-xs transition-all border ${
                          settings.receipt_paper_size === opt.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Print Toggle */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">الطباعة التلقائية بعد البيع</label>
                  <div 
                    onClick={() => setSettings({ ...settings, receipt_auto_print: !settings.receipt_auto_print })}
                    className={`h-11 px-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      settings.receipt_auto_print
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-400'
                        : 'bg-secondary/30 border-border/60 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xs font-bold">
                      {settings.receipt_auto_print ? 'مفعلة (طباعة فورية)' : 'معطلة (طباعة يدوية)'}
                    </span>
                    <RTLSwitch
                      checked={settings.receipt_auto_print}
                      onChange={() => setSettings({ ...settings, receipt_auto_print: !settings.receipt_auto_print })}
                      activeColor="bg-blue-600"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">فتح شاشة الطباعة فوراً بعد الضغط على تأكيد الطلب.</p>
                </div>

                {/* Show Dual Currency on Receipt */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">عرض السعرين معاً</label>
                  <div 
                    onClick={() => setSettings({ ...settings, receipt_show_dual_currency: !settings.receipt_show_dual_currency })}
                    className={`h-11 px-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      settings.receipt_show_dual_currency
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-secondary/30 border-border/60 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xs font-bold">
                      {settings.receipt_show_dual_currency ? 'إظهار السعر بالدولار والليرة السورية معاً' : 'إظهار العملة المحددة فقط'}
                    </span>
                    <RTLSwitch
                      checked={settings.receipt_show_dual_currency}
                      onChange={() => setSettings({ ...settings, receipt_show_dual_currency: !settings.receipt_show_dual_currency })}
                      activeColor="bg-primary"
                    />
                  </div>
                </div>

                {/* Footer Note */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">الملاحظة التذييلية للفاتورة (Footer Note)</label>
                  <textarea
                    rows={2}
                    value={settings.receipt_footer_note}
                    onChange={e => setSettings({ ...settings, receipt_footer_note: e.target.value })}
                    className="vercel-input w-full p-3 font-medium text-xs leading-relaxed resize-none rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* 3. Currency & Exchange Rates Card */}
            <div className="vercel-card space-y-5 border border-border/60 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
                <div className="p-1.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">قواعد العملات وأسعار الصرف</h3>
                  <p className="text-[11px] text-muted-foreground">تحديد سعر الصرف المعتمد وقواعد تقريب المبالغ بالليرة السورية</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">سعر صرف الدولار الحالي (ل.س)</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={settings.exchange_rate}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setSettings({ ...settings, exchange_rate: val });
                      }}
                      className="vercel-input w-full h-11 pl-16 font-black text-base text-emerald-600"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      ل.س
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-muted-foreground uppercase">قاعدة تقريب كسور الليرة السورية</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'none', label: 'بدون تقريب' },
                      { id: '100', label: 'لأقرب 100' },
                      { id: '500', label: 'لأقرب 500' },
                      { id: '1000', label: 'لأقرب 1,000' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, syp_rounding_rule: opt.id as any })}
                        className={`h-11 rounded-xl font-bold text-xs transition-all border ${
                          settings.syp_rounding_rule === opt.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Experience & Safety Card */}
            <div className="vercel-card space-y-5 border border-border/60 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border/50">
                <div className="p-1.5 bg-purple-500/10 rounded-xl text-purple-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">تجربة الاستخدام والأمان</h3>
                  <p className="text-[11px] text-muted-foreground">تخصيص التنبيهات وحماية عمليات البيع من الإلغاء العرضي</p>
                </div>
              </div>

              <div className="space-y-3">
                <div 
                  onClick={() => setSettings({ ...settings, sound_effects_enabled: !settings.sound_effects_enabled })}
                  className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs font-black text-foreground">المؤثرات الصوتية عند البيع</p>
                      <p className="text-[10px] text-muted-foreground">تشغيل نغمة تأكيد لطيفة عند مسح الباركود وإتمام البيع بنجاح.</p>
                    </div>
                  </div>
                  <RTLSwitch
                    checked={settings.sound_effects_enabled}
                    onChange={() => setSettings({ ...settings, sound_effects_enabled: !settings.sound_effects_enabled })}
                    activeColor="bg-purple-600"
                  />
                </div>

                <div 
                  onClick={() => setSettings({ ...settings, confirm_order_cancel: !settings.confirm_order_cancel })}
                  className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs font-black text-foreground">تأكيد قبل إلغاء الطلب أو تفريغ السلة</p>
                      <p className="text-[10px] text-muted-foreground">إظهار نافذة تأكيد تحذيرية لحماية الكاشير من مسح الطلبات بالخطأ.</p>
                    </div>
                  </div>
                  <RTLSwitch
                    checked={settings.confirm_order_cancel}
                    onChange={() => setSettings({ ...settings, confirm_order_cancel: !settings.confirm_order_cancel })}
                    activeColor="bg-purple-600"
                  />
                </div>

                <div 
                  onClick={() => setSettings({ ...settings, cart_autosave: !settings.cart_autosave })}
                  className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Save className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-xs font-black text-foreground">الحفظ التلقائي لمسودة السلة (Cart Autosave)</p>
                      <p className="text-[10px] text-muted-foreground">استعادة محتويات السلة تلقائياً في حال انقطاع التصفح أو تحديث الصفحة.</p>
                    </div>
                  </div>
                  <RTLSwitch
                    checked={settings.cart_autosave}
                    onChange={() => setSettings({ ...settings, cart_autosave: !settings.cart_autosave })}
                    activeColor="bg-purple-600"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Save Action Bar */}
          <div className="p-4 rounded-2xl bg-secondary/20 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-right">
              <p className="text-xs font-black text-foreground">Prince Pro Lux POS Settings</p>
              <p className="text-[10px] text-muted-foreground">يتم حفظ هذه التفضيلات وتطبيقها فوراً على واجهة الكاشير ونظام الطباعة</p>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full sm:w-auto min-w-[220px] vercel-button bg-primary text-primary-foreground h-13 px-8 text-base font-black shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري حفظ الإعدادات...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>حفظ كافة التغييرات</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Roles & Permissions Manager */}
      {activeTab === 'ROLES' && (
        <div className="space-y-6">

          {/* Top Intro Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-black text-sm text-foreground">إدارة المسميات الوظيفية وتحديد الصلاحيات</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                أنت تملك التحكم الكامل بإنشاء مسميات وتصنيفات وظيفية جديدة، واختيار الصفحات المسموح بظهورها في القائمة الجانبية لكل مسمى، بالإضافة لتحديد الصلاحيات الحساسة كـ تعديل الأسعار وتطبيق الخصومات.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveRoles}
              disabled={savingRoles}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              {savingRoles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ الصلاحيات والمسميات</span>
            </button>
          </div>

          {/* Section 1: Define / Add Roles (التصنيفات) */}
          <div className="vercel-card space-y-4 border border-border/60 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-primary" />
                  <span>المسميات الوظيفية (التصنيفات)</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">اختر المسمى الوظيفي لتعديل صلاحياته، أو أضف مسمى جديداً للنظام</p>
              </div>

              {/* Add New Role Form */}
              <form onSubmit={handleAddRole} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="اسم المسمى الجديد (مثال: مشرف مبيعات)..."
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="vercel-input h-10 px-3 text-xs w-56 font-bold"
                />
                <button
                  type="submit"
                  disabled={!newRoleName.trim()}
                  className="h-10 px-4 bg-primary text-primary-foreground rounded-xl text-xs font-black hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </form>
            </div>

            {/* Roles Chips / Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {roles.map(role => {
                const isSelected = role.id === selectedRoleId;
                const isAdminRole = role.id === 'ADMIN';

                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-md'
                        : 'bg-secondary/30 border-border/60 hover:bg-secondary/60 hover:border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {role.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-foreground leading-tight line-clamp-1">{role.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {role.allowed_pages.length} صفحات متاحة
                          </p>
                        </div>
                      </div>

                      {isAdminRole ? (
                        <span className="p-1 bg-amber-500/10 text-amber-600 rounded-lg" title="مدير النظام الرئيسي">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      ) : !role.is_system && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteRole(role.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="حذف هذا المسمى"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground pt-1 border-t border-border/30">
                      <span>{isAdminRole ? 'نظامي (ثابت)' : role.is_system ? 'افتراضي' : 'مخصص'}</span>
                      {isSelected && <span className="text-primary font-black">نشط للتعديل ✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Selected Role Permissions Inspector */}
          {currentRole && (
            <div className="space-y-6">

              {/* Selected Role Meta Header */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-black">
                      {currentRole.id === 'ADMIN' ? 'مدير النظام (كامل الصلاحيات)' : 'تعديل الصلاحيات'}
                    </span>
                    {currentRole.id !== 'ADMIN' && (
                      <input
                        type="text"
                        value={currentRole.name}
                        onChange={e => handleUpdateRoleMeta('name', e.target.value)}
                        className="vercel-input h-9 px-3 text-sm font-black w-60"
                        placeholder="اسم المسمى الوظيفي"
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    value={currentRole.description}
                    onChange={e => handleUpdateRoleMeta('description', e.target.value)}
                    disabled={currentRole.id === 'ADMIN'}
                    className="vercel-input h-8 px-3 text-xs w-full max-w-lg text-muted-foreground"
                    placeholder="وصف مختصر للمسمى الوظيفي..."
                  />
                </div>

                {currentRole.id === 'ADMIN' && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-500/20">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>حساب مدير النظام يملك وصولاً كاملاً وغير مقيد لجميع أقسام وعمليات النظام.</span>
                  </div>
                )}
              </div>

              {/* Part A: Allowed Sidebar Navigation Pages (10 Pages) */}
              <div className="vercel-card space-y-4 border border-border/60 shadow-sm">
                <div className="pb-3 border-b border-border/50">
                  <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    <span>الصفحات المسموحة في القائمة الجانبية (10 صفحات)</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    حدد أي الصفحات تظهر في القائمة الجانبية لهذا المسمى الوظيفي. الصفحات غير المحددة ستختفي تماماً وتُحظر.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {AVAILABLE_PAGES.map(page => {
                    const PageIcon = page.icon;
                    const isAllowed = currentRole.id === 'ADMIN' || (currentRole.allowed_pages || []).includes(page.id);
                    const isLocked = currentRole.id === 'ADMIN';

                    return (
                      <div
                        key={page.id}
                        onClick={() => !isLocked && handleTogglePage(page.id)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isLocked
                            ? 'bg-secondary/40 border-border/60 cursor-default'
                            : isAllowed
                              ? 'bg-primary/5 border-primary/40 cursor-pointer hover:bg-primary/10'
                              : 'bg-secondary/20 border-border/40 cursor-pointer hover:bg-secondary/40 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                            isAllowed ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'
                          }`}>
                            <PageIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-foreground truncate">{page.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{page.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-bold ${isAllowed ? 'text-primary' : 'text-muted-foreground'}`}>
                            {isAllowed ? 'متاحة' : 'محظورة'}
                          </span>
                          <RTLSwitch
                            checked={isAllowed}
                            onChange={() => handleTogglePage(page.id)}
                            disabled={isLocked}
                            activeColor="bg-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Part B: Sensitive Action Permissions (5 Actions) */}
              <div className="vercel-card space-y-4 border border-border/60 shadow-sm">
                <div className="pb-3 border-b border-border/50">
                  <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>صلاحيات العمليات الحساسة والإجراءات المالية</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    التحكم في العمليات الدقيقة مثل تعديل أسعار البيع، الخصومات، تعديل المخزون، وحذف الطلبات.
                  </p>
                </div>

                <div className="space-y-3">
                  {AVAILABLE_ACTIONS.map(action => {
                    const isGranted = currentRole.id === 'ADMIN' || Boolean(currentRole.actions?.[action.key]);
                    const isLocked = currentRole.id === 'ADMIN';

                    return (
                      <div
                        key={action.key}
                        onClick={() => !isLocked && handleToggleAction(action.key)}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                          isLocked
                            ? 'bg-secondary/40 border-border/60 cursor-default'
                            : isGranted
                              ? 'bg-purple-500/5 border-purple-500/40 cursor-pointer hover:bg-purple-500/10'
                              : 'bg-secondary/20 border-border/40 cursor-pointer hover:bg-secondary/40 opacity-75'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-black text-foreground flex items-center gap-2">
                            <span>{action.title}</span>
                            {action.key === 'pos_edit_price' && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] font-bold">
                                خاص بالـ POS
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{action.desc}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-bold ${isGranted ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`}>
                            {isGranted ? 'مسموح' : 'ممنوع'}
                          </span>
                          <RTLSwitch
                            checked={isGranted}
                            onChange={() => handleToggleAction(action.key)}
                            disabled={isLocked}
                            activeColor="bg-purple-600"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Save Bar for Roles */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-right">
                  <p className="text-xs font-black text-foreground">حفظ صلاحيات المسمى: {currentRole.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    سيتم تطبيق هذه الصلاحيات فورياً على جميع الموظفين المسند إليهم هذا المسمى الوظيفي
                  </p>
                </div>

                <button 
                  type="button" 
                  onClick={handleSaveRoles}
                  disabled={savingRoles}
                  className="w-full sm:w-auto min-w-[240px] vercel-button bg-primary text-primary-foreground h-13 px-8 text-base font-black shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 rounded-xl"
                >
                  {savingRoles ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري حفظ الصلاحيات...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>حفظ الصلاحيات والمسميات</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default SettingsPage;
