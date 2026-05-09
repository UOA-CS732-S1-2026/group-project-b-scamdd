import { useEffect, useState } from 'react';
import { CATEGORIES } from '../types/transaction';
import type { Budget, BudgetInput, BudgetPeriod } from '../types/budget';
import { PERIOD_LABELS } from '../types/budget';
import { createBudget, updateBudget } from '../api/budgets';

interface Props {
  budget?: Budget;
  existingCategories: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

const PERIODS: BudgetPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

const inputClass =
  'px-3 py-2.5 border border-[var(--c-border)] rounded-lg bg-[var(--c-bg)] text-[var(--c-text)] text-sm focus:outline-none focus:border-[var(--c-accent)] transition-colors w-full';

export default function BudgetForm({ budget, existingCategories, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<BudgetInput>({
    category: '',
    monthlyLimit: 0,
    period: 'monthly',
    isPublic: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (budget) {
      setForm({
        category: budget.category,
        monthlyLimit: budget.monthlyLimit,
        period: budget.period ?? 'monthly',
        isPublic: budget.isPublic,
      });
    }
  }, [budget]);

  const availableCategories = budget
    ? CATEGORIES
    : CATEGORIES.filter((c) => !existingCategories.includes(c));

  function set<K extends keyof BudgetInput>(key: K, value: BudgetInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.category) { setError('Pick a category'); return; }
    if (!form.monthlyLimit || form.monthlyLimit <= 0) {
      setError('Limit must be greater than 0');
      return;
    }
    setLoading(true);
    try {
      if (budget) {
        await updateBudget(budget._id, {
          monthlyLimit: form.monthlyLimit,
          period: form.period,
          isPublic: form.isPublic,
        });
      } else {
        await createBudget(form);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-8">
        <h2 className="text-xl font-bold text-[var(--c-text)] mb-6 text-center">
          {budget ? 'Edit budget' : 'New budget'}
        </h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--c-text)]">Category</label>
            <select
              required
              disabled={Boolean(budget)}
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={`${inputClass} ${budget ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">Select a category</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            {!budget && availableCategories.length === 0 && (
              <p className="text-xs text-[var(--c-text-2)]">
                Every category already has a budget. Edit one instead.
              </p>
            )}
          </div>

          {/* Period */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--c-text)]">Period</label>
            <div className="grid grid-cols-4 gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('period', p)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.period === p
                      ? 'bg-[var(--c-accent)] text-white border-[var(--c-accent)]'
                      : 'bg-transparent text-[var(--c-text-2)] border-[var(--c-border)] hover:border-[var(--c-accent)]'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--c-text)]">
              {PERIOD_LABELS[form.period]} limit
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.monthlyLimit || ''}
              onChange={(e) =>
                set('monthlyLimit', e.target.value === '' ? 0 : parseFloat(e.target.value))
              }
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          {/* Visibility */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => set('isPublic', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-[var(--c-text)]">Visible to friends</span>
          </label>

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
              {loading ? 'Saving…' : budget ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
