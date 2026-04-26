import SearchableSelect from '../components/ui/SearchableSelect';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, Calendar as CalendarIcon, TrendingDown, Settings2 } from 'lucide-react';
import { isWithinInterval } from 'date-fns';
import api from '../services/api';
import ModalPortal from '../components/ui/ModalPortal';
import ViewToggle from '../components/ui/ViewToggle';
import DateRangeSelector, { type DateRange } from '../components/ui/DateRangeSelector';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(() => {
    const stored = localStorage.getItem('expenseCategoriesV2');
    if (stored) return JSON.parse(stored);
    const oldCustom = JSON.parse(localStorage.getItem('customExpenseCategories') || '[]');
    const defaultCats = ['إيجار', 'كهرباء وماء', 'مستلزمات تنظيف', 'أكل / مشروبات', 'رواتب وسلف', 'صيانة', 'شراء بضاعة', 'أخرى'];
    const merged = Array.from(new Set([...defaultCats, ...oldCustom]));
    localStorage.setItem('expenseCategoriesV2', JSON.stringify(merged));
    return merged;
  });
  
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    category: 'أخرى',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    currency: 'SYP'
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => (await api.get('/transactions')).data,
    refetchInterval: 3000
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.post('/transactions', data),
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);
      
      queryClient.setQueryData(['transactions'], (old: any) => [
        { ...newExpense, id: Date.now(), type: 'EXPENSE' },
        ...(old || [])
      ]);
      
      return { previousTransactions };
    },
    onError: (_err, _newExpense, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/transactions/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);
      
      queryClient.setQueryData(['transactions'], (old: any) => 
        (old || []).filter((t: any) => t.id !== id)
      );
      
      return { previousTransactions };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    saveMutation.mutate(formData);
    setIsModalOpen(false);
    setFormData({ type: 'EXPENSE', category: 'أخرى', amount: 0, date: new Date().toISOString().split('T')[0], notes: '', currency: 'SYP' });
  };

  const saveCategories = (cats: string[]) => {
    setCategories(cats);
    localStorage.setItem('expenseCategoriesV2', JSON.stringify(cats));
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || categories.includes(newCategoryName.trim())) return;
    saveCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName('');
  };

  const handleUpdateCategory = (index: number, newValue: string) => {
    const updated = [...categories];
    updated[index] = newValue;
    saveCategories(updated);
  };

  const handleDeleteCategory = (index: number) => {
    if (categories.length <= 1) return alert('لا يمكن حذف جميع التصنيفات!');
    const updated = categories.filter((_, i) => i !== index);
    saveCategories(updated);
  };


  const filteredExpenses = useMemo(() => {
    let filtered = transactions.filter((t: any) => t.type === 'EXPENSE');
    filtered = filtered.filter((t: any) => {
      if (!dateRange) return true;
      return isWithinInterval(new Date(t.date), { start: dateRange.start, end: dateRange.end });
    });
    if (categoryFilter !== 'ALL') filtered = filtered.filter((t: any) => t.category === categoryFilter);
    if (searchQuery) filtered = filtered.filter((t: any) => (t.notes && t.notes.includes(searchQuery)) || (t.category && t.category.includes(searchQuery)));
    return filtered;
  }, [transactions, dateRange, categoryFilter, searchQuery]);

  const { totalExpenseSyp, totalExpenseUsd } = useMemo(() => {
    return filteredExpenses.reduce((acc: any, t: any) => {
      if ((t.currency || 'SYP') === 'USD') {
        acc.totalExpenseUsd += Number(t.amount);
      } else {
        acc.totalExpenseSyp += Number(t.amount);
      }
      return acc;
    }, { totalExpenseSyp: 0, totalExpenseUsd: 0 });
  }, [filteredExpenses]);

  const confirmDelete = () => {
    if (expenseToDelete !== null) {
      deleteMutation.mutate(expenseToDelete);
      setDeleteModalOpen(false);
      setExpenseToDelete(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">المصروفات</h1>
          <p className="text-muted-foreground mt-2 text-base font-medium">سجل المصروفات وإدارتها</p>
        </div>
        <div className="text-left bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-4 shadow-sm flex flex-col items-end min-w-[200px]">
           <span className="text-sm font-bold text-muted-foreground mb-1">إجمالي مصروفات الفترة</span>
           {totalExpenseSyp > 0 && <span className="text-2xl font-bold text-rose-600">SYP {totalExpenseSyp.toLocaleString()}</span>}
           {totalExpenseUsd > 0 && <span className="text-2xl font-bold text-rose-600">${totalExpenseUsd.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>}
           {totalExpenseSyp === 0 && totalExpenseUsd === 0 && <span className="text-2xl font-bold text-rose-600">SYP 0</span>}
        </div>
      </div>

      <div className="z-10 relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-sm p-5 flex flex-col gap-5">
        {/* Top Controls Row */}
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 overflow-x-auto hide-scrollbar w-full 2xl:w-auto">
            <DateRangeSelector onChange={setDateRange} />
          </div>
          
          <div className="flex items-center gap-3 w-full 2xl:w-auto justify-end shrink-0">
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            <button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap">
              <Plus className="w-5 h-5" /> إضافة مصروف
            </button>
          </div>
        </div>

        {/* Bottom Search & Filter Row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative flex-1 w-full">
            <input type="text" placeholder="ابحث في البيان..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-background border border-border/50 rounded-full px-5 py-3 pr-11 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground shadow-sm" />
            <Search className="w-5 h-5 absolute top-1/2 -translate-y-1/2 right-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="w-full sm:w-[300px] shrink-0 flex gap-2">
              <div className="flex-1">
            <SearchableSelect
              options={[
                { label: 'كل الفئات', value: 'ALL' },
                ...categories.map(c => ({ label: c, value: c }))
              ]}
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(String(v))}
              buttonClassName="h-[46px] rounded-full px-5 text-sm font-bold bg-background shadow-sm border-border/50"
            />
              </div>
              <button 
                onClick={() => setIsManageCategoriesModalOpen(true)}
                className="shrink-0 w-[46px] h-[46px] flex items-center justify-center rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
                title="إدارة الفئات"
              >
                <Settings2 className="w-5 h-5" />
              </button>
          </div>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground font-medium">جاري تحميل السجل...</div>
        ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border/50 text-muted-foreground text-sm font-bold">
                    <th className="p-5 whitespace-nowrap w-1/3">البيان والتفاصيل</th>
                    <th className="p-5 whitespace-nowrap">الفئة</th>
                    <th className="p-5 whitespace-nowrap">التاريخ</th>
                    <th className="p-5 whitespace-nowrap text-left w-1/4">المبلغ والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredExpenses.map((t: any) => (
                    <tr key={t.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="p-5 font-bold text-foreground flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center"><TrendingDown className="w-4 h-4"/></div>
                        {t.notes || 'بدون بيان'}
                      </td>
                      <td className="p-5"><span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">{t.category}</span></td>
                      <td className="p-5 text-sm font-semibold text-muted-foreground">{t.date}</td>
                      <td className="p-5">
                        <div className="flex items-center justify-end gap-6">
                          <div className="text-left">
                            <div className="font-bold text-lg text-rose-600">{(t.currency || 'SYP') === 'USD' ? '$' : ''}{Number(t.amount).toLocaleString(undefined, {minimumFractionDigits: (t.currency || 'SYP') === 'USD' ? 2 : 0})}
      </div>
                            <div className="text-xs font-bold text-muted-foreground uppercase">{(t.currency || 'SYP') === 'USD' ? 'USD' : 'SYP'}</div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button onClick={() => { setExpenseToDelete(t.id); setDeleteModalOpen(true); }} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (<tr><td colSpan={4} className="p-12 text-center text-muted-foreground font-medium">لا توجد مصروفات مسجلة لهذه الفترة.</td></tr>)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
              {filteredExpenses.map((t: any) => (
                <div key={t.id} className="bg-background rounded-3xl p-5 border border-border/50 shadow-sm flex flex-col group hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                      {t.category}
                    </span>
                  </div>
                  <div className="flex-1 mb-4">
                    <h3 className="font-bold text-foreground text-lg mb-1">{t.notes || 'بدون بيان'}</h3>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" /> {t.date}
                    </p>
                  </div>
                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-border/30">
                    <div>
                      <div className="text-xs font-bold text-muted-foreground uppercase mb-0.5">المبلغ</div>
                      <div className="font-bold text-xl text-rose-600 flex items-baseline gap-1">
                        {(t.currency || 'SYP') === 'USD' ? '$' : ''}{Number(t.amount).toLocaleString(undefined, {minimumFractionDigits: (t.currency || 'SYP') === 'USD' ? 2 : 0})} <span className="text-xs">{(t.currency || 'SYP') === 'USD' ? 'USD' : 'SYP'}</span>
                      </div>
                    </div>
                    <button onClick={() => { setExpenseToDelete(t.id); setDeleteModalOpen(true); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors group-hover:opacity-100 opacity-0 md:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredExpenses.length === 0 && (
                <div className="col-span-full p-12 text-center text-muted-foreground font-medium">لا توجد مصروفات مسجلة لهذه الفترة.</div>
              )}
            </div>
          )}
      </div>

      <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-card w-full max-w-md rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.15)] border border-border/50 animate-in zoom-in-95 duration-300 mx-4">
          <div className="px-8 py-6 rounded-t-[2.5rem] border-b border-border/30 flex justify-center items-center bg-secondary/10 relative">
            <h2 className="text-xl font-bold tracking-tight text-primary">إضافة مصروف جديد</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-1.5"><label className="block text-xs font-bold text-muted-foreground pr-2">البيان</label><input required type="text" className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="مثال: فاتورة كهرباء شهر سبتمبر"/></div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pr-2 mb-1.5">
                  <label className="block text-xs font-bold text-muted-foreground">الفئة</label>
                  <button type="button" onClick={() => {setIsManageCategoriesModalOpen(true); setIsModalOpen(false);}} className="text-[10px] bg-secondary/50 px-2 py-1 rounded-md text-foreground font-bold hover:bg-secondary transition-colors">إدارة الفئات</button>
                </div>
              <SearchableSelect
                options={categories.map(c => ({ label: c, value: c }))}
                value={formData.category}
                onChange={(v) => setFormData({...formData, category: String(v)})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-muted-foreground pr-2">المبلغ والعملة</label>
              <div className="flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <div className="absolute right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg">
                    {formData.currency || 'SYP'}
                  </div>
                  <input required type="number" min="0.01" step="0.01" className="w-full bg-secondary/30 border border-border/50 rounded-2xl pr-14 pl-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} placeholder="مثال: 75000" />
                </div>
                <select 
                  className="bg-secondary/30 border border-border/50 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none"
                  value={formData.currency || 'SYP'}
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                >
                  <option value="SYP">ل.س (SYP)</option>
                  <option value="USD">دولار (USD)</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5"><label className="block text-xs font-bold text-muted-foreground pr-2">التاريخ</label><div className="relative"><input required type="date" className="appearance-none w-full bg-secondary/30 border border-border/50 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /><CalendarIcon className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-4 text-muted-foreground pointer-events-none" /></div></div>
            <div className="pt-4 flex gap-3">
              <button type="submit" disabled={saveMutation.isPending} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95">{saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold py-3.5 rounded-2xl transition-all active:scale-95">إلغاء</button>
            </div>
          </form>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <div className="bg-card w-full max-w-sm rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.15)] border border-border/50 animate-in zoom-in-95 duration-300 mx-4 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">تأكيد الحذف</h2>
          <p className="text-sm text-muted-foreground font-medium mb-6">هل أنت متأكد من رغبتك في حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <div className="flex gap-3">
            <button onClick={confirmDelete} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold py-3 rounded-2xl shadow-lg shadow-destructive/20 transition-all active:scale-95">حذف</button>
            <button onClick={() => setDeleteModalOpen(false)} className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold py-3 rounded-2xl transition-all active:scale-95">إلغاء</button>
          </div>
        </div>
      </ModalPortal>

      <ModalPortal isOpen={isManageCategoriesModalOpen} onClose={() => setIsManageCategoriesModalOpen(false)}>
        <div className="bg-card w-full max-w-md rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.15)] border border-border/50 animate-in zoom-in-95 duration-300 mx-4 p-8 relative z-[200]">
          <h3 className="text-xl font-black mb-6 text-center">إدارة التصنيفات</h3>
          
          <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {categories.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <input 
                  type="text" 
                  value={cat} 
                  onChange={e => handleUpdateCategory(idx, e.target.value)} 
                  className="flex-1 bg-secondary/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none"
                />
                <button type="button" onClick={() => handleDeleteCategory(idx)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2.5 rounded-xl transition-all opacity-100 sm:opacity-50 sm:group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCategory} className="flex items-center gap-2 mb-6 pt-4 border-t border-border/50">
            <input type="text" className="flex-1 bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="تصنيف جديد..." />
            <button type="submit" disabled={!newCategoryName.trim()} className="bg-primary text-primary-foreground font-black px-6 py-3 rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100">
              إضافة
            </button>
          </form>

          <button type="button" onClick={() => setIsManageCategoriesModalOpen(false)} className="w-full bg-secondary text-secondary-foreground font-black py-3.5 rounded-xl hover:bg-secondary/80 transition-all active:scale-95">
            تم، إغلاق
          </button>
        </div>
      </ModalPortal>
    </div>
  );
}
