import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getTransactions } from '../api/transactions';
import { getBudgets } from '../api/budgets';
import { getMyProfile } from '../api/profile';
import { getFriends } from '../api/friends';
import Navbar from '../components/Navbar';
import { useTheme } from '../hooks/useTheme';
import type { Transaction } from '../types/transaction';
import type { Budget } from '../types/budget';
import type { Friend } from '../types/friend';

// ── Period helpers ────────────────────────────────────────────────────────────

type DashPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

const PERIOD_DISPLAY: Record<DashPeriod, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
};

function periodBounds(period: DashPeriod, anchor: Date): { start: Date; end: Date } {
  switch (period) {
    case 'daily': {
      const s = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      return { start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1) };
    }
    case 'weekly': {
      const day = anchor.getDay() === 0 ? 7 : anchor.getDay();
      const mon = new Date(anchor);
      mon.setDate(anchor.getDate() - (day - 1));
      mon.setHours(0, 0, 0, 0);
      const next = new Date(mon);
      next.setDate(mon.getDate() + 7);
      return { start: mon, end: next };
    }
    case 'monthly':
      return {
        start: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
        end:   new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
      };
    case 'yearly':
      return {
        start: new Date(anchor.getFullYear(), 0, 1),
        end:   new Date(anchor.getFullYear() + 1, 0, 1),
      };
  }
}

function periodLabel(period: DashPeriod, anchor: Date): string {
  const { start } = periodBounds(period, anchor);
  switch (period) {
    case 'daily':
      return start.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    case 'weekly': {
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const s = start.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      const e = end.toLocaleDateString('en', {
        month: start.getMonth() === end.getMonth() ? undefined : 'short',
        day: 'numeric',
      });
      return `${s} - ${e}, ${start.getFullYear()}`;
    }
    case 'monthly':
      return start.toLocaleDateString('en', { month: 'long', year: 'numeric' });
    case 'yearly':
      return `${start.getFullYear()}`;
  }
}

function shiftAnchor(period: DashPeriod, anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor);
  switch (period) {
    case 'daily':   d.setDate(d.getDate() + dir); break;
    case 'weekly':  d.setDate(d.getDate() + dir * 7); break;
    case 'monthly': d.setMonth(d.getMonth() + dir); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + dir); break;
  }
  return d;
}

function isCurrentOrFuturePeriod(period: DashPeriod, anchor: Date): boolean {
  const now = new Date();
  const { start: nowStart } = periodBounds(period, now);
  const { start: anchorStart } = periodBounds(period, anchor);
  return anchorStart >= nowStart;
}

function currentPointIdx(period: DashPeriod): number {
  const now = new Date();
  switch (period) {
    case 'daily':   return now.getHours();
    case 'weekly':  return now.getDay() === 0 ? 6 : now.getDay() - 1;
    case 'monthly': return now.getDate() - 1;
    case 'yearly':  return now.getMonth();
  }
}

// ── Panel definitions ─────────────────────────────────────────────────────────

const PANEL_DEFS = [
  { id: 'mood'               as const, title: 'Spend by mood',       desc: 'Non-essential spending broken down by mood rating',            width: 2 as const, height: 4,  defaultOn: true  },
  { id: 'category'           as const, title: 'Where it goes',       desc: 'Expense breakdown by category with donut chart',               width: 2 as const, height: 4,  defaultOn: true  },
  { id: 'transactions'       as const, title: 'Recent transactions', desc: 'Scrollable list of all transactions in the period',            width: 2 as const, height: 12, defaultOn: true  },
  { id: 'breakdown'          as const, title: 'Spending breakdown',  desc: 'Proportional bars across 5 spending dimensions',               width: 2 as const, height: 8,  defaultOn: true  },
  { id: 'leaderboard'        as const, title: 'Streak leaderboard',  desc: 'Friends ranked by consecutive days of logging',                width: 2 as const, height: 4,  defaultOn: true  },
  { id: 'net-savings'        as const, title: 'Net savings',         desc: 'Cumulative income minus expenses over the period',             width: 2 as const, height: 4,  defaultOn: false },
  { id: 'daily-spending'     as const, title: 'Period spending',     desc: 'Spending per time segment as individual bars (not cumulative)', width: 2 as const, height: 3,  defaultOn: false },
  { id: 'top-categories'     as const, title: 'Top categories',      desc: 'Ranked horizontal bars of spending per category',             width: 2 as const, height: 5,  defaultOn: false },
  { id: 'budget-utilization' as const, title: 'Budget utilisation',  desc: 'Budget used versus limit for each budget category',           width: 2 as const, height: 5,  defaultOn: false },
  { id: 'txn-count'          as const, title: 'Transaction count',   desc: 'Number of transactions logged per time segment',              width: 2 as const, height: 3,  defaultOn: false },
];

type PanelId = typeof PANEL_DEFS[number]['id'];
type PanelConfig = { id: PanelId; visible: boolean; width?: 1 | 2 | 3 | 4; height?: number };

const DEFAULT_CONFIG: PanelConfig[] = PANEL_DEFS.map(p => ({ id: p.id, visible: p.defaultOn }));
const LS_KEY = 'dashboard-panels-v5';

