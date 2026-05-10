import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from '../lib/auth-client';
import FeltWordmark from './FeltWordmark';
import Footer from './Footer';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const navigate = useNavigate();

  const ghostBtn =
    'px-4 py-1.5 rounded-[20px] text-sm font-medium text-[var(--c-text)] bg-transparent hover:bg-[var(--c-nav-active)] transition-colors cursor-pointer';
  const primaryBtn =
    'px-4 py-1.5 rounded-[20px] text-sm font-medium border border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 transition-opacity cursor-pointer';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--c-bg)] text-[var(--c-text)]">
      <header className="sticky top-0 z-40 backdrop-blur bg-[color-mix(in_srgb,var(--c-bg)_85%,transparent)] border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            to="/"
            onClick={() => window.scrollTo(0, 0)}
            className="flex items-center cursor-pointer"
          >
            <FeltWordmark size="md" />
          </Link>
          <nav className="flex items-center gap-2">
            {session ? (
              <button
                type="button"
                className={primaryBtn}
                onClick={() => navigate('/transactions')}
              >
                Open app
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => navigate('/auth?tab=signin')}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={() => navigate('/auth?tab=signup')}
                >
                  Sign up
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
