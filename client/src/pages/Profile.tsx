import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/auth-client';
import { getMyProfile, updateMyProfile } from '../api/profile';
import { getTransactions } from '../api/transactions';
import { getBudgets } from '../api/budgets';
import { getRequests, respondToRequest, getFriends } from '../api/friends';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HeroTitle from '../components/HeroTitle';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../context/CurrencyContext';
import { useProfileAvatar } from '../context/ProfileContext';
import type { Profile as ProfileType, ProfileUpdate } from '../types/profile';
import type { Transaction } from '../types/transaction';
import type { Budget } from '../types/budget';
import type { Friend, Requests } from '../types/friend';

// ── Chart constants ───────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  food: '#FFBDC2', rent: '#FDFBD4', transport: '#C5FFD8',
  entertainment: '#C68BE1', utilities: '#C5ECF9', shopping: '#CBCBCB',
  health: '#FFBDC2', other: '#CBCBCB',
};
const MOOD_KEYS   = ['regret', 'meh', 'okay', 'glad', 'worth-it'] as const;
const MOOD_LABELS = ['Regret', 'Meh', 'Okay', 'Glad', 'Worth It'] as const;
const MOOD_COLORS = ['#FFBDC2', '#CBCBCB', '#FDFBD4', '#C5FFD8', '#C68BE1'];

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

// ── Profile page ──────────────────────────────────────────────────────────────
type ProfileTab = 'home' | 'stats' | 'account';

