import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getTransactions, deleteTransaction } from '../api/transactions';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Highlight from '../components/Highlight';
import TransactionForm from '../components/TransactionForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../context/CurrencyContext';
import type { Transaction } from '../types/transaction';
import { useCategories } from '../hooks/useCategories';

const MOOD_DISPLAY: Record<string, { label: string; emoji: string; color: string; value: number }> = {
  'regret':   { label: 'Regret',   emoji: '😞', color: '#FFBDC2', value: 1 },
  'meh':      { label: 'Meh',      emoji: '😐', color: '#CBCBCB', value: 2 },
  'okay':     { label: 'Okay',     emoji: '🙂', color: '#FDFBD4', value: 3 },
  'glad':     { label: 'Glad',     emoji: '😊', color: '#C5FFD8', value: 4 },
  'worth-it': { label: 'Worth It', emoji: '🤩', color: '#C68BE1', value: 5 },
};

type SortOption = 'recent' | 'largest' | 'smallest' | 'happiest' | 'regretful';
type TimeRange = 'all' | 'today' | 'week' | 'month' | 'lastMonth';

function rangeBounds(r: TimeRange): { from: string; to: string } {
  if (r === 'all') return { from: '', to: '' };
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (r === 'today') return { from: fmt(now), to: fmt(now) };
  if (r === 'week') {
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - (day - 1));
    return { from: fmt(mon), to: fmt(now) };
  }
  if (r === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: fmt(now) };
  }
  // lastMonth
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: fmt(start), to: fmt(end) };
}

function MoodDot({ mood }: { mood: string }) {
  const m = MOOD_DISPLAY[mood];
  if (!m) return null;
  return (
    <span className="text-base" title={m.label} aria-label={m.label}>
      {m.emoji}
    </span>
  );
}

const TH = 'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--c-text-2)] text-left whitespace-nowrap';
const TD = 'px-4 py-4 text-sm align-middle';

