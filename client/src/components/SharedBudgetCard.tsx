import type { SharedBudget, SharedBudgetMember } from '../types/sharedBudget';
import type { BudgetPeriod } from '../types/budget';
import { PERIOD_LABELS } from '../types/budget';

const CAT_COLORS: Record<string, string> = {
  food:          '#FFBDC2',
  rent:          '#FDFBD4',
  transport:     '#C5FFD8',
  entertainment: '#C68BE1',
  utilities:     '#C5ECF9',
  shopping:      '#CBCBCB',
  health:        '#FFBDC2',
  other:         '#CBCBCB',
};

const AVATAR_PALETTE = ['#FFBDC2', '#FDFBD4', '#C5FFD8', '#C68BE1', '#C5ECF9', '#CBCBCB'];

function hashIndex(id: string, mod: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

function memberColor(userId: string) {
  return AVATAR_PALETTE[hashIndex(userId, AVATAR_PALETTE.length)];
}

function memberLabel(m: SharedBudgetMember) {
  return m.displayName || m.username || 'Member';
}

function periodElapsed(period: BudgetPeriod): number {
  const now = new Date();
  switch (period) {
    case 'daily':
      return (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
    case 'weekly': {
      const day = now.getDay() === 0 ? 7 : now.getDay();
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

export type SharedPaceStatus = 'under' | 'on-track' | 'over-pacing' | 'exceeded';

function paceStatus(spentPct: number, elapsedPct: number): SharedPaceStatus {
  if (spentPct >= 100) return 'exceeded';
  if (spentPct > elapsedPct * 100 + 10) return 'over-pacing';
  if (spentPct < elapsedPct * 100 - 10) return 'under';
  return 'on-track';
}

const PACE_LABELS: Record<SharedPaceStatus, string> = {
  under: 'Under budget',
  'on-track': 'On track',
  'over-pacing': 'Over-pacing',
  exceeded: 'Over budget',
};

const PACE_COLORS: Record<SharedPaceStatus, string> = {
  under: 'text-[var(--c-income)]',
  'on-track': 'text-[var(--c-text-2)]',
  'over-pacing': 'text-[#F59E0B]',
  exceeded: 'text-[var(--c-negative)]',
};

export function sharedBudgetPace(b: SharedBudget): SharedPaceStatus {
  const spentPct = b.monthlyLimit > 0 ? (b.spent / b.monthlyLimit) * 100 : 0;
  return paceStatus(spentPct, periodElapsed(b.period));
}

interface Props {
  budget: SharedBudget;
  /** Current user id, used to decide invite/edit affordances. */
  meId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onLeave?: () => void;
}

interface PieSlice {
  value: number;
  color: string;
  label: string;
}

function MiniPie({ slices, size = 64 }: { slices: PieSlice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = size / 2;
  if (total <= 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={r} cy={r} r={r - 1} fill="var(--c-border)" />
      </svg>
    );
  }
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Per-member contribution">
      {slices.map((s, i) => {
        const startAngle = (acc / total) * Math.PI * 2;
        acc += s.value;
        const endAngle = (acc / total) * Math.PI * 2;
        const x1 = r + r * Math.sin(startAngle);
        const y1 = r - r * Math.cos(startAngle);
        const x2 = r + r * Math.sin(endAngle);
        const y2 = r - r * Math.cos(endAngle);
        const large = endAngle - startAngle > Math.PI ? 1 : 0;
        // For a single full-circle slice, draw a circle instead of degenerate path.
        if (slices.filter((sl) => sl.value > 0).length === 1) {
          return <circle key={i} cx={r} cy={r} r={r - 1} fill={s.color} />;
        }
        const d = `M${r},${r} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
        return <path key={i} d={d} fill={s.color} />;
      })}
    </svg>
  );
}

export default function SharedBudgetCard({
  budget,
  meId,
  onEdit,
  onDelete,
  onAccept,
  onDecline,
  onLeave,
}: Props) {
  const period = budget.period;
  const catColor = CAT_COLORS[budget.category] || '#B6B6B6';
  const spentPct = budget.monthlyLimit > 0 ? (budget.spent / budget.monthlyLimit) * 100 : 0;
  const elapsed = periodElapsed(period);
  const pace = paceStatus(spentPct, elapsed);
  const paceMarkerPct = Math.min(elapsed * 100, 100);

  const acceptedMembers = budget.members.filter((m) => m.status === 'accepted');
  const pendingMembers = budget.members.filter((m) => m.status === 'pending');

  const isPendingForMe = Boolean(meId && budget.members.find((m) => m.userId === meId && m.status === 'pending'));
  const isAcceptedMember = Boolean(meId && acceptedMembers.find((m) => m.userId === meId));

  // Segments: one per accepted member, in stable order by userId; width = amount / monthlyLimit
  const slices: PieSlice[] = acceptedMembers
    .filter((m) => m.amount > 0)
    .map((m) => ({ value: m.amount, color: memberColor(m.userId), label: memberLabel(m) }));

  const segments = acceptedMembers.map((m) => {
    const width = budget.monthlyLimit > 0
      ? Math.max(0, Math.min(100, (m.amount / budget.monthlyLimit) * 100))
      : 0;
    return { id: m.userId, width, color: memberColor(m.userId), label: memberLabel(m), amount: m.amount };
  });

  // Stack widths; bar is capped at 100% overall via overflow-hidden track.
  const segmentNodes = segments.map((seg) => (
    <div
      key={seg.id}
      title={`${seg.label}: $${seg.amount.toFixed(2)}`}
      style={{ width: `${seg.width}%`, background: pace === 'exceeded' ? 'var(--c-negative)' : seg.color }}
      className="h-full"
    />
  ));

  const titleText = budget.name?.trim() || budget.category;

  return (
    <div
      className={`border border-[rgba(109,109,109,0.8)] rounded-3xl p-6 bg-[var(--c-card)] ${
        isPendingForMe ? 'opacity-95' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 border-[3px] border-white"
            style={{ backgroundColor: catColor }}
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--c-text)] truncate capitalize">{titleText}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full border border-[rgba(109,109,109,0.5)] text-[var(--c-text-2)] capitalize">
                {budget.category}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full border border-[rgba(109,109,109,0.5)] text-[var(--c-text-2)]">
                {PERIOD_LABELS[period]}
              </span>
              <span className="text-xs text-[var(--c-text-2)]">· Shared</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          {isPendingForMe ? (
            <>
              <button
                onClick={onAccept}
                className="text-sm font-semibold text-[var(--c-income)] hover:opacity-70 transition-opacity cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={onDecline}
                className="text-sm text-[var(--c-expense)] hover:opacity-60 transition-opacity cursor-pointer"
              >
                Decline
              </button>
            </>
          ) : isAcceptedMember ? (
            <>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-sm text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}
              {onLeave && (
                <button
                  onClick={onLeave}
                  className="text-sm text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors cursor-pointer"
                >
                  Leave
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="text-sm text-[var(--c-expense)] hover:opacity-60 transition-opacity cursor-pointer"
                >
                  Delete
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Member strip */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex -space-x-2">
          {acceptedMembers.slice(0, 5).map((m) => (
            <span
              key={m.userId}
              title={memberLabel(m)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-[#1a1a1a] border-2 border-[var(--c-card)]"
              style={{ background: memberColor(m.userId) }}
            >
              {initials(memberLabel(m))}
            </span>
          ))}
          {acceptedMembers.length > 5 && (
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-[var(--c-text)] border-2 border-[var(--c-card)] bg-[var(--c-surface)]">
              +{acceptedMembers.length - 5}
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--c-text-2)]">
          {acceptedMembers.length} member{acceptedMembers.length !== 1 ? 's' : ''}
          {pendingMembers.length > 0 && ` · ${pendingMembers.length} pending`}
        </span>
      </div>

      {/* Body: amounts + bar + pie */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xl font-bold text-[var(--c-text)]">
              ${budget.spent.toFixed(2)}
            </span>
            <span className="text-sm text-[var(--c-text-2)]">
              of ${budget.monthlyLimit.toFixed(2)}
            </span>
          </div>

          {/* Segmented progress bar */}
          <div className="relative mb-3">
            <div className="w-full h-2.5 rounded-full overflow-hidden bg-[var(--c-border)] flex">
              {segmentNodes}
            </div>
            <div
              title={`${Math.round(elapsed * 100)}% through the ${PERIOD_LABELS[period].toLowerCase()}`}
              style={{ left: `${paceMarkerPct}%` }}
              className="absolute -top-0.5 -translate-x-0.5 w-0.5 h-3.5 bg-[var(--c-text-2)] rounded-full opacity-60"
            />
          </div>

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

        <div className="flex-shrink-0">
          <MiniPie slices={slices} />
        </div>
      </div>

      {/* Per-member breakdown */}
      {acceptedMembers.length > 0 && budget.spent > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--c-border)] flex flex-col gap-1.5">
          {acceptedMembers.map((m) => {
            const pct = budget.spent > 0 ? (m.amount / budget.spent) * 100 : 0;
            return (
              <div key={m.userId} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: memberColor(m.userId) }}
                />
                <span className="text-[var(--c-text)] truncate flex-1">{memberLabel(m)}</span>
                <span className="text-[var(--c-text-2)]">
                  ${m.amount.toFixed(2)} · {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
