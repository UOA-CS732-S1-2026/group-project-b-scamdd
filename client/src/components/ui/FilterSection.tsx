export default function FilterSection({
  title, children, last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? '' : 'mb-5 pb-5 border-b border-[var(--c-border)]'}>
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--c-text-2)] mb-3">{title}</div>
      {children}
    </div>
  );
}
