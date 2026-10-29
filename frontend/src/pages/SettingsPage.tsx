import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Loader2, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingCart, 
  Printer, 
  ShieldCheck, 
  Volume2, 
  Coins, 
  FileText, 
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

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

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    fetchSettings();
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

  const handleSave = async (e: React.FormEvent) => {
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

      // Also persist POS client-side settings to localStorage for immediate effect
      localStorage.setItem('prince_pos_currency', settings.pos_default_currency);
      localStorage.setItem('prince_receipt_size', settings.receipt_paper_size);
      localStorage.setItem('prince_sound_fx', settings.sound_effects_enabled ? '1' : '0');

      setMessage({ type: 'success', text: 'تم حفظ كافة الإعدادات بنجاح' });
      setTimeout(() => setMessage(null), 3500);
      fetchSettings();
    } catch (err) {
      console.error('Save settings error', err);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة ثانيةً' });
    } finally {
      setSaving(false);
    }
  };

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
              التحكم في قواعد نقطة البيع (POS)، خيارات الفواتير والطباعة، وضبط أسعار الصرف
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary transition-all flex items-center gap-2 border border-border/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث الإعدادات
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

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Modern 2-Column Grid of Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. POS & Sales Operations Card */}
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
                    <DollarSign className="w-3.5 h-3.5" />
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

              {/* Low Stock Alert Threshold */}
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
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${settings.pos_allow_negative_stock ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.pos_allow_negative_stock ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
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
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${settings.receipt_auto_print ? 'bg-blue-600' : 'bg-muted-foreground/30'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.receipt_auto_print ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">فتح شاشة الطباعة فوراً بعد الضغط على تأكيد الطلب.</p>
              </div>

              {/* Show Dual Currency on Receipt */}
              <div className="space-y-2">
                <div 
                  onClick={() => setSettings({ ...settings, receipt_show_dual_currency: !settings.receipt_show_dual_currency })}
                  className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-all"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-foreground">إظهار السعر بالدولار والليرة السورية معاً في الفاتورة</p>
                    <p className="text-[10px] text-muted-foreground">طباعة إجمالي الفاتورة بالعملتين لتسهيل المحاسبة مع الزبون.</p>
                  </div>
                  <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${settings.receipt_show_dual_currency ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.receipt_show_dual_currency ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </div>

              {/* Receipt Footer Note */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase">الملاحظة التذييلية للفاتورة (Footer Note)</label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={settings.receipt_footer_note}
                    onChange={e => setSettings({ ...settings, receipt_footer_note: e.target.value })}
                    className="vercel-input w-full p-3 font-medium text-xs leading-relaxed resize-none"
                    placeholder="نص يظهر في أسفل الفاتورة للزبون..."
                  />
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Currency & Exchange Rate Rules Card */}
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
              {/* Exchange Rate */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase">سعر صرف الدولار الحالي (ل.س)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={settings.exchange_rate}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setSettings({ ...settings, exchange_rate: val });
                    }}
                    className="vercel-input w-full h-11 pr-10 font-black text-base text-emerald-600 dark:text-emerald-400"
                    required
                  />
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[10px] text-muted-foreground">السعر المعتمد تلقائياً في نقطة البيع وحسابات الديون.</p>
              </div>

              {/* SYP Rounding Rule */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase">قاعدة تقريب الليرة السورية</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: '500', label: 'لأقرب 500 ل.س' },
                    { id: '1000', label: 'لأقرب 1,000 ل.س' },
                    { id: '100', label: 'لأقرب 100 ل.س' },
                    { id: 'none', label: 'بدون تقريب' },
                  ].map(rule => (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, syp_rounding_rule: rule.id as any })}
                      className={`h-11 rounded-xl font-bold text-xs transition-all border ${
                        settings.syp_rounding_rule === rule.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary'
                      }`}
                    >
                      {rule.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Experience & Security Card */}
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
              {/* Sound Effects */}
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
                <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${settings.sound_effects_enabled ? 'bg-purple-600' : 'bg-muted-foreground/30'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.sound_effects_enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>

              {/* Confirm Order Cancel */}
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
                <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${settings.confirm_order_cancel ? 'bg-purple-600' : 'bg-muted-foreground/30'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.confirm_order_cancel ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </div>

              {/* Cart Autosave */}
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
                <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${settings.cart_autosave ? 'bg-purple-600' : 'bg-muted-foreground/30'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.cart_autosave ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
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
    </div>
  );
};

export default SettingsPage;
