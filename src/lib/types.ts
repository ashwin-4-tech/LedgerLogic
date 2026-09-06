export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment_method: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionInput {
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment_method: string;
  description?: string | null;
  transaction_date: string;
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface Budget {
  id: string;
  user_id: string;
  monthly_budget: number;
  category_budgets: CategoryBudget[];
  created_at: string;
  updated_at: string;
}

export interface BudgetInput {
  monthly_budget: number;
  category_budgets: CategoryBudget[];
}

export interface MonthlyBucket {
  month: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  savings: number;
  savingsRate: number;
  budgetRemaining: number | null;
  budgetUsedPercent: number | null;
  monthlyTrend: MonthlyBucket[];
  categoryBreakdown: CategoryBreakdownItem[];
  recentTransactions: Transaction[];
  transactionCount: number;
}

export interface HeuristicInsight {
  title: string;
  body: string;
  type: 'positive' | 'warning' | 'tip' | 'info';
}

export interface Prediction {
  predictedExpense: number;
  confidence: number;
  budgetRisk: boolean;
  basisMonths: number;
  history: MonthlyBucket[];
}

export const EXPENSE_CATEGORIES = [
  'Rent', 'Groceries', 'Transport', 'Shopping',
  'Entertainment', 'Healthcare', 'Utilities', 'Education',
  'Travel', 'Insurance', 'Subscriptions', 'Other',
] as const;

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investments',
  'Rental', 'Gifts', 'Refund', 'Other',
] as const;

export const PAYMENT_METHODS = [
  'UPI', 'Card', 'Cash', 'Bank Transfer', 'Cheque', 'Other',
] as const;