const CURRENCIES = [
  { code: 'NZD', label: 'NZD ($)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'AUD', label: 'AUD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
];

const AVATAR_COLORS = ['#C68BE1', '#1D9E75', '#3B82F6', '#F59E0B', '#EC4899', '#EF4444', '#8B5CF6', '#10B981'];
const AVATAR_PALETTE = ['#FFBDC2', '#FDFBD4', '#C5FFD8', '#C68BE1', '#C5ECF9', '#CBCBCB'];

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

export default function Profile() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { fmt, fmtY, setCurrency: setGlobalCurrency } = useCurrency();
  const { setAvatarColor: setGlobalAvatarColor, setAvatarImage: setGlobalAvatarImage } = useProfileAvatar();

  const [tab, setTab] = useState<ProfileTab>('home');
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [rawBudgets, setRawBudgets] = useState<Budget[]>([]);
  const [requests, setRequests] = useState<Requests>({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  // Account form state
  const [username, setUsername] = useState('');          // read-only after profile setup
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('NZD');
  const [avatarColor, setAvatarColor] = useState('#C68BE1');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isPending && !session) navigate('/auth');
  }, [session, isPending, navigate]);

  const loadData = useCallback(async () => {
    try {
      const [prof, transactions, budgets, reqs, friendList] = await Promise.all([
        getMyProfile(),
        getTransactions(),
        getBudgets(),
        getRequests().catch(() => ({ incoming: [], outgoing: [] })),
        getFriends().catch(() => [] as Friend[]),
      ]);
      setProfile(prof);
      setAllTransactions(transactions);
      setRawBudgets(budgets);
      setRequests(reqs);
      setFriends(friendList);
      setUsername(prof.username ?? '');
      setDisplayName(prof.displayName ?? prof.name ?? '');
      setPhone(prof.phone ?? '');
      setCurrency(prof.currency ?? 'NZD');
      setAvatarColor(prof.avatarColor ?? '#C68BE1');
      setImageUrl(prof.avatarImage ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session, loadData]);

  const handleAcceptRequest = async (id: string) => {
    try {
      await respondToRequest(id, 'accept');
      await loadData();
    } catch { alert('Failed to accept request'); }
  };

  const handleDeclineRequest = async (id: string) => {
    try {
      await respondToRequest(id, 'reject');
      await loadData();
    } catch { alert('Failed to decline request'); }
  };

  const handleSaveProfile = async () => {
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      const update: ProfileUpdate = {};
      const dn = displayName.trim();
      if (dn && dn !== (profile?.displayName ?? '')) update.displayName = dn;
      if (currency !== profile?.currency) update.currency = currency;
      if (phone !== (profile?.phone ?? '')) update.phone = phone;
      // always save avatarColor so it always persists
      update.avatarColor = avatarColor;
      // include avatarImage if changed (empty string means removed)
      const incomingImage = imageUrl ?? '';
      const storedImage   = profile?.avatarImage ?? '';
      if (incomingImage !== storedImage) update.avatarImage = incomingImage;
      if (Object.keys(update).length > 0) {
        const updated = await updateMyProfile(update);
        setProfile(updated);
        if (update.currency) setGlobalCurrency(update.currency);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSetTab = (t: ProfileTab) => {
    setTab(t);
    localStorage.setItem('profile-tab', t);
  };

  // Auto-save avatar fields immediately so navigating away doesn't lose them
  const saveAvatarField = async (patch: { avatarColor?: string; avatarImage?: string }) => {
    try {
      const updated = await updateMyProfile(patch);
      setProfile(updated);
      if (patch.avatarColor !== undefined) setGlobalAvatarColor(patch.avatarColor);
      if (patch.avatarImage !== undefined) setGlobalAvatarImage(patch.avatarImage === '' ? null : patch.avatarImage);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleSetColor = (c: string) => {
    setAvatarColor(c);
    saveAvatarField({ avatarColor: c });
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    if (imgInputRef.current) imgInputRef.current.value = '';
    saveAvatarField({ avatarImage: '' });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800_000) {
      setSaveError('Photo must be under 800 KB');
      if (imgInputRef.current) imgInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageUrl(dataUrl);
      saveAvatarField({ avatarImage: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] text-[var(--c-text)]">
        Unable to load profile
      </div>
    );
  }

  // Derive live from form state so greeting/avatar update as user types
  const displayedName = displayName.trim() || profile.displayName || profile.name || 'User';
  const userInitials = initials(displayedName);

  // ── Stats: current month computations ────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthLabel = monthStart.toLocaleDateString('en', { month: 'long', year: 'numeric' });

  const monthTxns  = allTransactions.filter(t => { const d = new Date(t.date); return d >= monthStart && d < monthEnd; });
  const expenses   = monthTxns.filter(t => t.type === 'expense');
  const totalSpent  = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

  const periodBudgetTotal = rawBudgets
    .filter(b => (b.period ?? 'monthly') === 'monthly')
    .reduce((s, b) => s + b.monthlyLimit, 0);

  // Cumulative spending chart
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cumulativePoints = Array.from({ length: dim }, (_, i) =>
    expenses.filter(t => new Date(t.date).getDate() <= i + 1).reduce((s, t) => s + Math.abs(t.amount), 0),
  );
  const N = cumulativePoints.length;
  const drawUpToIdx = Math.min(now.getDate() - 1, N - 1);
  const SVG_W = 400, SVG_H = 120;
  const PAD_L = 40, PAD_R = 8, PAD_T = 8, PAD_B = 18;
  const PLOT_W = SVG_W - PAD_L - PAD_R;
  const PLOT_H = SVG_H - PAD_T - PAD_B;

  const rawYMax = Math.max(...cumulativePoints, periodBudgetTotal, 10);
  const approxStep = rawYMax / 4;
  const stepMag = Math.pow(10, Math.floor(Math.log10(Math.max(approxStep, 1))));
  const yStep = ([1, 2, 5, 10].map(s => s * stepMag).find(s => rawYMax / s <= 5)) ?? stepMag * 10;
  const yMax = yStep * Math.ceil(rawYMax / yStep);
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);

  const cxFn = (idx: number) => PAD_L + (N <= 1 ? 0 : idx / (N - 1)) * PLOT_W;
  const cyFn = (v: number)   => PAD_T + PLOT_H - (v / yMax) * PLOT_H;
  const chartBottom = PAD_T + PLOT_H;

  const xTicks = [1, 5, 10, 15, 20, 25, dim]
    .filter((d, i, a) => a.indexOf(d) === i && d <= dim)
    .map(d => ({ idx: d - 1, label: String(d) }));

  const spendPts = cumulativePoints.slice(0, drawUpToIdx + 1)
    .map((v, i) => `${cxFn(i).toFixed(1)},${cyFn(v).toFixed(1)}`);
  const budgetLineY = periodBudgetTotal > 0 ? cyFn(periodBudgetTotal) : null;
  const areaD = spendPts.length > 0
    ? `M ${cxFn(0).toFixed(1)},${chartBottom} L ${spendPts.join(' L ')} L ${cxFn(drawUpToIdx).toFixed(1)},${chartBottom} Z`
    : '';
  const lastSpendPt = spendPts[spendPts.length - 1];
  const [lastPtX, lastPtY] = lastSpendPt ? lastSpendPt.split(',').map(Number) : [0, 0];

  // Mood chart
  const moodSpending = [0, 0, 0, 0, 0];
  for (const t of monthTxns.filter(t => t.essential === false && t.mood)) {
    const idx = MOOD_KEYS.indexOf(t.mood as typeof MOOD_KEYS[number]);
    if (idx >= 0) moodSpending[idx] += Math.abs(t.amount);
  }
  const maxMood = Math.max(...moodSpending, 1);

  // Category chart
  const catSpending = expenses.reduce((acc, t) => {
    const cat = t.category ?? 'other';
    acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);
  const catSlices = Object.entries(catSpending)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([cat, amount]) => ({ label: cat, value: amount, color: CAT_COLORS[cat] || '#EF9F27' }));
  const catTotal = catSlices.reduce((s, d) => s + d.value, 0);

  // Breakdown bars
  const essentialSpent    = expenses.filter(t => t.essential === true) .reduce((s, t) => s + Math.abs(t.amount), 0);
  const nonEssentialSpent = expenses.filter(t => t.essential === false).reduce((s, t) => s + Math.abs(t.amount), 0);
  const breakdownRows = [
    { left: 'Essential',    right: 'Non-essential',   slices: [{ label: 'Essential', value: essentialSpent, color: '#C5FFD8' }, { label: 'Non-essential', value: nonEssentialSpent, color: '#C68BE1' }].filter(s => s.value > 0) },
    { left: 'Food / Drink', right: 'Other spending',  slices: [{ label: 'Food / Drink', value: catSpending['food'] || 0, color: '#FFBDC2' }, { label: 'Other', value: totalSpent - (catSpending['food'] || 0), color: '#C5FFD8' }].filter(s => s.value > 0) },
    { left: 'Personal',     right: 'Shared expenses', slices: [{ label: 'Personal', value: totalSpent * 0.6, color: '#FDFBD4' }, { label: 'Shared expenses', value: totalSpent * 0.4, color: '#FFBDC2' }].filter(s => s.value > 0) },
    { left: 'Reoccurring',  right: 'One-off',         slices: [{ label: 'Reoccurring', value: totalSpent * 0.45, color: '#FFBDC2' }, { label: 'One-off', value: totalSpent * 0.55, color: '#FDFBD4' }].filter(s => s.value > 0) },
  ];

  // Milestone notifications
  const txnCount = allTransactions.length;
  const milestones: string[] = [];
  for (const thr of [50, 100, 200, 500]) {
    if (txnCount >= thr) milestones.push(`You just hit ${thr} logged transactions!`);
  }
  const regretThisMonth = monthTxns.filter(t => t.mood === 'regret').length;
  if (regretThisMonth === 0 && monthTxns.length > 0) milestones.push('This is your best month yet — no regret tags!');

  const panelClass = 'p-6 rounded-3xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-card)] flex flex-col overflow-hidden';
  const inputClass = 'w-full px-4 py-2.5 border border-[var(--c-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--c-accent)] bg-[var(--c-bg)] text-[var(--c-text)]';

  // ── Tab renderers ─────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div className="border border-[var(--c-border)] rounded-2xl p-6 bg-[var(--c-card)]">
      <h2 className="text-base font-bold text-[var(--c-text)] mb-4">Recent notifications</h2>
      <div className="flex flex-col divide-y divide-[var(--c-border)]">

        {/* Pending friend requests */}
        {requests.incoming.map(req => {
          const name = req.displayName || req.username || 'Someone';
          const ini = initials(name);
          const reqColor = req.avatarColor ?? AVATAR_PALETTE[Math.abs(req.fromId.charCodeAt(0)) % AVATAR_PALETTE.length];
          const reqImage = req.avatarImage ?? null;
          return (
            <div key={req.id} className="flex items-center gap-3 py-3 flex-wrap">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[var(--c-tint-text)] flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: reqImage ? 'transparent' : reqColor }}
              >
                {reqImage ? <img src={reqImage} alt={name} className="w-full h-full object-cover" /> : ini}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-[var(--c-text)]">{name}</span>
                <span className="text-sm text-[var(--c-text-2)]"> • Sent you a friend request</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleAcceptRequest(req.id)} className="px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-80 transition-opacity">Accept</button>
                <button onClick={() => handleDeclineRequest(req.id)} className="px-3 py-1 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-text)] hover:opacity-70 transition-opacity">Decline</button>
              </div>
            </div>
          );
        })}

        {/* Accepted friends */}
        {friends.slice(0, 3).map((f) => {
          const name = f.displayName || f.username || 'Friend';
          const ini = initials(name);
          const fColor = f.avatarColor ?? '#C68BE1';
          const fImage = f.avatarImage ?? null;
          return (
            <div key={f.id} className="flex items-center gap-3 py-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[var(--c-tint-text)] flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: fImage ? 'transparent' : fColor }}
              >
                {fImage ? <img src={fImage} alt={name} className="w-full h-full object-cover" /> : ini}
              </div>
              <div className="flex-1 min-w-0 text-sm">
                <span className="font-semibold text-[var(--c-text)]">{name}</span>
                <span className="text-[var(--c-text-2)]"> • Accepted your friend request!</span>
              </div>
              <svg className="text-[var(--c-text-2)] flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
          );
        })}

        {/* Milestones */}
        {milestones.map((msg, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor }}>{userInitials}</div>
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-semibold text-[var(--c-text)]">You</span>
              <span className="text-[var(--c-text-2)]"> • {msg}</span>
            </div>
            <span className="text-xl flex-shrink-0">🎉</span>
          </div>
        ))}

        {requests.incoming.length === 0 && friends.length === 0 && milestones.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--c-text-2)]">No notifications yet</div>
        )}
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="flex flex-col gap-5">
      {/* Cumulative spending */}
      <div className={panelClass}>
        <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-base text-[var(--c-text)]">Cumulative spending</h3>
            <div className="text-xs text-[var(--c-text-2)] mt-0.5">{monthLabel} · {fmt(totalSpent)} spent</div>
          </div>
          {periodBudgetTotal > 0 && (
            <div className="flex items-center gap-3 text-xs text-[var(--c-text-2)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-5 border-t-2 border-dashed border-[var(--c-text-2)]" />Budget
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-5 border-t-2 border-[var(--c-accent)]" />Spent
              </span>
            </div>
          )}
        </div>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block', overflow: 'visible' }}>
          {yTicks.map(tick => {
            const y = cyFn(tick);
            return (
              <g key={tick}>
                <line x1={PAD_L} y1={y} x2={PAD_L + PLOT_W} y2={y} stroke="var(--c-grid)" strokeWidth="1" />
                <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--c-text-2)">{fmtY(tick)}</text>
              </g>
            );
          })}
          {budgetLineY !== null && (
            <>
              <line x1={PAD_L} y1={budgetLineY} x2={PAD_L + PLOT_W} y2={budgetLineY} stroke="var(--c-text-2)" strokeWidth="1.5" strokeDasharray="5 4" />
              <text x={PAD_L + PLOT_W - 2} y={budgetLineY - 4} textAnchor="end" fontSize="9" fill="var(--c-text-2)">Budget · ${periodBudgetTotal.toFixed(0)}</text>
            </>
          )}
          {areaD && <path d={areaD} fill="var(--c-accent)" opacity="0.15" />}
          {spendPts.length > 1 && (
            <polyline points={spendPts.join(' ')} fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {spendPts.length > 0 && (
            <>
              <circle cx={lastPtX} cy={lastPtY} r="4" fill="var(--c-accent)" />
              <text x={lastPtX + 6} y={lastPtY - 5} fontSize="9" fill="var(--c-text)">{fmt(cumulativePoints[drawUpToIdx])}</text>
            </>
          )}
          {xTicks.map(({ idx, label }) => (
            <text key={idx} x={cxFn(idx)} y={SVG_H - 2} textAnchor="middle" fontSize="9" fill="var(--c-text-2)">{label}</text>
          ))}
        </svg>
      </div>

      {/* Spend by mood */}
      <div className={panelClass}>
        <h3 className="font-semibold text-base text-[var(--c-text)] mb-1">Spend by mood</h3>
        <div className="text-xs text-[var(--c-text-2)] mb-4">{monthLabel} · {fmt(totalSpent)} spent</div>
        <div className="flex gap-2" style={{ minHeight: '160px' }}>
          <div className="flex flex-col justify-between items-end text-xs text-[var(--c-text-2)] pb-6 flex-shrink-0 w-12">
            <span>${maxMood >= 1000 ? `${(maxMood / 1000).toFixed(1)}k` : maxMood.toFixed(0)}</span>
            <span>${maxMood >= 1000 ? `${(maxMood / 2000).toFixed(1)}k` : (maxMood / 2).toFixed(0)}</span>
            <span>$0</span>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1 relative" style={{ minHeight: '120px' }}>
              {[0, 0.5, 1].map(pos => (
                <div key={pos} className="absolute left-0 right-0 border-t border-[var(--c-grid)]" style={{ top: `${(1 - pos) * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex items-end gap-2 pb-px">
                {MOOD_LABELS.map((lbl, i) => (
                  <div key={lbl} className="flex-1 h-full flex items-end">
                    <div title={`${fmt(moodSpending[i])}`}
                      style={{ backgroundColor: MOOD_COLORS[i], height: moodSpending[i] > 0 ? `${Math.max((moodSpending[i] / maxMood) * 100, 2)}%` : '0%' }}
                      className="w-full rounded-t-lg transition-all" />
                  </div>
                ))}
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

      {/* Where it goes */}
      <div className={panelClass}>
        <h3 className="font-semibold text-base text-[var(--c-text)] mb-1">Where it goes</h3>
        <div className="text-xs text-[var(--c-text-2)] mb-4">By category · {monthLabel}</div>
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

      {/* How you've been spending */}
      <div className={`${panelClass} !bg-[#C5ECF9]`}>
        <h3 className="font-semibold text-base text-[var(--c-tint-text)] mb-1">How you've been spending your money</h3>
        <div className="text-xs text-[var(--c-tint-text-2)] mb-5">By attribute · {monthLabel}</div>
        {totalSpent === 0 ? (
          <div className="text-sm text-center py-4 text-[var(--c-tint-text-2)]">No spending data yet</div>
        ) : (
          <div className="flex flex-col gap-5">
            {breakdownRows.map(({ left, right, slices }) => {
              const total = slices.reduce((s, sl) => s + sl.value, 0);
              return (
                <div key={left}>
                  {total === 0 ? (
                    <div className="h-6 rounded-full bg-white/40 flex items-center pl-3">
                      <span className="text-xs text-[var(--c-tint-text-2)]">No data</span>
                    </div>
                  ) : (
                    <>
                      <div className="h-6 rounded-full overflow-hidden flex gap-px">
                        {slices.map(sl => (
                          <div key={sl.label} title={`${sl.label}: ${fmt(sl.value)}`}
                            style={{ width: `${(sl.value / total) * 100}%`, backgroundColor: sl.color }}
                            className="h-full" />
                        ))}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-xs text-[var(--c-tint-text-2)]">{left}</span>
                        <span className="text-xs text-[var(--c-tint-text-2)]">{right}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="flex flex-col gap-5">
      {/* Avatar / photo picker */}
      <div className="border border-[var(--c-border)] rounded-2xl p-6 bg-[var(--c-card)]">
        <h2 className="text-base font-bold text-[var(--c-text)] mb-4">Profile picture</h2>
        <div className="flex items-start gap-6 flex-wrap">
          {/* Avatar circle */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: imageUrl ? 'transparent' : avatarColor }}>
              {imageUrl
                ? <img src={imageUrl} alt="avatar" className="w-full h-full object-cover" />
                : userInitials}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Upload button */}
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <div className="flex gap-2">
              <button onClick={() => imgInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-[var(--c-text)] hover:opacity-70 transition-opacity">
                {imageUrl ? 'Change photo' : 'Upload photo'}
              </button>
              {imageUrl && (
                <button onClick={handleRemoveImage}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--c-border)] text-red-500 hover:opacity-70 transition-opacity">
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--c-text-2)]">JPG, PNG or GIF · max 800 KB</p>

            {/* Color picker (shown when no photo) */}
            {!imageUrl && (
              <div>
                <p className="text-xs font-medium text-[var(--c-text-2)] mb-2">Avatar colour</p>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map(c => (
                    <button key={c} onClick={() => handleSetColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${avatarColor === c ? 'ring-2 ring-offset-2 ring-[var(--c-accent)]' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="border border-[var(--c-border)] rounded-2xl p-6 bg-[var(--c-card)] flex flex-col gap-5">
        {username && (
          <div>
            <label className="block text-sm font-semibold text-[var(--c-text)] mb-1.5">Username</label>
            <div className="w-full px-4 py-2.5 border border-[var(--c-border)] rounded-xl text-sm bg-[var(--c-surface)] text-[var(--c-text-2)] cursor-not-allowed select-none">
              @{username}
            </div>
            <p className="text-xs text-[var(--c-text-2)] mt-1">Username cannot be changed</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-[var(--c-text)] mb-1.5">Display Name</label>
          <input type="text" value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className={inputClass}
            placeholder="Your display name" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--c-text)] mb-1.5">Email</label>
          <input type="email" value={profile.email} readOnly
            className="w-full px-4 py-2.5 border border-[var(--c-border)] rounded-xl text-sm bg-[var(--c-surface)] text-[var(--c-text-2)] cursor-not-allowed" />
          <p className="text-xs text-[var(--c-text-2)] mt-1">Email cannot be changed here</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--c-text)] mb-1.5">Phone Number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className={inputClass} placeholder="(+64) 000 0000" />
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="block text-sm font-semibold text-[var(--c-text)]">Currency</label>
            <div className="relative group">
              <button type="button" className="w-4 h-4 rounded-full text-[9px] font-bold bg-[var(--c-border)] text-[var(--c-text-2)] flex items-center justify-center hover:bg-[var(--c-accent)] hover:text-white transition-colors">?</button>
              {/* Rates tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl border border-[var(--c-border)] bg-[var(--c-card)] shadow-lg p-3 text-xs z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="font-semibold text-[var(--c-text)] mb-2">Conversion rates (base: NZD)</p>
                {currency === 'NZD' ? (
                  <div className="flex flex-col gap-1 text-[var(--c-text-2)]">
                    <span>1 NZD ≈ 0.60 USD</span>
                    <span>1 NZD ≈ 0.85 AUD</span>
                    <span>1 NZD ≈ 0.51 EUR</span>
                    <span>1 NZD ≈ 0.44 GBP</span>
                  </div>
                ) : currency === 'USD' ? (
                  <div className="flex flex-col gap-1 text-[var(--c-text-2)]">
                    <span className="font-medium text-[var(--c-text)]">1 NZD = 0.60 USD ✓</span>
                    <span>1 USD ≈ 1.68 NZD</span>
                  </div>
                ) : currency === 'AUD' ? (
                  <div className="flex flex-col gap-1 text-[var(--c-text-2)]">
                    <span className="font-medium text-[var(--c-text)]">1 NZD = 0.85 AUD ✓</span>
                    <span>1 AUD ≈ 1.18 NZD</span>
                  </div>
                ) : currency === 'EUR' ? (
                  <div className="flex flex-col gap-1 text-[var(--c-text-2)]">
                    <span className="font-medium text-[var(--c-text)]">1 NZD = 0.51 EUR ✓</span>
                    <span>1 EUR ≈ 1.98 NZD</span>
                  </div>
                ) : currency === 'GBP' ? (
                  <div className="flex flex-col gap-1 text-[var(--c-text-2)]">
                    <span className="font-medium text-[var(--c-text)]">1 NZD = 0.44 GBP ✓</span>
                    <span>1 GBP ≈ 2.27 NZD</span>
                  </div>
                ) : null}
                <p className="mt-2 text-[var(--c-text-2)] opacity-70">All amounts are stored in NZD and converted on display.</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className={`${inputClass} appearance-none pr-8`}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--c-text-2)]">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {saveError   && <p className="text-sm text-red-500">{saveError}</p>}
        {saveSuccess && <p className="text-sm text-[var(--c-income)]">Saved successfully!</p>}

        <button onClick={handleSaveProfile} disabled={saving}
          className="self-start px-6 py-2.5 rounded-xl text-sm font-semibold bg-[var(--c-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );

  const TAB_ITEMS: { id: ProfileTab; label: string }[] = [
    { id: 'home',    label: 'Home' },
    { id: 'stats',   label: 'Your stats' },
    { id: 'account', label: 'Account' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--c-bg)] text-[var(--c-text)]">
      <Navbar isDark={isDark} onThemeToggle={toggle} userName={displayedName} />

      <div className="flex-1 flex max-w-5xl mx-auto w-full">
        {/* Main content */}
        <main className="flex-1 px-6 py-8 min-w-0">
          <HeroTitle
            highlight="Hello,"
            rest={displayedName}
            subtitle="Welcome to your profile! Access all your information and detailed graphs in this page."
          />
          <div className="mt-8">
            {tab === 'home'    && renderHome()}
            {tab === 'stats'   && renderStats()}
            {tab === 'account' && renderAccount()}
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="w-52 py-8 pr-6 flex flex-col items-center gap-3 flex-shrink-0">
          {/* Overlapping circles logo – matches brand mark */}
          <div className="relative flex-shrink-0" style={{ width: 76, height: 76 }}>
            {/* purple – top-left */}
            <div className="absolute rounded-full" style={{ width: 46, height: 46, background: '#C68BE1', top: 0, left: 0 }} />
            {/* cream – top-right */}
            <div className="absolute rounded-full" style={{ width: 46, height: 46, background: '#FDFBD4', top: 0, right: 0 }} />
            {/* mint – bottom-center, slightly larger */}
            <div className="absolute rounded-full" style={{ width: 52, height: 52, background: '#C5FFD8', bottom: 0, left: '50%', transform: 'translateX(-50%)' }} />
          </div>

          <span className="text-lg font-bold text-[var(--c-text)]">felt</span>

          {/* User avatar */}
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: imageUrl ? 'transparent' : avatarColor }}>
            {imageUrl
              ? <img src={imageUrl} alt="avatar" className="w-full h-full object-cover" />
              : userInitials}
          </div>

          {/* Tab nav */}
          <nav className="w-full flex flex-col gap-0.5 mt-1">
            {TAB_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => handleSetTab(id)}
                className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === id
                    ? 'bg-[var(--c-accent)]/20 text-[var(--c-text)] font-semibold'
                    : 'text-[var(--c-text-2)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>
      </div>

      <Footer />
    </div>
  );
}
