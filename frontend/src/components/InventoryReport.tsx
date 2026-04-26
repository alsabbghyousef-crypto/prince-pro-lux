import SearchableSelect from '../components/ui/SearchableSelect';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, FileText, Search, Package } from 'lucide-react';
import api from '../services/api';
import ProductProfileModal from './ui/ProductProfileModal';

export default function InventoryReport({ onClose }: { onClose?: () => void }) {
  const [scope, setScope] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, sold, idle
  const [profileProductId, setProfileProductId] = useState<number | null>(null);
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [refDate, setRefDate] = useState(todayStr);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-report-v2', scope, refDate],
    queryFn: async () => (await api.get(`/inventory-report?scope=${scope}&date=${refDate}`)).data
  });

  const allProducts = data?.all_products || [];
  
  // Unique categories
  const categories = useMemo(() => Array.from(new Set(allProducts.map((p:any) => p.category))), [allProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' 
        ? true 
        : selectedStatus === 'sold' 
          ? p.sold_quantity > 0 
          : p.sold_quantity === 0;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [allProducts, searchQuery, selectedCategory, selectedStatus]);

  // Calculations for Footer
  const footerTotals = useMemo(() => {
    return filteredProducts.reduce((acc: any, p: any) => {
      acc.qty += p.sold_quantity;
      if (p.track_stock) acc.stock += Number(p.stock);
      return acc;
    }, { qty: 0, stock: 0 });
  }, [filteredProducts]);

  const metrics = data?.metrics || { total_items_sold: 0, total_products_active: 0, total_products_idle: 0, period_string: '' };

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-card text-foreground border border-border w-full max-w-[95vw] lg:max-w-6xl max-h-[95vh] overflow-y-auto rounded-[2rem] p-4 sm:p-8 shadow-2xl font-sans animate-in fade-in zoom-in-95 duration-300 print:shadow-none print:border-none print:p-0 print:overflow-visible" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8 relative print:mb-4">
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground absolute left-0 top-0 p-3 bg-secondary/30 rounded-full hover:bg-secondary transition-colors print:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
        <h1 className="text-3xl font-bold flex justify-center items-center gap-3">
          <Package className="text-blue-500 w-8 h-8 print:hidden" />
          تقرير المخزون التفصيلي
        </h1>
        <p className="text-muted-foreground text-sm mt-3 font-medium">تقرير تفصيلي لحركة المخزون، الكميات المباعة، والمنتجات الراكدة.</p>
      </div>

      {/* Global Filters & Actions */}
      <div className="bg-secondary/20 border border-border rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-center gap-6 mb-8 print:hidden">
        
        {/* Scope Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <span className="text-sm font-bold text-muted-foreground w-full sm:w-auto text-right">نطاق التقرير</span>
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
                className={`flex-1 sm:flex-none px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  scope === p.id 
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 scale-105' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
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

        {/* Actions */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button onClick={handlePrint} className="flex-1 lg:flex-none px-6 py-3 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20">
            <FileText className="w-4 h-4" /> طباعة / PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-blue-500 font-bold text-lg animate-pulse">جاري تحليل بيانات المخزون...</div>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-background shadow-sm border-t-4 border-blue-500 border-x border-b border-border rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="text-blue-600 text-sm font-bold mb-2">المنتجات النشطة</div>
              <div className="text-3xl font-black text-foreground">{metrics.total_products_active}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-3 bg-secondary/50 w-fit px-3 py-1 rounded-full">منتج تم بيعه</div>
            </div>

            <div className="bg-background shadow-sm border-t-4 border-purple-500 border-x border-b border-border rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="text-purple-600 text-sm font-bold mb-2">إجمالي القطع المباعة</div>
              <div className="text-3xl font-black text-foreground">{Number(metrics.total_items_sold || 0).toLocaleString()}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-3 bg-secondary/50 w-fit px-3 py-1 rounded-full">وحدة مبيعات</div>
            </div>

            <div className="bg-background shadow-sm border-t-4 border-rose-500 border-x border-b border-border rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="text-rose-500 text-sm font-bold mb-2">المنتجات الراكدة</div>
              <div className="text-3xl font-black text-foreground">{metrics.total_products_idle}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-3 bg-secondary/50 w-fit px-3 py-1 rounded-full">منتج لم يُباع</div>
            </div>

            <div className="bg-secondary/30 shadow-sm border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center items-center text-center">
              <div className="text-muted-foreground text-sm font-bold mb-2">الفترة الزمنية للتقرير</div>
              <div className="text-xl font-black text-foreground" dir="ltr">{metrics.period_string}</div>
              <div className="text-xs font-bold text-blue-500 mt-3 bg-blue-500/10 px-4 py-1.5 rounded-full">
                {scope === 'daily' ? 'تقرير يومي' : scope === 'weekly' ? 'تقرير أسبوعي' : scope === 'monthly' ? 'تقرير شهري' : 'تقرير سنوي'}
              </div>
            </div>
          </div>

          {/* Table Tools (Search & Filter) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 print:hidden">
            <div className="relative w-full sm:w-96">
              <input 
                type="text" 
                placeholder="ابحث عن منتج أو صنف..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-5 py-3 pr-11 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
              />
              <Search className="w-5 h-5 absolute top-1/2 -translate-y-1/2 right-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <SearchableSelect
                options={[
                  { label: 'كافة الحالات', value: 'all' },
                  { label: 'المنتجات المباعة فقط', value: 'sold' },
                  { label: 'المنتجات الراكدة فقط', value: 'idle' }
                ]}
                value={selectedStatus}
                onChange={(v) => setSelectedStatus(String(v))}
                className="w-full sm:w-48"
              />

              <SearchableSelect
                options={[
                  { label: 'كافة التصنيفات', value: 'all' },
                  ...categories.map((c: any) => ({ label: c, value: c }))
                ]}
                value={selectedCategory}
                onChange={(v) => setSelectedCategory(String(v))}
                className="w-full sm:w-48"
              />
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-background rounded-2xl overflow-hidden border border-border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-secondary/60 text-muted-foreground border-b border-border text-xs">
                    <th className="p-4 font-bold text-center w-12">#</th>
                    <th className="p-4 font-bold text-center">الحالة</th>
                    <th className="p-4 font-bold">التاريخ (الفترة)</th>
                    <th className="p-4 font-bold">المنتج</th>
                    <th className="p-4 font-bold">التصنيف</th>
                    <th className="p-4 font-black text-center text-emerald-600">الوارد (إضافة)</th>
                    <th className="p-4 font-black text-center text-blue-600">الصادر (مبيعات)</th>
                    <th className="p-4 font-black text-center text-purple-600">المخزون الفعلي</th>
                    <th className="p-4 font-bold text-center">تفاصيل الحركات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((p: any, i: number) => (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-4 text-center text-muted-foreground font-bold">{i + 1}</td>
                      <td className="p-4 text-center">
                        {p.sold_quantity > 0 ? (
                          <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black border border-emerald-500/30 text-emerald-700 bg-emerald-500/10">نشط/مُباع</span>
                        ) : (p.imported_quantity > 0 ? (
                          <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black border border-amber-500/30 text-amber-700 bg-amber-500/10">وارد جديد</span>
                        ) : (
                          <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-black border border-slate-500/30 text-muted-foreground bg-secondary/50">راكد</span>
                        ))}
                      </td>
                      <td className="p-4 text-muted-foreground text-[10px] font-bold" dir="ltr">{metrics.period_string}</td>
                      <td className="p-4 font-black text-foreground">{p.name}</td>
                      <td className="p-4 text-muted-foreground text-xs font-bold bg-secondary/20 rounded-md w-fit inline-block mt-2 px-2 py-1">{p.category}</td>
                      <td className="p-4 text-center font-black text-emerald-600 text-base">{p.imported_quantity || 0}</td>
                      <td className="p-4 text-center font-black text-blue-600 text-base">{p.sold_quantity}</td>
                      <td className="p-4 text-center font-black text-purple-600 text-base">
                        {!p.track_stock ? '-' : p.stock}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => setProfileProductId(p.id)} className="vercel-button bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary border-none py-1.5 px-3 text-xs rounded-lg print:hidden">
                          <FileText className="w-3.5 h-3.5 inline-block ml-1" /> السجل
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-16 text-center">
                        <div className="text-muted-foreground font-bold text-lg">لا توجد منتجات مطابقة للبحث أو الفلتر.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredProducts.length > 0 && (
                  <tfoot className="bg-secondary/80 border-t-2 border-border">
                    <tr>
                      <td colSpan={5} className="p-5 font-black text-left text-foreground">الإجمالي الفرعي للبحث الحالي:</td>
                      <td className="p-5 text-center font-black text-blue-600 text-lg">{footerTotals.qty.toLocaleString()}</td>
                      <td className="p-5 text-center font-black text-purple-600 text-lg">{footerTotals.stock.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
      
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
    
      {/* Product Profile Modal */}
      {profileProductId && (
        <ProductProfileModal productId={profileProductId} onClose={() => setProfileProductId(null)} />
      )}
</div>
  );
}
