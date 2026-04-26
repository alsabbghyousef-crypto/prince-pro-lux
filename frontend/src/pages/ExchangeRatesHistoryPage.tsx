import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DollarSign, ArrowDown, ArrowUp, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

export default function ExchangeRatesHistoryPage() {
  const [page, setPage] = useState(1);
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['exchangeRateHistory', page],
    queryFn: async () => {
      const response = await api.get(`/settings/exchange-rate/history?page=${page}`);
      return response.data;
    }
  });

  const history = responseData?.data || [];
  const totalPages = responseData?.last_page || 1;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <DollarSign className="w-8 h-8" />
            </div>
            سجل أسعار الصرف
          </h1>
          <p className="text-muted-foreground font-medium">متابعة التغيرات التاريخية لسعر صرف الدولار مقابل الليرة السورية</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider rounded-tr-2xl">التاريخ والوقت</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">السعر القديم</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">السعر الجديد</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">الفرق</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider rounded-tl-2xl">المستخدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    جاري تحميل السجل...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    لا يوجد أي تغييرات سابقة في السجل
                  </td>
                </tr>
              ) : (
                history.map((record: any, idx: number) => {
                  const previousRecord = idx < history.length - 1 ? history[idx + 1] : null;
                  const oldRate = previousRecord ? previousRecord.rate : record.rate;
                  const newRate = record.rate;
                  const diff = newRate - oldRate;

                  return (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={record.id} 
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(record.created_at), 'yyyy-MM-dd hh:mm a')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-bold">
                        {new Intl.NumberFormat('en-US').format(oldRate)} ل.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-black text-primary">
                        {new Intl.NumberFormat('en-US').format(newRate)} ل.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {diff > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg">
                            <ArrowUp className="w-3 h-3" />
                            {new Intl.NumberFormat('en-US').format(Math.abs(diff))}
                          </span>
                        ) : diff < 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-destructive/10 text-destructive px-2 py-1 rounded-lg">
                            <ArrowDown className="w-3 h-3" />
                            {new Intl.NumberFormat('en-US').format(Math.abs(diff))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-bold">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                            {record.user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium text-foreground">{record.user?.name || 'مستخدم غير معروف'}</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-secondary/10">
            <span className="text-sm text-muted-foreground font-medium">
              صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-border/50 hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-border/50 hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
