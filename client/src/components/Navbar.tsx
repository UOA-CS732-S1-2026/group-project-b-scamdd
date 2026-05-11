import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from '../lib/auth-client';
import { getRequests, getFriends, respondToRequest } from '../api/friends';
import FeltWordmark from './FeltWordmark';
import type { Friend, Requests } from '../types/friend';

interface NavbarProps {
  isDark: boolean;
  onThemeToggle: () => void;
  userName?: string;
}

const AVATAR_PALETTE = ['#FFBDC2', '#FDFBD4', '#C5FFD8', '#C68BE1', '#C5ECF9', '#CBCBCB'];
const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

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

function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 1.5a3 3 0 0 0-3 3v2.5l-1.5 2.5h9L10.5 7V4.5a3 3 0 0 0-3-3z" />
      <path d="M6 11.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

export default function Navbar({ isDark, onThemeToggle }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [requests, setRequests] = useState<Requests>({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('seen-notifications-v1');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const [newAtOpen, setNewAtOpen] = useState<Set<string>>(new Set());
  const bellWrapRef = useRef<HTMLDivElement>(null);

  const refreshNotifications = () => {
    getRequests().then(setRequests).catch(() => {});
    getFriends().then(setFriends).catch(() => {});
  };

  useEffect(() => {
    refreshNotifications();
  }, [location.pathname]);

  useEffect(() => {
    if (!bellOpen) return;
    const onClick = (e: MouseEvent) => {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [bellOpen]);

  const handleBellRespond = async (id: string, action: 'accept' | 'reject') => {
    try {
      await respondToRequest(id, action);
      refreshNotifications();
    } catch { /* ignore */ }
  };

  const notifications: Array<{ id: string; kind: 'request' | 'like'; data: any }> = [
    ...requests.incoming.map((r) => ({ id: `req-${r.id}`, kind: 'request' as const, data: r })),
    ...friends.slice(0, 3).map((f) => ({ id: `like-${f.id}`, kind: 'like' as const, data: f })),
  ];
  const unseenCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  const openBell = () => {
    setBellOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        const newOnes = new Set(notifications.filter((n) => !seenIds.has(n.id)).map((n) => n.id));
        setNewAtOpen(newOnes);
        const next = new Set(seenIds);
        notifications.forEach((n) => next.add(n.id));
        setSeenIds(next);
        try { localStorage.setItem('seen-notifications-v1', JSON.stringify([...next])); } catch { /* ignore */ }
      } else {
        setNewAtOpen(new Set());
      }
      return willOpen;
    });
  };

  const goToNotification = () => {
    setBellOpen(false);
    navigate('/friends');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', Icon: IconDashboard },
    { label: 'Transactions', path: '/transactions', Icon: IconTransactions },
    { label: 'Budgets', path: '/budgets', Icon: IconBudgets },
    { label: 'Friends', path: '/friends', Icon: IconFriends },
    { label: 'Games', path: '/games', Icon: IconGames },
    { label: 'Profile', path: '/profile', Icon: IconProfile },
  ];

  const isActive = (path: string) => location.pathname === path;

  const ghostBtn =
    'px-4 py-1.5 rounded-[20px] text-sm font-medium text-[var(--c-text)] bg-transparent hover:bg-[var(--c-nav-active)] transition-colors cursor-pointer';
  const iconBtn =
    'w-8 h-8 flex items-center justify-center rounded-[20px] text-[var(--c-text-2)] hover:bg-[var(--c-nav-active)] hover:text-[var(--c-text)] transition-colors cursor-pointer';

  return (
    <nav className="sticky top-0 z-40 backdrop-blur bg-[color-mix(in_srgb,var(--c-bg)_85%,transparent)] border-b border-[var(--c-border)]">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between min-h-[32px]">
        <Link
          to="/dashboard"
          className="flex items-center cursor-pointer hover:opacity-75 transition-opacity"
        >
          <FeltWordmark size="md" />
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map(({ label, path, Icon }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'text-[var(--c-text)] bg-[var(--c-nav-active)]'
                    : 'text-[var(--c-text-2)] hover:text-[var(--c-text)] hover:bg-[var(--c-nav-active)]'
                }`}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div ref={bellWrapRef} className="relative">
            <button
              type="button"
              onClick={openBell}
              aria-label="Notifications"
              aria-expanded={bellOpen}
              className={`${iconBtn} relative`}
            >
              <IconBell />
              {unseenCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[var(--c-accent)] text-[var(--c-text)] border border-[var(--c-text)]">
                  {unseenCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[rgba(109,109,109,0.8)] bg-[var(--c-card)] shadow-xl z-50 overflow-hidden">
                <div className="absolute -top-1.5 right-3 w-3 h-3 rotate-45 bg-[var(--c-card)] border-l border-t border-[rgba(109,109,109,0.8)]" aria-hidden />
                <div className="px-4 py-3 border-b border-[var(--c-border)]">
                  <p className="text-sm font-semibold text-[var(--c-text)]">Notifications</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-[var(--c-text-2)] text-center py-6">No notifications yet.</p>
                  ) : (
                    <ul className="flex flex-col">
                      {notifications.slice(0, 3).map((n) => {
                        const wasNew = newAtOpen.has(n.id);
                        if (n.kind === 'request') {
                          const r = n.data;
                          return (
                            <li
                              key={n.id}
                              className={`px-4 py-3 border-b border-[var(--c-border)] last:border-b-0 flex items-center gap-3 cursor-pointer hover:bg-[var(--c-nav-active)] ${wasNew ? 'bg-[var(--c-tint-yellow)]' : ''}`}
                              onClick={goToNotification}
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-[2px] border-white text-[var(--c-text)] flex-shrink-0 bg-[#C68BE1]">
                                {initials(r.displayName ?? r.username ?? '?')}
                              </div>
                              <p className="text-xs text-[var(--c-text)] flex-1 min-w-0 truncate">
                                <span className="font-semibold">{r.displayName ?? r.username}</span>{' '}
                                <span className="text-[var(--c-text-2)]">sent you a friend request</span>
                              </p>
                              <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleBellRespond(r.id, 'accept')}
                                  className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--c-accent)] text-[var(--c-text)] border border-[var(--c-text)] hover:opacity-90 transition-opacity"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleBellRespond(r.id, 'reject')}
                                  className="px-2 py-1 rounded-full border border-[rgba(109,109,109,0.5)] bg-[#ffffff] text-[10px] text-[var(--c-text-2)] hover:text-[var(--c-expense)] hover:border-[var(--c-expense)] transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            </li>
                          );
                        }
                        const f = n.data;
                        const name = f.displayName ?? f.username ?? 'Friend';
                        const idx = friends.indexOf(f);
                        const color = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
                        return (
                          <li
                            key={n.id}
                            className={`px-4 py-3 border-b border-[var(--c-border)] last:border-b-0 flex items-center gap-3 cursor-pointer hover:bg-[var(--c-nav-active)] ${wasNew ? 'bg-[var(--c-tint-yellow)]' : ''}`}
                            onClick={goToNotification}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-[2px] border-white text-[var(--c-text)] flex-shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {initials(name)}
                            </div>
                            <p className="text-xs text-[var(--c-text)] flex-1 min-w-0 truncate">
                              <span className="font-semibold">{name}</span>{' '}
                              <span className="text-[var(--c-text-2)]">liked your achievement</span>
                            </p>
                            <span className="flex-shrink-0 text-[#E11D48]">
                              <svg width="14" height="14" viewBox="0 0 15 15" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M7.5 13s-5-3.1-5-6.6A2.7 2.7 0 0 1 7.5 4.6a2.7 2.7 0 0 1 5 1.8C12.5 9.9 7.5 13 7.5 13z" />
                              </svg>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setBellOpen(false); navigate('/profile'); }}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)] hover:bg-[var(--c-nav-active)] border-t border-[var(--c-border)] transition-colors cursor-pointer"
                >
                  See all notifications →
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onThemeToggle}
            className={iconBtn}
            aria-label="Toggle theme"
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>

          <button
            onClick={() => signOut().then(() => navigate('/'))}
            className={ghostBtn}
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
