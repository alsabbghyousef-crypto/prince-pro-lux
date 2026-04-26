import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, DollarSign, Calculator, Wallet, CheckCircle2, AlertCircle, Package, TrendingUp } from 'lucide-react';
import api from '../services/api';

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [settings, setSettings] = useState({
    exchange_rate: '0',
    treasury_usd: '0',
    treasury_syp: '0',
    app_name: 'Prince Pro Lux',
    cogs_percent: '45',
    tax_percent: '0',
    address: '',
    phone: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setSettings({
        exchange_rate: String(res.data.exchangeRate || 15000),
        treasury_usd: String(res.data.treasury?.usd || 0),
        treasury_syp: String(res.data.treasury?.syp || 0),
        app_name: res.data.appName || 'Prince Pro Lux',
        cogs_percent: String(res.data.cogsPercent || 45),
        tax_percent: String(res.data.taxPercent || 0),
        address: res.data.address || '',
        phone: res.data.phone || '',
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
        appName: settings.app_name,
        cogsPercent: Number(settings.cogs_percent),
        taxPercent: Number(settings.tax_percent),
        address: settings.address,
        phone: settings.phone
      });
      setMessage({ type: 'success', text: 'تم حفظ جميع الإعدادات بنجاح' });
      setTimeout(() => setMessage(null), 3000);
      fetchSettings();
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل في حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">إعدادات النظام</h1>
          <p className="text-muted-foreground text-sm font-medium">إدارة القيم المالية وقواعد العمل والبيانات الأساسية</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-bold">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Exchange Rate Card */}
            <div className="vercel-card space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider">سعر الصرف والضريبة</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase">سعر الدولار (ل.س)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={settings.exchange_rate}
                      onChange={e => setSettings({...settings, exchange_rate: e.target.value})}
                      className="vercel-input w-full h-11 pr-10 font-black" 
                      required
                    />
                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase">نسبة الضريبة المضافة (%)</label>
                  <input 
                    type="number" 
                    value={settings.tax_percent}
                    onChange={e => setSettings({...settings, tax_percent: e.target.value})}
                    className="vercel-input w-full h-11 font-bold" 
                  />
                </div>
              </div>
            </div>

            {/* P&L Rules Card */}
            <div className="vercel-card space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm uppercase tracking-wider">قواعد الأرباح والخسائر</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase">نسبة التكلفة الافتراضية (COGS %)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={settings.cogs_percent}
                      onChange={e => setSettings({...settings, cogs_percent: e.target.value})}
                      className="vercel-input w-full h-11 font-black" 
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                  * هذه النسبة تُستخدم في التقارير لتقدير تكلفة المواد في حال عدم وجود وصفات دقيقة.
                </p>
              </div>
            </div>

            {/* Business Info Card */}
            <div className="vercel-card md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider">معلومات المنشأة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">اسم المنشأة / التطبيق</label>
                  <input 
                    type="text" 
                    value={settings.app_name}
                    onChange={e => setSettings({...settings, app_name: e.target.value})}
                    className="vercel-input w-full h-11 font-bold" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">رقم الهاتف</label>
                  <input 
                    type="text" 
                    value={settings.phone}
                    onChange={e => setSettings({...settings, phone: e.target.value})}
                    className="vercel-input w-full h-11 font-bold" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">العنوان</label>
                  <input 
                    type="text" 
                    value={settings.address}
                    onChange={e => setSettings({...settings, address: e.target.value})}
                    className="vercel-input w-full h-11 font-bold" 
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Treasury Sidebar */}
        <div className="space-y-6">
          <div className="vercel-card space-y-6 bg-secondary/10 border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-wider">أرصدة الخزينة الحالية</h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase">الليرة السورية (SYP)</label>
              <div className="text-2xl font-black text-emerald-600">
                {new Intl.NumberFormat('en-US').format(Number(settings.treasury_syp))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase">الدولار الأمريكي (USD)</label>
              <div className="text-2xl font-black text-blue-600">
                ${new Intl.NumberFormat('en-US').format(Number(settings.treasury_usd))}
              </div>
            </div>

            <div className="p-4 bg-background/50 rounded-2xl border border-border/50">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground italic">ملاحظة:</span> يتم حساب الأرصدة تلقائياً بناءً على العمليات المسجلة.
              </p>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full vercel-button bg-primary text-primary-foreground h-14 text-lg font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            حفظ كل التغييرات
          </button>
        </div>

      </form>
    </div>
  );
};

export default SettingsPage;
