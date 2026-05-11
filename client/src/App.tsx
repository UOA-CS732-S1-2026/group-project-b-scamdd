import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useSession } from './lib/auth-client';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Budgets from './pages/Budgets';
import Friends from './pages/Friends';
import ProfileSetup from './pages/ProfileSetup';
import Profile from './pages/Profile';
import Games from './pages/Games';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';
import MarketingLayout from './components/MarketingLayout';
import Highlight from './components/Highlight';
import { getMyProfile } from './api/profile';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/profile/setup" element={<ProfileSetup />} />
        <Route path="/dashboard" element={<RequireProfile><Dashboard /></RequireProfile>} />
        <Route path="/transactions" element={<RequireProfile><Transactions /></RequireProfile>} />
        <Route path="/goals" element={<RequireProfile><Goals /></RequireProfile>} />
        <Route path="/budgets" element={<RequireProfile><Budgets /></RequireProfile>} />
        <Route path="/friends" element={<RequireProfile><Friends /></RequireProfile>} />
        <Route path="/profile" element={<RequireProfile><Profile /></RequireProfile>} />
        <Route path="/games" element={<RequireProfile><Games /></RequireProfile>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
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

function HeroCtas() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const primary =
    'px-5 py-2 rounded-[20px] text-sm font-medium bg-[var(--c-text)] text-[var(--c-bg)] border border-[var(--c-text)] hover:opacity-90 cursor-pointer transition-opacity';
  const ghost =
    'px-5 py-2 rounded-[20px] text-sm font-medium border border-[#8D8D8D] text-[var(--c-text)] bg-[#ffffff] hover:bg-[var(--c-nav-active)] cursor-pointer transition-colors';

  if (session) {
    return (
      <div className="flex flex-wrap gap-3">
        <button type="button" className={primary} onClick={() => navigate('/dashboard')}>
          Open the app
        </button>
        <button type="button" className={ghost} onClick={() => navigate('/about')}>
          Learn more
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className={primary}
        onClick={() => navigate('/auth?tab=signup')}
      >
        Get started — it&apos;s free
      </button>
      <button type="button" className={ghost} onClick={() => navigate('/about')}>
        Learn more
      </button>
    </div>
  );
}

function HowItWorksStep({
  n,
  title,
  body,
  bg,
}: {
  n: number;
  title: string;
  body: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-card)] p-6">
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-8 h-8 rounded-full text-[var(--c-text)] flex items-center justify-center text-sm font-bold"
          style={{ background: bg }}
        >
          {n}
        </span>
        <h3 className="text-lg font-semibold text-[var(--c-text)]">{title}</h3>
      </div>
      <p className="text-sm text-[var(--c-text-2)] leading-relaxed">{body}</p>
    </div>
  );
}

const MOOD_BARS = [
  { mood: 'Regret', value: 0.3, color: '#FFBDC2' },
  { mood: 'Meh', value: 0.55, color: '#FDFBD4' },
  { mood: 'Glad', value: 0.85, color: '#C5FFD8' },
  { mood: 'Worth it', value: 0.65, color: '#C68BE1' },
];

const CATEGORY_SLICES = [
  { label: 'Shads', value: 28, color: '#FFBDC2' },
  { label: 'Munchy mart', value: 22, color: '#FDFBD4' },
  { label: 'Roblox', value: 18, color: '#C5FFD8' },
  { label: 'Kittens', value: 14, color: '#C68BE1' },
  { label: 'Child support', value: 12, color: '#C5ECF9' },
  { label: 'Other', value: 6, color: '#CBCBCB' },
];

