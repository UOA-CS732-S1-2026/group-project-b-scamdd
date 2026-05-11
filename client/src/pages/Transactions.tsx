import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getTransactions, deleteTransaction } from '../api/transactions';
import Navbar from '../components/Navbar';
import HeroTitle from '../components/HeroTitle';
import TransactionForm from '../components/TransactionForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTheme } from '../hooks/useTheme';
import type { Transaction } from '../types/transaction';
import type { Profile } from '../types/profile';
import { PAGE_SIZE, MOOD_KEYS } from '../lib/transactions';
import type { SortBy, TimeRange, TypeFilter } from '../lib/transactions';
import { timeRangeBounds, formatRelative, moodIdx } from '../lib/transactionHelpers';
import StatTiles from '../components/transactions/StatTiles';
import DailyChart from '../components/transactions/DailyChart';
import SortRefineSidebar from '../components/transactions/SortRefineSidebar';
import TransactionRow from '../components/transactions/TransactionRow';

export default function Transactions() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Filters
  const [sortBy, setSortBy] = useState<SortBy>('most-recent');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [moodFilter, setMoodFilter] = useState<'all' | typeof MOOD_KEYS[number]>('all');
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [amountRange, setAmountRange] = useState<[number, number] | null>(null);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getTransactions();
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchTransactions();
      import('../api/profile').then(({ getMyProfile }) => {
        getMyProfile().then(setProfile).catch(console.error);
      });
    }
  }, [session, fetchTransactions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      setTransactions((ts) => ts.filter((t) => t._id !== id));
      setConfirmDeleteId(null);
    } catch {
      setConfirmDeleteId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTransaction(undefined);
    fetchTransactions();
  };

  // ── Amount range: max = highest transaction in the loaded set ─────────────
  const dataMaxAmount = useMemo(() => {
    if (transactions.length === 0) return 100;
    return Math.ceil(transactions.reduce((m, t) => Math.max(m, Math.abs(t.amount)), 0));
  }, [transactions]);

  const effectiveAmountRange = useMemo<[number, number]>(
    () => amountRange ?? [0, dataMaxAmount],
    [amountRange, dataMaxAmount],
  );

  // ── Month-locked stats (tiles + chart always show current calendar month) ─
  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const monthEnd = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }, []);

  const monthTxns = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d < monthEnd;
    }),
    [transactions, monthStart, monthEnd],
  );

  const monthExpenses   = monthTxns.filter((t) => t.type === 'expense');
  const monthSpent      = monthExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthBiggestTxn = monthExpenses.reduce<Transaction | null>(
    (best, t) => (best === null || Math.abs(t.amount) > Math.abs(best.amount) ? t : best),
    null,
  );
  const monthBiggest    = monthBiggestTxn ? Math.abs(monthBiggestTxn.amount) : 0;

  // ── Daily spend chart ─────────────────────────────────────────────────────
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const dailySpend = useMemo(() => {
    const arr = Array(daysInMonth).fill(0);
    for (const t of monthExpenses) {
      const day = new Date(t.date).getDate() - 1;
      arr[day] += Math.abs(t.amount);
    }
    return arr;
  }, [monthExpenses, daysInMonth]);
  const dailyMax = Math.max(...dailySpend, 1);

  // ── Apply filters + sort to the list ──────────────────────────────────────
  const filtered = useMemo(() => {
    const { start, end } = timeRangeBounds(timeRange);
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (start && new Date(t.date) < start) return false;
      if (end   && new Date(t.date) >= end)  return false;
      if (categoryFilters.size > 0 && !categoryFilters.has(t.category ?? 'other')) return false;
      if (moodFilter !== 'all' && t.mood !== moodFilter) return false;
      const amt = Math.abs(t.amount);
      if (amt < effectiveAmountRange[0] || amt > effectiveAmountRange[1]) return false;
      return true;
    });
  }, [transactions, typeFilter, timeRange, categoryFilters, moodFilter, effectiveAmountRange]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'most-recent':
        arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'largest':
        arr.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
        break;
      case 'smallest':
        arr.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
        break;
      case 'happiest':
        arr.sort((a, b) => moodIdx(b.mood) - moodIdx(a.mood));
        break;
      case 'most-regretful':
        arr.sort((a, b) => {
          const ai = moodIdx(a.mood);
          const bi = moodIdx(b.mood);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        break;
    }
    return arr;
  }, [filtered, sortBy]);

  const visible = sorted.slice(0, displayLimit);
  const canLoadMore = sorted.length > displayLimit;

  const handleSortBy = (v: typeof sortBy) => { setSortBy(v); setDisplayLimit(PAGE_SIZE); };
  const handleTypeFilter = (v: TypeFilter) => { setTypeFilter(v); setDisplayLimit(PAGE_SIZE); };
  const handleTimeRange = (v: TimeRange) => { setTimeRange(v); setDisplayLimit(PAGE_SIZE); };
  const handleMoodFilter = (v: typeof moodFilter) => { setMoodFilter(v); setDisplayLimit(PAGE_SIZE); };
  const handleAmountRange = (v: [number, number]) => { setAmountRange(v); setDisplayLimit(PAGE_SIZE); };

  const toggleCategory = (cat: string) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
    setDisplayLimit(PAGE_SIZE);
  };

  const lastLogged = transactions.length > 0
    ? formatRelative(
        [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt,
      )
    : null;

  const monthLabelShort = monthStart.toLocaleDateString('en', { month: 'long' });
  const panelClass = 'p-6 rounded-3xl border border-[var(--c-border)] bg-[var(--c-card)]';

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8 gap-4">
          <HeroTitle
            highlight="Transactions"
            subtitle={
              transactions.length === 0
                ? 'No purchases yet — log your first one!'
                : `${monthTxns.length} purchases this month${lastLogged ? ` · last logged ${lastLogged}` : ''}`
            }
          />
          <button
            onClick={() => { setEditingTransaction(undefined); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black text-white text-sm font-semibold hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-black font-bold text-base bg-[var(--c-tint-green)]">+</span>
            Log a transaction
          </button>
        </div>

        {/* Stat tiles */}
        <StatTiles
          monthTxns={monthTxns}
          monthExpenses={monthExpenses}
          monthSpent={monthSpent}
          monthBiggest={monthBiggest}
          monthBiggestTxn={monthBiggestTxn}
        />

        {/* Daily spend chart */}
        <div className={`${panelClass} mb-6`}>
          <h3 className="font-semibold text-base text-[var(--c-text)]">Daily spend</h3>
          <div className="text-xs mb-5 text-[var(--c-text-2)]">{monthLabelShort} · ${monthSpent.toFixed(2)} spent</div>
          <DailyChart values={dailySpend} max={dailyMax} />
        </div>

        {/* Sort & Refine + List */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <SortRefineSidebar
            sortBy={sortBy} onSortBy={handleSortBy}
            typeFilter={typeFilter} onTypeFilter={handleTypeFilter}
            timeRange={timeRange} onTimeRange={handleTimeRange}
            moodFilter={moodFilter} onMoodFilter={handleMoodFilter}
            categoryFilters={categoryFilters} onToggleCategory={toggleCategory}
            amountRange={effectiveAmountRange} onAmountRange={handleAmountRange}
            dataMaxAmount={dataMaxAmount}
          />

          {/* Transaction list */}
          <section className={panelClass}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-base text-[var(--c-text)]">Transactions</h3>
              <span className="text-xs text-[var(--c-text-2)]">{sorted.length} result{sorted.length === 1 ? '' : 's'}</span>
            </div>

            {sorted.length === 0 ? (
              <div className="text-center py-12 text-sm text-[var(--c-text-2)]">
                {transactions.length === 0
                  ? 'No transactions yet. Log your first one!'
                  : 'No transactions match the current filters.'}
              </div>
            ) : (
              <div className="flex flex-col">
                {visible.map((t) => (
                  <TransactionRow
                    key={t._id}
                    txn={t}
                    onEdit={() => { setEditingTransaction(t); setShowForm(true); }}
                    onDelete={() => setConfirmDeleteId(t._id)}
                  />
                ))}
                {canLoadMore && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setDisplayLimit((d) => d + PAGE_SIZE)}
                      className="px-6 py-2 rounded-full border border-[var(--c-border)] text-sm font-medium text-[var(--c-text)] hover:opacity-80 transition-opacity"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {showForm && (
          <TransactionForm
            transaction={editingTransaction}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditingTransaction(undefined); }}
          />
        )}

        {confirmDeleteId && (
          <ConfirmDialog
            message="Delete this transaction? This can't be undone."
            onConfirm={() => handleDelete(confirmDeleteId)}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}

      </main>
    </div>
  );
}
