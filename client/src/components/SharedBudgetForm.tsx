import { useEffect, useState } from 'react';
import { CATEGORIES, EMERGENCY_CATEGORY } from '../types/transaction';
import type { BudgetPeriod } from '../types/budget';
import { PERIOD_LABELS } from '../types/budget';
import type { SharedBudget, SharedBudgetInput } from '../types/sharedBudget';
import { createSharedBudget, inviteToSharedBudget, updateSharedBudget } from '../api/sharedBudgets';
import { getFriends } from '../api/friends';
import type { Friend } from '../types/friend';

interface Props {
  budget?: SharedBudget;
  onSuccess: () => void;
  onCancel: () => void;
}

const PERIODS: BudgetPeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

const AVATAR_PALETTE = ['#FFBDC2', '#FDFBD4', '#C5FFD8', '#C68BE1', '#C5ECF9', '#CBCBCB'];

const inputClass =
  'px-4 py-2.5 border border-[rgba(109,109,109,0.5)] rounded-2xl bg-[var(--c-card)] text-[var(--c-text)] text-sm placeholder:text-[var(--c-text-2)] focus:outline-none focus:border-[var(--c-text)] transition-colors w-full';

function hashIndex(id: string, mod: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

export default function SharedBudgetForm({ budget, onSuccess, onCancel }: Props) {
  const isEdit = Boolean(budget);
  const [name, setName] = useState(budget?.name ?? '');
  const [category, setCategory] = useState(budget?.category ?? '');
  const [monthlyLimit, setMonthlyLimit] = useState(budget?.monthlyLimit ?? 0);
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? 'monthly');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Friend[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getFriends()
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

  const sharableCategories = CATEGORIES.filter((c) => c !== EMERGENCY_CATEGORY);

  // Existing member ids — exclude them from the friend picker when editing
  const existingIds = new Set((budget?.members ?? []).map((m) => m.userId));
  const pickableFriends = friends.filter((f) => !existingIds.has(f.id));

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isEdit && !category) {
      setError('Pick a category');
      return;
    }
    if (!monthlyLimit || monthlyLimit <= 0) {
      setError('Limit must be greater than 0');
      return;
    }
    if (!isEdit && selected.size === 0) {
      setError('Invite at least one friend');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && budget) {
        await updateSharedBudget(budget._id, {
          name: name.trim() || undefined,
          monthlyLimit,
          period,
        });
        if (selected.size > 0) {
          await inviteToSharedBudget(budget._id, Array.from(selected));
        }
      } else {
        const input: SharedBudgetInput = {
          name: name.trim() || undefined,
          category,
          monthlyLimit,
          period,
          inviteUserIds: Array.from(selected),
        };
        await createSharedBudget(input);
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
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-3 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--c-text)]">
              {isEdit ? 'Edit shared budget' : 'New shared budget'}
            </h2>
            <p className="text-sm text-[var(--c-text-2)] mt-1">
              Pool spending with friends or family.
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

        <form
          className="flex flex-col gap-5 overflow-y-auto px-5 sm:px-7 pb-6 sm:pb-7"
          onSubmit={handleSubmit}
        >
          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Label (optional)</label>
            <input
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flat groceries"
              className={inputClass}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {sharableCategories.map((c) => {
                const isSel = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={isEdit && category !== c}
                    onClick={() => setCategory(c)}
                    className={`py-2 px-3 rounded-2xl text-sm font-medium border transition-colors cursor-pointer capitalize disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSel
                        ? 'bg-[var(--c-accent)] text-[var(--c-text)] border-[var(--c-text)]'
                        : 'bg-[var(--c-card)] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Period */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">Period</label>
            <div className="grid grid-cols-4 gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`py-2 rounded-2xl text-sm font-medium border transition-colors cursor-pointer ${
                    period === p
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
              {PERIOD_LABELS[period]} limit
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
                value={monthlyLimit || ''}
                onChange={(e) =>
                  setMonthlyLimit(e.target.value === '' ? 0 : parseFloat(e.target.value))
                }
                placeholder="0.00"
                className={`${inputClass} pl-9 text-lg font-semibold`}
              />
            </div>
          </div>

          {/* Friend picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--c-text)]">
              {isEdit ? 'Invite more friends' : 'Invite friends'}
            </label>
            {pickableFriends.length === 0 ? (
              <p className="text-xs text-[var(--c-text-2)]">
                {friends.length === 0
                  ? 'Add some friends first to share a budget with them.'
                  : 'Everyone you know is already in this budget.'}
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {pickableFriends.map((f) => {
                  const label = f.displayName || f.username || 'Friend';
                  const colour = AVATAR_PALETTE[hashIndex(f.id, AVATAR_PALETTE.length)];
                  const isSel = selected.has(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggle(f.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-2xl border transition-colors text-left cursor-pointer ${
                        isSel
                          ? 'bg-[var(--c-accent)] border-[var(--c-text)]'
                          : 'bg-[var(--c-card)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)]'
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-[#1a1a1a] flex-shrink-0"
                        style={{ background: colour }}
                      >
                        {initials(label)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-[var(--c-text)] truncate">
                          {label}
                        </span>
                        {f.username && (
                          <span className="block text-xs text-[var(--c-text-2)] truncate">
                            @{f.username}
                          </span>
                        )}
                      </span>
                      <span
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] ${
                          isSel
                            ? 'bg-[var(--c-text)] text-[var(--c-bg)] border-[var(--c-text)]'
                            : 'bg-transparent border-[rgba(109,109,109,0.6)]'
                        }`}
                        aria-hidden
                      >
                        {isSel ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-[var(--c-expense)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-[20px] bg-[var(--c-text)] text-[var(--c-bg)] border border-[var(--c-text)] text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity cursor-pointer"
          >
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create shared budget'}
          </button>
        </form>
      </div>
    </div>
  );
}
