import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession, signOut } from '../lib/auth-client';
import { useTheme } from '../hooks/useTheme';
import FeltWordmark from './FeltWordmark';
import Footer from './Footer';

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="2.5" />
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M11.01 11.01l1.06 1.06M2.93 12.07l1.06-1.06M11.01 3.99l1.06-1.06" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 10A6 6 0 0 1 5 2.5a6 6 0 1 0 7.5 7.5z" />
    </svg>
  );
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  const ghostBtn =
    'px-4 py-1.5 rounded-[20px] text-sm font-medium text-[var(--c-text)] bg-transparent hover:bg-[var(--c-nav-active)] transition-colors cursor-pointer';
  const primaryBtn =
    'px-4 py-1.5 rounded-[20px] text-sm font-medium border border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90 transition-opacity cursor-pointer';
  const iconBtn =
    'w-8 h-8 flex items-center justify-center rounded-[20px] text-[var(--c-text-2)] hover:bg-[var(--c-nav-active)] hover:text-[var(--c-text)] transition-colors cursor-pointer';

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
            <button
              type="button"
              onClick={toggle}
              className={iconBtn}
              aria-label="Toggle theme"
            >
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
            {session ? (
              <button
                type="button"
                className={ghostBtn}
                onClick={() => signOut().then(() => navigate('/'))}
              >
                Log out
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
