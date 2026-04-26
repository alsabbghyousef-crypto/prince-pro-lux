import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Printer,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet, Undo2
, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import ModalPortal from '../components/ui/ModalPortal';
import ViewToggle from '../components/ui/ViewToggle';
import ReturnOrderModal from '../components/ui/ReturnOrderModal';
import DateRangeSelector, { type DateRange } from '../components/ui/DateRangeSelector';

export interface OrderItem {
  id?: number;
  orderItemId: number;
  productName?: string;
  product?: { name: string };
  quantity: number;
  price: number;
  returnedQuantity?: number;
  returned_quantity?: number;
  isPaid?: boolean;
}

export interface Order {
  id: number;
  created_at?: string;
  timestamp: string;
  status: string;
  total: number;
  currency?: string;
  notes?: string;
  customerName?: string;
  discountAmount?: number;
  paidAmount?: number;
  debtAmount?: number;
  items: OrderItem[];
}


export const getNetTotal = (order: any) => {
  const returnedValue = order.items?.reduce((sum: number, item: any) => sum + ((item.returned_quantity || item.returnedQuantity || 0) * item.price), 0) || 0;
  return Math.max(0, order.total - returnedValue);
};

export const getReturnedValue = (order: any) => {
  return order.items?.reduce((sum: number, item: any) => sum + ((item.returned_quantity || item.returnedQuantity || 0) * item.price), 0) || 0;
};

