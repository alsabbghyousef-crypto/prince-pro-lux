import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, Clock, DollarSign, Briefcase, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import ModalPortal from '../components/ui/ModalPortal';
import ViewToggle from '../components/ui/ViewToggle';

interface User {
  id: number;
  name: string;
  role: string | null;
  salary: number | null;
  join_date: string | null;
  shift_start: string | null;
  shift_end: string | null;
}

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
  allowed_pages: string[];
  actions?: Record<string, boolean>;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  // Modal tabs
  const [modalTab, setModalTab] = useState<'INFO' | 'LEAVES' | 'PAYROLL'>('INFO');

  const [formData, setFormData] = useState({
    name: '', password: '', role: '', salary: 0, join_date: '', shift_start: '', shift_end: ''
  });

  const [leaveData, setLeaveData] = useState({ start_date: '', end_date: '', is_paid: false, reason: '' });
  const [paymentData, setPaymentData] = useState({ amount: 0, type: 'SALARY', month: new Date().getMonth()+1, year: new Date().getFullYear(), date: new Date().toISOString().split('T')[0], notes: '' });

  // Users Query
  const { data: users = [], isLoading } = useQuery<User[]>({ 
    queryKey: ['users'], 
    queryFn: async () => (await api.get('/users')).data, 
    refetchInterval: 4000 
  });

  // Roles Query from Settings
  const { data: rolesData } = useQuery<{ roles: RoleDefinition[] }>({
    queryKey: ['roles-permissions'],
    queryFn: async () => (await api.get('/settings/roles-permissions')).data,
  });

  const definedRoles = useMemo(() => {
    return rolesData?.roles || [
      { id: 'ADMIN', name: 'مدير النظام', description: 'كامل الصلاحيات', allowed_pages: ['dashboard', 'sales', 'orders', 'items', 'datasheets', 'customers', 'expenses', 'exchange-rates', 'users', 'settings'] },
      { id: 'SELLER', name: 'كاشير / بائع', description: 'وصول للمبيعات ونقطة البيع', allowed_pages: ['sales', 'orders', 'customers'] },
      { id: 'ACCOUNTANT', name: 'محاسب مالي', description: 'وصول للمحاسبة والتقارير', allowed_pages: ['dashboard', 'orders', 'customers', 'expenses', 'exchange-rates'] },
      { id: 'INVENTORY', name: 'أمين مستودع', description: 'وصول للمنتجات والمخزون', allowed_pages: ['items', 'datasheets'] },
    ];
  }, [rolesData]);

  const { data: payrollData, refetch: refetchPayroll } = useQuery({
    queryKey: ['payroll', editingUser?.id],
    queryFn: async () => (await api.get(`/payroll/${editingUser?.id}`)).data,
    enabled: !!editingUser && (modalTab === 'LEAVES' || modalTab === 'PAYROLL')
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => editingUser ? api.put(`/users/${editingUser.id}`, data) : api.post('/users', data),
    onMutate: async (newUserData) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData<User[]>(['users']);
      queryClient.setQueryData<User[]>(['users'], (old) => {
        if (!old) return old;
        if (editingUser) {
          return old.map(u => u.id === editingUser.id ? { ...u, ...newUserData, id: u.id } as User : u);
        } else {
          return [...old, { id: Date.now(), ...newUserData } as User];
        }
      });
      return { previousUsers };
    },
    onError: (_err, _newUserData, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData<User[]>(['users']);
      queryClient.setQueryData<User[]>(['users'], (old) => {
        if (!old) return old;
        return old.filter(u => u.id !== id);
      });
      return { previousUsers };
    },
    onError: (_err, _id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const addLeaveMutation = useMutation({
    mutationFn: (data: typeof leaveData) => api.post('/payroll/leaves', { ...data, user_id: editingUser?.id }),
    onMutate: async (newLeave) => {
      const queryKey = ['payroll', editingUser?.id];
      await queryClient.cancelQueries({ queryKey });
      const previousPayroll = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, leaves: [...(old.leaves || []), { id: Date.now(), ...newLeave }] };
      });
      return { previousPayroll };
    },
    onError: (_err, _newLeave, context) => {
      if (context?.previousPayroll) {
        queryClient.setQueryData(['payroll', editingUser?.id], context.previousPayroll);
      }
    },
    onSettled: () => {
      refetchPayroll();
    }
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/payroll/leaves/${id}`),
    onMutate: async (id) => {
      const queryKey = ['payroll', editingUser?.id];
      await queryClient.cancelQueries({ queryKey });
      const previousPayroll = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, leaves: (old.leaves || []).filter((l: any) => l.id !== id) };
      });
      return { previousPayroll };
    },
    onError: (_err, _id, context) => {
      if (context?.previousPayroll) {
        queryClient.setQueryData(['payroll', editingUser?.id], context.previousPayroll);
      }
    },
    onSettled: () => {
      refetchPayroll();
    }
  });

  const addPaymentMutation = useMutation({
    mutationFn: (data: typeof paymentData) => api.post('/payroll/payments', { ...data, user_id: editingUser?.id }),
    onMutate: async (newPayment) => {
      const queryKey = ['payroll', editingUser?.id];
      await queryClient.cancelQueries({ queryKey });
      const previousPayroll = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, payments: [...(old.payments || []), { id: Date.now(), ...newPayment }] };
      });
      return { previousPayroll };
    },
    onError: (_err, _newPayment, context) => {
      if (context?.previousPayroll) {
        queryClient.setQueryData(['payroll', editingUser?.id], context.previousPayroll);
      }
    },
    onSettled: () => {
      refetchPayroll();
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/payroll/payments/${id}`),
    onMutate: async (id) => {
      const queryKey = ['payroll', editingUser?.id];
      await queryClient.cancelQueries({ queryKey });
      const previousPayroll = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, payments: (old.payments || []).filter((p: any) => p.id !== id) };
      });
      return { previousPayroll };
    },
    onError: (_err, _id, context) => {
      if (context?.previousPayroll) {
        queryClient.setQueryData(['payroll', editingUser?.id], context.previousPayroll);
      }
    },
    onSettled: () => {
      refetchPayroll();
    }
  });

  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    saveMutation.mutate(formData); 
    setIsModalOpen(false);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ 
      name: user.name, 
      password: '', 
      role: user.role || (definedRoles[0]?.id || 'SELLER'), 
      salary: user.salary || 0, 
      join_date: user.join_date ? String(user.join_date).substring(0, 10) : '', 
      shift_start: user.shift_start ? String(user.shift_start).substring(0, 5) : '', 
      shift_end: user.shift_end ? String(user.shift_end).substring(0, 5) : '' 
    });
    setModalTab('INFO');
    setIsModalOpen(true);
  };

  // Helper to resolve role name
  const getRoleDisplayName = (roleVal: string | null) => {
    if (!roleVal) return 'بدون مسمى';
    const found = definedRoles.find(r => r.id === roleVal || r.name === roleVal);
    return found ? found.name : roleVal;
  };

  // Filter tabs: combine defined roles
  const filterTabs = useMemo(() => {
    const list = [{ id: 'ALL', name: `الكل (${users.length})` }];
    definedRoles.forEach(r => {
      const count = users.filter(u => u.role === r.id || u.role === r.name).length;
      list.push({ id: r.id, name: `${r.name} (${count})` });
    });
    return list;
  }, [definedRoles, users]);

  const filteredUsers = useMemo(() => {
    if (activeTab === 'ALL') return users;
    return users.filter((u) => u.role === activeTab || getRoleDisplayName(u.role) === activeTab);
  }, [users, activeTab, definedRoles]);

  const selectedRoleObj = definedRoles.find(r => r.id === formData.role || r.name === formData.role);

  // Map page ids to Arabic names for preview
  const PAGE_NAMES_MAP: Record<string, string> = {
    dashboard: 'لوحة التحكم',
    sales: 'نقطة البيع (POS)',
    orders: 'سجل المبيعات',
    items: 'المنتجات والمخزون',
    datasheets: 'ملفات الداتا شيت',
    customers: 'العملاء والديون',
    expenses: 'المصروفات',
    'exchange-rates': 'سعر الصرف',
    users: 'الموظفين والمستخدمين',
    settings: 'إعدادات النظام',
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-medium">جاري التحميل...</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">الموارد البشرية والمستخدمين</h1>
          <p className="text-muted-foreground mt-2 text-base font-medium">إدارة الكادر، الرواتب، الإجازات، وتعيين المسميات الوظيفية</p>
        </div>
        <div className="flex items-center gap-4">
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          <button 
            onClick={() => { 
              setEditingUser(null); 
              setFormData({ 
                name: '', 
                password: '', 
                role: definedRoles[1]?.id || definedRoles[0]?.id || 'SELLER', 
                salary: 0, 
                join_date: new Date().toISOString().split('T')[0], 
                shift_start: '09:00', 
                shift_end: '18:00' 
              }); 
              setModalTab('INFO'); 
              setIsModalOpen(true); 
            }} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> موظف جديد
          </button>
        </div>
      </div>

      {/* Filter Tabs by Defined Roles */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {filterTabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-foreground text-background shadow-md transform scale-105' 
                : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              onClick={() => openEdit(user)} 
              className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xl font-bold text-primary shadow-inner">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl tracking-tight text-foreground">{user.name}</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground mt-1 bg-secondary/50 px-2.5 py-1 rounded-full">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/40 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1"><DollarSign className="w-3.5 h-3.5" /> الراتب</div>
                    <div className="font-bold text-foreground">{user.salary ? Number(user.salary).toLocaleString() : '0'} ل.س</div>
                  </div>
                  <div className="bg-secondary/40 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1"><Clock className="w-3.5 h-3.5" /> الدوام</div>
                    <div className="font-bold text-foreground truncate text-sm mt-0.5">{user.shift_start ? String(user.shift_start).substring(0,5) : '-'} إلى {user.shift_end ? String(user.shift_end).substring(0,5) : '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-secondary/40 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">الاسم</th>
                  <th className="px-6 py-4">المسمى الوظيفي</th>
                  <th className="px-6 py-4">الراتب</th>
                  <th className="px-6 py-4">أوقات الدوام</th>
                  <th className="px-6 py-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{user.name}</td>
                    <td className="px-6 py-4 font-semibold text-primary">{getRoleDisplayName(user.role)}</td>
                    <td className="px-6 py-4">{user.salary ? Number(user.salary).toLocaleString() : '0'} ل.س</td>
                    <td className="px-6 py-4">{user.shift_start ? String(user.shift_start).substring(0,5) : '-'} إلى {user.shift_end ? String(user.shift_end).substring(0,5) : '-'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openEdit(user)} className="text-primary hover:underline font-semibold">
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <ModalPortal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-card w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.15)] overflow-hidden border border-border/50 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="px-8 py-6 border-b border-border/30 flex justify-between items-center bg-secondary/20">
                <h2 className="text-2xl font-bold tracking-tight">{editingUser ? 'ملف الموظف' : 'موظف جديد'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              {editingUser && (
                <div className="flex gap-2 p-4 bg-secondary/10 border-b border-border/30 overflow-x-auto">
                  <button onClick={() => setModalTab('INFO')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${modalTab === 'INFO' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:bg-secondary/50'}`}>البيانات الشخصية</button>
                  <button onClick={() => setModalTab('LEAVES')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${modalTab === 'LEAVES' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:bg-secondary/50'}`}>سجل الإجازات</button>
                  <button onClick={() => setModalTab('PAYROLL')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${modalTab === 'PAYROLL' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:bg-secondary/50'}`}>الرواتب والسلف</button>
                </div>
              )}
              
              <div className="p-8 max-h-[65vh] overflow-y-auto">
                {modalTab === 'INFO' && (
                  <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name */}
                    <div className="group">
                      <label className="block text-sm font-semibold mb-2 text-muted-foreground">الاسم الكامل</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full bg-secondary/30 border-0 rounded-2xl px-4 py-3.5 text-base font-medium focus:ring-2 focus:ring-primary outline-none" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        placeholder="اسم الموظف"
                      />
                    </div>

                    {/* Role Selector (Connected to Defined Roles) */}
                    <div className="group space-y-2">
                      <label className="block text-sm font-semibold text-muted-foreground">
                        المسمى الوظيفي (التصنيف)
                      </label>
                      <select 
                        required 
                        className="w-full bg-secondary/30 border-0 rounded-2xl px-4 py-3.5 text-base font-bold focus:ring-2 focus:ring-primary outline-none cursor-pointer" 
                        value={formData.role} 
                        onChange={e => setFormData({...formData, role: e.target.value})}
                      >
                        {definedRoles.map(r => (
                          <option key={r.id} value={r.id} className="bg-card text-foreground font-bold">
                            {r.name} {r.id === 'ADMIN' ? '(كامل الصلاحيات)' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Role Pages & Permissions Preview */}
                      {selectedRoleObj && (
                        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>الصفحات المتاحة لهذا المسمى في القائمة:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedRoleObj.allowed_pages.map(pid => (
                              <span key={pid} className="px-2 py-0.5 bg-background border border-border/60 rounded-md text-[11px] font-bold text-foreground shadow-xs">
                                {PAGE_NAMES_MAP[pid] || pid}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {selectedRoleObj.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Salary & Join Date */}
                    <div className="grid grid-cols-2 gap-5">
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-muted-foreground">الراتب (ل.س)</label>
                        <input 
                          type="number" 
                          min="0" 
                          className="w-full bg-secondary/30 border-0 rounded-2xl px-4 py-3.5 text-base font-medium focus:ring-2 focus:ring-primary outline-none" 
                          value={formData.salary} 
                          onChange={e => setFormData({...formData, salary: Number(e.target.value)})} 
                        />
                      </div>
                      <div className="group">
                        <label className="block text-sm font-semibold mb-2 text-muted-foreground">تاريخ المباشرة</label>
                        <input 
                          type="date" 
                          className="w-full bg-secondary/30 border-0 rounded-2xl px-4 py-3.5 text-base font-medium focus:ring-2 focus:ring-primary outline-none" 
                          value={formData.join_date} 
                          onChange={e => setFormData({...formData, join_date: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* Shift Times */}
                    <div className="bg-secondary/20 p-5 rounded-3xl border border-border/50">
                      <h4 className="text-sm font-bold mb-4 text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" /> أوقات الدوام
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold mb-2 text-muted-foreground">من الساعة</label>
                          <input 
                            type="time" 
                            className="w-full bg-background border-0 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none" 
                            value={formData.shift_start} 
                            onChange={e => setFormData({...formData, shift_start: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-2 text-muted-foreground">إلى الساعة</label>
                          <input 
                            type="time" 
                            className="w-full bg-background border-0 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none" 
                            value={formData.shift_end} 
                            onChange={e => setFormData({...formData, shift_end: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="group pt-2">
                      <label className="block text-sm font-semibold mb-2 text-muted-foreground">
                        {editingUser ? 'كلمة المرور (اختياري لولوج النظام)' : 'كلمة المرور (اختياري لولوج النظام)'}
                      </label>
                      <input 
                        type={editingUser ? "text" : "password"} 
                        placeholder={editingUser ? "اتركه فارغاً لعدم التغيير" : "أدخل كلمة مرور إن أردت إعطاءه وصول للنظام"} 
                        className="w-full bg-secondary/30 border-0 rounded-2xl px-4 py-3.5 text-base font-medium focus:ring-2 focus:ring-primary outline-none" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                      />
                    </div>
                  </form>
                )}

                {modalTab === 'LEAVES' && (
                  <div className="space-y-6">
                    <form onSubmit={e => { e.preventDefault(); addLeaveMutation.mutate(leaveData); setLeaveData({ start_date: '', end_date: '', is_paid: false, reason: '' }); }} className="bg-secondary/10 p-5 rounded-3xl border border-border/50 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-semibold mb-1">من تاريخ</label><input required type="date" className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none" value={leaveData.start_date} onChange={e => setLeaveData({...leaveData, start_date: e.target.value})} /></div>
                        <div><label className="block text-xs font-semibold mb-1">إلى تاريخ</label><input required type="date" className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none" value={leaveData.end_date} onChange={e => setLeaveData({...leaveData, end_date: e.target.value})} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="is_paid" checked={leaveData.is_paid} onChange={e => setLeaveData({...leaveData, is_paid: e.target.checked})} className="w-4 h-4 rounded text-primary" />
                        <label htmlFor="is_paid" className="text-sm font-bold">إجازة مدفوعة الأجر (لا تخصم من الراتب)</label>
                      </div>
                      <textarea placeholder="سبب الإجازة (اختياري)" className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none resize-none" rows={2} value={leaveData.reason} onChange={e => setLeaveData({...leaveData, reason: e.target.value})} />
                      <button type="submit" disabled={addLeaveMutation.isPending} className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-xl text-sm w-full">إضافة إجازة</button>
                    </form>
                    <div className="space-y-3">
                      {payrollData?.leaves?.map((l: any) => (
                        <div key={l.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border border-border/30">
                          <div>
                            <div className="font-bold text-sm flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-primary" /> {l.start_date} إلى {l.end_date}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {l.is_paid ? <span className="text-emerald-600 font-bold">مدفوعة الأجر</span> : <span className="text-rose-600 font-bold">غير مدفوعة (مخصومة)</span>} 
                              {l.reason && ` - ${l.reason}`}
                            </div>
                          </div>
                          <button onClick={() => { if(confirm('متأكد؟')) deleteLeaveMutation.mutate(l.id) }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {payrollData?.leaves?.length === 0 && <div className="text-center text-sm text-muted-foreground">لا توجد إجازات مسجلة</div>}
                    </div>
                  </div>
                )}

                {modalTab === 'PAYROLL' && (
                  <div className="space-y-6">
                    <form onSubmit={e => { e.preventDefault(); addPaymentMutation.mutate(paymentData); setPaymentData({...paymentData, amount: 0, notes: ''}); }} className="bg-secondary/10 p-5 rounded-3xl border border-border/50 space-y-4">
                      <div className="flex bg-secondary/30 rounded-xl p-1 gap-1 border border-border/50">
                        <button type="button" onClick={() => setPaymentData({...paymentData, type: 'ADVANCE'})} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${paymentData.type === 'ADVANCE' ? 'bg-background shadow text-rose-600' : 'text-muted-foreground hover:text-foreground'}`}>سلفة</button>
                        <button type="button" onClick={() => setPaymentData({...paymentData, type: 'SALARY'})} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${paymentData.type === 'SALARY' ? 'bg-background shadow text-emerald-600' : 'text-muted-foreground hover:text-foreground'}`}>راتب شهري</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-semibold mb-1">المبلغ</label><input required type="number" min="1" className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})} /></div>
                        <div><label className="block text-xs font-semibold mb-1">التاريخ</label><input required type="date" className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-semibold mb-1">عن شهر</label><input required type="number" min="1" max="12" className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none" value={paymentData.month} onChange={e => setPaymentData({...paymentData, month: Number(e.target.value)})} /></div>
                        <div><label className="block text-xs font-semibold mb-1">لسنة</label><input required type="number" min="2020" className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none" value={paymentData.year} onChange={e => setPaymentData({...paymentData, year: Number(e.target.value)})} /></div>
                      </div>
                      <textarea placeholder="ملاحظات (اختياري)" className="w-full bg-background rounded-xl px-3 py-2 text-sm outline-none resize-none" rows={1} value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} />
                      <button type="submit" disabled={addPaymentMutation.isPending} className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-xl text-sm w-full">تسجيل وتسديد من الصندوق</button>
                      <p className="text-[10px] text-center text-muted-foreground font-bold">تسجيل الراتب/السلفة سيقوم بخصم المبلغ آلياً من الصندوق في النظام المحاسبي.</p>
                    </form>
                    <div className="space-y-3">
                      {payrollData?.payments?.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center bg-secondary/20 p-4 rounded-2xl border border-border/30">
                          <div>
                            <div className={`font-bold text-sm flex items-center gap-2 ${p.type === 'SALARY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              <DollarSign className="w-4 h-4" /> {p.type === 'SALARY' ? 'راتب' : 'سلفة'} - {Number(p.amount).toLocaleString()} ل.س
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 font-bold">
                              عن شهر {p.month}/{p.year} • {p.date} {p.notes && `• ${p.notes}`}
                            </div>
                          </div>
                          <button onClick={() => { if(confirm('متأكد؟ (لن يتم استرجاع المبلغ للصندوق آلياً، يجب حذفه من قسم المحاسبة أيضاً)')) deletePaymentMutation.mutate(p.id) }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {payrollData?.payments?.length === 0 && <div className="text-center text-sm text-muted-foreground">لا توجد سجلات رواتب أو سلف.</div>}
                    </div>
                  </div>
                )}
              </div>
              
              {modalTab === 'INFO' && (
                <div className="p-6 bg-secondary/30 border-t border-border/50 flex gap-4">
                  <button type="submit" form="user-form" disabled={saveMutation.isPending} className="flex-1 bg-foreground text-background hover:bg-foreground/90 font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95">
                    {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                  {editingUser && editingUser.id !== 1 && (
                    <button 
                      type="button" 
                      onClick={() => { 
                        if(confirm('هل أنت متأكد من حذف هذا الموظف؟')) { 
                          deleteMutation.mutate(editingUser.id); 
                          setIsModalOpen(false); 
                        } 
                      }} 
                      className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground p-4 rounded-2xl font-bold transition-all active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
