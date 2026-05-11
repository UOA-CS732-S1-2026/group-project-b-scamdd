export default function Pill({
  active, onClick, children, ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:opacity-80 ${
        active
          ? 'bg-[var(--c-text)] text-[var(--c-bg)] border-[var(--c-text)]'
          : 'bg-transparent text-[var(--c-text-2)] border-[var(--c-border)]'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}
