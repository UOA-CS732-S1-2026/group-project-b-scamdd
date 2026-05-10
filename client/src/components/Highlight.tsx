import type { ReactNode } from 'react';

const COLORS = {
  accent: 'bg-[var(--c-accent)] text-[var(--c-text)]',
  green: 'bg-[var(--c-tint-green)] text-[var(--c-text)]',
  pink: 'bg-[var(--c-tint-pink)] text-[var(--c-text)]',
  yellow: 'bg-[var(--c-tint-yellow)] text-[var(--c-text)]',
} as const;

export default function Highlight({
  children,
  color = 'accent',
  className = '',
}: {
  children: ReactNode;
  color?: keyof typeof COLORS;
  className?: string;
}) {
  return (
    <span
      className={`inline-block px-2.5 pt-0.5 pb-3 rounded-2xl leading-none align-baseline ${COLORS[color]} ${className}`}
    >
      {children}
    </span>
  );
}
