import { useState, useEffect } from 'react';
import { CATEGORIES, type Transaction, type TransactionInput, type TransactionType } from '../types/transaction';
import { createTransaction, updateTransaction } from '../api/transactions';

interface Props {
  transaction?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass =
  'px-4 py-2.5 border border-[rgba(109,109,109,0.5)] rounded-2xl bg-[#ffffff] text-[var(--c-text)] text-sm placeholder:text-[var(--c-text-2)] focus:outline-none focus:border-[var(--c-text)] transition-colors w-full';

const MOODS: { key: string; label: string; color: string }[] = [
  { key: 'regret',   label: 'Regret',   color: '#FFBDC2' },
  { key: 'meh',      label: 'Meh',      color: '#CBCBCB' },
  { key: 'okay',     label: 'Okay',     color: '#FDFBD4' },
  { key: 'glad',     label: 'Glad',     color: '#C5FFD8' },
  { key: 'worth-it', label: 'Worth It', color: '#C68BE1' },
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

  const isExpense = form.type === 'expense';
  const isNonEssential = isExpense && form.essential === false;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-[var(--c-card)] border border-[rgba(109,109,109,0.8)] rounded-3xl shadow-xl flex flex-col max-h-[92vh]">
        <div className="px-7 pt-6 pb-3 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[var(--c-text)]">
              {transaction ? 'Edit transaction' : 'Log a transaction'}
            </h2>
            <p className="text-sm text-[var(--c-text-2)] mt-1">
              How are you feeling about this one?
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-2xl leading-none text-[var(--c-text-2)] hover:text-[var(--c-text)] cursor-pointer px-2"
          >
            ×
          </button>
        </div>

        <form className="flex flex-col gap-5 overflow-y-auto px-7 pb-7" onSubmit={handleSubmit}>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Transaction type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--c-surface)] rounded-2xl">
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
                  className={`py-2 rounded-[16px] text-sm font-semibold transition-colors cursor-pointer ${
                    form.type === t
                      ? 'bg-[var(--c-accent)] text-[var(--c-text)]'
                      : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
                  }`}
                >
                  {t === 'expense' ? 'Expense' : 'Income'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold text-[var(--c-text-2)] pointer-events-none select-none">
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
                className={`${inputClass} pl-9 text-lg font-semibold`}
              />
            </div>
          </div>

          {/* Category (expense only) — pill grid */}
          {isExpense && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--c-text)]">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => {
                  const selected = form.category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('category', c)}
                      className={`py-2 px-3 rounded-2xl text-sm font-medium border transition-colors cursor-pointer capitalize ${
                        selected
                          ? 'bg-[var(--c-accent)] text-[var(--c-text)] border-[var(--c-text)]'
                          : 'bg-[#ffffff] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--c-text-2)]">How would you categorise this purchase?</p>
            </div>
          )}

          {/* Title (description) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Description</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="What did you buy?"
              className={inputClass}
            />
          </div>

          {/* Essential toggle (expense only) */}
          {isExpense && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--c-text)]">Was this essential?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => set('essential', true)}
                  className={`py-2.5 rounded-2xl text-sm font-medium border transition-colors cursor-pointer ${
                    form.essential === true
                      ? 'bg-[var(--c-tint-green)] text-[var(--c-text)] border-[var(--c-text)]'
                      : 'bg-[#ffffff] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
                  }`}
                >
                  Yes, essential
                </button>
                <button
                  type="button"
                  onClick={() => set('essential', false)}
                  className={`py-2.5 rounded-2xl text-sm font-medium border transition-colors cursor-pointer ${
                    form.essential === false
                      ? 'bg-[var(--c-tint-pink)] text-[var(--c-text)] border-[var(--c-text)]'
                      : 'bg-[#ffffff] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
                  }`}
                >
                  No, non-essential
                </button>
              </div>
            </div>
          )}

          {/* Mood (only when non-essential) */}
          {isNonEssential && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--c-text)]">How did it make you feel?</label>
              <div className="grid grid-cols-5 gap-2">
                {MOODS.map(({ key, label, color }) => {
                  const selected = form.mood === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('mood', selected ? undefined : key)}
                      style={selected ? { backgroundColor: color, borderColor: 'var(--c-text)' } : {}}
                      className={`py-2 rounded-2xl border text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'text-[var(--c-text)]'
                          : 'bg-[#ffffff] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment method (expense only) */}
          {isExpense && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--c-text)]">Payment method</label>
              <select
                value={form.paymentMethod ?? ''}
                onChange={(e) => set('paymentMethod', e.target.value || undefined)}
                className={inputClass}
              >
                <option value="">Select payment method</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">
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

          {error && <p className="text-sm text-[var(--c-expense)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-[20px] bg-[var(--c-text)] text-[var(--c-bg)] border border-[var(--c-text)] text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity cursor-pointer"
          >
            {loading ? 'Saving…' : transaction ? 'Save changes' : 'Log transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
