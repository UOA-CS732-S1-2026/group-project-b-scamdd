import { MOOD_EMOJIS, MOOD_VALUES } from '../../lib/transactions';
import type { Transaction } from '../../types/transaction';

interface StatTilesProps {
  monthTxns: Transaction[];
  monthExpenses: Transaction[];
  monthSpent: number;
  monthBiggest: number;
  monthBiggestTxn: Transaction | null;
}

export default function StatTiles({
  monthTxns,
  monthExpenses,
  monthSpent,
  monthBiggest,
  monthBiggestTxn,
}: StatTilesProps) {
  const moodTxns = monthExpenses.filter(
    (t) => t.essential === false && t.mood && MOOD_VALUES[t.mood] !== undefined,
  );
  const moodTotal = moodTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  const moodAvg = moodTotal > 0
    ? moodTxns.reduce((s, t) => s + MOOD_VALUES[t.mood!] * Math.abs(t.amount), 0) / moodTotal
    : 3;
  const moodEmoji = MOOD_EMOJIS[Math.min(Math.max(Math.floor(moodAvg) - 1, 0), 4)];

  const cardBase = 'p-5 rounded-3xl';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className={`${cardBase} bg-[var(--c-tint-pink)]`}>
        <div className="text-sm font-semibold mb-1 text-[var(--c-tint-text)]">Spent</div>
        <div className="text-xs mb-4 text-[var(--c-tint-text-2)]">So far, this month</div>
        <div className="text-2xl font-bold text-[var(--c-tint-text)]">${monthSpent.toFixed(2)}</div>
      </div>
      <div className={`${cardBase} bg-[var(--c-tint-green)]`}>
        <div className="text-sm font-semibold mb-1 text-[var(--c-tint-text)]">Transactions</div>
        <div className="text-xs mb-4 text-[var(--c-tint-text-2)]">So far, this month</div>
        <div className="text-2xl font-bold text-[var(--c-tint-text)]">{monthTxns.length}</div>
      </div>
      <div className={`${cardBase} bg-[var(--c-tint-yellow)]`}>
        <div className="text-sm font-semibold mb-1 text-[var(--c-tint-text)]">Biggest hit</div>
        <div className="text-xs mb-4 text-[var(--c-tint-text-2)]">This month</div>
        <div className="text-2xl font-bold text-[var(--c-tint-text)]">${monthBiggest.toFixed(2)}</div>
        {monthBiggestTxn && (
          <div className="text-xs mt-1 truncate text-[var(--c-tint-text-2)]">{monthBiggestTxn.title}</div>
        )}
      </div>
      <div className={`${cardBase} bg-[var(--c-tint-mood)]`}>
        <div className="text-sm font-semibold mb-1 text-[var(--c-tint-mood-text)]">Mood average</div>
        <div className="text-xs mb-4 text-[var(--c-tint-mood-sub)]">This month's average</div>
        <div className="text-2xl font-bold text-[var(--c-tint-mood-text)]">
          {moodAvg.toFixed(2)}/5 {moodEmoji}
        </div>
      </div>
    </div>
  );
}
