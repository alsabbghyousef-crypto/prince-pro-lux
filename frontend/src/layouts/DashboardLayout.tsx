import React from 'react';
import { motion } from 'framer-motion';
import ExchangeRateWidget from '../components/ui/ExchangeRateWidget';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, TrendingDown,
  ShoppingBag,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  FileText,
  Package,
  FileSpreadsheet,
  Boxes,
  Loader2,
  UserCog,
  ShieldAlert,
  X,
  DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../services/api';

// ── NavItem with active route detection ──────────────────────────────────────
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to?: string;
  badge?: string | number;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, to, badge }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = to
    ? to === '/dashboard'
      ? location.pathname === '/dashboard' || location.pathname === '/dashboard/'
      : location.pathname.startsWith(to)
    : false;

  return (
    <button
      onClick={() => to && navigate(to)}
      className={cn(
        'flex items-center justify-between gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
        <span>{label}</span>
      </div>
      {badge && (
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
          isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
};

// ── Section label ─────────────────────────────────────────────────────────────
const NavSection: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest px-3 mt-5 mb-1.5">
    {label}
  </p>
);

// ── Role badge ────────────────────────────────────────────────────────────────
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const config: Record<string, { label: string; cls: string }> = {
    ADMIN:       { label: 'مدير النظام', cls: 'bg-primary/10 text-primary' },
    ACCOUNTANT:  { label: 'محاسب مالي', cls: 'bg-amber-500/10 text-amber-600' },
    SELLER:      { label: 'كاشير / بائع', cls: 'bg-emerald-500/10 text-emerald-600' },
    INVENTORY:   { label: 'أمين مستودع', cls: 'bg-indigo-500/10 text-indigo-600' },
  };
  const item = config[role];
  const label = item ? item.label : role;
  const cls = item ? item.cls : 'bg-secondary text-muted-foreground';
  return <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', cls)}>{label}</span>;
};

interface UserType {
  name: string;
  role: string;
  email?: string;
  allowed_pages?: string[];
  actions?: Record<string, boolean>;
}

// ── Main Layout ───────────────────────────────────────────────────────────────
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  
  const { data: alerts = [] } = useQuery({
    queryKey: ['hr-alerts'],
    queryFn: async () => {
      const res = await api.get('/hr/alerts');
      return res.data;
    },
    refetchInterval: 15000
  });

  const [user, setUser] = React.useState<UserType | null>(null);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/user');
        setUser(response.data);
      } catch {
        // 401 → interceptor will redirect to /login
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try { await api.post('/logout'); } catch { /* ignore */ }
    localStorage.removeItem('prince_token');
    localStorage.removeItem('Prince Pro Lux_token');
    localStorage.removeItem('newpower_token');
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';

  const isPageAllowed = (pageKey: string): boolean => {
    if (isAdmin) return true;
    if (!user?.allowed_pages || !Array.isArray(user.allowed_pages)) return false;
    return user.allowed_pages.includes(pageKey);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Route Guard Check ──
  const currentPath = location.pathname;
  const routePageMap: Record<string, string> = {
    '/dashboard/sales': 'sales',
    '/dashboard/orders': 'orders',
    '/dashboard/items': 'items',
    '/dashboard/containers': 'containers',
    '/dashboard/datasheets': 'datasheets',
    '/dashboard/customers': 'customers',
    '/dashboard/expenses': 'expenses',
    '/dashboard/exchange-rates': 'exchange-rates',
    '/dashboard/users': 'users',
    '/dashboard/settings': 'settings',
  };

  let pageKey = 'dashboard';
  for (const [route, key] of Object.entries(routePageMap)) {
    if (currentPath === route || currentPath.startsWith(route + '/')) {
      pageKey = key;
      break;
    }
  }

  const hasAccessToCurrentPage = isPageAllowed(pageKey);

  // Group pages for section rendering
  const hasSalesGroup = isPageAllowed('sales') || isPageAllowed('orders') || isPageAllowed('items') || isPageAllowed('containers') || isPageAllowed('datasheets') || isPageAllowed('customers');
  const hasFinanceGroup = isPageAllowed('expenses') || isPageAllowed('exchange-rates');
  const hasSettingsGroup = isPageAllowed('users') || isPageAllowed('settings');

  // ── Sidebar inner content (shared between desktop + mobile) ──
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <ShoppingBag className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight leading-none">Prince Pro Lux</h2>
            <p className="text-[10px] text-muted-foreground font-medium">نظام نقاط البيع</p>
          </div>
        </div>
        {/* Mobile close */}
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden p-1 hover:bg-secondary rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {isPageAllowed('dashboard') && (
          <>
            <NavSection label="الرئيسية" />
            <NavItem icon={LayoutDashboard} label="لوحة التحكم" to="/dashboard" />
          </>
        )}
        
        {hasSalesGroup && (
          <>
            <NavSection label="المبيعات والمخزون" />
            {isPageAllowed('sales') && <NavItem icon={ShoppingCart} label="نقطة البيع (POS)" to="/dashboard/sales" />}
            {isPageAllowed('orders') && <NavItem icon={FileText} label="سجل المبيعات" to="/dashboard/orders" />}
            {isPageAllowed('items') && <NavItem icon={Package} label="المنتجات والمخزون" to="/dashboard/items" />}
            {isPageAllowed('containers') && <NavItem icon={Boxes} label="الحاويات والشحنات" to="/dashboard/containers" />}
            {isPageAllowed('datasheets') && <NavItem icon={FileSpreadsheet} label="ملفات الداتا شيت" to="/dashboard/datasheets" />}
            {isPageAllowed('customers') && <NavItem icon={Users} label="العملاء والديون" to="/dashboard/customers" />}
          </>
        )}
        
        {hasFinanceGroup && (
          <>
            <NavSection label="المحاسبة والتقارير" />
            {isPageAllowed('expenses') && <NavItem icon={TrendingDown} label="المصروفات" to="/dashboard/expenses" />}
            {isPageAllowed('exchange-rates') && <NavItem icon={DollarSign} label="سجل سعر الصرف" to="/dashboard/exchange-rates" />}
          </>
        )}

        {hasSettingsGroup && (
          <>
            <NavSection label="الإعدادات والموارد البشرية" />
            {isPageAllowed('users') && <NavItem icon={UserCog} label="الموظفين والمستخدمين" to="/dashboard/users" />}
            {isPageAllowed('settings') && <NavItem icon={Settings} label="إعدادات النظام" to="/dashboard/settings" />}
          </>
        )}
      </nav>

      {/* User Footer */}
      <div className="mt-auto pt-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-tight truncate">{user?.name || 'مستخدم'}</p>
            <RoleBadge role={user?.role || ''} />
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row rtl">

      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ x: isMobileSidebarOpen ? 0 : '100%' }}
        className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-background border-l border-border p-6 md:hidden shadow-2xl"
      >
        <SidebarContent />
      </motion.aside>

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 256 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="border-l border-border bg-background/60 backdrop-blur-xl z-30 hidden md:block overflow-hidden sticky top-0 h-screen"
      >
        <div className="p-5 w-64 flex flex-col h-full">
          <SidebarContent />
        </div>
      </motion.aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/60 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExchangeRateWidget />
            {/* Desktop toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-secondary rounded-lg hidden md:flex"
            >
              <Menu className="w-4 h-4" />
            </button>
            {/* Mobile toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 hover:bg-secondary rounded-lg md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث سريع..."
                className="bg-secondary/50 border-transparent focus:border-border/80 h-9 w-56 rounded-lg pl-10 pr-4 text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 hover:bg-secondary rounded-full relative">
                <Bell className="w-4 h-4 text-muted-foreground" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] flex items-center justify-center font-bold bg-primary text-white rounded-full border border-background">
                    {alerts.length}
                  </span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <div className="absolute left-0 mt-2 w-84 sm:w-96 bg-card border border-border shadow-2xl rounded-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between p-2 border-b border-border/60 mb-2">
                    <span className="text-sm font-black flex items-center gap-1.5 text-foreground">
                      <Bell className="w-4 h-4 text-primary" />
                      التنبيهات الذكية وإشعارات المخزون
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {alerts.length} تنبيه
                    </span>
                  </div>
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground font-semibold">
                      🎉 لا توجد تنبيهات جديدة حالياً، المخزون والعمليات بحالة ممتازة!
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                      {alerts.map((alert: any, i: number) => {
                        const isStockLow = alert.type === 'STOCK_LOW';
                        const isStockOut = alert.type === 'STOCK_OUT';
                        const isSalary = alert.type === 'SALARY';
                        
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              if (alert.link) {
                                navigate(alert.link);
                                setIsNotificationsOpen(false);
                              }
                            }}
                            className={`p-2.5 rounded-xl transition-all border ${
                              alert.link ? 'cursor-pointer hover:scale-[1.01]' : ''
                            } ${
                              isStockOut 
                                ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15' 
                                : isStockLow 
                                ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15' 
                                : 'bg-secondary/40 border-border/50 hover:bg-secondary/70'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  isStockOut ? 'bg-rose-500 animate-pulse' :
                                  isStockLow ? 'bg-amber-500 animate-pulse' :
                                  isSalary ? 'bg-emerald-500' : 'bg-blue-500'
                                }`} />
                                <span className={`text-xs font-black ${
                                  isStockOut ? 'text-rose-700 dark:text-rose-300' :
                                  isStockLow ? 'text-amber-800 dark:text-amber-200' :
                                  'text-foreground'
                                }`}>
                                  {alert.title}
                                </span>
                              </div>
                              {alert.link && (
                                <span className="text-[10px] font-bold text-primary underline underline-offset-2 shrink-0">
                                  عرض التفاصيل ←
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground/80 leading-relaxed pr-4 font-medium">
                              {alert.message}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-tight">{user?.name || 'مستخدم'}</p>
                <RoleBadge role={user?.role || ''} />
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className={cn(
          "flex-1 min-h-0 flex flex-col",
          location.pathname.startsWith('/dashboard/sales')
            ? "p-2.5 sm:p-3 md:p-4 overflow-hidden h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]"
            : "p-4 md:p-6 overflow-auto"
        )}>
          {hasAccessToCurrentPage ? (
            children
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] max-w-lg mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-5 shadow-inner">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-foreground">لا تملك صلاحية للوصول إلى هذه الصفحة</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                تم تقييد الوصول إلى هذا القسم بناءً على الصلاحيات المحددة لمسماك الوظيفي الحالي ({user?.role || 'مستخدم'}).
                إذا كنت تعتقد أن هذا خطأ، يرجى مراجعة مدير النظام.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if (isPageAllowed('dashboard')) navigate('/dashboard');
                    else if (isPageAllowed('sales')) navigate('/dashboard/sales');
                    else if (isPageAllowed('orders')) navigate('/dashboard/orders');
                    else if (isPageAllowed('items')) navigate('/dashboard/items');
                    else navigate('/dashboard');
                  }}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all"
                >
                  العودة للصفحة المتاحة
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
