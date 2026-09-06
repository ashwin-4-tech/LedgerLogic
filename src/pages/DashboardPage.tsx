import { useState } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { summarizeTransactions } from '@/lib/financeAnalyzer';
import { formatCurrency, formatMonthYear, monthKey } from '@/lib/format';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useAsync } from '@/hooks/useAsync';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Receipt, ArrowRight, TrendingUp } from 'lucide-react';

const PIE_COLORS = ['#059669', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#a855f7', '#0891b2'];

export function DashboardPage() {
  const { fetchTransactions, fetchBudget } = useFinance();
  const [retryKey, setRetryKey] = useState(0);

  const { data, loading, error } = useAsync(async () => {
    const [transactions, budget] = await Promise.all([fetchTransactions(), fetchBudget()]);
    return { transactions, budget, summary: summarizeTransactions(transactions, budget) };
  }, [retryKey]);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message="Couldn't load your dashboard" onRetry={() => setRetryKey((k) => k + 1)} />;

  const { summary, transactions } = data!;

  const currentMonthKey = monthKey(new Date());
  const currentMonth = summary.monthlyTrend[summary.monthlyTrend.length - 1];
  const lastMonth = summary.monthlyTrend[summary.monthlyTrend.length - 2];
  const expenseTrend = lastMonth && lastMonth.expense > 0
    ? ((currentMonth.expense - lastMonth.expense) / lastMonth.expense) * 100
    : undefined;

  const trendData = summary.monthlyTrend.map((b) => ({
    name: b.label,
    Income: Number(b.income.toFixed(0)),
    Expense: Number(b.expense.toFixed(0)),
  }));

  const pieData = summary.categoryBreakdown.slice(0, 8).map((c) => ({
    name: c.category,
    value: Number(c.amount.toFixed(0)),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formatMonthYear(currentMonthKey)} · overview of your finances
          </p>
        </div>
        <Link to="/transactions" className="btn-secondary">
          <Receipt className="h-4 w-4" aria-hidden="true" />
          Manage transactions
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Income"
          value={formatCurrency(summary.totalIncome)}
          icon="income"
          subtitle="all time"
        />
        <SummaryCard
          title="Total Expense"
          value={formatCurrency(summary.totalExpense)}
          icon="expense"
          subtitle="all time"
        />
        <SummaryCard
          title="Net Savings"
          value={formatCurrency(summary.savings)}
          icon="savings"
          subtitle={`${summary.savingsRate.toFixed(0)}% savings rate`}
        />
        <SummaryCard
          title="Budget Remaining"
          value={
            summary.budgetRemaining !== null
              ? formatCurrency(summary.budgetRemaining)
              : 'Not set'
          }
          icon="budget"
          subtitle={
            summary.budgetUsedPercent !== null
              ? `${summary.budgetUsedPercent.toFixed(0)}% used this month`
              : 'Set a budget to track'
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Income vs Expense</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Last 6 months</p>
            </div>
            {expenseTrend !== undefined && (
              <span
                className={`badge ${
                  expenseTrend >= 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                }`}
              >
                <TrendingUp className={`h-3 w-3 ${expenseTrend >= 0 ? '' : 'rotate-180'}`} aria-hidden="true" />
                {expenseTrend >= 0 ? '+' : ''}
                {expenseTrend.toFixed(0)}%
              </span>
            )}
          </div>
          <figure role="img" aria-label={`Line chart of income vs expense over 6 months: ${trendData.map((d) => `${d.name} income ${d.Income} expense ${d.Expense}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
              <Line type="monotone" dataKey="Income" stroke="#059669" strokeWidth={2.5} dot={{ r: 3, fill: '#059669' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
          </figure>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Category Breakdown</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Expense distribution</p>
          {pieData.length === 0 ? (
            <EmptyState icon={<Receipt className="h-7 w-7" aria-hidden="true" />} title="No expenses yet" description="Add transactions to see breakdown" />
          ) : (
            <figure role="img" aria-label={`Pie chart of expense categories: ${pieData.map((d) => `${d.name} ${d.value}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            </figure>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">Monthly Cash Flow</h3>
        <figure role="img" aria-label={`Bar chart of monthly cash flow: ${trendData.map((d) => `${d.name} income ${d.Income} expense ${d.Expense}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} cursor={{ fill: '#f8fafc' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
            <Bar dataKey="Income" fill="#059669" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </figure>
      </div>

      {/* Recent transactions */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Recent Activity</h3>
          <Link to="/transactions" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {summary.recentTransactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-7 w-7" aria-hidden="true" />}
            title="No transactions yet"
            description="Add your first income or expense to see it here"
            action={<Link to="/transactions" className="btn-primary">Add transaction</Link>}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {summary.recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
