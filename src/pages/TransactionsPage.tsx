import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { useAsync } from '@/hooks/useAsync';
import { TransactionRow } from '@/components/TransactionRow';
import { TransactionForm } from '@/components/TransactionForm';
import { Modal } from '@/components/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { formatCurrency } from '@/lib/format';
import type { Transaction, TransactionInput } from '@/lib/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types';
import { Plus, Search, ChevronLeft, ChevronRight, Receipt, Filter, X } from 'lucide-react';

type SortKey = 'latest' | 'oldest' | 'amount_desc' | 'amount_asc';
type TypeFilter = 'all' | 'income' | 'expense';
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
const PAGE_SIZE = 8;

export function TransactionsPage() {
  const { fetchTransactions, createTransaction, updateTransaction, deleteTransaction } = useFinance();
  const [retryKey, setRetryKey] = useState(0);
  const { data, loading, error } = useAsync(fetchTransactions, [retryKey]);
  const transactions = data ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('latest');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (typeFilter !== 'all') result = result.filter((t) => t.type === typeFilter);
    if (categoryFilter !== 'all') result = result.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        case 'amount_desc':
          return Number(b.amount) - Number(a.amount);
        case 'amount_asc':
          return Number(a.amount) - Number(b.amount);
        default:
          return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
      }
    });
    return result;
  }, [transactions, typeFilter, categoryFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [search, typeFilter, categoryFilter, sort]);

  const handleSubmit = async (input: TransactionInput) => {
    if (editing) await updateTransaction(editing.id, input);
    else await createTransaction(input);
    setRetryKey((k) => k + 1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      setRetryKey((k) => k + 1);
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all' || search.trim() !== '';

  if (loading) return <LoadingState message="Loading transactions..." />;
  if (error) return <ErrorState message="Couldn't load transactions" onRetry={() => setRetryKey((k) => k + 1)} />;

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">Transactions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            {hasActiveFilters && ' · filtered'}
          </p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add transaction
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Income</p>
          <p className="mt-1 text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Expense</p>
          <p className="mt-1 text-xl font-bold font-display text-rose-600 dark:text-rose-400">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <label htmlFor="tx-search" className="sr-only">Search transactions</label>
            <input
              id="tx-search"
              className="input pl-10"
              placeholder="Search by title, category, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
            <button onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            aria-controls="tx-filters"
            className={`btn-secondary ${showFilters ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' : ''}`}>
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
        {showFilters && (
          <div id="tx-filters" className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
            <div>
              <label htmlFor="filter-type" className="label">Type</label>
              <select id="filter-type" className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-category" className="label">Category</label>
              <select id="filter-category" className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All categories</option>
                {ALL_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-sort" className="label">Sort by</label>
              <select id="filter-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="latest">Latest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount_desc">Amount: high to low</option>
                <option value="amount_asc">Amount: low to high</option>
              </select>
            </div>
          </div>
        )}
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all'); }}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-7 w-7" />}
            title={hasActiveFilters ? 'No matching transactions' : 'No transactions yet'}
            description={hasActiveFilters ? 'Try adjusting your filters' : 'Add your first income or expense to get started'}
            action={hasActiveFilters ? undefined : (
              <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary">
                <Plus className="h-4 w-4" /> Add transaction
              </button>
            )}
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paged.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onEdit={(t) => { setEditing(t); setFormOpen(true); }}
                onDelete={(t) => setDeleteTarget(t)}
              />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Previous page" className="btn-secondary px-3">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label="Next page" className="btn-secondary px-3">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        editing={editing}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete transaction" maxWidth="max-w-sm">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{deleteTarget?.title}</span> (
          {formatCurrency(Number(deleteTarget?.amount ?? 0))})? This can't be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