function MoodPreviewCard() {
  return (
    <div className="rounded-2xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-card)] p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-[var(--c-text)]">Spend by mood</h3>
        <span className="text-xs text-[var(--c-text-2)]">April · $676.67 spent</span>
      </div>
      <div className="h-44 grid grid-cols-4 gap-3 items-end mt-4">
        {MOOD_BARS.map((b) => (
          <div key={b.mood} className="flex flex-col items-center gap-2 h-full">
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-md"
                style={{ height: `${b.value * 100}%`, background: b.color }}
              />
            </div>
            <span className="text-[11px] text-[var(--c-text-2)]">{b.mood}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryPreviewCard() {
  const total = CATEGORY_SLICES.reduce((s, x) => s + x.value, 0);
  const r = 70;
  let startAngle = -Math.PI / 2;
  return (
    <div className="rounded-2xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-card)] p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-[var(--c-text)]">Where it goes</h3>
        <span className="text-xs text-[var(--c-text-2)]">By category, this month</span>
      </div>
      <div className="flex items-center gap-6 mt-4 h-44">
        <svg viewBox="-80 -80 160 160" className="w-36 h-36 flex-shrink-0">
          {CATEGORY_SLICES.map((s) => {
            const angle = (s.value / total) * 2 * Math.PI;
            const endAngle = startAngle + angle;
            const x1 = Math.cos(startAngle) * r;
            const y1 = Math.sin(startAngle) * r;
            const x2 = Math.cos(endAngle) * r;
            const y2 = Math.sin(endAngle) * r;
            const largeArc = angle > Math.PI ? 1 : 0;
            const d = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            startAngle = endAngle;
            return <path key={s.label} d={d} fill={s.color} />;
          })}
        </svg>
        <ul className="text-sm space-y-1.5 flex-1">
          {CATEGORY_SLICES.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-[var(--c-text-2)]">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: s.color }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const AVATAR_DOTS = ['#C68BE1', '#C5FFD8', '#FDFBD4', '#FFBDC2'];

function Home() {
  return (
    <MarketingLayout>
      <section className="max-w-5xl mx-auto px-6 pt-4 pb-6">
        <div className="grid md:grid-cols-[3fr_1fr] gap-8 items-center">
          <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--c-text)] leading-[1.1] tracking-tight">
              <span className="block whitespace-nowrap">
                The finance website that asks
              </span>
              <span className="block">
                <Highlight className="px-3 py-1">how you felt</Highlight> about it.
              </span>
            </h1>
            <p className="text-lg text-[var(--c-text-2)] max-w-xl leading-relaxed mt-6">
              <span className="font-bold text-[var(--c-text)]">felt</span> is a finance
              tracker that pairs every purchase with a mood. After a month, you stop
              guessing where your money goes, and start seeing where it actually feels
              good.
            </p>
            <div className="mt-8">
              <HeroCtas />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex -space-x-2">
                {AVATAR_DOTS.map((c, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full border-2 border-[var(--c-bg)]"
                    style={{ background: c }}
                  />
                ))}
              </span>
              <span className="text-sm text-[var(--c-text-2)]">
                12,400+ people tracking how money makes them feel.
              </span>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <img
              src="/felt-logo.svg"
              alt="felt"
              className="w-56 md:w-[320px] max-w-none h-auto select-none"
              draggable={false}
            />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 mt-6 grid gap-4 md:grid-cols-2">
        <MoodPreviewCard />
        <CategoryPreviewCard />
      </section>

      <section className="max-w-5xl mx-auto px-6 mt-12">
        <h2
          className="text-3xl md:text-4xl font-bold text-[var(--c-text)] tracking-tight"
          style={{ marginBottom: '20px' }}
        >
          How it works
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <HowItWorksStep
            n={1}
            bg="#C68BE1"
            title="Tag the feeling"
            body="After every purchase, log how it made you feel. Guilty, happy, impulsive — no judgement."
          />
          <HowItWorksStep
            n={2}
            bg="#C5FFD8"
            title="See the pattern"
            body="felt shows you where your money went and how each purchase actually made you feel."
          />
          <HowItWorksStep
            n={3}
            bg="#FFBDC2"
            title="Spend better"
            body="Use what you learn to make purchases you'll feel good about. Less regret, more intention."
          />
        </div>
      </section>
    </MarketingLayout>
  );
}
