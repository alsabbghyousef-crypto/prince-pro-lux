import SearchableSelect from '../components/ui/SearchableSelect';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, FileText, Search, Printer, Loader2 } from 'lucide-react';
import ModalPortal from '../components/ui/ModalPortal';
import api from '../services/api';

export default function FinancialReport({ onClose }: { onClose?: () => void }) {
  const [scope, setScope] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [currency, setCurrency] = useState<'syp' | 'usd' | 'both'>('syp');
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [refDate, setRefDate] = useState(todayStr);

  const { data, isLoading } = useQuery({
    queryKey: ['revenue-stream-v3', scope, refDate],
    queryFn: async () => (await api.get(`/revenue-stream?scope=${scope}&date=${refDate}`)).data
  });

  const allRecords = data?.records || [];
  
  const filteredRecords = useMemo(() => {
    return allRecords.filter((r: any) => {
      const matchesSearch = r.details.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || r.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [allRecords, searchQuery, selectedType]);

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<number | null>(null);

  const handleViewInvoice = async (orderId: number) => {
    try {
      setLoadingInvoiceId(orderId);
      const res = await api.get(`/orders/${orderId}`);
      setSelectedInvoice(res.data);
    } catch (err) {
      console.error('Error fetching order invoice:', err);
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const metrics = data?.metrics || { 
    syp: { total_revenue: 0, total_expense: 0, total_cost: 0, net_profit: 0, total_cash_in: 0, total_cash_out: 0, total_customer_debt: 0, period_debt: 0 },
    usd: { total_revenue: 0, total_expense: 0, total_cost: 0, net_profit: 0, total_cash_in: 0, total_cash_out: 0, total_customer_debt: 0, period_debt: 0 }
  };

  const handlePrev = () => {
    const d = new Date(refDate);
    if (scope === 'daily') d.setDate(d.getDate() - 1);
    if (scope === 'weekly') d.setDate(d.getDate() - 7);
    if (scope === 'monthly') d.setMonth(d.getMonth() - 1);
    if (scope === 'yearly') d.setFullYear(d.getFullYear() - 1);
    setRefDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const handleNext = () => {
    const d = new Date(refDate);
    if (scope === 'daily') d.setDate(d.getDate() + 1);
    if (scope === 'weekly') d.setDate(d.getDate() + 7);
    if (scope === 'monthly') d.setMonth(d.getMonth() + 1);
    if (scope === 'yearly') d.setFullYear(d.getFullYear() + 1);
    setRefDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const formatMoney = (valSyp: number, valUsd: number) => {
    if (currency === 'syp') return `${Number(valSyp).toLocaleString()} ل.س`;
    if (currency === 'usd') return `$${Number(valUsd).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    return `${Number(valSyp).toLocaleString()} ل.س | $${Number(valUsd).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };
  
  const formatMoneySigned = (valSyp: number, valUsd: number) => {
    const sign = valSyp > 0 ? '+' : (valSyp < 0 ? '-' : '');
    const absSyp = Math.abs(valSyp);
    const absUsd = Math.abs(valUsd);
    
    if (currency === 'syp') return `${sign}${Number(absSyp).toLocaleString()} ل.س`;
    if (currency === 'usd') return `${sign}$${Number(absUsd).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    return `${sign}${Number(absSyp).toLocaleString()} ل.س | ${sign}$${Number(absUsd).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  // Compute subtotals for footer based on filteredRecords
  const footerTotals = useMemo(() => {
    return filteredRecords.reduce((acc: any, r: any) => {
      acc.revenue_syp += r.revenue_syp; acc.revenue_usd += r.revenue_usd;
      acc.cost_syp += r.cost_syp; acc.cost_usd += r.cost_usd;
      acc.profit_syp += r.profit_syp; acc.profit_usd += r.profit_usd;
      acc.cash_syp += r.cash_syp; acc.cash_usd += r.cash_usd;
      acc.debt_syp += r.debt_syp; acc.debt_usd += r.debt_usd;
      return acc;
    }, { revenue_syp:0, revenue_usd:0, cost_syp:0, cost_usd:0, profit_syp:0, profit_usd:0, cash_syp:0, cash_usd:0, debt_syp:0, debt_usd:0 });
  }, [filteredRecords]);

  return (
    <div className="bg-card text-foreground border border-border w-full max-w-[95vw] lg:max-w-[90vw] max-h-[95vh] overflow-y-auto rounded-[2rem] p-4 sm:p-8 shadow-2xl font-sans animate-in fade-in zoom-in-95 duration-300 print:shadow-none print:border-none print:p-0 print:overflow-visible" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8 relative print:mb-4">
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground absolute left-0 top-0 p-3 bg-secondary/30 rounded-full hover:bg-secondary transition-colors print:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
        <h1 className="text-3xl font-bold flex justify-center items-center gap-3">
          <FileText className="text-primary w-8 h-8 print:hidden" />
          التقرير المالي الشامل
        </h1>
        <p className="text-muted-foreground text-sm mt-3 font-medium">سجل الحركات المالية الموحد مع الأرباح ورأس المال</p>
      </div>

      {/* Global Filters & Actions */}
      <div className="bg-secondary/20 border border-border rounded-2xl p-4 flex flex-col xl:flex-row justify-between items-center gap-4 mb-8 print:hidden">
        
        {/* Scope Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <span className="text-sm font-bold text-muted-foreground w-full sm:w-auto text-right">النطاق</span>
          <div className="flex bg-background rounded-full p-1 w-full sm:w-auto border border-border shadow-sm">
            {[
              { id: 'daily', label: 'يومي' },
              { id: 'weekly', label: 'أسبوعي' },
              { id: 'monthly', label: 'شهري' },
              { id: 'yearly', label: 'سنوي' }
            ].map(p => (
              <button 
                key={p.id} 
                onClick={() => setScope(p.id as any)} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  scope === p.id 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Toggle */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <span className="text-sm font-bold text-muted-foreground w-full sm:w-auto text-right">العملة</span>
          <div className="flex bg-background rounded-full p-1 w-full sm:w-auto border border-border shadow-sm">
            {[
              { id: 'syp', label: 'ل.س' },
              { id: 'usd', label: 'USD' },
              { id: 'both', label: 'كلاهما' }
            ].map(p => (
              <button 
                key={p.id} 
                onClick={() => setCurrency(p.id as any)} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  currency === p.id 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <span className="text-sm font-bold text-muted-foreground w-full sm:w-auto text-right">
            <Calendar className="w-4 h-4 inline-block ml-1" /> المرجع
          </span>
          <div className="flex items-center bg-background rounded-xl border border-border w-full sm:w-auto overflow-hidden shadow-sm">
            <button onClick={handleNext} className="p-3 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-l border-border">
              <ChevronRight className="w-5 h-5" />
            </button>
            <input 
              type="date" 
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
              className="bg-transparent text-foreground px-4 py-2 font-black text-center outline-none w-full sm:w-auto"
            />
            <button onClick={handlePrev} className="p-3 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-r border-border">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button onClick={() => window.print()} className="w-full xl:w-auto vercel-button bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-sm">
          <FileText className="w-4 h-4" /> طباعة / PDF
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground font-bold animate-pulse">جاري سحب القيود المالية والمصاريف والديون...</div>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-background shadow-sm border-t-4 border-emerald-500 border-x border-b border-border rounded-2xl p-4 xl:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="text-emerald-600 text-xs font-bold mb-2">إجمالي الإيرادات</div>
              <div className="text-xl xl:text-2xl font-black text-foreground" dir="ltr">{formatMoney(metrics.syp.total_revenue, metrics.usd.total_revenue)}</div>
            </div>

            <div className="bg-background shadow-sm border-t-4 border-amber-500 border-x border-b border-border rounded-2xl p-4 xl:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="text-amber-600 text-xs font-bold mb-2">إجمالي رأس المال (التكلفة)</div>
              <div className="text-xl xl:text-2xl font-black text-foreground" dir="ltr">{formatMoney(metrics.syp.total_cost, metrics.usd.total_cost)}</div>
            </div>

            <div className="bg-background shadow-sm border-t-4 border-blue-500 border-x border-b border-border rounded-2xl p-4 xl:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="text-blue-600 text-xs font-bold mb-2">صافي الربح</div>
              <div className="text-xl xl:text-2xl font-black text-foreground" dir="ltr">{formatMoneySigned(metrics.syp.net_profit, metrics.usd.net_profit)}</div>
            </div>

            <div className="bg-background shadow-sm border-t-4 border-rose-500 border-x border-b border-border rounded-2xl p-4 xl:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="text-rose-600 text-xs font-bold mb-2">إجمالي المصاريف</div>
              <div className="text-xl xl:text-2xl font-black text-foreground" dir="ltr">{formatMoney(metrics.syp.total_expense, metrics.usd.total_expense)}</div>
            </div>

            <div className="bg-background shadow-sm border-t-4 border-primary border-x border-b border-border rounded-2xl p-4 xl:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="text-primary text-xs font-bold mb-2">حركة الصندوق (الكاش)</div>
              <div className="text-xl xl:text-2xl font-black text-foreground" dir="ltr">{formatMoneySigned(metrics.syp.total_cash_in - metrics.syp.total_cash_out, metrics.usd.total_cash_in - metrics.usd.total_cash_out)}</div>
            </div>

            <div className="bg-background shadow-sm border-t-4 border-purple-500 border-x border-b border-border rounded-2xl p-4 xl:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="text-purple-600 text-xs font-bold">إجمالي ديون العملاء</div>
                {(metrics.usd.period_debt > 0 || metrics.syp.period_debt > 0) && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600">
                    + ديون جديدة
                  </span>
                )}
              </div>
              <div className="text-xl xl:text-2xl font-black text-foreground" dir="ltr">
                {formatMoney(metrics.syp.total_customer_debt, metrics.usd.total_customer_debt)}
              </div>
              <div className="text-[11px] font-bold mt-1.5">
                {metrics.usd.total_customer_debt > 0 || metrics.syp.total_customer_debt > 0 ? (
                  <span className="text-rose-600">ذمم مدينة مستحقة التحصيل</span>
                ) : (
                  <span className="text-emerald-600">لا توجد ديون معلقة</span>
                )}
              </div>
            </div>
          </div>

          {/* Table Tools (Search & Filter) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 print:hidden">
            <div className="relative w-full sm:w-96">
              <input 
                type="text" 
                placeholder="ابحث عن فاتورة، عميل، أو مصروف..." 
                className="w-full h-11 bg-background border border-border rounded-xl px-12 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="w-5 h-5 absolute right-4 top-3 text-muted-foreground" />
            </div>
            
            <div className="w-full sm:w-auto flex items-center gap-2">
              <SearchableSelect
                options={[
                  { label: 'كافة الحركات المالية', value: 'all' },
                  { label: 'إيرادات المبيعات فقط', value: 'SALE' },
                  { label: 'المصاريف فقط', value: 'EXPENSE' },
                  { label: 'تسديدات الديون فقط', value: 'DEBT_PAYMENT' }
                ]}
                value={selectedType}
                onChange={(v) => setSelectedType(String(v))}
                className="w-full sm:w-64"
              />
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-background rounded-2xl overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-secondary/60 text-muted-foreground border-b border-border">
                    <th className="p-4 font-bold text-center w-12">#</th>
                    <th className="p-4 font-bold text-center">النوع</th>
                    <th className="p-4 font-bold">التاريخ</th>
                    <th className="p-4 font-bold">البيان</th>
                    <th className="p-4 font-bold">الإيراد</th>
                    <th className="p-4 font-bold">رأس المال (تكلفة)</th>
                    <th className="p-4 font-black text-blue-600">الربح/المصروف</th>
                    <th className="p-4 font-black text-center text-primary">تأثير الصندوق</th>
                    <th className="p-4 font-black text-center text-rose-500">تأثير الدين</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.map((r: any, i: number) => (
                    <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-4 text-center text-muted-foreground font-bold">{i + 1}</td>
                      <td className="p-4 text-center">
                        {r.type === 'SALE' && <span className="inline-block px-2 py-1 rounded-md text-[10px] font-black border border-emerald-500/30 text-emerald-700 bg-emerald-500/10">مبيعات</span>}
                        {r.type === 'EXPENSE' && <span className="inline-block px-2 py-1 rounded-md text-[10px] font-black border border-rose-500/30 text-rose-700 bg-rose-500/10">مصروف</span>}
                        {r.type === 'DEBT_PAYMENT' && <span className="inline-block px-2 py-1 rounded-md text-[10px] font-black border border-blue-500/30 text-blue-700 bg-blue-500/10">دفعة دين</span>}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs font-bold" dir="ltr">{r.date_string.split(' ')[0]}</td>
                                            <td className="p-4 font-black text-foreground">
                        {r.order_id ? (
                          <button
                            type="button"
                            onClick={() => handleViewInvoice(r.order_id)}
                            className="inline-flex items-center gap-2 group text-right hover:text-primary transition-colors focus:outline-none"
                            title="اضغط لعرض الفاتورة وتفاصيلها"
                          >
                            <span className="group-hover:underline underline-offset-4 font-black transition-all">
                              {r.details}
                            </span>
                            {loadingInvoiceId === r.order_id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all shrink-0" />
                            )}
                          </button>
                        ) : (
                          <span>{r.details}</span>
                        )}
                      </td>
                      
                      {/* Revenue */}
                      <td className="p-4 font-bold text-emerald-600" dir="ltr">
                        {r.revenue_syp > 0 || r.revenue_usd > 0 ? formatMoney(r.revenue_syp, r.revenue_usd) : '-'}
                      </td>
                      
                      {/* Cost */}
                      <td className="p-4 font-bold text-amber-600" dir="ltr">
                        {r.cost_syp > 0 || r.cost_usd > 0 ? formatMoney(r.cost_syp, r.cost_usd) : '-'}
                      </td>
                      
                      {/* Profit */}
                      <td className={`p-4 font-black ${r.profit_syp > 0 ? 'text-blue-600' : (r.profit_syp < 0 ? 'text-rose-600' : 'text-muted-foreground')}`} dir="ltr">
                        {r.profit_syp !== 0 || r.profit_usd !== 0 ? formatMoneySigned(r.profit_syp, r.profit_usd) : '-'}
                      </td>
                      
                      {/* Cash */}
                      <td className="p-4 font-black text-center" dir="ltr">
                        <span className={r.cash_syp > 0 ? 'text-emerald-600' : (r.cash_syp < 0 ? 'text-rose-600' : 'text-muted-foreground')}>
                          {r.cash_syp !== 0 || r.cash_usd !== 0 ? formatMoneySigned(r.cash_syp, r.cash_usd) : '-'}
                        </span>
                      </td>
                      
                      {/* Debt */}
                      <td className="p-4 font-black text-center" dir="ltr">
                        <span className={r.debt_syp > 0 ? 'text-rose-600' : (r.debt_syp < 0 ? 'text-emerald-600' : 'text-muted-foreground')}>
                          {r.debt_syp !== 0 || r.debt_usd !== 0 ? formatMoneySigned(r.debt_syp, r.debt_usd) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-16 text-center">
                        <div className="text-muted-foreground font-bold text-lg">لا توجد حركات مالية مطابقة للبحث أو الفلتر.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredRecords.length > 0 && (
                  <tfoot className="bg-secondary/80 border-t-2 border-border">
                    <tr>
                      <td colSpan={4} className="p-4 font-black text-left text-foreground">الإجمالي الفرعي:</td>
                      <td className="p-4 font-black text-emerald-700" dir="ltr">{formatMoney(footerTotals.revenue_syp, footerTotals.revenue_usd)}</td>
                      <td className="p-4 font-black text-amber-700" dir="ltr">{formatMoney(footerTotals.cost_syp, footerTotals.cost_usd)}</td>
                      <td className="p-4 font-black text-blue-700" dir="ltr">{formatMoneySigned(footerTotals.profit_syp, footerTotals.profit_usd)}</td>
                      <td className="p-4 font-black text-center" dir="ltr">
                        <span className={footerTotals.cash_syp >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatMoneySigned(footerTotals.cash_syp, footerTotals.cash_usd)}
                        </span>
                      </td>
                      <td className="p-4 font-black text-center" dir="ltr">
                        <span className={footerTotals.debt_syp > 0 ? 'text-rose-700' : (footerTotals.debt_syp < 0 ? 'text-emerald-700' : 'text-muted-foreground')}>
                          {formatMoneySigned(footerTotals.debt_syp, footerTotals.debt_usd)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
      
            {/* Order Invoice Details Modal */}
      <ModalPortal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} className="print:bg-white print:backdrop-blur-none">
        {selectedInvoice && (
          <div className="bg-card border border-white/10 dark:border-white/5 rounded-[32px] p-8 max-w-2xl w-[95vw] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] space-y-6 print:border-none print:shadow-none print:p-0 print:text-black print:bg-white max-h-[90vh] overflow-y-auto scrollbar-hide printable-receipt print-container" dir="rtl">
            {/* Header */}
            <div className="text-center pb-6 border-b border-dashed border-border print:border-gray-400">
              <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent print:text-black">Prince Pro Lux</h2>
              <p className="text-muted-foreground print:text-gray-500 text-sm font-bold">فاتورة مبيعات نظام نقاط البيع</p>
              <div className="mt-4 inline-flex flex-col items-center justify-center bg-secondary/50 print:bg-transparent px-4 py-2 rounded-2xl">
                <p className="text-foreground font-black print:text-black">فاتورة طلب رقم #{selectedInvoice.id}</p>
                <p className="text-muted-foreground print:text-gray-500 text-xs font-bold mt-1" dir="ltr">
                  {selectedInvoice.created_at ? new Date(selectedInvoice.created_at).toLocaleString('ar-SY', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                </p>
              </div>
            </div>

            {/* Customer & Order Info */}
            <div className="text-sm font-bold border-b border-dashed border-border print:border-gray-400 pb-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground print:text-gray-500">العميل</span>
                <span className="text-foreground print:text-black text-base">{selectedInvoice.customer?.name || selectedInvoice.customer_name || 'عميل نقدي'}</span>
              </div>
              {selectedInvoice.customer?.phone && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground print:text-gray-500">رقم الهاتف</span>
                  <span className="text-foreground print:text-black font-mono" dir="ltr">{selectedInvoice.customer.phone}</span>
                </div>
              )}
              {selectedInvoice.customer?.address && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground print:text-gray-500">العنوان</span>
                  <span className="text-foreground print:text-black">{selectedInvoice.customer.address}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-muted-foreground print:text-gray-500">طريقة الدفع</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-black ${selectedInvoice.payment_method === 'CASH' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                  {selectedInvoice.payment_method === 'CASH' ? 'نقدي (كاش)' : 'دين / آجل'}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-4 pb-6 border-b border-dashed border-border print:border-gray-400 text-right text-sm">
              <div className="flex justify-between items-center text-xs text-muted-foreground font-bold mb-2">
                <span>الصنف والكمية</span>
                <span>المجموع</span>
              </div>
              {selectedInvoice.items?.map((item: any, i: number) => {
                const isReturned = (item.returned_quantity || 0) > 0;
                const netQuantity = (item.quantity || 0) - (item.returned_quantity || 0);
                return (
                  <div key={i} className="flex justify-between items-start">
                    <div className="flex flex-col text-right">
                      <span className={`font-bold text-base text-foreground print:text-black ${netQuantity === 0 ? 'line-through opacity-50' : ''}`}>
                        {item.product?.name || item.product_name || `صنف #${item.product_id}`}
                      </span>
                      <div className="flex items-center gap-2 mt-1 justify-start">
                        <span className="text-xs font-bold text-muted-foreground print:text-gray-500 bg-secondary/50 print:bg-transparent px-2 py-0.5 rounded-lg" dir="ltr">
                          ${Number(item.price).toLocaleString()} × {item.quantity}
                        </span>
                        {isReturned && (
                          <span className="text-xs font-bold text-rose-500 bg-rose-500/10 print:bg-transparent px-2 py-0.5 rounded-lg">
                            مرتجع: {item.returned_quantity}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`font-black text-base text-foreground print:text-black mt-0.5 ${netQuantity === 0 ? 'line-through opacity-50' : ''}`} dir="ltr">
                      ${(Number(item.price) * netQuantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals Summary */}
            <div className="space-y-2.5 font-bold text-sm border-b border-dashed border-border print:border-gray-400 pb-6 text-right">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground print:text-gray-500">الإجمالي بالدولار</span>
                <span className="text-lg font-black text-foreground print:text-black" dir="ltr">
                  ${Number(selectedInvoice.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>المعادل بالليرة السورية (سعر الصرف {Number(selectedInvoice.exchange_rate || 13950).toLocaleString()})</span>
                <span className="font-bold text-foreground" dir="ltr">
                  {Number(selectedInvoice.total_syp || (selectedInvoice.total * (selectedInvoice.exchange_rate || 13950))).toLocaleString()} ل.س
                </span>
              </div>
              {Number(selectedInvoice.discount_amount || 0) > 0 && (
                <div className="flex justify-between items-center text-emerald-500">
                  <span>الخصم الممنوح</span>
                  <span dir="ltr">-${Number(selectedInvoice.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-primary pt-1 border-t border-border/50">
                <span>المدفوع نقدياً</span>
                <span className="text-xl font-black" dir="ltr">
                  ${Number(selectedInvoice.paid_usd > 0 ? selectedInvoice.paid_usd : (selectedInvoice.paid_amount || selectedInvoice.total)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {Number(selectedInvoice.debt_amount || 0) > 0 && (
                <div className="flex justify-between items-center text-rose-500 bg-rose-500/5 p-2 rounded-xl">
                  <span>المتبقي (دين على العميل)</span>
                  <span className="text-lg font-black" dir="ltr">
                    {selectedInvoice.debt_currency === 'USD' ? '$' : ''}
                    {Number(selectedInvoice.debt_amount).toLocaleString()}
                    {selectedInvoice.debt_currency !== 'USD' ? ' ل.س' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Actions (Hidden in Print) */}
            <div className="print:hidden flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-3.5 text-sm font-bold bg-secondary/80 text-foreground hover:bg-secondary rounded-2xl transition-colors"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-[2] py-3.5 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Printer className="w-5 h-5" />
                طباعة الفاتورة
              </button>
            </div>
          </div>
        )}
      </ModalPortal>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          .overflow-y-auto {
            overflow: visible !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}