export default function Transactions() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { fmt } = useCurrency();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [filterAmountMin, setFilterAmountMin] = useState<string>('');
  const [filterAmountMax, setFilterAmountMax] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { allCategories } = useCategories();

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

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterFrom && new Date(t.date) < new Date(filterFrom)) return false;
      if (filterTo && new Date(t.date) > new Date(filterTo + 'T23:59:59')) return false;
      if (filterMood !== 'all' && t.mood !== filterMood) return false;
      const amt = Math.abs(t.amount);
      if (filterAmountMin && amt < Number(filterAmountMin)) return false;
      if (filterAmountMax && amt > Number(filterAmountMax)) return false;
      if (q && !t.title.toLowerCase().includes(q) && !(t.note ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'recent':    return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'largest':   return Math.abs(b.amount) - Math.abs(a.amount);
        case 'smallest':  return Math.abs(a.amount) - Math.abs(b.amount);
        case 'happiest':  return (MOOD_DISPLAY[b.mood ?? '']?.value ?? 0) - (MOOD_DISPLAY[a.mood ?? '']?.value ?? 0);
        case 'regretful': return (MOOD_DISPLAY[a.mood ?? '']?.value ?? 99) - (MOOD_DISPLAY[b.mood ?? '']?.value ?? 99);
      }
    });
  }, [transactions, filterType, filterCategory, filterFrom, filterTo, filterMood, filterAmountMin, filterAmountMax, sortBy, searchQuery]);

  const hasActiveFilters =
    filterType !== 'all' || filterCategory !== 'all' || filterFrom !== '' || filterTo !== ''
    || filterMood !== 'all' || filterAmountMin !== '' || filterAmountMax !== '' || timeRange !== 'all' || sortBy !== 'recent'
    || searchQuery !== '';

  const stats = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const spent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const biggest = expenses.reduce<Transaction | null>((b, t) => !b || Math.abs(t.amount) > Math.abs(b.amount) ? t : b, null);
    const moodList = filteredTransactions.filter(t => t.essential === false && t.mood && MOOD_DISPLAY[t.mood]);
    const moodTotalSpent = moodList.reduce((s, t) => s + Math.abs(t.amount), 0);
    const moodAvg = moodTotalSpent > 0
      ? moodList.reduce((s, t) => s + MOOD_DISPLAY[t.mood!].value * Math.abs(t.amount), 0) / moodTotalSpent
      : 0;
    const moodEmoji = moodAvg >= 4.5 ? '🤩' : moodAvg >= 3.5 ? '😊' : moodAvg >= 2.5 ? '😐' : moodAvg >= 1.5 ? '😕' : moodAvg > 0 ? '😞' : '—';
    return { spent, count: filteredTransactions.length, biggest, moodAvg, moodEmoji };
  }, [filteredTransactions]);

  const dailySpend = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) return { bars: [] as { day: number; total: number }[], max: 0, monthLabel: '' };
    const dates = expenses.map(t => new Date(t.date));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const year = maxDate.getFullYear();
    const month = maxDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totals = new Array(daysInMonth).fill(0);
    for (const t of expenses) {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        totals[d.getDate() - 1] += Math.abs(t.amount);
      }
    }
    const max = Math.max(...totals, 1);
    const monthLabel = maxDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
    return { bars: totals.map((total, i) => ({ day: i + 1, total })), max, monthLabel };
  }, [filteredTransactions]);

  const lastLogged = useMemo(() => {
    if (transactions.length === 0) return null;
    const latest = transactions.reduce((b, t) => new Date(t.date) > new Date(b.date) ? t : b, transactions[0]);
    const diffMs = Date.now() - new Date(latest.date).getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }, [transactions]);

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile?.name} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Title row */}
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-4xl font-bold m-0 text-[var(--c-text)]">
            <Highlight className="px-3 py-1">Transactions</Highlight>
          </h1>
          <button
            onClick={() => { setEditingTransaction(undefined); setShowForm(true); }}
            className="px-5 py-2 rounded-[20px] text-sm font-semibold border border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 transition-opacity"
          >
            + Log a transaction
          </button>
        </div>
        <p className="text-sm text-[var(--c-text-2)] mb-6">
          {transactions.length} purchases logged{lastLogged && ` · last logged ${lastLogged}`}
        </p>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard bg="#FFBDC2" label="Spent" sub="So far, this month" value={fmt(stats.spent)} />
          <StatCard bg="#FDFBD4" label="Transactions" sub="So far, this month" value={`${stats.count}`} />
          <StatCard
            bg="#C5FFD8"
            label="Biggest hit"
            sub={stats.biggest?.title || 'This month'}
            value={stats.biggest ? fmt(Math.abs(stats.biggest.amount)) : '—'}
          />
          <StatCard
            bg="#C68BE1"
            label="Mood average"
            sub="This month's average"
            value={stats.moodAvg ? `${stats.moodAvg.toFixed(1)}/5 ${stats.moodEmoji}` : '—'}
          />
        </div>

        {/* Daily spend bar chart */}
        <div className="mb-6 p-5 rounded-3xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-card)]">
          <h3 className="font-semibold text-base text-[var(--c-text)]">Daily spend</h3>
          {dailySpend.bars.length === 0 ? (
            <p className="text-sm text-[var(--c-text-2)] mt-4">No expense data to chart.</p>
          ) : (
            <>
              <div className="text-xs text-[var(--c-text-2)] mb-4">
                {dailySpend.monthLabel} · {fmt(dailySpend.bars.reduce((s, b) => s + b.total, 0))} spent
              </div>
              <div className="flex items-end gap-1 h-36">
                {dailySpend.bars.map(b => (
                  <div key={b.day} className="flex-1 h-full flex flex-col justify-end">
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${b.total > 0 ? Math.max((b.total / dailySpend.max) * 100, 2) : 0}%`,
                        background: '#C68BE1',
                      }}
                      title={`Day ${b.day}: ${fmt(b.total)}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-1">
                {dailySpend.bars.map(b => (
                  <div key={b.day} className="flex-1 flex justify-center">
                    {(b.day === 1 || b.day % 5 === 0 || b.day === dailySpend.bars.length) && (
                      <span className="text-[10px] text-[var(--c-text-2)] leading-none">{b.day}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort & refine on top, transactions list below */}
        <div className="flex flex-col gap-6">
          <aside className="p-5 rounded-3xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-card)]">
            <button
              type="button"
              onClick={() => setFiltersOpen(o => !o)}
              className={`flex w-full items-center justify-between font-semibold text-base text-[var(--c-text)] cursor-pointer ${filtersOpen ? 'mb-4' : ''}`}
              aria-expanded={filtersOpen}
            >
              <span>
                Sort &amp; refine
                {hasActiveFilters && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--c-accent)] text-[var(--c-text)] align-middle">
                    active
                  </span>
                )}
              </span>
              <span aria-hidden className={`transition-transform text-[var(--c-text-2)] ${filtersOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {filtersOpen && (<>
            {/* Search */}
            <div className="relative mb-4">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--c-text-2)] pointer-events-none" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="6.5" cy="6.5" r="4.5" />
                <path d="M10.5 10.5l3 3" />
              </svg>
              <input
                type="search"
                placeholder="Search by title or note…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[rgba(109,109,109,0.5)] bg-[var(--c-card)] text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-2)] focus:outline-none focus:border-[var(--c-text)] transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
            <FilterGroup label="SORT BY">
              {(['recent', 'largest', 'smallest', 'happiest', 'regretful'] as SortOption[]).map(s => (
                <FilterChip key={s} active={sortBy === s} onClick={() => setSortBy(s)}>
                  {s === 'recent' ? 'Most recent'
                    : s === 'largest' ? 'Largest amount'
                    : s === 'smallest' ? 'Smallest amount'
                    : s === 'happiest' ? 'Happiest first'
                    : 'Most regretful'}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="TIME RANGE">
              {([
                ['all', 'All'],
                ['today', 'Today'],
                ['week', 'This week'],
                ['month', 'This month'],
                ['lastMonth', 'Last month'],
              ] as const).map(([k, label]) => (
                <FilterChip
                  key={k}
                  active={timeRange === k}
                  onClick={() => {
                    setTimeRange(k);
                    const { from, to } = rangeBounds(k);
                    setFilterFrom(from);
                    setFilterTo(to);
                  }}
                >
                  {label}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="MOOD">
              <FilterChip active={filterMood === 'all'} onClick={() => setFilterMood('all')}>All</FilterChip>
              {Object.entries(MOOD_DISPLAY).map(([key, m]) => (
                <FilterChip key={key} active={filterMood === key} onClick={() => setFilterMood(key)}>
                  <span title={m.label} aria-label={m.label} className="text-base">{m.emoji}</span>
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="CATEGORY">
              <FilterChip active={filterCategory === 'all'} onClick={() => setFilterCategory('all')}>All</FilterChip>
              {allCategories.map(c => (
                <FilterChip key={c} active={filterCategory === c} onClick={() => setFilterCategory(c)}>
                  <span className="capitalize">{c}</span>
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="AMOUNT">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="$0"
                  value={filterAmountMin}
                  onChange={e => setFilterAmountMin(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-[12px] text-sm bg-[var(--c-card)] border border-[rgba(109,109,109,0.5)] focus:outline-none focus:border-[var(--c-text)]"
                />
                <span className="text-xs text-[var(--c-text-2)]">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="$any"
                  value={filterAmountMax}
                  onChange={e => setFilterAmountMax(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-[12px] text-sm bg-[var(--c-card)] border border-[rgba(109,109,109,0.5)] focus:outline-none focus:border-[var(--c-text)]"
                />
              </div>
            </FilterGroup>

            <FilterGroup label="TYPE">
              {(['all', 'income', 'expense'] as const).map(k => (
                <FilterChip key={k} active={filterType === k} onClick={() => setFilterType(k)}>
                  <span className="capitalize">{k}</span>
                </FilterChip>
              ))}
            </FilterGroup>

            </div>

            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => {
                setFilterType('all'); setFilterCategory('all'); setFilterFrom(''); setFilterTo('');
                setFilterMood('all'); setFilterAmountMin(''); setFilterAmountMax('');
                setSortBy('recent'); setTimeRange('all'); setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-[20px] text-sm border border-[rgba(109,109,109,0.8)] bg-[var(--c-card)] text-[var(--c-text)] hover:opacity-80 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear all
            </button>
            </>)}
          </aside>

          <div className="min-w-0">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-[var(--c-text-2)]">
                {filteredTransactions.length} of {transactions.length} transactions
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="border border-[rgba(109,109,109,0.8)] rounded-3xl p-12 text-center bg-[var(--c-card)]">
                <p className="text-[var(--c-text-2)]">
                  {transactions.length === 0 ? 'No transactions yet. Add one to get started.' : 'No transactions match the current filters.'}
                </p>
              </div>
            ) : (
          <div className="border border-[rgba(109,109,109,0.8)] rounded-3xl overflow-hidden bg-[var(--c-card)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--c-surface)] border-b border-[var(--c-border)]">
                    <th className={TH}>Date</th>
                    <th className={TH}>Title</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Category</th>
                    <th className={TH}>Essential</th>
                    <th className={TH}>Mood</th>
                    <th className={TH}>Payment</th>
                    <th className={`${TH} text-right`}>Amount</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr
                      key={t._id}
                      className="border-b border-[var(--c-border)] last:border-b-0 hover:bg-[var(--c-surface)] transition-colors group"
                    >
                      {/* Date */}
                      <td className={`${TD} text-[var(--c-text-2)] whitespace-nowrap`}>
                        {new Date(t.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                      </td>

                      {/* Title */}
                      <td className={`${TD} font-medium text-[var(--c-text)] max-w-[180px]`}>
                        <span className="block truncate">{t.title}</span>
                        {t.note && (
                          <span className="block text-xs text-[var(--c-text-2)] truncate mt-0.5 font-normal">
                            {t.note}
                          </span>
                        )}
                      </td>

                      {/* Type */}
                      <td className={TD}>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            t.type === 'income'
                              ? 'bg-[var(--c-income-light)] text-[var(--c-income-dark)]'
                              : 'bg-[var(--c-expense-light)] text-[var(--c-expense-dark)]'
                          }`}
                        >
                          {t.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className={`${TD} capitalize text-[var(--c-text-2)]`}>
                        {t.category ?? <span className="text-[var(--c-border)]">-</span>}
                      </td>

                      {/* Essential */}
                      <td className={TD}>
                        {t.type === 'expense' && t.essential !== undefined ? (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              t.essential
                                ? 'bg-[var(--c-tint-green)] text-[var(--c-tint-text)]'
                                : 'bg-[var(--c-tint-yellow)] text-[var(--c-tint-text)]'
                            }`}
                          >
                            {t.essential ? 'Essential' : 'Non-essential'}
                          </span>
                        ) : (
                          <span className="text-[var(--c-border)]">-</span>
                        )}
                      </td>

                      {/* Mood */}
                      <td className={TD}>
                        {t.essential === false && t.mood ? (
                          <MoodDot mood={t.mood} />
                        ) : (
                          <span className="text-[var(--c-border)]">-</span>
                        )}
                      </td>

                      {/* Payment method */}
                      <td className={`${TD} text-[var(--c-text-2)] whitespace-nowrap`}>
                        {t.paymentMethod ?? <span className="text-[var(--c-border)]">-</span>}
                      </td>

                      {/* Amount */}
                      <td className={`${TD} text-right font-semibold whitespace-nowrap ${
                        t.type === 'income' ? 'text-[var(--c-income)]' : 'text-[var(--c-expense)]'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                      </td>

                      {/* Actions */}
                      <td className={TD}>
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingTransaction(t); setShowForm(true); }}
                            className="text-xs text-[var(--c-accent)] hover:opacity-60 transition-opacity whitespace-nowrap"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(t._id)}
                            className="text-xs text-red-500 hover:opacity-60 transition-opacity"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            )}
          </div>
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

      <Footer />
    </div>
  );
}

function StatCard({ bg, label, sub, value }: { bg: string; label: string; sub: string; value: string }) {
  return (
    <div
      className="p-4 rounded-3xl border border-[rgba(109,109,109,0.8)]"
      style={{ background: bg }}
    >
      <div className="text-sm font-semibold text-[var(--c-tint-text)]">{label}</div>
      <div className="text-xs mb-3 text-[var(--c-tint-text-2)] truncate">{sub}</div>
      <div className="text-2xl font-bold text-[var(--c-tint-text)]">{value}</div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-semibold tracking-wider text-[var(--c-text-2)] mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
        active
          ? 'bg-[var(--c-accent)] text-[var(--c-text)] border-[var(--c-text)]'
          : 'bg-[var(--c-card)] text-[var(--c-text-2)] border-[rgba(109,109,109,0.5)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]'
      }`}
    >
      {children}
    </button>
  );
}
