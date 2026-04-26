import React, { useState } from 'react';
import { X, RefreshCcw, AlertTriangle } from 'lucide-react';
import ModalPortal from './ModalPortal';
import api from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ReturnOrderModalProps {
  order: any;
  onClose: () => void;
}

export default function ReturnOrderModal({ order, onClose }: ReturnOrderModalProps) {
  const queryClient = useQueryClient();
  
  // State to hold the quantity to return for each item ID
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg] = useState('');

  const handleQuantityChange = (itemId: string, maxAvailable: number, value: string) => {
    let num = parseInt(value, 10) || 0;
    if (num < 0) num = 0;
    if (num > maxAvailable) num = maxAvailable;
    
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: num
    }));
  };

  const returnAll = () => {
    const allQuantities: Record<string, number> = {};
    order.items.forEach((item: any) => {
      const max = item.quantity - (item.returned_quantity || 0);
      if (max > 0) {
        allQuantities[item.id] = max;
      }
    });
    setReturnQuantities(allQuantities);
  };

  const calculateTotalRefund = () => {
    let total = 0;
    order.items.forEach((item: any) => {
      const q = returnQuantities[item.id] || 0;
      total += q * item.price;
    });
    return total;
  };

  const returnMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post(`/orders/${order.id}/return`, payload);
      return response.data;
    },
    onMutate: async () => {
      onClose(); // Close instantly (0ms UX)
      await queryClient.cancelQueries({ queryKey: ['ordersHistory'] });
      const previousOrders = queryClient.getQueryData(['ordersHistory']);
      
      // We could add more complex optimistic update here if needed
      
      return { previousOrders };
    },
    onError: (err: any, _variables: any, context: any) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['ordersHistory'], context.previousOrders);
      }
      alert(err.response?.data?.error || 'حدث خطأ أثناء الإرجاع');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ordersHistory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
  const getItemsToReturn = () => {
    return Object.entries(returnQuantities)
      .map(([id, qty]) => ({ order_item_id: id, quantity: qty }))
      .filter(item => item.quantity > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToReturn = getItemsToReturn();
    if (itemsToReturn.length === 0) return;
    setShowConfirm(true);
  };

  const confirmAction = () => {
    returnMutation.mutate({ items: getItemsToReturn() });
  };

  const hasAnyReturnable = order.items.some((item:any) => (item.quantity - (item.returned_quantity || 0)) > 0);

  return (
    <ModalPortal isOpen={true} onClose={onClose}>
      <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl w-full max-w-2xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 p-8 transform transition-all flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center">
              <RefreshCcw className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">إرجاع بضاعة</h3>
              <p className="text-sm font-bold text-muted-foreground mt-1">طلب رقم #{order.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!hasAnyReturnable ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mb-4 opacity-50" />
            <h4 className="text-xl font-bold text-foreground mb-2">تم إرجاع كامل الطلب مسبقاً</h4>
            <p className="text-sm font-semibold text-muted-foreground">لا توجد أي مواد متبقية في هذا الطلب يمكن إرجاعها.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="flex justify-end mb-4 shrink-0">
              <button 
                type="button" 
                onClick={returnAll} 
                className="text-xs font-bold bg-secondary/50 hover:bg-secondary text-foreground py-2 px-4 rounded-xl transition-colors"
              >
                تحديد إرجاع كامل الفاتورة
              </button>
            </div>

            <div className="overflow-y-auto pr-2 pb-4 space-y-3 flex-1 min-h-[200px]">
              {order.items.map((item: any) => {
                const returnedQty = item.returned_quantity || 0;
                const maxAvailable = item.quantity - returnedQty;
                const isFullyReturned = maxAvailable === 0;

                return (
                  <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isFullyReturned ? 'bg-secondary/20 border-border/40 opacity-60' : 'bg-black/5 dark:bg-white/5 border-border/50'}`}>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground text-base">{item.productName || 'منتج مجهول'}</h4>
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-1 rounded-md">السعر: {item.price}</span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-500/10 px-2 py-1 rounded-md">الكمية المباعة: {item.quantity}</span>
                        {returnedQty > 0 && (
                          <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md">تم إرجاع: {returnedQty}</span>
                        )}
                      </div>
                    </div>
                    
                    {!isFullyReturned && (
                      <div className="w-32 flex flex-col items-center gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground">الكمية المرجعة</label>
                        <div className="flex items-center bg-background rounded-xl border border-border p-1 w-full h-10">
                          <input 
                            type="number" 
                            min="0"
                            max={maxAvailable}
                            className="w-full bg-transparent border-none text-center font-black text-rose-500 focus:ring-0 outline-none p-0"
                            value={returnQuantities[item.id] || ''}
                            onChange={e => handleQuantityChange(item.id, maxAvailable, e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 pt-6 mt-4 border-t border-border/40">
              <div className="flex items-center justify-between bg-rose-500/10 p-5 rounded-2xl mb-6 border border-rose-500/20">
                <span className="text-base font-bold text-rose-600 dark:text-rose-400">إجمالي قيمة المرتجعات:</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{calculateTotalRefund().toLocaleString()} {order.currency}</span>
              </div>
              
              <button 
                type="submit" 
                disabled={returnMutation.isPending || calculateTotalRefund() === 0}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {returnMutation.isPending ? 'جاري التنفيذ...' : 'تأكيد عملية الإرجاع'}
              </button>
            </div>
          </form>
        )}
      </div>
    
        {/* Custom Confirm Dialog Overlay */}
        {showConfirm && !successMsg && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 rounded-[32px] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-border text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h4 className="text-xl font-black text-foreground mb-3">هل أنت متأكد؟</h4>
              <p className="text-sm font-bold text-muted-foreground mb-8">سيتم إرجاع هذه المواد للمخزون فوراً وتعديل الصندوق بقيمة المرتجعات.</p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setShowConfirm(false)} 
                  className="flex-1 py-3 bg-secondary/80 hover:bg-secondary text-foreground font-bold rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  onClick={confirmAction} 
                  disabled={returnMutation.isPending}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
                >
                  {returnMutation.isPending ? 'جاري التنفيذ...' : 'نعم، تأكيد'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Success Overlay */}
        {successMsg && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 rounded-[32px] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-emerald-500/30 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <div className="w-8 h-8 rounded-full border-4 border-emerald-500 flex items-center justify-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                </div>
              </div>
              <h4 className="text-xl font-black text-emerald-500 mb-2">{successMsg}</h4>
            </div>
          </div>
        )}
</ModalPortal>
  );
}
