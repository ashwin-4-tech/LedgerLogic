import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { useAsync } from '@/hooks/useAsync';
import { summarizeTransactions } from '@/lib/financeAnalyzer';
import { formatCurrency, monthKey } from '@/lib/format';
import { ProgressBar } from '@/components/ProgressBar';
import { LoadingState, ErrorState } from '@/components/States';
import type { CategoryBudget } from '@/lib/types';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import { Target, Plus, Trash2, AlertTriangle, CheckCircle2, Save } from 'lucide-react';

export function BudgetPage() {
  const { fetchTransactions, fetchBudget, saveBudget } = useFinance();
  const [retryKey, setRetryKey] = useState(0);
  const { data, loading, error } = useAsync(async () => {
    const [transactions, budget] = await Promise.all([fetchTransactions(), fetchBudget()]);
    return { transactions, budget, summary: summarizeTransactions(transactions, budget) };
  }, [retryKey]);

  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [newCategory, setNewCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [newLimit, setNewLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.budget) {
      setMonthlyBudget(String(data.budget.monthly_budget));
      setCategoryBudgets(data.budget.category_budgets ?? []);
    }
  }, [data?.budget]);

  const currentMonthSpending = useMemo(() => {
    if (!data) return { total: 0, byCategory: new Map<string, number>() };
    const key = monthKey(new Date());
    const byCategory = new Map<string, number>();
    let total = 0;
    for (const t of data.transactions) {
      if (t.type === 'expense' && monthKey(t.transaction_date) === key) {
        total += Number(t.amount);
        byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + Number(t.amount));
      }
    }
    return { total, byCategory };
  }, [data]);

  if (loading) return <LoadingState message="Loading budget..." />;
  if (error) return <ErrorState message="Couldn't load your budget" onRetry={() => setRetryKey((k) => k + 1)} />;

  const monthBudgetNum = Number(monthlyBudget || 0);
  const remaining = monthBudgetNum - currentMonthSpending.total;
  const usedPct = monthBudgetNum > 0 ? (currentMonthSpending.total / monthBudgetNum) * 100 : 0;

  const addCategory = () => {
    const limit = Number(newLimit || 0);
    if (limit <= 0) return;
    if (categoryBudgets.some((c) => c.category === newCategory)) return;
    setCategoryBudgets([...categoryBudgets, { category: newCategory, limit }]);
    setNewLimit('');
    setSaved(false);
  };

  const removeCategory = (cat: string) => {
    setCategoryBudgets(categoryBudgets.filter((c) => c.category !== cat));
    setSaved(false);
  };

  const updateLimit = (cat: string, limit: number) => {
    setCategoryBudgets(categoryBudgets.map((c) => (c.category === cat ? { ...c, limit } : c)));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await saveBudget({
        monthly_budget: Number(monthlyBudget || 0),
        category_budgets: categoryBudgets,
      });
      setSaved(true);
      setRetryKey((k) => k + 1);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const overspent = remaining < 0 && monthBudgetNum > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">Budget</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Set spending limits and track progress this month</p>
      </div>

      {/* Monthly budget overview */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Monthly Budget</h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your overall spending limit for each month</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 dark:text-slate-500">Spent this month</p>
            <p className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">
              {formatCurrency(currentMonthSpending.total)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="label">Monthly limit</label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">₹</span>
              <input
                type="number"
                min="0"
                className="input pl-7"
                value={monthlyBudget}
                onChange={(e) => { setMonthlyBudget(e.target.value); setSaved(false); }}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {monthBudgetNum > 0 && (
          <>
            <div className="mb-3">
              <ProgressBar value={currentMonthSpending.total} max={monthBudgetNum} size="md" label="Monthly budget usage" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{usedPct.toFixed(0)}% used</span>
              <span className={`font-semibold ${overspent ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {overspent ? (
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    {formatCurrency(Math.abs(remaining))} over budget
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    {formatCurrency(remaining)} remaining
                  </span>
                )}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Category budgets */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Category Limits</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Set per-category spending caps to catch overspending early</p>

        {/* Add category */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <select
            className="select flex-1"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            {EXPENSE_CATEGORIES.filter((c) => !categoryBudgets.some((cb) => cb.category === c)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="relative sm:w-40">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">₹</span>
            <input
              type="number"
              min="0"
              className="input pl-7"
              placeholder="Limit"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
          </div>
          <button onClick={addCategory} disabled={!newLimit || Number(newLimit) <= 0} className="btn-primary whitespace-nowrap">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </button>
        </div>

        {/* Category list */}
        {categoryBudgets.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            No category limits yet. Add one above to start tracking per-category spending.
          </div>
        ) : (
          <div className="space-y-4">
            {categoryBudgets.map((cb) => {
              const spent = currentMonthSpending.byCategory.get(cb.category) ?? 0;
              const pct = cb.limit > 0 ? (spent / cb.limit) * 100 : 0;
              const over = spent > cb.limit && cb.limit > 0;
              return (
                <div key={cb.category} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cb.category}</span>
                      {over && (
                        <span className="badge bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Over
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(spent)} / {formatCurrency(cb.limit)}
                      </span>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          className="input pl-6 py-1.5 text-xs"
                          value={cb.limit}
                          onChange={(e) => updateLimit(cb.category, Number(e.target.value))}
                        />
                      </div>
                      <button
                        onClick={() => removeCategory(cb.category)}
                        aria-label={`Remove ${cb.category} budget limit`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <ProgressBar value={spent} max={cb.limit} size="sm" label={`${cb.category} budget usage`} />
                  {pct > 0 && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pct.toFixed(0)}% of limit used</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3">
        {saveError && <span className="text-sm text-rose-600 dark:text-rose-400">{saveError}</span>}
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Budget saved
          </span>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? 'Saving...' : 'Save budget'}
        </button>
      </div>
    </div>
  );
}
