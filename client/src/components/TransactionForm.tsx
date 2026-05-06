import { useState, useEffect } from 'react';
import { CATEGORIES, type Transaction, type TransactionInput, type TransactionType } from '../types/transaction';
import { createTransaction, updateTransaction } from '../api/transactions';

interface Props {
  transaction?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass =
  'px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm placeholder:text-[var(--text)] focus:outline-none focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-bg)] transition-colors w-full';

export default function TransactionForm({ transaction, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<TransactionInput>(() => ({
    title: '',
    amount: 0,
    type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      setForm({
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date: transaction.date.split('T')[0],
        note: transaction.note ?? '',
      });
    }
  }, [transaction]);

  function set<K extends keyof TransactionInput>(key: K, value: TransactionInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.amount || form.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    setLoading(true);
    try {
      if (transaction) {
        await updateTransaction(transaction._id, form);
      } else {
        await createTransaction(form);
      }
      onSuccess();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-xl p-8 shadow-[var(--shadow)]">
        <h2 className="text-xl font-bold text-[var(--text-h)] mb-6 text-center">
          {transaction ? 'Edit Transaction' : 'Add Transaction'}
        </h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Grocery run"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.amount || ''}
              onChange={(e) => set('amount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">Type</label>
            <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
              {(['expense', 'income'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    form.type === t
                      ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text)] hover:bg-[var(--code-bg)]'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">Category</label>
            <select
              required
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={inputClass}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">
              Note{' '}
              <span className="text-[var(--text)] font-normal">(optional)</span>
            </label>
            <textarea
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              rows={2}
              placeholder="Any additional details…"
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-h)] hover:bg-[var(--code-bg)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity cursor-pointer"
            >
              {loading ? 'Saving…' : transaction ? 'Save changes' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
