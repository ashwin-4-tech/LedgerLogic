import { useState, useEffect, useId } from 'react';
import { Modal } from './Modal';
import type { Transaction, TransactionInput } from '@/lib/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '@/lib/types';
import { todayISO } from '@/lib/format';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: TransactionInput) => Promise<void>;
  editing?: Transaction | null;
}

export function TransactionForm({ open, onClose, onSubmit, editing }: TransactionFormProps) {
  const [form, setForm] = useState<TransactionInput>({
    title: '',
    amount: 0,
    type: 'expense',
    category: EXPENSE_CATEGORIES[0],
    payment_method: PAYMENT_METHODS[0],
    description: '',
    transaction_date: todayISO(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        amount: Number(editing.amount),
        type: editing.type,
        category: editing.category,
        payment_method: editing.payment_method,
        description: editing.description ?? '',
        transaction_date: editing.transaction_date,
      });
    } else {
      setForm({
        title: '',
        amount: 0,
        type: 'expense',
        category: EXPENSE_CATEGORIES[0],
        payment_method: PAYMENT_METHODS[0],
        description: '',
        transaction_date: todayISO(),
      });
    }
    setError(null);
  }, [editing, open]);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Please enter a title');
    if (form.amount <= 0) return setError('Amount must be greater than 0');

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        amount: Number(form.amount),
        description: form.description?.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit transaction' : 'Add transaction'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Transaction type">
          <button
            type="button"
            role="radio"
            aria-checked={form.type === 'expense'}
            onClick={() =>
              setForm((f) => ({ ...f, type: 'expense', category: EXPENSE_CATEGORIES[0] }))
            }
            className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
              form.type === 'expense'
                ? 'border-rose-500 bg-rose-50 text-rose-600'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={form.type === 'income'}
            onClick={() =>
              setForm((f) => ({ ...f, type: 'income', category: INCOME_CATEGORIES[0] }))
            }
            className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
              form.type === 'income'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            Income
          </button>
        </div>

        <div>
          <label htmlFor="tx-title" className="label">Title</label>
          <input
            id="tx-title"
            className="input"
            placeholder="e.g. Grocery shopping"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tx-amount" className="label">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true">₹</span>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                className="input pl-7"
                placeholder="0.00"
                value={form.amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div>
            <label htmlFor="tx-date" className="label">Date</label>
            <input
              id="tx-date"
              type="date"
              className="input"
              value={form.transaction_date}
              onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tx-category" className="label">Category</label>
            <select
              id="tx-category"
              className="select"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tx-payment" className="label">Payment method</label>
            <select
              id="tx-payment"
              className="select"
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="tx-description" className="label">Description (optional)</label>
          <textarea
            id="tx-description"
            className="input min-h-[72px] resize-none"
            placeholder="Add a note..."
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        {error && (
          <div id={errorId} role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
