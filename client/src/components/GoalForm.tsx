import { useEffect, useState } from 'react';
import type { Goal, GoalInput } from '../types/goal';
import { createGoal, updateGoal } from '../api/goals';

interface Props {
  goal?: Goal;
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass =
  'px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm placeholder:text-[var(--text)] focus:outline-none focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-bg)] transition-colors w-full';

export default function GoalForm({ goal, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<GoalInput>(() => ({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
    isPublic: false,
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goal) {
      setForm({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline.split('T')[0],
        isPublic: goal.isPublic,
      });
    }
  }, [goal]);

  function set<K extends keyof GoalInput>(key: K, value: GoalInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.targetAmount || form.targetAmount <= 0) {
      setError('Target amount must be greater than 0');
      return;
    }
    setLoading(true);
    try {
      if (goal) await updateGoal(goal._id, form);
      else await createGoal(form);
      onSuccess();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6 sm:p-8 shadow-[var(--shadow)]">
        <h2 className="text-xl font-bold text-[var(--text-h)] mb-6 text-center">
          {goal ? 'Edit goal' : 'New goal'}
        </h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">Name</label>
            <input
              type="text"
              required
              maxLength={80}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. House deposit"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">Target amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.targetAmount || ''}
              onChange={(e) =>
                set('targetAmount', e.target.value === '' ? 0 : parseFloat(e.target.value))
              }
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          {goal && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-h)]">Current amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount ?? 0}
                onChange={(e) =>
                  set('currentAmount', e.target.value === '' ? 0 : parseFloat(e.target.value))
                }
                className={inputClass}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-h)]">Deadline</label>
            <input
              type="date"
              required
              value={form.deadline}
              onChange={(e) => set('deadline', e.target.value)}
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => set('isPublic', e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text-h)]">Visible to friends</span>
          </label>

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
              {loading ? 'Saving…' : goal ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
