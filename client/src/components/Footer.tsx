export default function Footer() {
  const linkClass = 'text-sm text-[var(--c-text-2)] hover:text-[var(--c-text)] transition-colors';
  const dotClass = 'w-1 h-1 rounded-full bg-[var(--c-text-2)] opacity-60';

  return (
    <footer className="border-t border-[var(--c-border)] mt-12">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-center gap-6">
        <a href="/about" className={linkClass}>About</a>
        <span className={dotClass} />
        <a href="/feedback" className={linkClass}>Contact / Feedback</a>
        <span className={dotClass} />
        <a href="/privacy" className={linkClass}>Privacy &amp; Terms</a>
      </div>
    </footer>
  );
}
