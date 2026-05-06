import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useSession, signOut } from './lib/auth-client';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Budgets from './pages/Budgets';
import Friends from './pages/Friends';
import ProfileSetup from './pages/ProfileSetup';
import Profile from './pages/Profile';
import { getMyProfile } from './api/profile';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile/setup" element={<ProfileSetup />} />
        <Route
          path="/profile"
          element={
            <RequireProfile>
              <Profile />
            </RequireProfile>
          }
        />
        <Route
          path="/transactions"
          element={
            <RequireProfile>
              <Transactions />
            </RequireProfile>
          }
        />
        <Route
          path="/goals"
          element={
            <RequireProfile>
              <Goals />
            </RequireProfile>
          }
        />
        <Route
          path="/budgets"
          element={
            <RequireProfile>
              <Budgets />
            </RequireProfile>
          }
        />
        <Route
          path="/friends"
          element={
            <RequireProfile>
              <Friends />
            </RequireProfile>
          }
        />
        <Route path="/" element={<Home />} />
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
    if (!session) {
      navigate('/auth');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await getMyProfile();
        if (cancelled) return;
        if (!me.profileComplete) {
          navigate('/profile/setup');
          return;
        }
        setOk(true);
      } catch {
        if (!cancelled) navigate('/auth');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, isPending, navigate]);

  if (isPending || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--text)]">
        Loading…
      </div>
    );
  }
  if (!ok) return null;
  return <>{children}</>;
}

function AuthNav() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const baseBtn =
    'px-5 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer';
  const ghost = `${baseBtn} border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] hover:bg-[var(--code-bg)]`;
  const primary = `${baseBtn} border-transparent bg-[var(--accent)] text-white hover:opacity-90`;

  if (session) {
    return (
      <div className="flex flex-wrap gap-3 justify-center">
        <button type="button" className={ghost} onClick={() => navigate('/transactions')}>
          Transactions
        </button>
        <button type="button" className={ghost} onClick={() => navigate('/goals')}>
          Goals
        </button>
        <button type="button" className={ghost} onClick={() => navigate('/budgets')}>
          Budgets
        </button>
        <button type="button" className={ghost} onClick={() => navigate('/friends')}>
          Friends
        </button>
        <button type="button" className={ghost} onClick={() => navigate('/profile')}>
          Profile
        </button>
        <button type="button" className={primary} onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      <button type="button" className={ghost} onClick={() => navigate('/auth?tab=signin')}>
        Sign in
      </button>
      <button type="button" className={primary} onClick={() => navigate('/auth?tab=signup')}>
        Sign up
      </button>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex-1 min-w-[220px] p-6 rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow)]">
      <h3 className="text-lg font-semibold text-[var(--text-h)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text)] leading-relaxed">{body}</p>
    </div>
  );
}

function Home() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <section className="flex flex-col items-center text-center gap-6">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-bg)] text-[var(--accent)]">
          B Scamdd · expense tracker
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-h)] leading-tight max-w-2xl">
          Track expenses, hit goals, see how friends are doing.
        </h1>
        <p className="text-lg text-[var(--text)] max-w-xl">
          A simple expense tracker with budgets, savings goals, and a friend feed so you stay
          accountable together.
        </p>
        <div className="mt-2">
          <AuthNav />
        </div>
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          title="Transactions"
          body="Log income and expenses with categories, dates, and notes. Edit and delete inline."
        />
        <FeatureCard
          title="Goals"
          body="Set saving targets with deadlines. Watch the progress bar fill as you contribute."
        />
        <FeatureCard
          title="Budgets"
          body="Monthly limits per category. See what's left before you spend."
        />
        <FeatureCard
          title="Friends"
          body="Add friends by username and cheer them on as their public goals make progress."
        />
      </section>
    </main>
  );
}
