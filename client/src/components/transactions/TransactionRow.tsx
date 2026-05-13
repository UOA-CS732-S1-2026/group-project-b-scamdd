import { CAT_AVATAR_COLORS, MOOD_EMOJIS, MOOD_LABELS } from '../../lib/transactions';
import { moodIdx } from '../../lib/transactionHelpers';
import type { Transaction } from '../../types/transaction';

export default function TransactionRow({
  txn,
  onEdit,
  onDelete,
}: {
  txn: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initial = txn.title.charAt(0).toUpperCase();
  const cat = txn.category ?? 'other';
  const avatarColor = CAT_AVATAR_COLORS[cat] ?? '#E0E0E0';
  const isExpense = txn.type === 'expense';
  const mIdx = moodIdx(txn.mood);
  const moodEmoji = mIdx >= 0 ? MOOD_EMOJIS[mIdx] : null;

  return (
    <div className="group flex items-center gap-4 py-3 border-b border-[var(--c-border)] last:border-b-0 hover:bg-[var(--c-surface)] transition-colors px-2 -mx-2 rounded-xl">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: avatarColor, color: '#1a1a1a' }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--c-text)] truncate">{txn.title}</div>
        <div className="text-xs text-[var(--c-text-2)] capitalize truncate">
          {cat}
          {txn.note ? ` · ${txn.note}` : ''}
        </div>
      </div>
      <div
        className={`text-sm font-bold flex-shrink-0 ${isExpense ? 'text-[var(--c-expense)]' : 'text-[var(--c-income)]'}`}
      >
        {isExpense ? '-' : '+'}${Math.abs(txn.amount).toFixed(2)}
      </div>
      {moodEmoji ? (
        <span className="text-base leading-none flex-shrink-0" title={MOOD_LABELS[mIdx]}>
          {moodEmoji}
        </span>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-2)] hover:opacity-80 transition-opacity"
          aria-label="Edit transaction"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 15 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11.5 1.5l2 2L5 12l-3 .5.5-3 9-8z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--c-card)] border border-[var(--c-border)] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete transaction"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 15 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 4h11M5.5 4V2.5h4V4M3.5 4l.5 9a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1l.5-9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