function loadPanelConfig(): PanelConfig[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed: PanelConfig[] = JSON.parse(raw);
    const savedIds = new Set(parsed.map(p => p.id));
    const extras = DEFAULT_CONFIG.filter(p => !savedIds.has(p.id));
    return [...parsed.filter(p => PANEL_DEFS.some(d => d.id === p.id)), ...extras];
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ── Chart constants ───────────────────────────────────────────────────────────

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

const MOOD_KEYS   = ['regret', 'meh', 'okay', 'glad', 'worth-it'] as const;
const MOOD_LABELS = ['Regret', 'Meh', 'Okay', 'Glad', 'Worth It'] as const;
const MOOD_COLORS = ['#F87171', '#FB923C', '#FCD34D', '#86EFAC', '#C68BE1'];

function computeStreak(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;
  const dateSet = new Set(
    transactions.map((t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cur = new Date(today);
  const todayKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
  if (!dateSet.has(todayKey)) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (true) {
    const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    if (!dateSet.has(k)) break;
    n++;
    cur.setDate(cur.getDate() - 1);
    if (n > 3650) break;
  }
  return n;
}

const formatDateRelative = (dateStr: string) => {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

function PieChart({ slices }: { slices: { value: number; color: string }[] }) {
  const cx = 60, cy = 60, r = 56;
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  let angle = -Math.PI / 2;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      {slices.map((slice, i) => {
        const fraction = slice.value / total;
        const startAngle = angle;
        angle += fraction * 2 * Math.PI;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(angle);
        const y2 = cy + r * Math.sin(angle);
        const large = fraction > 0.5 ? 1 : 0;
        return (
          <path key={i} fill={slice.color}
            d={`M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`} />
        );
      })}
    </svg>
  );
}

function fmtY(v: number): string {
  const abs = Math.abs(v);
  const s = abs >= 1000 ? `${abs % 1000 === 0 ? abs / 1000 : (abs / 1000).toFixed(1)}k` : String(abs);
  return v < 0 ? `-$${s}` : `$${s}`;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [rawBudgets, setRawBudgets] = useState<Budget[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewPeriod, setViewPeriod] = useState<DashPeriod>('monthly');
  const [periodAnchor, setPeriodAnchor] = useState<Date>(new Date());
  const [panelConfig, setPanelConfig] = useState<PanelConfig[]>(() => loadPanelConfig());
  const [showCustomise, setShowCustomise] = useState(false);

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const fetchData = useCallback(async () => {
    try {
      const [transactions, budgets, prof, friendList] = await Promise.all([
        getTransactions(),
        getBudgets(),
        getMyProfile(),
        getFriends().catch(() => [] as Friend[]),
      ]);
      setAllTransactions(transactions);
      setRawBudgets(budgets);
      setProfile(prof);
      setFriends(friendList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  const handlePeriodChange = (p: DashPeriod) => {
    setViewPeriod(p);
    setPeriodAnchor(new Date());
  };

  const togglePanel = (id: PanelId) => {
    const next = panelConfig.map(p => p.id === id ? { ...p, visible: !p.visible } : p);
    setPanelConfig(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const movePanel = (id: PanelId, dir: -1 | 1) => {
    const idx = panelConfig.findIndex(p => p.id === id);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= panelConfig.length) return;
    const next = [...panelConfig];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setPanelConfig(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const setHeight = (id: PanelId, height: number) => {
    const next = panelConfig.map(p => p.id === id ? { ...p, height } : p);
    setPanelConfig(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const setWidth = (id: PanelId, width: 1 | 2 | 3 | 4) => {
    const next = panelConfig.map(p => p.id === id ? { ...p, width } : p);
    setPanelConfig(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const resetPanels = () => {
    setPanelConfig(DEFAULT_CONFIG);
    localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_CONFIG));
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const { start: pStart, end: pEnd } = periodBounds(viewPeriod, periodAnchor);
  const label    = periodLabel(viewPeriod, periodAnchor);
  const isCurrent = isCurrentOrFuturePeriod(viewPeriod, periodAnchor);

  const periodTxns = allTransactions.filter((t) => {
    const d = new Date(t.date);
    return d >= pStart && d < pEnd;
  });
  const expenses = periodTxns.filter(t => t.type === 'expense');
  const incomes  = periodTxns.filter(t => t.type === 'income');

  const totalSpent  = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

  const periodBudgetTotal = rawBudgets
    .filter(b => (b.period ?? 'monthly') === viewPeriod)
    .reduce((s, b) => s + b.monthlyLimit, 0);

  const MOOD_VALUES: Record<string, number> = { regret: 1, meh: 2, okay: 3, glad: 4, 'worth-it': 5 };
  const moodTxns = periodTxns.filter(t => t.essential === false && t.mood && MOOD_VALUES[t.mood] !== undefined);
  const moodTotalSpent = moodTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  const moodAvg = moodTotalSpent > 0
    ? moodTxns.reduce((s, t) => s + MOOD_VALUES[t.mood!] * Math.abs(t.amount), 0) / moodTotalSpent
    : 3;
  const moodEmoji = ['😢', '😕', '😐', '🙂', '😊'][Math.min(Math.floor(moodAvg) - 1, 4)];

  const recentAll = [...periodTxns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // ── Cumulative chart ──────────────────────────────────────────────────────────
  const SVG_W = 400, SVG_H = 110;
  const PAD_L = 36, PAD_R = 8, PAD_T = 6, PAD_B = 16;
  const PLOT_W = SVG_W - PAD_L - PAD_R;
  const PLOT_H = SVG_H - PAD_T - PAD_B;

  let cumulativePoints: number[] = [];
  let xTicks: Array<{ idx: number; label: string }> = [];
  const N_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (viewPeriod === 'daily') {
    cumulativePoints = Array.from({ length: 24 }, (_, h) =>
      expenses.filter(t => new Date(t.date).getHours() <= h).reduce((s, t) => s + Math.abs(t.amount), 0),
    );
    xTicks = [0, 6, 12, 18, 23].map(h => ({
      idx: h, label: h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`,
    }));
  } else if (viewPeriod === 'weekly') {
    cumulativePoints = Array.from({ length: 7 }, (_, i) =>
      expenses.filter(t => { const d = new Date(t.date).getDay(); return (d === 0 ? 6 : d - 1) <= i; })
              .reduce((s, t) => s + Math.abs(t.amount), 0),
    );
    xTicks = ['M','T','W','T','F','S','S'].map((l, i) => ({ idx: i, label: l }));
  } else if (viewPeriod === 'monthly') {
    const dim = new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0).getDate();
    cumulativePoints = Array.from({ length: dim }, (_, i) =>
      expenses.filter(t => new Date(t.date).getDate() <= i + 1).reduce((s, t) => s + Math.abs(t.amount), 0),
    );
    xTicks = [1, 5, 10, 15, 20, 25, dim]
      .filter((d, i, a) => a.indexOf(d) === i && d <= dim)
      .map(d => ({ idx: d - 1, label: String(d) }));
  } else {
    cumulativePoints = Array.from({ length: 12 }, (_, m) =>
      expenses.filter(t => new Date(t.date).getMonth() <= m).reduce((s, t) => s + Math.abs(t.amount), 0),
    );
    xTicks = N_MONTHS.map((l, i) => ({ idx: i, label: l }));
  }

  const N = cumulativePoints.length;
  const drawUpToIdx = isCurrent ? Math.min(currentPointIdx(viewPeriod), N - 1) : N - 1;

  const rawYMax = Math.max(...cumulativePoints, periodBudgetTotal, 10);
  const approxStep = rawYMax / 4;
  const stepMag = Math.pow(10, Math.floor(Math.log10(Math.max(approxStep, 1))));
  const yStep = ([1, 2, 5, 10].map(s => s * stepMag).find(s => rawYMax / s <= 5)) ?? stepMag * 10;
  const yMax = yStep * Math.ceil(rawYMax / yStep);
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);

  const cxFn = (idx: number) => PAD_L + (N <= 1 ? 0 : idx / (N - 1)) * PLOT_W;
  const cyFn = (v: number)   => PAD_T + PLOT_H - (v / yMax) * PLOT_H;
  const chartBottom = PAD_T + PLOT_H;

  const spendPts = cumulativePoints.slice(0, drawUpToIdx + 1)
    .map((v, i) => `${cxFn(i).toFixed(1)},${cyFn(v).toFixed(1)}`);
  const budgetLineY = periodBudgetTotal > 0 ? cyFn(periodBudgetTotal) : null;
  const areaD = spendPts.length > 0
    ? `M ${cxFn(0).toFixed(1)},${chartBottom} L ${spendPts.join(' L ')} L ${cxFn(drawUpToIdx).toFixed(1)},${chartBottom} Z`
    : '';

  // ── Mood & category ───────────────────────────────────────────────────────────
  const moodSpending = [0, 0, 0, 0, 0];
  for (const t of periodTxns.filter(t => t.essential === false && t.mood)) {
    const idx = MOOD_KEYS.indexOf(t.mood as typeof MOOD_KEYS[number]);
    if (idx >= 0) moodSpending[idx] += Math.abs(t.amount);
  }
  const maxMood = Math.max(...moodSpending, 1);

  const catSpending = expenses.reduce((acc, t) => {
    const cat = t.category ?? 'other';
    acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);
  const catSlices = Object.entries(catSpending)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([cat, amount]) => ({ label: cat, value: amount, color: CAT_COLORS[cat] || '#EF9F27' }));
  const catTotal = catSlices.reduce((s, d) => s + d.value, 0);
  const catAllSlices = Object.entries(catSpending)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({ label: cat, value: amount, color: CAT_COLORS[cat] || '#B6B6B6' }));

  // ── Breakdown rows ────────────────────────────────────────────────────────────
  const essentialSpent    = expenses.filter(t => t.essential === true) .reduce((s, t) => s + Math.abs(t.amount), 0);
  const nonEssentialSpent = expenses.filter(t => t.essential === false).reduce((s, t) => s + Math.abs(t.amount), 0);
  const remainingBudget   = Math.max(0, periodBudgetTotal - totalSpent);
  const pmSpending: Record<string, number> = {};
  for (const t of expenses) {
    const pm = t.paymentMethod ?? 'Unspecified';
    pmSpending[pm] = (pmSpending[pm] || 0) + Math.abs(t.amount);
  }
  const PM_COLORS: Record<string, string> = {
    Cash: '#10B981', Debit: '#3B82F6', Credit: '#8B5CF6',
    'Bank Transfer': '#F59E0B', PayPal: '#0EA5E9', Other: '#6B7280', Unspecified: '#9CA3AF',
  };
  const pmSlices = Object.entries(pmSpending)
    .sort((a, b) => b[1] - a[1])
    .map(([lbl, value]) => ({ label: lbl, value, color: PM_COLORS[lbl] ?? '#9CA3AF' }));
  const breakdownRows = [
    { label: 'By category', slices: catAllSlices },
    { label: 'Essential vs Non-essential', slices: [
        { label: 'Essential', value: essentialSpent, color: '#1D9E75' },
        { label: 'Non-essential', value: nonEssentialSpent, color: '#EF9F27' },
      ].filter(s => s.value > 0) },
    { label: 'Spent vs Budget', slices: periodBudgetTotal > 0 ? [
        { label: 'Spent', value: totalSpent, color: '#C68BE1' },
        { label: 'Remaining', value: remainingBudget, color: '#D1D5DB' },
      ].filter(s => s.value > 0) : [] },
    { label: 'Income vs Expenses', slices: [
        { label: 'Income', value: totalIncome, color: '#1D9E75' },
        { label: 'Expenses', value: totalSpent, color: '#D85A30' },
      ].filter(s => s.value > 0) },
    { label: 'By payment method', slices: pmSlices },
  ];

  // ── Leaderboard ───────────────────────────────────────────────────────────────
  const myStreak = computeStreak(allTransactions);
  const AVATAR_PALETTE = ['#C68BE1','#1D9E75','#D85A30','#3B82F6','#F59E0B','#EC4899','#8B5CF6'];
  const leaderboard = [
    { id: 'me', name: profile?.displayName || profile?.name || 'You', streak: myStreak, isMe: true, color: 'var(--c-accent)' },
    ...friends.map((f, i) => ({
      id: f.id,
      name: f.displayName || f.username || 'Friend',
      streak: f.streak,
      isMe: false,
      color: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
    })),
  ].sort((a, b) => b.streak - a.streak);

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  // ── Segment-based chart data ──────────────────────────────────────────────────
  const getSegIdx = (t: Transaction): number => {
    const d = new Date(t.date);
    if (viewPeriod === 'daily')   return d.getHours();
    if (viewPeriod === 'weekly')  return d.getDay() === 0 ? 6 : d.getDay() - 1;
    if (viewPeriod === 'monthly') return d.getDate() - 1;
    return d.getMonth();
  };

  const segSpending = Array.from({ length: N }, (_, i) =>
    expenses.filter(t => getSegIdx(t) === i).reduce((s, t) => s + Math.abs(t.amount), 0),
  );
  const segTxnCount = Array.from({ length: N }, (_, i) =>
    periodTxns.filter(t => getSegIdx(t) === i).length,
  );
  const segLabels: string[] = Array.from({ length: N }, (_, i) => {
    if (viewPeriod === 'daily')   return i % 6 === 0 ? (i === 0 ? '12am' : i === 12 ? '12pm' : i < 12 ? `${i}am` : `${i - 12}pm`) : '';
    if (viewPeriod === 'weekly')  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i];
    if (viewPeriod === 'monthly') return (i + 1) % 5 === 1 || i === N - 1 ? String(i + 1) : '';
    return N_MONTHS[i];
  });

  // Net savings (cumulative income – expenses per segment)
  const netSavingsFull = Array.from({ length: N }, (_, i) =>
    periodTxns.filter(t => getSegIdx(t) <= i)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -Math.abs(t.amount)), 0),
  );

  // Net savings y-axis — must be defined before netSavingsPts uses nsCyFn
  const nsYMax = Math.max(0, ...netSavingsFull, 1);
  const nsYMin = Math.min(0, ...netSavingsFull, -1);
  const nsAbsMax = Math.max(Math.abs(nsYMax), Math.abs(nsYMin));
  const nsStepMag = Math.pow(10, Math.floor(Math.log10(Math.max(nsAbsMax / 2, 1))));
  const nsStep = ([1, 2, 5, 10].map(s => s * nsStepMag).find(s => nsAbsMax / s <= 3)) ?? nsStepMag * 10;
  const nsPMax = nsStep * (Math.ceil(nsYMax / nsStep) || 1);
  const nsPMin = nsYMin < 0 ? -(nsStep * (Math.ceil(-nsYMin / nsStep) || 1)) : 0;
  const nsRange = nsPMax - nsPMin || 1;
  const NS_H = 120;
  const NS_PLOT_H = NS_H - PAD_T - PAD_B;
  const nsCyFn = (v: number) => PAD_T + NS_PLOT_H - ((v - nsPMin) / nsRange) * NS_PLOT_H;

  const netSavingsPts = netSavingsFull.slice(0, drawUpToIdx + 1)
    .map((v, i) => `${cxFn(i).toFixed(1)},${nsCyFn(v).toFixed(1)}`);
  const nsZeroY = nsCyFn(0);
  const nsYTicks = Array.from(
    { length: Math.round((nsPMax - nsPMin) / nsStep) + 1 },
    (_, i) => nsPMin + i * nsStep,
  );
  const nsLastVal = netSavingsFull[drawUpToIdx] ?? 0;
  const nsColor = nsLastVal >= 0 ? '#1D9E75' : '#D85A30';

  // Other maximums for bar charts
  const maxSegSpend = Math.max(...segSpending, 1);
  const maxSegCount = Math.max(...segTxnCount, 1);
  const topCats = catAllSlices.slice(0, 8);
  const maxCatVal = topCats[0]?.value ?? 1;

  // Budget utilisation
  const budgetUtil = rawBudgets
    .filter(b => (b.period ?? 'monthly') === viewPeriod)
    .map(b => ({
      category: b.category,
      limit: b.monthlyLimit,
      spent: catSpending[b.category] ?? 0,
      pct: b.monthlyLimit > 0 ? Math.round(((catSpending[b.category] ?? 0) / b.monthlyLimit) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  // ── Shared styles ─────────────────────────────────────────────────────────────
  const panelClass = 'p-6 rounded-3xl border border-[var(--c-border)] bg-[var(--c-card)] h-full flex flex-col overflow-hidden';
  const cardBase   = 'p-5 rounded-3xl';

  // ── Panel renderer ────────────────────────────────────────────────────────────
  const renderPanel = (id: PanelId) => {
    switch (id) {

      // ── Spend by mood ──
      case 'mood':
        return (
          <div className={panelClass}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-base text-[var(--c-text)]">Spend by mood</h3>
              <button onClick={() => navigate('/transactions')} className="text-sm font-medium hover:opacity-80 text-[var(--c-accent)]">View more →</button>
            </div>
            <div className="text-xs mb-4 text-[var(--c-text-2)]">Non-essential · {label}</div>
            <div className="flex gap-2 flex-1 min-h-0">
              <div className="flex flex-col justify-between items-end text-xs text-[var(--c-text-2)] pb-6 flex-shrink-0 w-10">
                <span>${maxMood >= 1000 ? `${(maxMood / 1000).toFixed(1)}k` : maxMood.toFixed(0)}</span>
                <span>${maxMood >= 1000 ? `${(maxMood / 2000).toFixed(1)}k` : (maxMood / 2).toFixed(0)}</span>
                <span>$0</span>
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 relative" style={{ minHeight: '120px' }}>
                  {[0, 0.5, 1].map(pos => (
                    <div key={pos} className="absolute left-0 right-0 border-t border-[var(--c-grid)]" style={{ top: `${(1 - pos) * 100}%` }} />
                  ))}
                  <div className="absolute inset-0 flex items-end gap-2 pb-px">
                    {MOOD_LABELS.map((lbl, i) => {
                      const amount = moodSpending[i];
                      return (
                        <div key={lbl} className="flex-1 h-full flex items-end">
                          <div
                            title={`$${amount.toFixed(2)}`}
                            style={{ backgroundColor: MOOD_COLORS[i], height: amount > 0 ? `${Math.max((amount / maxMood) * 100, 2)}%` : '0%' }}
                            className="w-full rounded-t-lg transition-all"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {MOOD_LABELS.map((lbl, i) => (
                    <div key={i} className="flex-1 text-xs text-center text-[var(--c-text-2)] leading-tight">{lbl}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      // ── Where it goes ──
      case 'category':
        return (
          <div className={panelClass}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-base text-[var(--c-text)]">Where it goes</h3>
              <button onClick={() => navigate('/transactions')} className="text-sm font-medium hover:opacity-80 text-[var(--c-accent)]">View more →</button>
            </div>
            <div className="text-xs mb-4 text-[var(--c-text-2)]">By category · {label}</div>
            {catSlices.length === 0 ? (
              <div className="text-sm text-center py-8 text-[var(--c-text-2)]">No expenses yet</div>
            ) : (
              <div className="flex items-center gap-6">
                <PieChart slices={catSlices} />
                <div className="flex-1 min-w-0">
                  {catSlices.map(({ label: cl, value, color }) => (
                    <div key={cl} className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm capitalize truncate text-[var(--c-text-2)]">{cl}</span>
                      </div>
                      <span className="text-sm font-medium flex-shrink-0 text-[var(--c-text)]">
                        {catTotal > 0 ? Math.round((value / catTotal) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      // ── Recent transactions ──
      case 'transactions':
        return (
          <div className={panelClass}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-base text-[var(--c-text)]">Recent transactions</h3>
              <button onClick={() => navigate('/transactions')} className="text-sm font-medium hover:opacity-80 text-[var(--c-accent)]">View all →</button>
            </div>
            <div className="text-xs mb-4 text-[var(--c-text-2)]">{label}</div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {recentAll.length === 0 ? (
                <p className="text-sm text-center py-8 text-[var(--c-text-2)]">No transactions for this period.</p>
              ) : (
                <div className="space-y-0.5">
                  {recentAll.map(t => (
                    <div key={t._id} className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-[var(--c-surface)] transition-colors">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--c-text)] truncate">{t.title}</div>
                        <div className="text-xs text-[var(--c-text-2)]">
                          {t.category ? `${t.category} · ` : ''}{formatDateRelative(t.date)}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold flex-shrink-0 ml-4 ${t.type === 'income' ? 'text-[var(--c-income)]' : 'text-[var(--c-expense)]'}`}>
                        {t.type === 'income' ? '+' : '−'}${Math.abs(t.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      // ── Spending breakdown ──
      case 'breakdown':
        return (
          <div className={panelClass}>
            <h3 className="font-semibold text-base text-[var(--c-text)] mb-1">Spending breakdown</h3>
            <div className="text-xs mb-5 text-[var(--c-text-2)]">{label}</div>
            <div className="flex flex-col gap-5">
              {breakdownRows.map(({ label: rowLabel, slices }) => {
                const total = slices.reduce((s, sl) => s + sl.value, 0);
                return (
                  <div key={rowLabel}>
                    <div className="text-xs font-medium text-[var(--c-text-2)] mb-2">{rowLabel}</div>
                    {total === 0 ? (
                      <div className="h-5 rounded-full bg-[var(--c-border)] flex items-center pl-3">
                        <span className="text-xs text-[var(--c-text-2)]">No data</span>
                      </div>
                    ) : (
                      <>
                        <div className="h-5 rounded-full overflow-hidden flex gap-px">
                          {slices.map(sl => (
                            <div key={sl.label} title={`${sl.label}: $${sl.value.toFixed(2)} (${Math.round((sl.value / total) * 100)}%)`}
                              style={{ width: `${(sl.value / total) * 100}%`, backgroundColor: sl.color }}
                              className="h-full transition-all" />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {slices.map(sl => (
                            <div key={sl.label} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sl.color }} />
                              <span className="text-xs text-[var(--c-text-2)] capitalize">
                                {sl.label} · {Math.round((sl.value / total) * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      // ── Streak leaderboard ──
      case 'leaderboard':
        return (
          <div className={panelClass}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-base text-[var(--c-text)]">Streak leaderboard</h3>
              <button onClick={() => navigate('/friends')} className="text-sm font-medium hover:opacity-80 text-[var(--c-accent)]">Manage →</button>
            </div>
            {friends.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-[var(--c-text-2)] mb-3">No friends yet.</p>
                <button onClick={() => navigate('/friends')} className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--c-accent)] text-white hover:opacity-80 transition-opacity">
                  Add friends
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.id} className={`flex items-center gap-3 py-2 px-2 rounded-xl ${entry.isMe ? 'bg-[var(--c-surface)]' : ''}`}>
                    <span className="text-xs font-bold w-5 text-center flex-shrink-0 text-[var(--c-text-2)]">
                      {idx === 0 ? '🥇' : `#${idx + 1}`}
                    </span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: entry.color }}>
                      {getInitials(entry.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-[var(--c-text)]">
                        {entry.name}{entry.isMe && <span className="text-xs text-[var(--c-text-2)] ml-1">(you)</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-bold text-[var(--c-accent)]">{entry.streak}</div>
                      <div className="text-xs text-[var(--c-text-2)]">days</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ── Net savings ──
      case 'net-savings':
        return (
          <div className={panelClass}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-base mb-1 text-[var(--c-text)]">Net savings</h3>
                <div className="text-xs text-[var(--c-text-2)]">Cumulative income − expenses · {label}</div>
              </div>
              <span className={`text-xl font-bold flex-shrink-0 ${nsLastVal >= 0 ? 'text-[var(--c-income)]' : 'text-[var(--c-expense)]'}`}>
                {nsLastVal >= 0 ? '+' : '−'}${Math.abs(nsLastVal).toFixed(0)}
              </span>
            </div>
            <svg width="100%" viewBox={`0 0 ${SVG_W} ${NS_H}`} style={{ display: 'block', overflow: 'visible' }}>
              {nsYTicks.map(tick => {
                const y = nsCyFn(tick);
                return (
                  <g key={tick}>
                    <line x1={PAD_L} y1={y} x2={PAD_L + PLOT_W} y2={y}
                      stroke={tick === 0 ? 'var(--c-text-2)' : 'var(--c-grid)'}
                      strokeWidth={tick === 0 ? 1.5 : 1}
                      strokeDasharray={tick === 0 ? '4 3' : undefined} />
                    <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--c-text-2)">{fmtY(tick)}</text>
                  </g>
                );
              })}
              {/* zero-crossing area fill */}
              {netSavingsPts.length > 1 && (
                <path
                  d={`M ${cxFn(0).toFixed(1)},${nsZeroY.toFixed(1)} L ${netSavingsPts.join(' L ')} L ${cxFn(drawUpToIdx).toFixed(1)},${nsZeroY.toFixed(1)} Z`}
                  fill={nsColor} opacity="0.15"
                />
              )}
              {netSavingsPts.length > 1 && (
                <polyline points={netSavingsPts.join(' ')} fill="none" stroke={nsColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {netSavingsPts.length > 0 && (() => {
                const [lx, ly] = netSavingsPts[netSavingsPts.length - 1].split(',').map(Number);
                return <circle cx={lx} cy={ly} r="3" fill={nsColor} />;
              })()}
              {xTicks.map(({ idx, label: xl }) => (
                <text key={idx} x={cxFn(idx)} y={NS_H - 3} textAnchor="middle" fontSize="9" fill="var(--c-text-2)">{xl}</text>
              ))}
            </svg>
          </div>
        );

      // ── Period spending bars ──
      case 'daily-spending': {
        const visibleSegs = segSpending.slice(0, drawUpToIdx + 1);
        const visibleLabels = segLabels.slice(0, drawUpToIdx + 1);
        return (
          <div className={panelClass}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-base mb-1 text-[var(--c-text)]">Period spending</h3>
                <div className="text-xs text-[var(--c-text-2)]">Per {viewPeriod === 'daily' ? 'hour' : viewPeriod === 'weekly' ? 'day' : viewPeriod === 'monthly' ? 'day' : 'month'} (not cumulative) · {label}</div>
              </div>
              <span className="text-sm font-semibold text-[var(--c-text)]">${totalSpent.toFixed(0)} total</span>
            </div>
            <div className="flex items-end gap-px" style={{ height: '96px' }}>
              {visibleSegs.map((val, i) => (
                <div key={i} className="flex-1 h-full flex items-end" title={`$${val.toFixed(2)}`}>
                  <div
                    style={{ height: val > 0 ? `${Math.max((val / maxSegSpend) * 100, 2)}%` : '0%', backgroundColor: 'var(--c-accent)', opacity: 0.85 }}
                    className="w-full rounded-t transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex mt-1">
              {visibleLabels.map((lbl, i) => (
                <div key={i} className="flex-1 text-center" style={{ fontSize: '9px', color: 'var(--c-text-2)', lineHeight: 1.4 }}>{lbl}</div>
              ))}
            </div>
          </div>
        );
      }

      // ── Top categories ──
      case 'top-categories':
        return (
          <div className={panelClass}>
            <h3 className="font-semibold text-base mb-1 text-[var(--c-text)]">Top categories</h3>
            <div className="text-xs mb-5 text-[var(--c-text-2)]">By spend · {label}</div>
            {topCats.length === 0 ? (
              <div className="text-sm text-center py-8 text-[var(--c-text-2)]">No expenses yet</div>
            ) : (
              <div className="flex flex-col gap-3">
                {topCats.map(cat => (
                  <div key={cat.label} className="flex items-center gap-3">
                    <div className="w-20 text-xs capitalize text-right text-[var(--c-text-2)] flex-shrink-0 truncate">{cat.label}</div>
                    <div className="flex-1 h-5 rounded-full overflow-hidden bg-[var(--c-border)]">
                      <div
                        style={{ width: `${(cat.value / maxCatVal) * 100}%`, backgroundColor: cat.color }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>
                    <div className="w-14 text-xs text-right font-medium text-[var(--c-text)] flex-shrink-0">
                      ${cat.value.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ── Budget utilisation ──
      case 'budget-utilization':
        return (
          <div className={panelClass}>
            <h3 className="font-semibold text-base mb-1 text-[var(--c-text)]">Budget utilisation</h3>
            <div className="text-xs mb-5 text-[var(--c-text-2)]">{PERIOD_DISPLAY[viewPeriod]} budgets · {label}</div>
            {budgetUtil.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[var(--c-text-2)] mb-3">No {PERIOD_DISPLAY[viewPeriod].toLowerCase()} budgets set.</p>
                <button onClick={() => navigate('/budgets')} className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--c-accent)] text-white hover:opacity-80 transition-opacity">
                  Create budget →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {budgetUtil.map(b => {
                  const over = b.pct > 100;
                  const barColor = over ? '#D85A30' : b.pct > 80 ? '#EF9F27' : '#1D9E75';
                  return (
                    <div key={b.category}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="capitalize font-medium text-[var(--c-text)]">{b.category}</span>
                        <span className={over ? 'text-[var(--c-negative)] font-medium' : 'text-[var(--c-text-2)]'}>
                          ${b.spent.toFixed(0)} / ${b.limit.toFixed(0)}{' '}
                          <span className="font-semibold">({b.pct}%)</span>
                        </span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden bg-[var(--c-border)]">
                        <div
                          style={{ width: `${Math.min(b.pct, 100)}%`, backgroundColor: barColor }}
                          className="h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      // ── Transaction count ──
      case 'txn-count': {
        const visibleCounts = segTxnCount.slice(0, drawUpToIdx + 1);
        const visibleLabels = segLabels.slice(0, drawUpToIdx + 1);
        const totalTxns = periodTxns.length;
        return (
          <div className={panelClass}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-base mb-1 text-[var(--c-text)]">Transaction count</h3>
                <div className="text-xs text-[var(--c-text-2)]">Per {viewPeriod === 'daily' ? 'hour' : viewPeriod === 'weekly' || viewPeriod === 'monthly' ? 'day' : 'month'} · {label}</div>
              </div>
              <span className="text-sm font-semibold text-[var(--c-text)]">{totalTxns} total</span>
            </div>
            <div className="flex items-end gap-px" style={{ height: '96px' }}>
              {visibleCounts.map((val, i) => (
                <div key={i} className="flex-1 h-full flex items-end" title={`${val} transaction${val !== 1 ? 's' : ''}`}>
                  <div
                    style={{ height: val > 0 ? `${Math.max((val / maxSegCount) * 100, 4)}%` : '0%', backgroundColor: '#3B82F6', opacity: 0.85 }}
                    className="w-full rounded-t transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="flex mt-1">
              {visibleLabels.map((lbl, i) => (
                <div key={i} className="flex-1 text-center" style={{ fontSize: '9px', color: 'var(--c-text-2)', lineHeight: 1.4 }}>{lbl}</div>
              ))}
            </div>
          </div>
        );
      }
    }
  };

  // ── JSX ───────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={profile?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[var(--c-text)]" style={{ margin: 0 }}>
              Welcome,{' '}
              <span className="text-[var(--c-accent)]">{profile?.displayName || profile?.name || 'there'}</span>
            </h1>
            <p className="text-sm mt-2 text-[var(--c-text-2)]">Here's your spending overview for {label}.</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex flex-col gap-2">
              <select
                value={viewPeriod}
                onChange={e => handlePeriodChange(e.target.value as DashPeriod)}
                className="px-3 py-1.5 border border-[var(--c-border)] rounded-lg text-sm bg-[var(--c-card)] text-[var(--c-text)] focus:outline-none cursor-pointer"
              >
                {(Object.keys(PERIOD_DISPLAY) as DashPeriod[]).map(p => (
                  <option key={p} value={p}>{PERIOD_DISPLAY[p]}</option>
                ))}
              </select>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPeriodAnchor(shiftAnchor(viewPeriod, periodAnchor, -1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-text-2)] hover:opacity-80 text-base leading-none">‹</button>
                <span className="text-sm font-medium text-[var(--c-text)] min-w-[160px] text-center">{label}</span>
                <button onClick={() => setPeriodAnchor(shiftAnchor(viewPeriod, periodAnchor, 1))} disabled={isCurrent}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-text-2)] hover:opacity-80 disabled:opacity-25 disabled:cursor-not-allowed text-base leading-none">›</button>
              </div>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="flex flex-col items-center gap-1.5 px-6 py-2.5 rounded-3xl hover:opacity-80 transition-opacity bg-[var(--c-tint-green)]"
            >
              <span className="text-sm text-[var(--c-tint-text)]">Bought something recently?</span>
              <span className="bg-black text-white text-sm font-bold px-8 py-1.5 rounded-2xl w-full text-center">
                Log it
              </span>
            </button>
          </div>
        </div>

        {/* ── Row 1: 2×2 stat cards + cumulative chart (always visible) ── */}
        <div className="grid grid-cols-[2fr_3fr] gap-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className={`${cardBase} bg-[var(--c-tint-pink)]`}>
              <div className="text-sm font-semibold mb-1 text-[var(--c-tint-text)]">Spent</div>
              <div className="text-xs mb-4 text-[var(--c-tint-text-2)]">{PERIOD_DISPLAY[viewPeriod]}</div>
              <div className="text-2xl font-bold text-[var(--c-tint-text)]">${totalSpent.toFixed(2)}</div>
            </div>
            <div className={`${cardBase} bg-[var(--c-tint-green)]`}>
              <div className="text-sm font-semibold mb-1 text-[var(--c-tint-text)]">Remaining</div>
              <div className="text-xs mb-4 text-[var(--c-tint-text-2)]">Budget for {PERIOD_DISPLAY[viewPeriod].toLowerCase()}</div>
              {periodBudgetTotal === 0 ? (
                <button onClick={() => navigate('/budgets')} className="text-sm font-semibold text-[var(--c-accent)] hover:opacity-70 transition-opacity text-left">
                  Create {PERIOD_DISPLAY[viewPeriod].toLowerCase()} budget →
                </button>
              ) : (
                <div className={`text-2xl font-bold ${periodBudgetTotal - totalSpent < 0 ? 'text-[var(--c-negative)]' : 'text-[var(--c-tint-text)]'}`}>
                  {periodBudgetTotal - totalSpent < 0 ? '-' : ''}${Math.abs(periodBudgetTotal - totalSpent).toFixed(2)}
                </div>
              )}
            </div>
            <div className={`${cardBase} bg-[var(--c-tint-yellow)]`}>
              <div className="text-sm font-semibold mb-1 text-[var(--c-tint-text)]">Income</div>
              <div className="text-xs mb-4 text-[var(--c-tint-text-2)]">{PERIOD_DISPLAY[viewPeriod]}</div>
              <div className="text-2xl font-bold text-[var(--c-tint-text)]">${totalIncome.toFixed(2)}</div>
            </div>
            <div className={`${cardBase} bg-[var(--c-tint-mood)]`}>
              <div className="text-sm font-semibold mb-1 text-[var(--c-tint-mood-text)]">Mood avg</div>
              <div className="text-xs mb-4 text-[var(--c-tint-mood-sub)]">{PERIOD_DISPLAY[viewPeriod]}</div>
              <div className="text-2xl font-bold text-[var(--c-tint-mood-text)]">{moodAvg.toFixed(1)}/5 {moodEmoji}</div>
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-base mb-1 text-[var(--c-text)]">Cumulative spending</h3>
                <div className="text-xs mb-1.5 text-[var(--c-text-2)]">
                  {label} · ${totalSpent.toFixed(2)} spent
                  {periodBudgetTotal > 0 && ` · $${periodBudgetTotal.toFixed(2)} budget`}
                </div>
                <div className="flex items-center gap-4">
                  {periodBudgetTotal > 0 && (
                    <span className="flex items-center gap-1.5">
                      <svg width="18" height="8" style={{ display: 'block' }}>
                        <line x1="0" y1="4" x2="18" y2="4" stroke="var(--c-text-2)" strokeDasharray="4 3" strokeWidth="1.5" />
                      </svg>
                      <span className="text-xs text-[var(--c-text-2)]">Budget</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <svg width="18" height="8" style={{ display: 'block' }}>
                      <line x1="0" y1="4" x2="18" y2="4" stroke="var(--c-accent)" strokeWidth="2" />
                    </svg>
                    <span className="text-xs text-[var(--c-text-2)]">Spent</span>
                  </span>
                </div>
              </div>
              <button onClick={() => navigate('/transactions')} className="text-sm font-medium hover:opacity-80 flex-shrink-0 text-[var(--c-accent)]">
                View more →
              </button>
            </div>
            <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block', overflow: 'visible' }}>
              {yTicks.map(tick => {
                const y = cyFn(tick);
                return (
                  <g key={tick}>
                    <line x1={PAD_L} y1={y} x2={PAD_L + PLOT_W} y2={y} stroke="var(--c-grid)" strokeWidth="1" />
                    <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--c-text-2)">
                      ${tick >= 1000 ? `${tick % 1000 === 0 ? tick / 1000 : (tick / 1000).toFixed(1)}k` : tick}
                    </text>
                  </g>
                );
              })}
              {budgetLineY !== null && (
                <>
                  <line x1={PAD_L} y1={budgetLineY} x2={PAD_L + PLOT_W} y2={budgetLineY} stroke="var(--c-text-2)" strokeWidth="1.5" strokeDasharray="5 4" />
                  <text x={PAD_L + PLOT_W - 3} y={budgetLineY - 3} textAnchor="end" fontSize="9" fill="var(--c-text-2)">
                    Budget: ${periodBudgetTotal.toFixed(0)}
                  </text>
                </>
              )}
              {areaD && <path d={areaD} fill="var(--c-accent)" opacity="0.18" />}
              {spendPts.length > 1 && (
                <polyline points={spendPts.join(' ')} fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {spendPts.length > 0 && (() => {
                const [lx, ly] = spendPts[spendPts.length - 1].split(',').map(Number);
                const lbl = `$${totalSpent.toFixed(0)}`;
                const bw = lbl.length * 7 + 12;
                return (
                  <>
                    <rect x={lx - bw / 2} y={ly - 18} width={bw} height={13} rx="3" fill="var(--c-accent)" />
                    <text x={lx} y={ly - 8} textAnchor="middle" fontSize="9" fill="white" fontWeight="600">{lbl}</text>
                    <circle cx={lx} cy={ly} r="3" fill="var(--c-accent)" />
                  </>
                );
              })()}
              {xTicks.map(({ idx, label: xl }) => (
                <text key={idx} x={cxFn(idx)} y={SVG_H - 3} textAnchor="middle" fontSize="9" fill="var(--c-text-2)">{xl}</text>
              ))}
            </svg>
          </div>
        </div>

        {/* ── Customisable panels ── */}
        <div className="grid grid-cols-4 gap-6" style={{ gridAutoRows: '60px' }}>
          {panelConfig.filter(p => p.visible).map(p => {
            const def = PANEL_DEFS.find(d => d.id === p.id)!;
            const h = p.height ?? def.height;
            const w = p.width ?? def.width;
            return (
              <div key={p.id} className="min-h-0" style={{ gridRow: `span ${h}`, gridColumn: `span ${w}` }}>
                {renderPanel(p.id)}
              </div>
            );
          })}
        </div>

        {panelConfig.every(p => !p.visible) && (
          <div className="border border-dashed border-[var(--c-border)] rounded-3xl p-12 text-center">
            <p className="text-[var(--c-text-2)] mb-4">All panels are hidden.</p>
            <button onClick={() => setShowCustomise(true)} className="px-5 py-2 rounded-xl text-sm font-medium bg-[var(--c-accent)] text-white hover:opacity-80 transition-opacity">
              Customise dashboard
            </button>
          </div>
        )}

        {/* Customise button — bottom centre */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowCustomise(true)}
            className="px-5 py-2 rounded-xl text-sm font-medium border border-[var(--c-border)] text-[var(--c-text-2)] hover:bg-[var(--c-surface)] transition-colors"
          >
            Customise dashboard
          </button>
        </div>

      </main>

      {/* ── Customise modal ── */}
      {showCustomise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCustomise(false); }}
        >
          <div className="w-full max-w-md rounded-3xl shadow-2xl border border-[var(--c-border)] bg-[var(--c-card)] flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex justify-between items-center px-6 pt-6 pb-4 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[var(--c-text)]">Customise dashboard</h2>
                <p className="text-xs text-[var(--c-text-2)] mt-0.5">Toggle panels on or off, and drag to reorder.</p>
              </div>
              <button onClick={() => setShowCustomise(false)} className="text-[var(--c-text-2)] hover:opacity-60 text-xl leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <div className="flex flex-col gap-2">
                {panelConfig.map((p, idx) => {
                  const def = PANEL_DEFS.find(d => d.id === p.id)!;
                  return (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${p.visible ? 'border-[var(--c-border)] bg-[var(--c-surface)]' : 'border-[var(--c-border)] opacity-60'}`}>
                      {/* reorder arrows */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button onClick={() => movePanel(p.id, -1)} disabled={idx === 0}
                          className="text-[var(--c-text-2)] hover:opacity-70 disabled:opacity-20 leading-none text-xs">▲</button>
                        <button onClick={() => movePanel(p.id, 1)} disabled={idx === panelConfig.length - 1}
                          className="text-[var(--c-text-2)] hover:opacity-70 disabled:opacity-20 leading-none text-xs">▼</button>
                      </div>

                      {/* label */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--c-text)]">{def.title}</div>
                        <div className="text-xs text-[var(--c-text-2)] mt-0.5">{def.desc}</div>
                      </div>

                      {/* width + height steppers */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] leading-none text-[var(--c-text-2)]">W</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => setWidth(p.id, Math.max(1, (p.width ?? def.width) - 1) as 1 | 2 | 3 | 4)}
                              disabled={(p.width ?? def.width) <= 1}
                              className="w-5 h-5 rounded border border-[var(--c-border)] text-xs leading-none flex items-center justify-center text-[var(--c-text-2)] hover:opacity-70 disabled:opacity-20"
                            >−</button>
                            <span className="text-xs text-[var(--c-text)] w-4 text-center">{p.width ?? def.width}</span>
                            <button
                              onClick={() => setWidth(p.id, Math.min(4, (p.width ?? def.width) + 1) as 1 | 2 | 3 | 4)}
                              disabled={(p.width ?? def.width) >= 4}
                              className="w-5 h-5 rounded border border-[var(--c-border)] text-xs leading-none flex items-center justify-center text-[var(--c-text-2)] hover:opacity-70 disabled:opacity-20"
                            >+</button>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] leading-none text-[var(--c-text-2)]">H</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => setHeight(p.id, Math.max(1, (p.height ?? def.height) - 1))}
                              disabled={(p.height ?? def.height) <= 1}
                              className="w-5 h-5 rounded border border-[var(--c-border)] text-xs leading-none flex items-center justify-center text-[var(--c-text-2)] hover:opacity-70 disabled:opacity-20"
                            >−</button>
                            <span className="text-xs text-[var(--c-text)] w-5 text-center">{p.height ?? def.height}</span>
                            <button
                              onClick={() => setHeight(p.id, Math.min(12, (p.height ?? def.height) + 1))}
                              disabled={(p.height ?? def.height) >= 12}
                              className="w-5 h-5 rounded border border-[var(--c-border)] text-xs leading-none flex items-center justify-center text-[var(--c-text-2)] hover:opacity-70 disabled:opacity-20"
                            >+</button>
                          </div>
                        </div>
                      </div>

                      {/* toggle */}
                      <button
                        onClick={() => togglePanel(p.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${p.visible ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-border)]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${p.visible ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-t border-[var(--c-border)] flex-shrink-0">
              <button onClick={resetPanels} className="text-sm text-[var(--c-text-2)] hover:opacity-70 transition-opacity">
                Reset to default
              </button>
              <button onClick={() => setShowCustomise(false)}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-[var(--c-accent)] text-white hover:opacity-80 transition-opacity">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}