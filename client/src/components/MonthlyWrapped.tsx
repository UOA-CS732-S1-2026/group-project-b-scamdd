import { useState } from 'react';
import { statsToInsights } from '../lib/insights';
import type { WrappedMonth } from '../types/wrapped';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export default function MonthlyWrapped({ months }: { months: WrappedMonth[] }) {
  const [selected, setSelected] = useState(0);

  if (months.length === 0) return null;

  const active = months[selected];
  const cards = statsToInsights(active.stats);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--c-text)] m-0">Monthly Wrapped</h2>
        <span className="text-xs text-[var(--c-text-2)]">Your month in numbers</span>
      </div>

      {/* Month tab strip */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {months.map((m, i) => (
          <button
            key={m._id}
            onClick={() => setSelected(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:opacity-80 ${
              i === selected
                ? 'bg-[var(--c-text)] text-[var(--c-bg)] border-[var(--c-text)]'
                : 'bg-transparent text-[var(--c-text-2)] border-[var(--c-border)]'
            }`}
          >
            {MONTH_NAMES[m.month - 1]} {m.year}
          </button>
        ))}
      </div>

      {/* Horizontally scrollable insight cards */}
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex-shrink-0 snap-start w-52 p-5 rounded-3xl flex flex-col justify-between min-h-[140px]"
            style={{ background: card.tint }}
          >
            <div className="text-xs font-semibold text-[var(--c-tint-text)] uppercase tracking-wider">
              {card.label}
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--c-tint-text)] mt-2 leading-tight">
                {card.value}
              </div>
              <div className="text-xs mt-1 text-[var(--c-tint-text-2)] leading-snug">
                {card.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
