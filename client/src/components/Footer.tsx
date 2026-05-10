import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-[var(--c-border)]">
      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-[var(--c-text-2)]">
        <Link to="/about" className="hover:text-[var(--c-text)] transition-colors">
          About
        </Link>
        <span aria-hidden>·</span>
        <Link to="/contact" className="hover:text-[var(--c-text)] transition-colors">
          Contact / Feedback
        </Link>
        <span aria-hidden>·</span>
        <Link to="/privacy" className="hover:text-[var(--c-text)] transition-colors">
          Privacy &amp; Terms
        </Link>
      </div>
    </footer>
  );
}
