import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from '../lib/auth-client';

interface NavbarProps {
  isDark: boolean;
  onThemeToggle: () => void;
  userName?: string;
}

function IconDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function IconTransactions() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="13" height="9" rx="1.5" />
      <path d="M1 6h13" />
      <path d="M4 9.5h2" />
      <path d="M7.5 9.5h1" />
    </svg>
  );
}

function IconFriends() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="4.5" r="2.5" />
      <path d="M1 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <path d="M10.5 2a2.5 2.5 0 0 1 0 5" />
      <path d="M13 13c0-2-1.2-3.3-2.5-3.8" />
    </svg>
  );
}

function IconBudgets() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="13" height="8" rx="1.5" />
      <path d="M4 4V3a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1" />
      <path d="M7.5 8v.5" />
      <circle cx="7.5" cy="8" r="1.5" />
    </svg>
  );
}

function IconGames() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="13" height="8" rx="2" />
      <path d="M5 8h2m-1-1v2" />
      <circle cx="10" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="9" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="4.5" r="3" />
      <path d="M1.5 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </svg>
  );
}

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

export default function Navbar({ isDark, onThemeToggle, userName }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', Icon: IconDashboard },
    { label: 'Transactions', path: '/transactions', Icon: IconTransactions },
    { label: 'Budgets', path: '/budgets', Icon: IconBudgets },
    { label: 'Friends', path: '/friends', Icon: IconFriends },
    { label: 'Games', path: '/games', Icon: IconGames },
    { label: 'Profile', path: '/profile', Icon: IconProfile },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[var(--c-bg)] border-b border-[var(--c-border)]">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 font-bold text-lg transition-opacity hover:opacity-80 text-[var(--c-text)]"
          >
            <span className="w-5 h-5 rounded-full flex-shrink-0 bg-[var(--c-accent)]" />
            <span>felt</span>
          </button>

          <div className="flex items-center gap-1">
            {navLinks.map(({ label, path, Icon }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all hover:opacity-80 ${
                    active
                      ? 'text-[var(--c-text)] bg-[var(--c-nav-active)] border-[var(--c-border)]'
                      : 'text-[var(--c-text-2)] bg-transparent border-transparent'
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onThemeToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--c-border)] text-[var(--c-text-2)] transition-colors hover:opacity-80"
            aria-label="Toggle theme"
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>

          <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm select-none bg-[var(--c-avatar)] text-[var(--c-text)]">
            {(userName || 'U')[0].toUpperCase()}
          </div>

          <button
            onClick={() => signOut().then(() => navigate('/auth'))}
            className="px-3 py-1.5 rounded-lg border border-[var(--c-border)] text-sm font-medium transition-colors hover:opacity-80 text-[var(--c-text)]"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
