import { useEffect, useState } from 'react';
import { CATEGORIES, EMERGENCY_CATEGORY } from '../types/transaction';
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
  'px-4 py-2.5 border border-[rgba(109,109,109,0.5)] rounded-2xl bg-[var(--c-card)] text-[var(--c-text)] text-sm placeholder:text-[var(--c-text-2)] focus:outline-none focus:border-[var(--c-text)] transition-colors w-full';

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

  const budgetableCategories = CATEGORIES.filter((c) => c !== EMERGENCY_CATEGORY);
  const availableCategories = budget
    ? budgetableCategories
    : budgetableCategories.filter((c) => !existingCategories.includes(c));

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
      <div className="w-full max-w-md bg-[var(--c-card)] border border-[rgba(109,109,109,0.8)] rounded-3xl flex flex-col max-h-[92vh]">
        <div className="px-7 pt-6 pb-3 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[var(--c-text)]">
              {budget ? 'Edit budget' : 'New budget'}
            </h2>
            <p className="text-sm text-[var(--c-text-2)] mt-1">
              Set a spending cap and track your pace.
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
          {/* Category — pill grid */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {availableCategories.map((c) => {
                const selected = form.category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={Boolean(budget) && form.category !== c}
                    onClick={() => set('category', c)}
                    className={`py-2 px-3 rounded-2xl text-sm font-medium border transition-colors cursor-pointer capitalize disabled:opacity-40 disabled:cursor-not-allowed ${
                      selected
                        ? 'bg-[var(--c-accent)] text-[var(--c-text)] border-[var(--c-text)]'
                        : 'bg-[var(--c-card)] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {!budget && availableCategories.length === 0 && (
              <p className="text-xs text-[var(--c-text-2)]">
                Every category already has a budget. Edit one instead.
              </p>
            )}
          </div>

          {/* Period */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Period</label>
            <div className="grid grid-cols-4 gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('period', p)}
                  className={`py-2 rounded-2xl text-sm font-medium border transition-colors cursor-pointer ${
                    form.period === p
                      ? 'bg-[var(--c-accent)] text-[var(--c-text)] border-[var(--c-text)]'
                      : 'bg-[var(--c-card)] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">
              {PERIOD_LABELS[form.period]} limit
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold text-[var(--c-text-2)] pointer-events-none select-none">
                $
              </span>
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
                className={`${inputClass} pl-9 text-lg font-semibold`}
              />
            </div>
          </div>

          {/* Visibility */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => set('isPublic', e.target.checked)}
              className="w-4 h-4 accent-[var(--c-accent)]"
            />
            <span className="text-sm text-[var(--c-text)]">Visible to friends</span>
          </label>

          {error && <p className="text-sm text-[var(--c-expense)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-[20px] bg-[var(--c-text)] text-[var(--c-bg)] border border-[var(--c-text)] text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity cursor-pointer"
          >
            {loading ? 'Saving…' : budget ? 'Save changes' : 'Create budget'}
          </button>
        </form>
      </div>
    </div>
  );
}
