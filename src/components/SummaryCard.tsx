import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: 'income' | 'expense' | 'savings' | 'budget';
  trend?: number;
}

const config: Record<SummaryCardProps['icon'], { Icon: LucideIcon; color: string; bg: string }> = {
  income: { Icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  expense: { Icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
  savings: { Icon: PiggyBank, color: 'text-accent-600', bg: 'bg-accent-50' },
  budget: { Icon: Wallet, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
};

export function SummaryCard({ title, value, subtitle, icon, trend }: SummaryCardProps) {
  const { Icon, color, bg } = config[icon];
  return (
    <div className="card p-5 animate-fade-in hover:shadow-soft transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      {typeof trend === 'number' && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <span className={trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
            {trend >= 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
          <span className="text-slate-400 dark:text-slate-500">vs last month</span>
        </div>
      )}
    </div>
  );
}
