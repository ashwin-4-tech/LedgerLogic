import type { Transaction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from 'lucide-react';

export function TransactionRow({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
}) {
  const isIncome = tx.type === 'income';
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group focus-within:bg-slate-50 dark:focus-within:bg-slate-800"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isIncome ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
        }`}
        aria-hidden="true"
      >
        {isIncome ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{tx.title}</p>
          <span className="hidden sm:inline badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{tx.category}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {formatDate(tx.transaction_date)} · {tx.payment_method}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-bold font-display ${
            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {isIncome ? '+' : '−'}
          {formatCurrency(Number(tx.amount))}
        </p>
        <span className="sr-only">
          {isIncome ? 'Income' : 'Expense'} of {formatCurrency(Number(tx.amount))}
        </span>
      </div>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(tx)}
              aria-label={`Edit transaction: ${tx.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(tx)}
              aria-label={`Delete transaction: ${tx.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
