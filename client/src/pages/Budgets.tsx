import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getBudgets, deleteBudget } from '../api/budgets';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Highlight from '../components/Highlight';
import BudgetForm from '../components/BudgetForm';
import SharedBudgetForm from '../components/SharedBudgetForm';
import SharedBudgetCard from '../components/SharedBudgetCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../context/CurrencyContext';
import { useCategories } from '../hooks/useCategories';
import type { Budget, BudgetPeriod } from '../types/budget';
import { PERIOD_LABELS } from '../types/budget';
import type { SharedBudget } from '../types/sharedBudget';
import {
  acceptSharedBudgetInvite,
  declineSharedBudgetInvite,
  deleteSharedBudget,
  getSharedBudgetInvites,
  getSharedBudgets,
  leaveSharedBudget,
} from '../api/sharedBudgets';


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

export default function Budgets() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { fmt } = useCurrency();
  const { getCategoryColor } = useCategories();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [sharedBudgets, setSharedBudgets] = useState<SharedBudget[]>([]);
  const [sharedInvites, setSharedInvites] = useState<SharedBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [showSharedForm, setShowSharedForm] = useState(false);
  const [editingShared, setEditingShared] = useState<SharedBudget | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmSharedDeleteId, setConfirmSharedDeleteId] = useState<string | null>(null);
  const [confirmSharedLeaveId, setConfirmSharedLeaveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BudgetPeriod | 'all'>('all');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const fetchBudgets = useCallback(async () => {
    try {
      const [personal, shared, invites] = await Promise.all([
        getBudgets(),
        getSharedBudgets().catch(() => []),
        getSharedBudgetInvites().catch(() => []),
      ]);
      setBudgets(personal);
      setSharedBudgets(shared);
      setSharedInvites(invites);
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

  const meId = session?.user?.id ?? '';

  const handleSharedFormSuccess = () => {
    setShowSharedForm(false);
    setEditingShared(undefined);
    fetchBudgets();
  };

  const handleAcceptShared = async (id: string) => {
    try {
      await acceptSharedBudgetInvite(id);
      fetchBudgets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineShared = async (id: string) => {
    try {
      await declineSharedBudgetInvite(id);
      fetchBudgets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShared = async (id: string) => {
    try {
      await deleteSharedBudget(id);
      setSharedBudgets((bs) => bs.filter((b) => b._id !== id));
      setConfirmSharedDeleteId(null);
    } catch {
      setConfirmSharedDeleteId(null);
    }
  };

  const handleLeaveShared = async (id: string) => {
    try {
      await leaveSharedBudget(id);
      setSharedBudgets((bs) => bs.filter((b) => b._id !== id));
      setConfirmSharedLeaveId(null);
    } catch {
      setConfirmSharedLeaveId(null);
    }
  };

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
  const existingBudgets = budgets.map((b) => ({ category: b.category, period: (b.period ?? 'monthly') as BudgetPeriod }));

  // Summary stats (across filtered set)
  const totalAllocated = filtered.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = filtered.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = filtered.filter((b) => b.spent > b.monthlyLimit).length;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile?.name} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        {/* ── Header ── */}
        <div className="flex justify-between items-center gap-3 flex-wrap mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold m-0 text-[var(--c-text)]">
            <Highlight className="px-3 py-1">Budgets</Highlight>
          </h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setEditingShared(undefined); setShowSharedForm(true); }}
              className="px-4 sm:px-5 py-2 rounded-[20px] text-sm font-semibold border border-[var(--c-text)] bg-[var(--c-card)] text-[var(--c-text)] hover:bg-[var(--c-nav-active)] transition-colors"
            >
              + Shared budget
            </button>
            <button
              onClick={() => { setEditingBudget(undefined); setShowForm(true); }}
              className="px-4 sm:px-5 py-2 rounded-[20px] text-sm font-semibold border border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 transition-opacity"
            >
              + Add a budget
            </button>
          </div>
        </div>

        {budgets.length === 0 ? (
          <div className="border border-[rgba(109,109,109,0.8)] rounded-3xl p-16 text-center bg-[var(--c-card)]">
            <p className="text-[var(--c-text-2)] mb-4">No budgets yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2 rounded-[20px] text-sm font-semibold border border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 transition-opacity"
            >
              Create your first budget
            </button>
          </div>
        ) : (
          <>
            {/* ── Summary strip ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="p-4 sm:p-5 rounded-3xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-tint-pink)]">
                <div className="text-xs text-[var(--c-tint-text-2)] mb-1 uppercase tracking-wide font-medium">
                  {filter === 'all' ? 'Total allocated' : `${FILTER_LABELS[filter]} total`}
                </div>
                <div className="text-2xl font-bold text-[var(--c-tint-text)]">{fmt(totalAllocated)}</div>
              </div>
              <div className="p-4 sm:p-5 rounded-3xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-tint-green)]">
                <div className="text-xs text-[var(--c-tint-text-2)] mb-1 uppercase tracking-wide font-medium">Spent so far</div>
                <div className="text-2xl font-bold text-[var(--c-tint-text)]">{fmt(totalSpent)}</div>
                {totalAllocated > 0 && (
                  <div className="text-xs text-[var(--c-tint-text-2)] mt-1">
                    {Math.round((totalSpent / totalAllocated) * 100)}% of budget used
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5 rounded-3xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-tint-yellow)]">
                <div className="text-xs text-[var(--c-tint-text-2)] mb-1 uppercase tracking-wide font-medium">Remaining</div>
                <div className="text-2xl font-bold text-[var(--c-tint-text)]">
                  {fmt(Math.max(0, totalAllocated - totalSpent))}
                </div>
                {overBudgetCount > 0 && (
                  <div className="text-xs text-[var(--c-negative)] mt-1">
                    {overBudgetCount} budget{overBudgetCount !== 1 ? 's' : ''} over limit
                  </div>
                )}
              </div>
            </div>

            {/* ── Period filter tabs ── */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {ALL_PERIODS.map((p) => {
                const count = p === 'all' ? budgets.length : budgets.filter((b) => (b.period ?? 'monthly') === p).length;
                if (p !== 'all' && count === 0) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setFilter(p)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                      filter === p
                        ? 'bg-[var(--c-accent)] text-[var(--c-text)] border-[var(--c-text)]'
                        : 'bg-[var(--c-card)] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
                    }`}
                  >
                    {FILTER_LABELS[p]}
                    {count > 0 && (
                      <span className={`ml-1.5 text-xs ${filter === p ? 'text-[var(--c-text-2)]' : 'text-[var(--c-text-2)]'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Budget cards ── */}
            {filtered.length === 0 ? (
              <div className="border border-[rgba(109,109,109,0.8)] rounded-3xl p-12 text-center bg-[var(--c-card)]">
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
                      getCategoryColor={getCategoryColor}
                      onEdit={() => { setEditingBudget(budget); setShowForm(true); }}
                      onDelete={() => setConfirmDeleteId(budget._id)}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Shared budgets section ── */}
        <section id="shared" className="mt-12">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-2xl font-bold text-[var(--c-text)]">Shared budgets</h2>
            {(sharedBudgets.length > 0 || sharedInvites.length > 0) && (
              <button
                onClick={() => { setEditingShared(undefined); setShowSharedForm(true); }}
                className="px-4 py-1.5 rounded-full text-sm font-medium border border-[var(--c-text)] text-[var(--c-text)] hover:bg-[var(--c-nav-active)] transition-colors"
              >
                + New shared budget
              </button>
            )}
          </div>

          {sharedInvites.length > 0 && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-5">
              {sharedInvites.map((sb) => (
                <SharedBudgetCard
                  key={sb._id}
                  budget={sb}
                  meId={meId}
                  onAccept={() => handleAcceptShared(sb._id)}
                  onDecline={() => handleDeclineShared(sb._id)}
                />
              ))}
            </div>
          )}

          {sharedBudgets.length === 0 && sharedInvites.length === 0 ? (
            <div className="border border-[rgba(109,109,109,0.8)] rounded-3xl p-12 text-center bg-[var(--c-card)]">
              <p className="text-[var(--c-text-2)] mb-3">
                Pool spending with friends or family — pick a category and invite people.
              </p>
              <button
                onClick={() => { setEditingShared(undefined); setShowSharedForm(true); }}
                className="px-5 py-2 rounded-[20px] text-sm font-semibold border border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 transition-opacity"
              >
                Create a shared budget
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sharedBudgets.map((sb) => (
                <SharedBudgetCard
                  key={sb._id}
                  budget={sb}
                  meId={meId}
                  onEdit={() => { setEditingShared(sb); setShowSharedForm(true); }}
                  onLeave={() => setConfirmSharedLeaveId(sb._id)}
                  onDelete={() => setConfirmSharedDeleteId(sb._id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {showForm && (
        <BudgetForm
          budget={editingBudget}
          existingBudgets={existingBudgets}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setEditingBudget(undefined); }}
        />
      )}

      {showSharedForm && (
        <SharedBudgetForm
          budget={editingShared}
          onSuccess={handleSharedFormSuccess}
          onCancel={() => { setShowSharedForm(false); setEditingShared(undefined); }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this budget? This can't be undone."
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {confirmSharedDeleteId && (
        <ConfirmDialog
          message="Delete this shared budget for everyone? This can't be undone."
          onConfirm={() => handleDeleteShared(confirmSharedDeleteId)}
          onCancel={() => setConfirmSharedDeleteId(null)}
        />
      )}

      {confirmSharedLeaveId && (
        <ConfirmDialog
          message="Leave this shared budget? The others can keep using it."
          onConfirm={() => handleLeaveShared(confirmSharedLeaveId)}
          onCancel={() => setConfirmSharedLeaveId(null)}
        />
      )}

      <Footer />
    </div>
  );
}

interface CardProps {
  budget: Budget;
  period: BudgetPeriod;
  spentPct: number;
  elapsed: number;
  pace: PaceStatus;
  getCategoryColor: (name: string) => string;
  onEdit: () => void;
  onDelete: () => void;
}

function BudgetCard({ budget, period, spentPct, elapsed, pace, getCategoryColor, onEdit, onDelete }: CardProps) {
  const catColor = getCategoryColor(budget.category);
  const { fmt } = useCurrency();
  const barFillPct = Math.min(spentPct, 100);
  const paceMarkerPct = Math.min(elapsed * 100, 100);

  return (
    <div className="border border-[rgba(109,109,109,0.8)] rounded-3xl p-6 bg-[var(--c-card)]">
      {/* Card header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 border-[3px] border-white"
            style={{ backgroundColor: catColor }}
          />
          <div>
            <h3 className="font-semibold capitalize text-[var(--c-text)]">{budget.category}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full border border-[rgba(109,109,109,0.5)] text-[var(--c-text-2)]">
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
            className="text-sm text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-[var(--c-expense)] hover:opacity-60 transition-opacity cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Amount row */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-2xl font-bold text-[var(--c-text)]">
          {fmt(budget.spent)}
        </span>
        <span className="text-sm text-[var(--c-text-2)]">
          of {fmt(budget.monthlyLimit)}
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
        {/* Pace marker - where you "should be" at this point in the period */}
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
