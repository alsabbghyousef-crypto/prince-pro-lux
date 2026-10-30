import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, X, Loader2, Package, TrendingUp, Clock, CalendarDays, User } from 'lucide-react';
import ModalPortal from './ModalPortal';
import api from '../../services/api';
import DateRangeSelector, { type DateRange } from './DateRangeSelector';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ProductProfileModalProps {
  productId: number;
  onClose: () => void;
}

export default function ProductProfileModal({ productId, onClose }: ProductProfileModalProps) {
  const [tab, setTab] = useState<'restocks' | 'sales'>('restocks');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['productProfile', productId, dateRange],
    queryFn: async () => {
      let url = `/products/${productId}/profile`;
      if (dateRange) {
        url += `?start_date=${dateRange.start.toISOString()}&end_date=${dateRange.end.toISOString()}`;
      }
      return (await api.get(url)).data;
    },
    enabled: !!productId,
  });

  const metrics = useMemo(() => {
    if (!data) return null;
    
    const totalImported = data.restocks.reduce((sum: number, r: any) => sum + Number(r.quantity_added || 0), 0);
    const totalSold = data.sales.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
    
    let lastSold = null;
    if (data.sales.length > 0) {
      lastSold = data.sales[0].created_at; // sales are ordered by date desc
    }

    let velocity = 'غير متوفر';
    if (data.restocks.length > 0 && totalSold > 0) {
      const firstRestock = new Date(data.restocks[data.restocks.length - 1].created_at);
      const daysSinceFirstRestock = Math.max(1, differenceInDays(new Date(), firstRestock));
      const salesPerDay = totalSold / daysSinceFirstRestock;
      if (salesPerDay >= 1) {
        velocity = `${salesPerDay.toFixed(1)} قطعة / يوم`;
      } else {
        const daysPerSale = daysSinceFirstRestock / totalSold;
        velocity = `قطعة كل ${daysPerSale.toFixed(0)} يوم`;
      }
    }

    return { totalImported, totalSold, lastSold, velocity };
  }, [data]);

  return (
    <ModalPortal isOpen={!!productId} onClose={onClose}>
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-xl border border-border p-6 flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 shrink-0 gap-4">
          <div>
            <h3 className="text-2xl font-black flex items-center gap-2 text-primary">
              <History className="w-7 h-7" />
              الملف الشخصي للمنتج
            </h3>
            {data?.product && (
              <p className="text-muted-foreground mt-2 font-bold text-lg flex items-center gap-2 flex-wrap">
                <span>{data.product.name}</span> 
                <span className="text-border">|</span>
                <span className={data.product.stock > 0 ? "text-emerald-600" : "text-destructive"}>
                  المخزون الحالي: {data.product.stock}
                </span>
                <span className="text-border">|</span>
                <span className="text-amber-600 dark:text-amber-400 text-sm bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 font-medium">
                  حد إعادة الطلب: {data.product.reorder_level ?? data.product.min_threshold ?? 5} قطعة
                </span>
              </p>
            )}
          </div>
          
          <div className="flex gap-4 items-center">
            <DateRangeSelector onChange={setDateRange} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary p-2 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : !data ? null : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
              <div className="bg-secondary/30 p-4 rounded-xl border border-border flex flex-col gap-1">
                <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Package className="w-4 h-4"/> إجمالي المستورد</div>
                <div className="text-xl font-black">{metrics?.totalImported} قطعة</div>
              </div>
              <div className="bg-secondary/30 p-4 rounded-xl border border-border flex flex-col gap-1">
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><TrendingUp className="w-4 h-4"/> إجمالي المباع</div>
                <div className="text-xl font-black text-emerald-600">{metrics?.totalSold} قطعة</div>
              </div>
              <div className="bg-secondary/30 p-4 rounded-xl border border-border flex flex-col gap-1">
                <div className="text-xs font-bold text-amber-600 flex items-center gap-1.5"><CalendarDays className="w-4 h-4"/> آخر عملية بيع</div>
                <div className="text-sm font-bold text-amber-700 mt-1">
                  {metrics?.lastSold ? format(new Date(metrics.lastSold), 'dd MMMM yyyy (hh:mm a)', { locale: ar }) : 'لم يتم البيع بعد'}
                </div>
              </div>
              <div className="bg-secondary/30 p-4 rounded-xl border border-border flex flex-col gap-1">
                <div className="text-xs font-bold text-blue-600 flex items-center gap-1.5"><Clock className="w-4 h-4"/> معدل المبيع (السرعة)</div>
                <div className="text-xl font-black text-blue-600">{metrics?.velocity}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-secondary/40 p-1.5 rounded-xl w-fit mb-4 shrink-0">
              <button
                onClick={() => setTab('restocks')}
                className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all ${
                  tab === 'restocks' ? 'bg-background text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                سجل الإضافات (الاستيراد) ({data.restocks.length})
              </button>
              <button
                onClick={() => setTab('sales')}
                className={`px-5 py-2.5 rounded-lg text-sm font-black transition-all ${
                  tab === 'sales' ? 'bg-background text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                سجل المبيعات ({data.sales.length})
              </button>
            </div>

            {/* Tables */}
            <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-inner">
              {tab === 'restocks' ? (
                <table className="w-full text-sm text-right">
                  <thead className="bg-secondary/80 border-b border-border text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-5 py-4 font-bold">التاريخ</th>
                      <th className="px-5 py-4 font-bold">الكمية المضافة</th>
                      <th className="px-5 py-4 font-bold">رأس المال (تكلفة)</th>
                      <th className="px-5 py-4 font-bold">سعر المبيع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.restocks.map((r: any) => (
                      <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 font-semibold" dir="ltr">{format(new Date(r.created_at), 'yyyy/MM/dd HH:mm')}</td>
                        <td className="px-5 py-4 font-black text-emerald-600">+{r.quantity_added}</td>
                        <td className="px-5 py-4 font-bold">{new Intl.NumberFormat('en-US').format(r.cost_price)} {r.currency || 'USD'}</td>
                        <td className="px-5 py-4 font-bold text-primary">{new Intl.NumberFormat('en-US').format(r.sale_price)} {r.currency || 'USD'}</td>
                      </tr>
                    ))}
                    {data.restocks.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-10 text-muted-foreground font-bold">لا يوجد سجلات استيراد في هذه الفترة</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm text-right">
                  <thead className="bg-secondary/80 border-b border-border text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                      <th className="px-5 py-4 font-bold">رقم الطلب</th>
                      <th className="px-5 py-4 font-bold">اسم العميل</th>
                      <th className="px-5 py-4 font-bold">التاريخ</th>
                      <th className="px-5 py-4 font-bold">الكمية المباعة</th>
                      <th className="px-5 py-4 font-bold">السعر المباع به</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.sales.map((s: any) => (
                      <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 font-bold">#{s.order_id}</td>
                        <td className="px-5 py-4 font-bold">
                          {s.customer_name ? (
                            <span className="flex items-center gap-2"><User className="w-4 h-4 text-primary"/> {s.customer_name}</span>
                          ) : (
                            <span className="text-muted-foreground">- زبون عام -</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold" dir="ltr">{format(new Date(s.created_at), 'yyyy/MM/dd HH:mm')}</td>
                        <td className="px-5 py-4 font-black text-amber-600">-{s.quantity}</td>
                        <td className="px-5 py-4 font-bold text-emerald-600">{new Intl.NumberFormat('en-US').format(s.price)} USD</td>
                      </tr>
                    ))}
                    {data.sales.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-muted-foreground font-bold">لا يوجد سجلات مبيعات في هذه الفترة</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </ModalPortal>
  );
}
