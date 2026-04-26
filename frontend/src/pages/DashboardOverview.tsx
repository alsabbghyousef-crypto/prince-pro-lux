import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  Wallet,
  Clock,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';

interface DashboardData {
  usd: {
    total_sales: number;
    total_costs: number;
    total_expenses: number;
    net_profit: number;
  };
  syp: {
    total_sales: number;
    total_costs: number;
    total_expenses: number;
    net_profit: number;
  };
  orders_count: number;
  recent_orders: Array<{ id: number; total_usd: number; total_syp: number; created_at: string }>;
  daily_chart: Array<{ date: string; sales_usd: number; sales_syp: number; expenses_usd: number; expenses_syp: number }>;
}

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="vercel-card space-y-2 p-3 lg:p-4">
    <div className="flex items-center justify-between">
      <div className="p-1.5 lg:p-2 bg-secondary rounded-lg">
        <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
      </div>
      <div className={cn(
        "text-xs lg:text-sm font-bold flex items-center gap-1 px-2 py-0.5 rounded-full",
        trend === 'up' ? "text-emerald-600 bg-emerald-500/10" :
          trend === 'down' ? "text-rose-600 bg-rose-500/10" :
            "text-muted-foreground bg-secondary"
      )}>
        <span dir="ltr">{change}</span>
      </div>
    </div>
    <div>
      <p className="text-xs lg:text-sm font-bold text-muted-foreground mb-1">{title}</p>
      <h3 className="text-xl lg:text-3xl font-black tracking-tight" dir="ltr">{value}</h3>
    </div>
  </div>
);

const DashboardOverview = () => {
  const [currency, setCurrency] = useState<'syp' | 'usd' | 'both'>('usd');

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const formatMoney = React.useCallback((valSyp: number, valUsd: number) => {
    if (currency === 'syp') return `SYP ${Number(valSyp).toLocaleString()}`;
    if (currency === 'usd') return `$${Number(valUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `SYP ${Number(valSyp).toLocaleString()} | $${Number(valUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currency]);

  // Build chart data from API or show empty
  const chartData = React.useMemo(() => {
    return data?.daily_chart?.length
      ? data.daily_chart
      : [
          { date: 'اليوم', sales_usd: 0, sales_syp: 0, expenses_usd: 0, expenses_syp: 0 }
        ];
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">جاري تحميل بيانات اللوحة...</p>
      </div>
    );
  }

  const mSyp = data?.syp || { total_sales: 0, total_costs: 0, total_expenses: 0, net_profit: 0 };
  const mUsd = data?.usd || { total_sales: 0, total_costs: 0, total_expenses: 0, net_profit: 0 };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">نظرة عامة</h1>
          <p className="text-muted-foreground">ملخص مبيعات ومصاريف الأسبوع الحالي</p>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-full border border-border shadow-sm">
          {[
            { id: 'syp', label: 'ل.س' },
            { id: 'usd', label: 'USD' },
            { id: 'both', label: 'كلاهما' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setCurrency(p.id as any)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs lg:text-sm font-bold transition-all duration-300",
                currency === p.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
        <StatCard
          title="إجمالي المبيعات"
          value={formatMoney(mSyp.total_sales, mUsd.total_sales)}
          change={mUsd.total_sales > 0 ? '+' + Math.round((mUsd.total_sales / 1000)).toFixed(0) + 'K' : '0'}
          icon={ShoppingCart}
          trend="up"
        />
        <StatCard
          title="التكلفة (رأس المال)"
          value={formatMoney(mSyp.total_costs, mUsd.total_costs)}
          change={mUsd.total_costs > 0 ? Math.round((mUsd.total_costs / 1000)).toFixed(0) + 'K' : '0'}
          icon={Package}
          trend="down"
        />
        <StatCard
          title="المصاريف"
          value={formatMoney(mSyp.total_expenses, mUsd.total_expenses)}
          change={mUsd.total_expenses > 0 ? '-' + Math.round((mUsd.total_expenses / 1000)).toFixed(0) + 'K' : '0'}
          icon={Wallet}
          trend="down"
        />
        <StatCard
          title="صافي الربح"
          value={formatMoney(mSyp.net_profit, mUsd.net_profit)}
          change={mUsd.net_profit && mUsd.total_sales
            ? ((mUsd.net_profit / mUsd.total_sales) * 100).toFixed(1) + '%'
            : '0%'}
          icon={TrendingUp}
          trend={mUsd.net_profit >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="عدد الطلبات"
          value={`+${data?.orders_count || 0}`}
          change={`${data?.orders_count || 0} طلب`}
          icon={Users}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 vercel-card min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold">تحليلات المبيعات والمصاريف (الأسبوع)</h3>
            <div className="flex gap-2">
              <button onClick={() => refetch()} className="px-3 py-1 text-xs font-medium rounded-md bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                تحديث
              </button>
            </div>
          </div>
          <div className="flex-1 w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                  formatter={(_value: any, name: any, props: any) => {
                    const isExpense = name === 'المصاريف';
                    const dataPoint = props.payload;
                    const valSyp = isExpense ? dataPoint.expenses_syp : dataPoint.sales_syp;
                    const valUsd = isExpense ? dataPoint.expenses_usd : dataPoint.sales_usd;
                    
                    if (currency === 'syp') return [`SYP ${Number(valSyp).toLocaleString()}`, name];
                    if (currency === 'usd') return [`$${Number(valUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                    return [`SYP ${Number(valSyp).toLocaleString()} | $${Number(valUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                  }}
                />
                <Area type="monotone" dataKey={currency === 'syp' ? "sales_syp" : "sales_usd"} name="المبيعات"
                  stroke="hsl(var(--primary))" strokeWidth={2}
                  fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey={currency === 'syp' ? "expenses_syp" : "expenses_usd"} name="المصاريف"
                  stroke="#f43f5e" strokeWidth={2}
                  fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="vercel-card flex flex-col">
          <h3 className="font-bold mb-6">آخر العمليات</h3>
          <div className="space-y-4 flex-1">
            {(data?.recent_orders || []).length > 0
              ? data!.recent_orders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">طلب #{order.id}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="text-sm font-black text-emerald-600 shrink-0" dir="ltr">
                    +{formatMoney(order.total_syp, order.total_usd)}
                  </p>
                </div>
              ))
              : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <Package className="w-8 h-8 opacity-30" />
                  <p className="text-sm">لا توجد طلبات حالية</p>
                </div>
              )
            }
          </div>
          <button onClick={() => window.location.href = '/dashboard/sales'}
            className="w-full mt-6 py-2 text-xs font-bold bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
            عرض كل الطلبات &larr; 
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
