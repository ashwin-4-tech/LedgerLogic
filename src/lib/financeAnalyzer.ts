import type {
  Transaction,
  Budget,
  FinanceSummary,
  MonthlyBucket,
  CategoryBreakdownItem,
  HeuristicInsight,
  Prediction,
} from './types';
import { monthKey, monthLabel, clamp } from './format';

export function summarizeTransactions(
  transactions: Transaction[],
  budget: Budget | null,
): FinanceSummary {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // monthly trend (last 6 months)
  const bucketsMap = new Map<string, MonthlyBucket>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = monthKey(d);
    bucketsMap.set(key, {
      month: key,
      label: monthLabel(key),
      income: 0,
      expense: 0,
      savings: 0,
    });
  }
  for (const t of transactions) {
    const key = monthKey(t.transaction_date);
    const bucket = bucketsMap.get(key);
    if (bucket) {
      if (t.type === 'income') bucket.income += Number(t.amount);
      else bucket.expense += Number(t.amount);
    }
  }
  const monthlyTrend = Array.from(bucketsMap.values()).map((b) => ({
    ...b,
    savings: b.income - b.expense,
  }));

  // category breakdown (expenses only)
  const catMap = new Map<string, { amount: number; count: number }>();
  const expenses = transactions.filter((t) => t.type === 'expense');
  const expenseTotal = expenses.reduce((s, t) => s + Number(t.amount), 0);
  for (const t of expenses) {
    const cat = t.category;
    const entry = catMap.get(cat) ?? { amount: 0, count: 0 };
    entry.amount += Number(t.amount);
    entry.count += 1;
    catMap.set(cat, entry);
  }
  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(catMap.entries())
    .map(([category, v]) => ({
      category,
      amount: v.amount,
      percentage: expenseTotal > 0 ? (v.amount / expenseTotal) * 100 : 0,
      count: v.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const recentTransactions = [...transactions]
    .sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime(),
    )
    .slice(0, 5);

  const budgetRemaining =
    budget && budget.monthly_budget > 0
      ? budget.monthly_budget - monthlyTrend[monthlyTrend.length - 1].expense
      : null;
  const budgetUsedPercent =
    budget && budget.monthly_budget > 0
      ? (monthlyTrend[monthlyTrend.length - 1].expense / budget.monthly_budget) * 100
      : null;

  return {
    totalIncome,
    totalExpense,
    savings,
    savingsRate,
    budgetRemaining,
    budgetUsedPercent,
    monthlyTrend,
    categoryBreakdown,
    recentTransactions,
    transactionCount: transactions.length,
  };
}

export function analyzeFinance(
  transactions: Transaction[],
  budget: Budget | null,
): HeuristicInsight[] {
  const summary = summarizeTransactions(transactions, budget);
  const insights: HeuristicInsight[] = [];

  // savings rate
  if (summary.savingsRate >= 20) {
    insights.push({
      title: 'Strong savings rate',
      body: `You're saving ${summary.savingsRate.toFixed(0)}% of your income — well above the recommended 20%. Keep it up!`,
      type: 'positive',
    });
  } else if (summary.savingsRate >= 10) {
    insights.push({
      title: 'Room to save more',
      body: `Your savings rate is ${summary.savingsRate.toFixed(0)}%. Aim for 20%+ by trimming a few discretionary categories.`,
      type: 'tip',
    });
  } else if (summary.savingsRate > 0) {
    insights.push({
      title: 'Low savings rate',
      body: `You're only saving ${summary.savingsRate.toFixed(0)}% of your income. Review your top expense categories for quick wins.`,
      type: 'warning',
    });
  } else if (summary.totalExpense > 0) {
    insights.push({
      title: 'Spending exceeds income',
      body: `You spent ${formatAbs(summary.totalExpense - summary.totalIncome)} more than you earned. Immediate action needed to avoid debt.`,
      type: 'warning',
    });
  }

  // top category
  const topCat = summary.categoryBreakdown[0];
  if (topCat && topCat.percentage > 35) {
    insights.push({
      title: `${topCat.category} dominates spending`,
      body: `${topCat.category} accounts for ${topCat.percentage.toFixed(0)}% of your expenses. Consider if this aligns with your priorities.`,
      type: 'info',
    });
  }

  // month over month
  const trend = summary.monthlyTrend;
  if (trend.length >= 2) {
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (prev.expense > 0) {
      const change = ((last.expense - prev.expense) / prev.expense) * 100;
      if (change > 20) {
        insights.push({
          title: 'Spending spiked this month',
          body: `Your spending rose ${change.toFixed(0)}% compared to last month. Worth reviewing recent transactions.`,
          type: 'warning',
        });
      } else if (change < -15) {
        insights.push({
          title: 'Great spending reduction',
          body: `You cut spending by ${Math.abs(change).toFixed(0)}% versus last month. Excellent discipline!`,
          type: 'positive',
        });
      }
    }
  }

  // budget status
  if (summary.budgetUsedPercent !== null) {
    if (summary.budgetUsedPercent >= 100) {
      insights.push({
        title: 'Monthly budget exceeded',
        body: `You've used ${summary.budgetUsedPercent.toFixed(0)}% of your monthly budget. Tighten spending for the rest of the month.`,
        type: 'warning',
      });
    } else if (summary.budgetUsedPercent >= 80) {
      insights.push({
        title: 'Approaching budget limit',
        body: `You've used ${summary.budgetUsedPercent.toFixed(0)}% of your monthly budget. Only ${formatAbs(summary.budgetRemaining ?? 0)} left.`,
        type: 'warning',
      });
    } else if (summary.budgetUsedPercent < 50 && summary.budgetUsedPercent > 0) {
      insights.push({
        title: 'Well within budget',
        body: `You've used just ${summary.budgetUsedPercent.toFixed(0)}% of your monthly budget. You're managing spending well.`,
        type: 'positive',
      });
    }
  }

  // category budget alerts
  if (budget && budget.category_budgets.length > 0) {
    const lastMonth = trend[trend.length - 1];
    const monthCatMap = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === 'expense' && monthKey(t.transaction_date) === lastMonth.month) {
        monthCatMap.set(t.category, (monthCatMap.get(t.category) ?? 0) + Number(t.amount));
      }
    }
    for (const cb of budget.category_budgets) {
      const spent = monthCatMap.get(cb.category) ?? 0;
      if (cb.limit > 0 && spent > cb.limit) {
        insights.push({
          title: `${cb.category} category over budget`,
          body: `You spent ${formatAbs(spent)} on ${cb.category}, exceeding the ${formatAbs(cb.limit)} limit by ${formatAbs(spent - cb.limit)}.`,
          type: 'warning',
        });
      }
    }
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Start tracking to see insights',
      body: 'Add a few transactions and set a budget to unlock personalized financial insights.',
      type: 'info',
    });
  }

  return insights;
}

export function predictSpending(
  transactions: Transaction[],
  budget: Budget | null,
): Prediction {
  const summary = summarizeTransactions(transactions, budget);
  const trend = summary.monthlyTrend;
  const expenseBuckets = trend.filter((b) => b.expense > 0);
  const basisMonths = expenseBuckets.length;

  let predictedExpense = 0;
  if (basisMonths > 0) {
    const avg = expenseBuckets.reduce((s, b) => s + b.expense, 0) / basisMonths;
    predictedExpense = avg;
  }

  // confidence based on number of months with data and transaction count
  const dataPoints = basisMonths;
  const confidence = clamp(
    55 + dataPoints * 8 + Math.min(summary.transactionCount * 0.5, 10),
    55,
    95,
  );

  const budgetRisk =
    budget != null &&
    budget.monthly_budget > 0 &&
    predictedExpense > budget.monthly_budget;

  return {
    predictedExpense,
    confidence: Math.round(confidence),
    budgetRisk,
    basisMonths,
    history: trend,
  };
}

function formatAbs(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
}
