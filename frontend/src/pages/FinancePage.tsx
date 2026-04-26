import SearchableSelect from '../components/ui/SearchableSelect';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import api from '../services/api';

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filters
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH'>('MONTH');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    category: 'أخرى',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.post('/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsModalOpen(false);
      setFormData({ type: 'EXPENSE', category: 'أخرى', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const categories = ['إيجار', 'كهرباء وماء', 'مستلزمات تنظيف', 'أكل / مشروبات', 'رواتب وسلف', 'صيانة', 'أخرى'];

  // Filter logic
  const filteredExpenses = useMemo(() => {
    let filtered = transactions.filter((t: any) => t.type === 'EXPENSE');

    // Time filter
    const now = new Date();
    filtered = filtered.filter((t: any) => {
      if (timeFilter === 'ALL') return true;
      const tDate = new Date(t.date);
      if (timeFilter === 'DAY') return tDate.toDateString() === now.toDateString();
      if (timeFilter === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return tDate >= weekAgo;
      }
      if (timeFilter === 'MONTH') {
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((t: any) => t.category === categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((t: any) => 
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  }, [transactions, timeFilter, categoryFilter, searchQuery]);

  const totalExpense = filteredExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  
  // Calculate total Treasury Balance (from ALL transactions, including Income from POS)
  const totalIncomeAll = transactions.filter((t: any) => t.type === 'INCOME').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const totalExpenseAll = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const treasuryBalance = totalIncomeAll - totalExpenseAll;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      
      {/* Header section similar to user screenshot */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">المصروفات</h1>
          <p className="text-muted-foreground mt-2 text-base font-medium">سجل المصروفات وإدارتها</p>
        </div>

        <div className="text-left bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-4 shadow-sm flex flex-col items-end min-w-[200px]">
           <span className="text-sm font-bold text-muted-foreground mb-1">المجموع (للفترة المحددة)</span>
           <span className="text-3xl font-bold text-primary">SYP {totalExpense.toLocaleString()}</span>
        </div>
      </div>

      {/* Treasury Info (Extra value for the user) */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-full"><DollarSign className="w-5 h-5 text-emerald-700" /></div>
          <div>
            <span className="block text-sm font-bold text-emerald-800">رصيد الصندوق الإجمالي</span>
            <span className="block text-xs font-semibold text-emerald-600/80">المبيعات (تضاف آلياً) - كافة المصروفات</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-emerald-700">SYP {treasuryBalance.toLocaleString()}</div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-sm p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Right side filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Time Tabs */}
          <div className="flex bg-secondary/50 p-1 rounded-full border border-border/50">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'DAY', label: 'يوم' },
              { id: 'WEEK', label: 'أسبوع' },
              { id: 'MONTH', label: 'شهر' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setTimeFilter(p.id as any)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  timeFilter === p.id 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="w-48">
            <SearchableSelect
              options={[
                { label: 'كل الفئات', value: 'ALL' },
                ...categories.map(c => ({ label: c, value: c }))
              ]}
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(String(v))}
            />
          </div>
        </div>

        {/* Search & Add Button */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <input 
              type="text" 
              placeholder="ابحث في البيان..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/50 border border-border/50 rounded-full px-5 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-4 text-muted-foreground pointer-events-none" />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            إضافة
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground font-medium">جاري تحميل السجل...</div>
        ) : (
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
                    <td className="p-5 font-bold text-foreground">
                      {t.notes || 'بدون بيان'}
                    </td>
                    <td className="p-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                        {t.category}
                      </span>
                    </td>
                    <td className="p-5 text-sm font-semibold text-muted-foreground">
                      {t.date}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-end gap-6">
                        <div className="text-left">
                          <div className="font-bold text-lg text-primary">{Number(t.amount).toLocaleString()}</div>
                          <div className="text-xs font-bold text-muted-foreground uppercase">SYP</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button 
                            onClick={() => { if(confirm('هل أنت متأكد من الحذف؟')) deleteMutation.mutate(t.id) }}
                            className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-muted-foreground font-medium">
                      لا توجد مصروفات مسجلة لهذه الفترة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-card w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.15)] overflow-hidden border border-border/50 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-border/30 flex justify-center items-center bg-secondary/10 relative">
              <h2 className="text-xl font-bold tracking-tight text-primary">إضافة مصروف جديد</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground pr-2">البيان</label>
                <input 
                  required 
                  type="text" 
                  className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="مثال: فاتورة كهرباء شهر سبتمبر"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground pr-2">الفئة</label>
                <SearchableSelect
                  options={categories.map(c => ({ label: c, value: c }))}
                  value={formData.category}
                  onChange={(v) => setFormData({...formData, category: String(v)})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground pr-2">المبلغ</label>
                <div className="relative flex items-center">
                  <div className="absolute right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg">
                    SYP
                  </div>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    className="w-full bg-secondary/30 border border-border/50 rounded-2xl pr-14 pl-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none" 
                    value={formData.amount || ''} 
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                    placeholder="مثال: 75000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground pr-2">التاريخ</label>
                <div className="relative">
                  <input 
                    required 
                    type="date" 
                    className="appearance-none w-full bg-secondary/30 border border-border/50 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:bg-background transition-all outline-none" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                  />
                  <CalendarIcon className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="submit" 
                  disabled={saveMutation.isPending} 
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3.5 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold py-3.5 rounded-2xl transition-all active:scale-95"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