export default function OrdersHistoryPage() {
    const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['ordersHistory'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    refetchInterval: 3000,
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = o.id.toString().includes(searchTerm) || (o.total && o.total.toString().includes(searchTerm));
      
      let matchesDate = true;
      if (dateRange && dateRange.start && dateRange.end) {
        const orderDateStr = o.created_at || o.timestamp;
        if (orderDateStr) {
          const orderDate = new Date(orderDateStr);
          matchesDate = isWithinInterval(orderDate, { start: dateRange.start, end: dateRange.end });
        }
      }
      
      return matchesSearch && matchesDate;
    });
  }, [orders, searchTerm, dateRange]);


  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange, itemsPerPage]);

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = () => {
    if (filteredOrders.length === 0) return;
    
    // Headers
    const headers = ['رقم الطلب', 'التاريخ', 'إجمالي المبلغ', 'الحالة', 'طريقة الدفع', 'الملاحظات'];
    
    // Rows
    const rows = filteredOrders.map((o) => [
      o.id,
      format(new Date(o.created_at || o.timestamp), 'yyyy-MM-dd HH:mm', { locale: ar }),
      getNetTotal(o),
      o.status === 'COMPLETED' ? 'مكتمل' : o.status === 'CANCELLED' ? 'ملغي' : o.status,
      o.currency || 'ل.س',
      o.notes || ''
    ]);

    // CSV Content (UTF-8 BOM for Excel Arabic support)
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`space-y-6 animate-fade-in ${selectedOrder ? "print:hidden" : "print-container"}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">سجل المبيعات</h1>
          <p className="text-muted-foreground">عرض جميع الطلبات السابقة مع إمكانية الطباعة والتصدير.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="vercel-button bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            تصدير Excel
          </button>
          <button 
            onClick={handlePrint}
            className="vercel-button bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            طباعة / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 no-print bg-card p-4 rounded-2xl border border-border shadow-sm">
        
        {/* Date Filter & Search Row */}
        <div className="flex flex-col xl:flex-row items-center gap-4 justify-between w-full">
          
          {/* Date & View Filters */}
          <div className="flex items-center gap-4 flex-wrap w-full xl:w-auto">
            <DateRangeSelector onChange={setDateRange} />
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>

          {/* Search */}
          <div className="relative w-full xl:w-64">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث برقم الطلب أو المبلغ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="vercel-input w-full pr-11 bg-background h-11 rounded-full border-border shadow-sm focus:border-primary/50"
            />
          </div>

        </div>
      </div>

      {/* Table Content */}
      {viewMode === 'list' ? (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">رقم الطلب</th>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">المنتجات</th>
                <th className="px-6 py-4">المبلغ الإجمالي</th>
                <th className="px-6 py-4">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2">جاري جلب السجل...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    لا يوجد طلبات تطابق بحثك.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <td className="px-6 py-4 font-mono font-medium">#{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(order.timestamp || order.created_at || new Date()), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                    </td>
                    <td className="px-6 py-4">
                      {order.items && order.items.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <span key={item.id || idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                              {item.productName || item.product?.name || 'منتج'} x{item.quantity}
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/50 text-muted-foreground">
                              +{order.items.length - 3} أخرى
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-primary whitespace-nowrap">
                      {getNetTotal(order).toLocaleString()} {order.currency === 'USD' ? '$' : 'ل.س'}
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'REFUNDED' ? (<span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold"><XCircle className="w-3 h-3" /> مسترجعة</span>) : order.status === 'PARTIALLY_REFUNDED' ? (<span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-1 rounded text-xs font-bold"><Undo2 className="w-3 h-3" /> مرتجع جزئي</span>) : order.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مكتمل
                        </span>
                      ) : order.status === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500">
                          <XCircle className="w-3.5 h-3.5" />
                          ملغي
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">
                          {order.status}
                        </span>
                      )}
                    </td>
                  <td className="px-6 py-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); setReturnOrder(order); }}
                          disabled={order.status === 'REFUNDED' || order.status === 'CANCELLED'}
                          className="vercel-button bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs py-1.5 px-3"
                        >
                          <Undo2 className="w-3.5 h-3.5 inline-block ml-1" />
                          إرجاع
                        </button>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-2">جاري جلب السجل...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            لا يوجد طلبات تطابق بحثك.
          </div>
        ) : (
          paginatedOrders.map((order) => (
            <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/50 transition-colors cursor-pointer shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold">#{order.id}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(order.timestamp || order.created_at || new Date()), 'dd MMM yyyy - hh:mm a', { locale: ar })}</span>
              </div>
              
              <div className="flex-1">
                <div className="text-sm font-bold text-primary mb-2">{getNetTotal(order).toLocaleString()} {order.currency === 'USD' ? '$' : 'ل.س'}</div>
                {order.items && order.items.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <span key={item.id || idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                        {item.productName || item.product?.name || 'منتج'} x{item.quantity}
                      </span>
                    ))}
                    {order.items.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/50 text-muted-foreground">
                        +{order.items.length - 3} أخرى
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </div>

              <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                <div>
                   {order.status === 'REFUNDED' ? (<span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold"><XCircle className="w-3 h-3" /> مسترجعة</span>) : order.status === 'PARTIALLY_REFUNDED' ? (<span className="flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-1 rounded text-xs font-bold"><Undo2 className="w-3 h-3" /> مرتجع جزئي</span>) : order.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مكتمل
                        </span>
                      ) : order.status === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500">
                          <XCircle className="w-3.5 h-3.5" />
                          ملغي
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-foreground">
                          {order.status}
                        </span>
                      )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setReturnOrder(order); }}
                  disabled={order.status === 'REFUNDED' || order.status === 'CANCELLED'}
                  className="vercel-button bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs py-1.5 px-3"
                >
                  <Undo2 className="w-3.5 h-3.5 inline-block ml-1" />
                  إرجاع
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      )}
        
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border border-border/50 rounded-2xl bg-card/60 backdrop-blur-xl mt-4 mb-4 shadow-sm gap-4">
          <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>عرض</span>
              <select 
                value={itemsPerPage} 
                onChange={e => setItemsPerPage(Number(e.target.value))} 
                className="bg-secondary border border-border/50 rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>عنصر</span>
            </div>
            <span>
              الصفحة {currentPage} من {totalPages} ({filteredOrders.length} طلب)
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-xl border border-border/50 hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <div className="hidden sm:flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = currentPage;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${currentPage === pageNum ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-secondary/80'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 rounded-xl border border-border/50 hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

{/* Print Only Footer */}
      <div className="hidden print:block text-center mt-12 text-sm text-gray-500">
        تم استخراج هذا السجل من نظام نيو باور. تاريخ الطباعة: {format(new Date(), 'dd MMM yyyy - hh:mm a', { locale: ar })}
      </div>
    
      
      {/* Order Details Modal */}
      <ModalPortal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} className="print:bg-white print:backdrop-blur-none">
        {selectedOrder && (
          <div className="bg-card border border-white/10 dark:border-white/5 rounded-[32px] p-8 max-w-2xl w-[95vw] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] space-y-6 print:border-none print:shadow-none print:p-0 print:text-black print:bg-white max-h-[90vh] overflow-y-auto scrollbar-hide printable-receipt print-container">
            {/* Header */}
            <div className="text-center pb-6 border-b border-dashed border-border print:border-gray-400">
              <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent print:text-black">Prince Pro Lux</h2>
              <p className="text-muted-foreground print:text-gray-500 text-sm font-bold">نظام نقاط البيع</p>
              <div className="mt-4 inline-flex flex-col items-center justify-center bg-secondary/50 print:bg-transparent px-4 py-2 rounded-2xl">
                <p className="text-foreground font-black print:text-black">طلب رقم #{selectedOrder.id}</p>
                <p className="text-muted-foreground print:text-gray-500 text-xs font-bold mt-1">{format(new Date(selectedOrder.timestamp || selectedOrder.created_at || new Date()), 'dd MMM yyyy - hh:mm a', { locale: ar })}</p>
              </div>
            </div>

            {/* Customer Info */}
            {selectedOrder.customerName && (
              <div className="text-sm font-bold border-b border-dashed border-border print:border-gray-400 pb-4 text-right flex justify-between items-center">
                <span className="text-muted-foreground print:text-gray-500">العميل</span>
                <span className="text-foreground print:text-black text-base">{selectedOrder.customerName}</span>
              </div>
            )}

            {/* Items */}
            <div className="space-y-4 pb-6 border-b border-dashed border-border print:border-gray-400 text-right text-sm">
              <div className="flex justify-between items-center text-xs text-muted-foreground font-bold mb-2">
                <span>الصنف</span>
                <span>المجموع</span>
              </div>
              {selectedOrder.items?.map((item: any, i: number) => {
                const isReturned = (item.returned_quantity || item.returnedQuantity || 0) > 0;
                const netQuantity = item.quantity - (item.returned_quantity || item.returnedQuantity || 0);
                return (
                  <div key={i} className="flex justify-between items-start">
                    <div className="flex flex-col text-right">
                      <span className={`font-bold text-base text-foreground print:text-black ${netQuantity === 0 ? 'line-through opacity-50' : ''}`}>{item.productName || item.product?.name || 'مجهول'}</span>
                      <div className="flex items-center gap-2 mt-1 justify-start">
                        <span className="text-xs font-bold text-muted-foreground print:text-gray-500 bg-secondary/50 print:bg-transparent px-2 py-0.5 rounded-lg">{(item.price).toLocaleString()} × {item.quantity}</span>
                        {isReturned && (
                          <span className="text-xs font-bold text-rose-500 bg-rose-500/10 print:bg-transparent px-2 py-0.5 rounded-lg">مرتجع: {item.returned_quantity || item.returnedQuantity}</span>
                        )}
                      </div>
                    </div>
                    <div className={`font-black text-base text-foreground print:text-black mt-0.5 ${netQuantity === 0 ? 'line-through opacity-50' : ''}`}>
                      {((item.price) * netQuantity).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="space-y-3 font-bold text-sm border-b border-dashed border-border print:border-gray-400 pb-6 text-right">
              {getReturnedValue(selectedOrder) > 0 && (
                <div className="flex justify-between items-center text-rose-500 mb-2">
                  <span className="opacity-80">قيمة المرتجعات</span>
                  <span>- {getReturnedValue(selectedOrder).toLocaleString()} {selectedOrder.currency === 'USD' ? '$' : 'ل.س'}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground print:text-gray-500">الإجمالي (الصافي)</span>
                <span className="text-lg text-foreground print:text-black">{getNetTotal(selectedOrder).toLocaleString()} {selectedOrder.currency === 'USD' ? '$' : 'ل.س'}</span>
              </div>
              {(selectedOrder.discountAmount || 0) > 0 && (
                <div className="flex justify-between items-center text-emerald-500">
                  <span className="opacity-80">الخصم</span>
                  <span>- {(selectedOrder.discountAmount || 0).toLocaleString()} {selectedOrder.currency === 'USD' ? '$' : 'ل.س'}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-primary pt-2">
                <span>المدفوع</span>
                <span className="text-xl font-black">{Math.max(0, (selectedOrder.paidAmount || (selectedOrder as any).paid_amount || selectedOrder.total) - getReturnedValue(selectedOrder)).toLocaleString()} {selectedOrder.currency === 'USD' ? '$' : 'ل.س'}</span>
              </div>
              {(selectedOrder.debtAmount || (selectedOrder as any).debt_amount || 0) > 0 && (
                <div className="flex justify-between items-center text-rose-500">
                  <span>المتبقي (دين)</span>
                  <span className="text-lg font-black">{Math.max(0, (selectedOrder.debtAmount || (selectedOrder as any).debt_amount || 0)).toLocaleString()} {(selectedOrder as any).debt_currency === 'USD' ? '$' : 'ل.س'}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground print:text-gray-500 font-bold">
              <p>شكراً لزيارتكم!</p>
            </div>

            {/* Actions (Hidden in Print) */}
            <div className="print:hidden flex gap-3 pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-4 text-sm font-bold bg-secondary/80 text-foreground hover:bg-secondary rounded-2xl transition-colors"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="flex-[2] py-4 text-base font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Printer className="w-5 h-5" />
                طباعة الفاتورة
              </button>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Return Modal */}
      {returnOrder && <ReturnOrderModal order={returnOrder} onClose={() => setReturnOrder(null)} />}

    </div>
  );
}
