import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getBudgets, deleteBudget } from '../api/budgets';
import Navbar from '../components/Navbar';
import BudgetForm from '../components/BudgetForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTheme } from '../hooks/useTheme';
import type { Budget, BudgetPeriod } from '../types/budget';
import { PERIOD_LABELS } from '../types/budget';

const CAT_COLORS: Record<string, string> = {
  food:          '#534AB7',
  rent:          '#1D9E75',
  transport:     '#D85A30',
  entertainment: '#EF9F27',
  utilities:     '#3B82F6',
  shopping:      '#EC4899',
  health:        '#C68BE1',
  other:         '#B6B6B6',
};

const ALL_PERIODS: Array<BudgetPeriod | 'all'> = ['all', 'daily', 'weekly', 'monthly', 'yearly'];
const FILTER_LABELS: Record<string, string> = { all: 'All', ...PERIOD_LABELS };

/** What fraction of the current period has elapsed (0-1). */
function periodElapsed(period: BudgetPeriod): number {
  const now = new Date();
  switch (period) {
    case 'daily':
      return (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
    case 'weekly': {
      const day = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1
      return (day - 1 + now.getHours() / 24) / 7;
    }
    case 'monthly': {
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return (now.getDate() - 1 + now.getHours() / 24) / days;
    }
    case 'yearly': {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
      return (now.getTime() - start) / (end - start);
    }
  }
}

/** Human-readable time remaining in the current period. */
function timeRemaining(period: BudgetPeriod): string {
  const now = new Date();
  switch (period) {
    case 'daily': {
      const h = 23 - now.getHours();
      const m = 59 - now.getMinutes();
      return h > 0 ? `${h}h ${m}m left today` : `${m}m left today`;
    }
    case 'weekly': {
      const day = now.getDay() === 0 ? 7 : now.getDay();
      const d = 7 - day;
      return d === 0 ? 'Last day of the week' : `${d} day${d !== 1 ? 's' : ''} left this week`;
    }
    case 'monthly': {
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const d = days - now.getDate();
      return d === 0 ? 'Last day of the month' : `${d} day${d !== 1 ? 's' : ''} left this month`;
    }
    case 'yearly': {
      const end = new Date(now.getFullYear() + 1, 0, 1);
      const d = Math.ceil((end.getTime() - now.getTime()) / 86400000);
      return `${d} day${d !== 1 ? 's' : ''} left this year`;
    }
  }
}

type PaceStatus = 'under' | 'on-track' | 'over-pacing' | 'exceeded';

function paceStatus(spentPct: number, elapsedPct: number): PaceStatus {
  if (spentPct >= 100) return 'exceeded';
  if (spentPct > elapsedPct * 100 + 10) return 'over-pacing';
  if (spentPct < elapsedPct * 100 - 10) return 'under';
  return 'on-track';
}

const PACE_LABELS: Record<PaceStatus, string> = {
  under: 'Under budget',
  'on-track': 'On track',
  'over-pacing': 'Over-pacing',
  exceeded: 'Over budget',
};

const PACE_COLORS: Record<PaceStatus, string> = {
  under: 'text-[var(--c-income)]',
  'on-track': 'text-[var(--c-text-2)]',
  'over-pacing': 'text-[#F59E0B]',
  exceeded: 'text-[var(--c-negative)]',
};

const BAR_COLORS: Record<PaceStatus, string> = {
  under: 'bg-[var(--c-accent)]',
  'on-track': 'bg-[var(--c-accent)]',
  'over-pacing': 'bg-[#F59E0B]',
  exceeded: 'bg-[var(--c-negative)]',
};

export default function BudgetsPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BudgetPeriod | 'all'>('all');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const fetchBudgets = useCallback(async () => {
    try {
      const data = await getBudgets();
      setBudgets(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchBudgets();
      import('../api/profile').then(({ getMyProfile }) => {
        getMyProfile().then(setProfile).catch(console.error);
      });
    }
  }, [session, fetchBudgets]);

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      setBudgets((bs) => bs.filter((b) => b._id !== id));
      setConfirmDeleteId(null);
    } catch {
      setConfirmDeleteId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBudget(undefined);
    fetchBudgets();
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  const filtered = filter === 'all' ? budgets : budgets.filter((b) => (b.period ?? 'monthly') === filter);
  const existingCategories = budgets.map((b) => b.category);

  // Summary stats (across filtered set)
  const totalAllocated = filtered.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = filtered.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = filtered.filter((b) => b.spent > b.monthlyLimit).length;

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Header ── */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold m-0 text-[var(--c-text)]">Budgets</h1>
          <button
            onClick={() => { setEditingBudget(undefined); setShowForm(true); }}
            className="px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity bg-[var(--c-accent)] text-white"
          >
            + Add Budget
          </button>
        </div>

        {budgets.length === 0 ? (
          <div className="border border-[var(--c-border)] rounded-2xl p-16 text-center bg-[var(--c-card)]">
            <p className="text-[var(--c-text-2)] mb-4">No budgets yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 rounded-lg font-medium bg-[var(--c-accent)] text-white hover:opacity-80 transition-opacity"
            >
              Create your first budget
            </button>
          </div>
        ) : (
          <>
            {/* ── Summary strip ── */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-5 rounded-2xl bg-[var(--c-tint-pink)]">
                <div className="text-xs text-[var(--c-tint-text-2)] mb-1 uppercase tracking-wide font-medium">
                  {filter === 'all' ? 'Total allocated' : `${FILTER_LABELS[filter]} total`}
                </div>
                <div className="text-2xl font-bold text-[var(--c-tint-text)]">${totalAllocated.toFixed(2)}</div>
              </div>
              <div className="p-5 rounded-2xl bg-[var(--c-tint-green)]">
                <div className="text-xs text-[var(--c-tint-text-2)] mb-1 uppercase tracking-wide font-medium">Spent so far</div>
                <div className="text-2xl font-bold text-[var(--c-tint-text)]">${totalSpent.toFixed(2)}</div>
                {totalAllocated > 0 && (
                  <div className="text-xs text-[var(--c-tint-text-2)] mt-1">
                    {Math.round((totalSpent / totalAllocated) * 100)}% of budget used
                  </div>
                )}
              </div>
              <div className="p-5 rounded-2xl bg-[var(--c-tint-yellow)]">
                <div className="text-xs text-[var(--c-tint-text-2)] mb-1 uppercase tracking-wide font-medium">Remaining</div>
                <div className="text-2xl font-bold text-[var(--c-tint-text)]">
                  ${Math.max(0, totalAllocated - totalSpent).toFixed(2)}
                </div>
                {overBudgetCount > 0 && (
                  <div className="text-xs text-[var(--c-negative)] mt-1">
                    {overBudgetCount} budget{overBudgetCount !== 1 ? 's' : ''} over limit
                  </div>
                )}
              </div>
            </div>

            {/* ── Period filter tabs ── */}
            <div className="flex items-center gap-2 mb-6">
              {ALL_PERIODS.map((p) => {
                const count = p === 'all' ? budgets.length : budgets.filter((b) => (b.period ?? 'monthly') === p).length;
                if (p !== 'all' && count === 0) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setFilter(p)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      filter === p
                        ? 'bg-[var(--c-accent)] text-white border-[var(--c-accent)]'
                        : 'bg-transparent text-[var(--c-text-2)] border-[var(--c-border)] hover:border-[var(--c-accent)]'
                    }`}
                  >
                    {FILTER_LABELS[p]}
                    {count > 0 && (
                      <span className={`ml-1.5 text-xs ${filter === p ? 'text-white/70' : 'text-[var(--c-text-2)]'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Budget cards ── */}
            {filtered.length === 0 ? (
              <div className="border border-[var(--c-border)] rounded-2xl p-12 text-center bg-[var(--c-card)]">
                <p className="text-[var(--c-text-2)]">No {FILTER_LABELS[filter].toLowerCase()} budgets yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filtered.map((budget) => {
                  const period = (budget.period ?? 'monthly') as BudgetPeriod;
                  const spentPct = (budget.spent / budget.monthlyLimit) * 100;
                  const elapsed = periodElapsed(period);
                  const pace = paceStatus(spentPct, elapsed);

                  return (
                    <BudgetCard
                      key={budget._id}
                      budget={budget}
                      period={period}
                      spentPct={spentPct}
                      elapsed={elapsed}
                      pace={pace}
                      onEdit={() => { setEditingBudget(budget); setShowForm(true); }}
                      onDelete={() => setConfirmDeleteId(budget._id)}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {showForm && (
        <BudgetForm
          budget={editingBudget}
          existingCategories={existingCategories}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setEditingBudget(undefined); }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this budget? This can't be undone."
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

interface CardProps {
  budget: Budget;
  period: BudgetPeriod;
  spentPct: number;
  elapsed: number;
  pace: PaceStatus;
  onEdit: () => void;
  onDelete: () => void;
}

function BudgetCard({ budget, period, spentPct, elapsed, pace, onEdit, onDelete }: CardProps) {
  const catColor = CAT_COLORS[budget.category] || '#B6B6B6';
  const barFillPct = Math.min(spentPct, 100);
  const paceMarkerPct = Math.min(elapsed * 100, 100);

  return (
    <div className="border border-[var(--c-border)] rounded-2xl p-6 bg-[var(--c-card)]">
      {/* Card header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: catColor }} />
          <div>
            <h3 className="font-semibold capitalize text-[var(--c-text)]">{budget.category}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--c-border)] text-[var(--c-text-2)]">
                {PERIOD_LABELS[period]}
              </span>
              {budget.isPublic && (
                <span className="text-xs text-[var(--c-text-2)]">· Public</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={onEdit}
            className="text-sm text-[var(--c-accent)] hover:opacity-60 transition-opacity"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-500 hover:opacity-60 transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Amount row */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-2xl font-bold text-[var(--c-text)]">
          ${budget.spent.toFixed(2)}
        </span>
        <span className="text-sm text-[var(--c-text-2)]">
          of ${budget.monthlyLimit.toFixed(2)}
        </span>
      </div>

      {/* Progress bar with pace marker */}
      <div className="relative mb-3">
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-[var(--c-border)]">
          <div
            style={{ width: `${barFillPct}%` }}
            className={`h-full rounded-full transition-all ${BAR_COLORS[pace]}`}
          />
        </div>
        {/* Pace marker — where you "should be" at this point in the period */}
        <div
          title={`${Math.round(elapsed * 100)}% through the ${PERIOD_LABELS[period].toLowerCase()}`}
          style={{ left: `${paceMarkerPct}%` }}
          className="absolute -top-0.5 -translate-x-0.5 w-0.5 h-3.5 bg-[var(--c-text-2)] rounded-full opacity-60"
        />
      </div>

      {/* Footer: time left + pace status + % bar label */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--c-text-2)]">{timeRemaining(period)}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${PACE_COLORS[pace]}`}>
            {PACE_LABELS[pace]}
          </span>
          <span className="text-xs text-[var(--c-text-2)]">
            · {Math.round(spentPct)}%
          </span>
        </div>
      </div>
    </div>
  );
}
