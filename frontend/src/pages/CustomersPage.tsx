import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import SearchableSelect from '../components/ui/SearchableSelect';
import { Search, User, X, LayoutGrid, List } from 'lucide-react';
import { MapPin, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import cn from 'clsx';
import ModalPortal from '../components/ui/ModalPortal';

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address?: string | null;
  total_debt: number;
    total_debt_usd?: number;
  orders?: any[];
  payments?: any[];
}

const CustomersPage = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [addressFilter, setAddressFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payCurrency, setPayCurrency] = useState<'SYP'|'USD'>('SYP');
  const [payNotes, setPayNotes] = useState('');
  const [payOrderId, setPayOrderId] = useState<number | ''>('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressValue, setEditAddressValue] = useState('');
  const [editPhoneValue, setEditPhoneValue] = useState('');

  const { data: customers = [], isLoading: loading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    },
    refetchInterval: 3000
  });

  const { data: selectedCustomer } = useQuery<Customer>({
    queryKey: ['customers', selectedCustomerId],
    queryFn: async () => {
      const response = await api.get(`/customers/${selectedCustomerId}`);
      return response.data;
    },
    enabled: !!selectedCustomerId
  });

  const filteredCustomers = useMemo(() => {
    let result = customers;
    
    if (searchQuery.trim()) {
      const lowerSearch = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(lowerSearch) || 
        (c.phone && c.phone.includes(lowerSearch))
      );
    }
    
    if (addressFilter.trim()) {
      const lowerAddress = addressFilter.toLowerCase();
      result = result.filter(c => c.address && c.address.toLowerCase().includes(lowerAddress));
    }
    
    return result;
  }, [customers, searchQuery, addressFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, addressFilter]);

  const closeCustomerDetails = useCallback(() => setSelectedCustomerId(null), []);
  const openPayModal = useCallback(() => setIsPayModalOpen(true), []);
  const closePayModal = useCallback(() => {
    setIsPayModalOpen(false);
    setPayAmount('');
    setPayNotes('');
    setPayOrderId('');
  }, []);

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, address, phone }: { id: number, address: string, phone: string }) => {
      const res = await api.put(`/customers/${id}`, { address, phone });
      return res.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      await queryClient.cancelQueries({ queryKey: ['customers', variables.id] });
      
      const previousCustomers = queryClient.getQueryData<Customer[]>(['customers']);
      const previousCustomer = queryClient.getQueryData<Customer>(['customers', variables.id]);
      
      if (previousCustomers) {
        queryClient.setQueryData<Customer[]>(['customers'], old => 
          old?.map(c => c.id === variables.id ? { ...c, address: variables.address, phone: variables.phone } : c)
        );
      }
      
      if (previousCustomer) {
        queryClient.setQueryData<Customer>(['customers', variables.id], old => {
          if (!old) return old;
          return {
            ...old,
            address: variables.address,
            phone: variables.phone
          };
        });
      }
      
      return { previousCustomers, previousCustomer };
    },
    onError: (_error, variables, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(['customers'], context.previousCustomers);
      }
      if (context?.previousCustomer) {
        queryClient.setQueryData(['customers', variables.id], context.previousCustomer);
      }
      alert('فشلت عملية التحديث');
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['customers', variables.id] });
      }
    }
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, amount, notes, order_id, currency }: { id: number, amount: number, notes: string, order_id?: number | '', currency: 'SYP'|'USD' }) => {
      const res = await api.post(`/customers/${id}/pay`, { amount, notes, order_id, currency });
      return res.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      if (variables.id) {
        await queryClient.cancelQueries({ queryKey: ['customers', variables.id] });
      }

      const previousCustomers = queryClient.getQueryData<Customer[]>(['customers']);
      const previousCustomer = queryClient.getQueryData<Customer>(['customers', variables.id]);

      if (previousCustomers) {
        queryClient.setQueryData<Customer[]>(['customers'], old => 
          old?.map(c => c.id === variables.id ? { ...c, total_debt: variables.currency === 'SYP' ? c.total_debt - variables.amount : c.total_debt, total_debt_usd: variables.currency === 'USD' ? (c.total_debt_usd || 0) - variables.amount : c.total_debt_usd } : c)
        );
      }
      
      if (previousCustomer) {
        queryClient.setQueryData<Customer>(['customers', variables.id], old => {
          if (!old) return old;
          return {
            ...old,
            total_debt: variables.currency === 'SYP' ? old.total_debt - variables.amount : old.total_debt,
              total_debt_usd: variables.currency === 'USD' ? (old.total_debt_usd || 0) - variables.amount : old.total_debt_usd
          };
        });
      }

      return { previousCustomers, previousCustomer };
    },
    onError: (_error, variables, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(['customers'], context.previousCustomers);
      }
      if (context?.previousCustomer) {
        queryClient.setQueryData(['customers', variables.id], context.previousCustomer);
      }
      alert('فشلت عملية الدفع');
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['customers', variables.id] });
      }
    }
  });

  const handlePayDebt = () => {
    if (!selectedCustomerId || !payAmount) return;
    payMutation.mutate({
      id: selectedCustomerId,
      amount: Number(payAmount),
      currency: payCurrency,
      notes: payNotes,
      order_id: payOrderId
    });
    closePayModal();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full min-w-0 lg:h-[calc(100vh-140px)] animate-fade-in relative">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">العملاء والديون</h1>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* View Toggle */}
              <div className="flex items-center bg-secondary/50 border border-border rounded-lg p-1 shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="عرض قائمة"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  title="عرض بطاقات"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الهاتف..."
                  className="w-full bg-secondary/50 border-transparent focus:border-border h-9 rounded-md ps-9 pe-3 text-sm outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative w-full sm:w-48">
                <MapPin className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="فلترة بالمنطقة..."
                  className="w-full bg-secondary/50 border-transparent focus:border-border h-9 rounded-md ps-9 pe-3 text-sm outline-none transition-all"
                  value={addressFilter}
                  onChange={(e) => setAddressFilter(e.target.value)}
                />
              </div>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="flex-1 overflow-auto rounded-xl border border-border/50 bg-card/30">
            <table className="w-full text-sm text-left rtl:text-right">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold">اسم العميل</th>
                  <th className="px-6 py-4 font-semibold">رقم الهاتف</th>
                  <th className="px-6 py-4 font-semibold">العنوان</th>
                  <th className="px-6 py-4 font-semibold">إجمالي الديون</th>
                  <th className="px-6 py-4 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">جاري التحميل...</td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">لا يوجد عملاء.</td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => (
                    <tr key={c.id} onClick={() => setSelectedCustomerId(c.id)} className="hover:bg-secondary/40 transition-colors cursor-pointer">
                      <td className="px-6 py-4 font-bold">{c.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{c.phone || '-'}</td>
                      <td className="px-6 py-4 text-muted-foreground">{c.address || '-'}</td>
                      <td className="px-6 py-4">
                        {c.total_debt > 0 && <div className="text-destructive font-bold text-sm">{new Intl.NumberFormat('en-US').format(c.total_debt)} ل.س</div>}
                        {(c.total_debt_usd || 0) > 0 && <div className="text-destructive font-bold text-sm">{new Intl.NumberFormat('en-US').format(c.total_debt_usd || 0)} USD</div>}
                        {c.total_debt <= 0 && (c.total_debt_usd || 0) <= 0 && <span className="text-emerald-600 font-bold">-</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setSelectedCustomerId(c.id)} className="vercel-button bg-primary/10 text-primary hover:bg-primary/20 py-1.5 px-3 rounded-lg text-xs">
                          عرض السجل
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-transparent pr-2">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">لا يوجد عملاء.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                {paginatedCustomers.map(c => (
                  <div key={c.id} onClick={() => setSelectedCustomerId(c.id)} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:border-primary/30 flex flex-col gap-4 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{c.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.phone || 'لا يوجد رقم'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-xl border ${c.total_debt > 0 ? 'bg-destructive/5 border-destructive/10' : 'bg-green-500/5 border-green-500/10'}`}>
                      <p className="text-xs text-muted-foreground mb-1">الرصيد المتبقي (عالدين)</p>
                      <div className="flex flex-col gap-1">
                        {c.total_debt > 0 && <span className="font-black text-sm text-destructive">{new Intl.NumberFormat('en-US').format(c.total_debt)} ل.س</span>}
                        {(c.total_debt_usd || 0) > 0 && <span className="font-black text-sm text-destructive">{new Intl.NumberFormat('en-US').format(c.total_debt_usd || 0)} USD</span>}
                        {c.total_debt <= 0 && (c.total_debt_usd || 0) <= 0 && <span className="font-black text-sm text-green-600">-</span>}
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="w-full mt-auto vercel-button bg-secondary text-foreground hover:bg-secondary/80 py-2.5"
                    >
                      عرض السجل والتفاصيل
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 pb-2 border-t border-border/50 shrink-0">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-border/50 hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNumber = i + 1;
                if (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`w-8 h-8 rounded-xl font-bold text-sm transition-all ${currentPage === pageNumber ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card border border-border/50 hover:bg-secondary'}`}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                  return <span key={pageNumber} className="px-1 text-muted-foreground">...</span>;
                }
                return null;
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-border/50 hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Customer Details Full Page Modal */}
      <ModalPortal isOpen={!!(selectedCustomer && selectedCustomerId === selectedCustomer.id)} onClose={closeCustomerDetails}>
        {selectedCustomer && (
        <div className="bg-card w-[95vw] max-w-5xl h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/30 shrink-0">
              <h2 className="font-bold text-2xl flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <User className="w-6 h-6" />
                </div>
                سجل العميل مفصل
              </h2>
              <button onClick={closeCustomerDetails} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
               {/* Customer Info Header */}
               <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-secondary/10 p-6 rounded-3xl border border-border/50">
                  <div className="text-center md:text-right space-y-2">
                    <h3 className="font-black text-3xl text-foreground">{selectedCustomer.name}</h3>
                    {isEditingAddress ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-5 h-5 shrink-0 text-muted-foreground" />
                          <input 
                            type="text" 
                            className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none w-48" 
                            value={editPhoneValue}
                            onChange={e => setEditPhoneValue(e.target.value)}
                            placeholder="أدخل رقم الهاتف..."
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 shrink-0 text-muted-foreground" />
                          <input 
                            type="text" 
                            className="bg-background border border-border rounded-md px-2 py-1 text-sm outline-none w-48" 
                            value={editAddressValue}
                            onChange={e => setEditAddressValue(e.target.value)}
                            placeholder="أدخل العنوان..."
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <button 
                            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md font-bold text-sm hover:opacity-90 transition-opacity"
                            onClick={() => {
                              updateCustomerMutation.mutate({ 
                                id: selectedCustomer.id, 
                                address: editAddressValue,
                                phone: editPhoneValue
                              });
                              setIsEditingAddress(false);
                            }}
                          >
                            حفظ التعديلات
                          </button>
                          <button 
                            className="text-destructive hover:text-destructive/80 font-bold text-sm"
                            onClick={() => setIsEditingAddress(false)}
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                          <p className="text-muted-foreground text-lg font-bold">{selectedCustomer.phone || 'لا يوجد رقم هاتف'}</p>
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mt-1">
                          <MapPin className="w-5 h-5 shrink-0" />
                          <span className="font-medium text-lg">
                            {selectedCustomer.address || 'لا يوجد عنوان'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <button 
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            onClick={() => {
                              setEditAddressValue(selectedCustomer.address || '');
                              setEditPhoneValue(selectedCustomer.phone || '');
                              setIsEditingAddress(true);
                            }}
                          >
                            تعديل البيانات
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                    <div className="px-8 py-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-center min-w-[240px] shadow-sm">
                      <p className="text-sm font-bold text-destructive uppercase tracking-wider mb-2">إجمالي الدين المتبقي</p>
                      <p className="text-xl font-black text-destructive leading-tight">
                        {selectedCustomer.total_debt > 0 && <span>{new Intl.NumberFormat('en-US').format(selectedCustomer.total_debt)} ل.س<br/></span>}
                        {(selectedCustomer.total_debt_usd || 0) > 0 && <span>{new Intl.NumberFormat('en-US').format(selectedCustomer.total_debt_usd || 0)} USD</span>}
                        {selectedCustomer.total_debt <= 0 && (selectedCustomer.total_debt_usd || 0) <= 0 && <span className="text-emerald-600">0</span>}
                      </p>
                    </div>
                    {(selectedCustomer.total_debt > 0 || (selectedCustomer.total_debt_usd || 0) > 0) && (
                      <button onClick={openPayModal} className="w-full md:w-auto px-10 py-3 bg-primary text-primary-foreground font-black text-lg rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
                        تسديد دفعة
                      </button>
                    )}
                  </div>
               </div>

               <div>
                 <h4 className="font-black text-2xl mb-6 flex items-center gap-3 border-b border-border pb-4">
                   <div className="p-2 bg-secondary rounded-xl text-foreground">
                     <List className="w-5 h-5" />
                   </div>
                   الطلبات والفواتير السابقة
                 </h4>
                 
                 {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) ? (
                   <div className="text-center py-12 bg-secondary/10 rounded-3xl border border-dashed border-border">
                     <p className="text-muted-foreground text-lg font-bold">لا يوجد أي طلبات سابقة لهذا العميل.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {selectedCustomer.orders?.map(order => (
                        <div key={order.id} className="bg-background rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                          {/* Card Header */}
                          <div className="p-5 bg-secondary/30 flex justify-between items-center border-b border-border">
                            <div className="flex flex-col">
                              <span className="font-black text-lg text-primary">فاتورة #{order.id}</span>
                              <span className="text-sm font-bold text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString('ar-SY', { dateStyle: 'long', timeStyle: 'short' })}</span>
                            </div>
                            <span className={cn("text-xs font-black px-4 py-2 rounded-xl shadow-sm", order.debt_amount > 0 ? "bg-destructive text-destructive-foreground" : "bg-emerald-500 text-white")}>
                              {order.debt_amount > 0 ? 'غير مسددة بالكامل' : 'مدفوعة بالكامل'}
                            </span>
                          </div>

                          {/* Items List */}
                          <div className="p-5 space-y-3 min-h-[120px]">
                            {(!order.items || order.items.length === 0) ? (
                              <p className="text-sm text-muted-foreground text-center py-4 font-bold">لا توجد منتجات مسجلة.</p>
                            ) : (
                              order.items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-sm p-3 rounded-xl bg-secondary/20 border border-border/30">
                                  <div className="flex gap-4 items-center">
                                    <span className="font-black text-primary bg-primary/10 px-3 py-1.5 rounded-lg text-base">{item.quantity}×</span>
                                    <span className="font-bold text-base text-foreground">{item.product?.name || 'منتج غير معروف'}</span>
                                  </div>
                                  <span className="font-black text-base">{new Intl.NumberFormat('en-US').format(item.price * item.quantity)} ل.س</span>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Financial Summary */}
                          <div className="p-5 bg-secondary/10 border-t border-border space-y-3 text-sm">
                            {Number(order.discount_amount || 0) > 0 && (
                              <div className="flex justify-between text-muted-foreground font-bold">
                                <span>الإجمالي قبل الخصم:</span>
                                <span className="line-through">{new Intl.NumberFormat('en-US').format(order.total + Number(order.discount_amount))} ل.س</span>
                              </div>
                            )}
                            {Number(order.discount_amount || 0) > 0 && (
                              <div className="flex justify-between text-emerald-600 font-black bg-emerald-500/10 p-2 rounded-lg">
                                <span>الخصم الممنوح:</span>
                                <span>- {new Intl.NumberFormat('en-US').format(order.discount_amount)} ل.س</span>
                              </div>
                            )}
                            <div className="flex justify-between font-black text-base pt-2">
                              <span>الإجمالي المطلوب:</span>
                              <span>{new Intl.NumberFormat('en-US').format(order.total)} ل.س</span>
                            </div>
                            <div className="flex justify-between text-primary font-black text-lg p-3 bg-primary/10 rounded-xl mt-2">
                              <span>المدفوع:</span>
                              <span>{new Intl.NumberFormat('en-US').format(order.paid_amount)} ل.س</span>
                            </div>
                            {order.debt_amount > 0 && (
                              <div className="flex justify-between text-destructive font-black text-lg p-3 bg-destructive/10 rounded-xl mt-2 border border-destructive/20">
                                <span>المتبقي (دين):</span>
                                <span>{new Intl.NumberFormat('en-US').format(order.debt_amount)} ل.س</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                   </div>
                 )}
               </div>
            </div>
        </div>
        )}
      </ModalPortal>

      {/* Pay Modal */}
      <AnimatePresence>
        {isPayModalOpen && (
          <ModalPortal isOpen={!!selectedCustomer} onClose={closeCustomerDetails}>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={closePayModal} />
              <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl relative z-10 p-8 space-y-6">
                <h3 className="font-black text-2xl">تسديد دفعة</h3>
                
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex justify-between items-center">
                  <span className="font-bold text-destructive">إجمالي الدين الحالي:</span>
                  <div className="flex flex-col text-right">
                        {(selectedCustomer?.total_debt ?? 0) > 0 && <span className="font-black text-lg text-destructive">{new Intl.NumberFormat('en-US').format(selectedCustomer?.total_debt || 0)} ل.س</span>}
                        {((selectedCustomer?.total_debt_usd) ?? 0) > 0 && <span className="font-black text-lg text-destructive">{new Intl.NumberFormat('en-US').format(selectedCustomer?.total_debt_usd || 0)} USD</span>}
                    </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-2">طريقة التسديد (اختياري)</label>
                    <SearchableSelect
                      options={[
                        { label: 'تسديد من إجمالي الدين (تلقائي)', value: '' },
                        ...(selectedCustomer?.orders?.filter(o => o.debt_amount > 0).map(o => ({
                          label: `فاتورة #${o.id} - باقي عليها: ${new Intl.NumberFormat('en-US').format(o.debt_amount)} ل.س`,
                          value: o.id
                        })) || [])
                      ]}
                      value={payOrderId || ''}
                      onChange={v => setPayOrderId(v ? Number(v) : '')}
                      className="w-full"
                      buttonClassName="h-12 rounded-xl px-4 text-sm font-semibold border-border/50 bg-secondary/30"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-muted-foreground">المبلغ</label>
                        <div className="flex gap-3">
                            <label className="text-xs font-bold flex items-center gap-1 cursor-pointer"><input type="radio" name="payCurrency" checked={payCurrency === 'SYP'} onChange={() => setPayCurrency('SYP')} /> ل.س</label>
                            <label className="text-xs font-bold flex items-center gap-1 cursor-pointer"><input type="radio" name="payCurrency" checked={payCurrency === 'USD'} onChange={() => setPayCurrency('USD')} /> USD</label>
                        </div>
                    </div>
                    <input type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full bg-secondary/30 border border-border/50 rounded-xl h-12 px-4 outline-none focus:border-primary font-bold text-lg" placeholder="مثال: 50000" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-2">ملاحظات إضافية</label>
                    <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} className="w-full bg-secondary/30 border border-border/50 rounded-xl h-12 px-4 outline-none focus:border-primary font-semibold" placeholder="دفعة نقدية، تحويل..." />
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={handlePayDebt} className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all" disabled={payMutation.isPending || !payAmount}>
                    {payMutation.isPending ? 'جاري الدفع...' : 'تأكيد ودفع'}
                  </button>
                </div>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomersPage;
