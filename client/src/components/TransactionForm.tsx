import { useState, useEffect } from 'react';
import { CATEGORIES, type Transaction, type TransactionInput, type TransactionType } from '../types/transaction';
import { createTransaction, updateTransaction } from '../api/transactions';

interface Props {
  transaction?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass =
  'px-3 py-2.5 border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)] text-[var(--c-text)] text-sm placeholder:text-[var(--c-text-2)] focus:outline-none focus:border-[var(--c-accent)] transition-colors w-full';

const MOODS: { key: string; label: string; color: string; textColor: string }[] = [
  { key: 'regret',   label: 'Regret',    color: '#F87171', textColor: '#fff' },
  { key: 'meh',      label: 'Meh',       color: '#FB923C', textColor: '#fff' },
  { key: 'okay',     label: 'Okay',      color: '#FCD34D', textColor: '#1a1a1a' },
  { key: 'glad',     label: 'Glad',      color: '#86EFAC', textColor: '#1a1a1a' },
  { key: 'worth-it', label: 'Worth It',  color: '#C68BE1', textColor: '#fff' },
];

const PAYMENT_METHODS = ['Cash', 'Debit', 'Credit', 'Bank Transfer', 'PayPal', 'Other'];

export default function TransactionForm({ transaction, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<TransactionInput>({
    title: '',
    amount: 0,
    type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    essential: true,
    mood: undefined,
    paymentMethod: undefined,
  });
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
        essential: transaction.essential,
        mood: transaction.mood,
        paymentMethod: transaction.paymentMethod,
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

  const isNonEssential = form.essential === false;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-8 pt-8 pb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--c-text)] text-center">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
        </div>

        <form className="flex flex-col gap-4 overflow-y-auto px-8 pb-8" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--c-text)]">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Grocery run"
              className={inputClass}
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--c-text)]">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text-2)] pointer-events-none select-none">
                $
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount || ''}
                onChange={(e) => set('amount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                placeholder="0.00"
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--c-text)]">Type</label>
            <div className="flex border border-[var(--c-border)] rounded-lg overflow-hidden">
              {(['expense', 'income'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setForm((f) =>
                      t === 'income'
                        ? { ...f, type: t, category: '', essential: undefined, mood: undefined, paymentMethod: undefined }
                        : { ...f, type: t, essential: true }
                    )
                  }
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    form.type === t
                      ? t === 'expense'
                        ? 'bg-[var(--c-expense-light)] text-[var(--c-expense-dark)] font-semibold'
                        : 'bg-[var(--c-income-light)] text-[var(--c-income-dark)] font-semibold'
                      : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface)]'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'expense' && (
            <>
              {/* Essential / Non-essential */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--c-text)]">Purchase type</label>
                <div className="flex border border-[var(--c-border)] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => set('essential', true)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      form.essential === true
                        ? 'bg-[var(--c-accent)] text-white font-semibold'
                        : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface)]'
                    }`}
                  >
                    Essential
                  </button>
                  <button
                    type="button"
                    onClick={() => set('essential', false)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      form.essential === false
                        ? 'bg-[var(--c-accent)] text-white font-semibold'
                        : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface)]'
                    }`}
                  >
                    Non-essential
                  </button>
                </div>
              </div>

              {/* Mood (only for non-essential) */}
              {isNonEssential && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--c-text)]">
                    How did you feel about it?
                  </label>
                  <div className="flex gap-2">
                    {MOODS.map(({ key, label, color, textColor }) => {
                      const selected = form.mood === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => set('mood', selected ? undefined : key)}
                          style={
                            selected
                              ? { backgroundColor: color, borderColor: color, color: textColor }
                              : {}
                          }
                          className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                            selected
                              ? ''
                              : 'text-[var(--c-text-2)] border-[var(--c-border)] hover:border-[var(--c-accent)]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Category (expense only) */}
          {form.type === 'expense' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--c-text)]">Category</label>
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
          )}

          {/* Payment method (expense only) */}
          {form.type === 'expense' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--c-text)]">
                Payment method{' '}
                <span className="font-normal text-[var(--c-text-2)]">(optional)</span>
              </label>
              <select
                value={form.paymentMethod ?? ''}
                onChange={(e) => set('paymentMethod', e.target.value || undefined)}
                className={inputClass}
              >
                <option value="">Select a payment method</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--c-text)]">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--c-text)]">
              Note <span className="font-normal text-[var(--c-text-2)]">(optional)</span>
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
              className="flex-1 py-2.5 border border-[var(--c-border)] rounded-lg text-sm font-medium text-[var(--c-text)] hover:opacity-80 transition-opacity cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[var(--c-accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity cursor-pointer"
            >
              {loading ? 'Saving…' : transaction ? 'Save changes' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
