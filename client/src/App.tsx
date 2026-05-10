import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useSession } from './lib/auth-client';
import { useTheme } from './hooks/useTheme';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard2 from './pages/Dashboard2';
import TransactionsPage from './pages/TransactionsPage';
import GoalsPage from './pages/GoalsPage';
import BudgetsPage from './pages/BudgetsPage';
import FriendsPage from './pages/FriendsPage';
import ProfileSetup from './pages/ProfileSetup';
import ProfilePage from './pages/ProfilePage';
import GamesPage from './pages/GamesPage';
import { getMyProfile } from './api/profile';
import { useState } from 'react';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile/setup" element={<ProfileSetup />} />
        <Route path="/dashboard" element={<RequireProfile><Dashboard2 /></RequireProfile>} />
        <Route path="/transactions" element={<RequireProfile><TransactionsPage /></RequireProfile>} />
        <Route path="/goals" element={<RequireProfile><GoalsPage /></RequireProfile>} />
        <Route path="/budgets" element={<RequireProfile><BudgetsPage /></RequireProfile>} />
        <Route path="/friends" element={<RequireProfile><FriendsPage /></RequireProfile>} />
        <Route path="/profile" element={<RequireProfile><ProfilePage /></RequireProfile>} />
        <Route path="/games" element={<RequireProfile><GamesPage /></RequireProfile>} />
      </Routes>
    </BrowserRouter>
  );
}

function RequireProfile({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) { navigate('/auth'); return; }
    let cancelled = false;
    (async () => {
      try {
        const me = await getMyProfile();
        if (cancelled) return;
        if (!me.profileComplete) { navigate('/profile/setup'); return; }
        setOk(true);
      } catch {
        if (!cancelled) navigate('/auth');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session, isPending, navigate]);

  if (isPending || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--c-bg)] text-[var(--c-text-2)] text-sm">
        Loading…
      </div>
    );
  }
  if (!ok) return null;
  return <>{children}</>;
}

// ── Landing page ──────────────────────────────────────────────────────────────

function LandingPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const { isDark, toggle } = useTheme();

  // Redirect logged-in users straight to the dashboard
  useEffect(() => {
    if (!isPending && session) navigate('/dashboard', { replace: true });
  }, [session, isPending, navigate]);

  if (isPending || session) return null;

  const features = [
    {
      title: 'Transactions',
      body: 'Log income and expenses with categories, dates, and notes. See everything in one place.',
      emoji: '💳',
    },
    {
      title: 'Budgets',
      body: 'Set monthly limits per category and track how much you have left before you spend.',
      emoji: '📊',
    },
    {
      title: 'Goals',
      body: 'Create saving targets with deadlines. Watch the progress bar fill as you contribute.',
      emoji: '🎯',
    },
    {
      title: 'Friends',
      body: 'Add friends by username and see their public goals. Stay accountable together.',
      emoji: '👥',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--c-bg)] border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-[var(--c-text)]">
            <span className="w-4 h-4 rounded-full bg-[var(--c-accent)] flex-shrink-0" />
            felt
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-text-2)] hover:opacity-70 transition-opacity"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="7.5" cy="7.5" r="2.5" />
                  <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M11.01 11.01l1.06 1.06M2.93 12.07l1.06-1.06M11.01 3.99l1.06-1.06" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12.5 10A6 6 0 0 1 5 2.5a6 6 0 1 0 7.5 7.5z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => navigate('/auth?tab=signin')}
              className="px-4 py-1.5 rounded-xl border border-[var(--c-border)] text-sm font-medium text-[var(--c-text)] hover:opacity-70 transition-opacity"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/auth?tab=signup')}
              className="px-4 py-1.5 rounded-xl bg-[var(--c-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6">
        <section className="flex flex-col items-center text-center gap-6 py-20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--c-surface)] text-[var(--c-text-2)] border border-[var(--c-border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-accent)]" />
            expense tracker
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--c-text)] leading-tight max-w-2xl" style={{ margin: 0, letterSpacing: '-0.02em' }}>
            Track expenses,<br />hit goals, stay accountable.
          </h1>
          <p className="text-base text-[var(--c-text-2)] max-w-md leading-relaxed">
            felt is a simple expense tracker with budgets, savings goals, and a friend feed so you stay on track together.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => navigate('/auth?tab=signup')}
              className="px-6 py-2.5 rounded-xl bg-[var(--c-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started - Sign Up
            </button>
            <button
              onClick={() => navigate('/auth?tab=signin')}
              className="px-6 py-2.5 rounded-xl border border-[var(--c-border)] text-sm font-medium text-[var(--c-text)] hover:opacity-70 transition-opacity"
            >
              Sign in
            </button>
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
          {features.map(({ title, body, emoji }) => (
            <div
              key={title}
              className="p-5 rounded-2xl border border-[var(--c-border)] bg-[var(--c-card)] flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--c-surface)] flex items-center justify-center text-xl">
                {emoji}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--c-text)] mb-1" style={{ margin: 0 }}>{title}</h3>
                <p className="text-sm text-[var(--c-text-2)] leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--c-border)] py-5">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-[var(--c-text-2)]">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--c-text)]">
            <span className="w-3 h-3 rounded-full bg-[var(--c-accent)]" />
            felt
          </div>
          <span>B Scamdd · expense tracker</span>
        </div>
      </footer>
    </div>
  );
}
