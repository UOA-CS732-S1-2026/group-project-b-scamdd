import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from '../lib/auth-client';
import {
  getRequests,
  getFriends,
  respondToRequest,
  getAcceptances,
  markAcceptancesSeen,
} from '../api/friends';
import { getReceivedCheers, markCheersSeen, type ReceivedCheer } from '../api/cheers';
import {
  acceptSharedBudgetInvite,
  declineSharedBudgetInvite,
  getSharedBudgetInvites,
} from '../api/sharedBudgets';
import type { SharedBudget } from '../types/sharedBudget';
import type { FriendAcceptance, IncomingRequest } from '../types/friend';
import { achievementMessage } from '../lib/achievementMeta';
import FeltWordmark from './FeltWordmark';
import { useProfileAvatar } from '../context/ProfileContext';
import type { Friend, Requests } from '../types/friend';

interface NavbarProps {
  isDark: boolean;
  onThemeToggle: () => void;
  userName?: string;
}

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

function IconDashboard() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function IconTransactions() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="13" height="9" rx="1.5" />
      <path d="M1 6h13" />
      <path d="M4 9.5h2" />
      <path d="M7.5 9.5h1" />
    </svg>
  );
}

function IconFriends() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5.5" cy="4.5" r="2.5" />
      <path d="M1 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <path d="M10.5 2a2.5 2.5 0 0 1 0 5" />
      <path d="M13 13c0-2-1.2-3.3-2.5-3.8" />
    </svg>
  );
}

function IconBudgets() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="13" height="8" rx="1.5" />
      <path d="M4 4V3a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1" />
      <path d="M7.5 8v.5" />
      <circle cx="7.5" cy="8" r="1.5" />
    </svg>
  );
}

function IconGames() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="13" height="8" rx="2" />
      <path d="M5 8h2m-1-1v2" />
      <circle cx="10" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="9" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="7.5" r="2.5" />
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.93 2.93l1.06 1.06M11.01 11.01l1.06 1.06M2.93 12.07l1.06-1.06M11.01 3.99l1.06-1.06" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.5 10A6 6 0 0 1 5 2.5a6 6 0 1 0 7.5 7.5z" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.5 1.5a3 3 0 0 0-3 3v2.5l-1.5 2.5h9L10.5 7V4.5a3 3 0 0 0-3-3z" />
      <path d="M6 11.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

function IconLogOut() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 1.5H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6" />
      <path d="M10.5 4.5L13.5 7.5L10.5 10.5" />
      <path d="M6 7.5h7.5" />
    </svg>
  );
}

// Module-level — survive Navbar remounts when navigating between pages
let _dismissed = new Set<string>();
let _clearedBadge = new Set<string>();

export default function Navbar({ isDark, onThemeToggle, userName }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [requests, setRequests] = useState<Requests>({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [cheers, setCheers] = useState<ReceivedCheer[]>([]);
  const [sharedInvites, setSharedInvites] = useState<SharedBudget[]>([]);
  const [acceptances, setAcceptances] = useState<FriendAcceptance[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [newAtOpen, setNewAtOpen] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(_dismissed);
  const [clearedBadgeIds, setClearedBadgeIds] = useState<Set<string>>(_clearedBadge);
  const bellWrapRef = useRef<HTMLDivElement>(null);

  const refreshNotifications = () => {
    getRequests()
      .then(setRequests)
      .catch(() => {});
    getFriends()
      .then(setFriends)
      .catch(() => {});
    getReceivedCheers()
      .then(setCheers)
      .catch(() => {});
    getSharedBudgetInvites()
      .then(setSharedInvites)
      .catch(() => {});
    getAcceptances()
      .then(setAcceptances)
      .catch(() => {});
  };

  useEffect(() => {
    refreshNotifications();
  }, [location.pathname]);

  // Poll every 5s while the tab is open; pause when hidden, refresh on focus.
  // Works regardless of whether the other user has the app open.
  useEffect(() => {
    let id: number | null = null;
    const start = () => {
      if (id !== null) return;
      id = window.setInterval(refreshNotifications, 5000);
    };
    const stop = () => {
      if (id !== null) {
        window.clearInterval(id);
        id = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshNotifications();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refreshNotifications);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refreshNotifications);
    };
  }, []);

  useEffect(() => {
    if (!bellOpen) return;
    const onClick = (e: MouseEvent) => {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node))
        setBellOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [bellOpen]);

  const handleBellRespond = async (id: string, action: 'accept' | 'reject') => {
    try {
      await respondToRequest(id, action);
      refreshNotifications();
    } catch {
      /* ignore */
    }
  };

  const handleSharedRespond = async (id: string, action: 'accept' | 'decline') => {
    try {
      if (action === 'accept') await acceptSharedBudgetInvite(id);
      else await declineSharedBudgetInvite(id);
      refreshNotifications();
    } catch {
      /* ignore */
    }
  };

  const notifications: Array<{
    id: string;
    kind: 'request' | 'like' | 'shared-invite' | 'friend-accepted';
    isNew: boolean;
    data: unknown;
  }> = [
    ...requests.incoming.map((r) => ({
      id: `req-${r.id}`,
      kind: 'request' as const,
      isNew: true,
      data: r,
    })),
    ...sharedInvites.map((sb) => ({
      id: `shared-${sb._id}`,
      kind: 'shared-invite' as const,
      isNew: true,
      data: sb,
    })),
    ...acceptances.map((a) => ({
      id: `accept-${a.id}`,
      kind: 'friend-accepted' as const,
      isNew: true,
      data: a,
    })),
    ...cheers.map((c) => ({ id: `cheer-${c.id}`, kind: 'like' as const, isNew: !c.seen, data: c })),
  ];
  const unseenCount = notifications.filter((n) => n.isNew && !clearedBadgeIds.has(n.id)).length;

  const openBell = () => {
    setBellOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        const newOnes = new Set(notifications.filter((n) => n.isNew).map((n) => n.id));
        setNewAtOpen(newOnes);
        _clearedBadge = new Set([..._clearedBadge, ...newOnes]);
        setClearedBadgeIds(_clearedBadge);
      } else {
        setNewAtOpen(new Set());
      }
      return willOpen;
    });
  };

  const handleNotificationClick = (
    id: string,
    kind: 'request' | 'like' | 'shared-invite' | 'friend-accepted',
    destination: string,
  ) => {
    _dismissed.add(id);
    setDismissedIds(new Set(_dismissed));
    if (kind === 'like') markCheersSeen().catch(() => {});
    if (kind === 'friend-accepted') markAcceptancesSeen().catch(() => {});
    setBellOpen(false);
    navigate(destination);
  };

  const handleSeeAll = () => {
    _dismissed = new Set([..._dismissed, ...notifications.map((n) => n.id)]);
    setDismissedIds(_dismissed);
    markCheersSeen().catch(() => {});
    markAcceptancesSeen().catch(() => {});
    setBellOpen(false);
    navigate('/profile');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', Icon: IconDashboard },
    { label: 'Transactions', path: '/transactions', Icon: IconTransactions },
    { label: 'Budgets', path: '/budgets', Icon: IconBudgets },
    { label: 'Friends', path: '/friends', Icon: IconFriends },
    { label: 'Games', path: '/games', Icon: IconGames },
  ];

  const { avatarColor, avatarImage } = useProfileAvatar();
  const avatarInitials =
    (userName || '?')
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';

  const isActive = (path: string) => location.pathname === path;

  const ghostBtn =
    'px-2.5 sm:px-4 py-1.5 rounded-[20px] text-xs sm:text-sm font-medium text-[var(--c-text)] bg-transparent hover:bg-[var(--c-nav-active)] transition-colors cursor-pointer';
  const iconBtn =
    'w-8 h-8 flex items-center justify-center rounded-[20px] text-[var(--c-text-2)] hover:bg-[var(--c-nav-active)] hover:text-[var(--c-text)] transition-colors cursor-pointer';

  return (
    <>
      <nav className="sticky top-0 z-40 backdrop-blur bg-[color-mix(in_srgb,var(--c-bg)_85%,transparent)] border-b border-[var(--c-border)]">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-3 flex items-center justify-between gap-2 min-h-[32px]">
          <Link
            to="/dashboard"
            aria-label="Felt — Dashboard"
            className="flex items-center cursor-pointer hover:opacity-75 transition-opacity flex-shrink-0"
          >
            <FeltWordmark size="md" />
          </Link>

          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 flex-shrink min-w-0">
            {navLinks.map(({ label, path, Icon }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  aria-label={label}
                  title={label}
                  className={`flex items-center gap-1.5 px-1.5 sm:px-2.5 lg:px-3 py-1.5 rounded-[20px] text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'text-[var(--c-text)] bg-[var(--c-nav-active)]'
                      : 'text-[var(--c-text-2)] hover:text-[var(--c-text)] hover:bg-[var(--c-nav-active)]'
                  }`}
                >
                  <Icon />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/profile')}
              aria-label="Your profile"
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[var(--c-border)] overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer ${
                location.pathname === '/profile' ? 'ring-2 ring-[var(--c-accent)]' : ''
              }`}
              style={{ backgroundColor: avatarImage ? 'transparent' : avatarColor }}
            >
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt={userName ?? 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                avatarInitials
              )}
            </button>
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
                <div className="fixed top-[60px] right-3 w-[min(calc(100vw-1.5rem),320px)] sm:absolute sm:top-auto sm:right-0 sm:mt-2 sm:w-80 rounded-2xl border border-[rgba(109,109,109,0.8)] bg-white dark:bg-black shadow-xl z-50 overflow-hidden">
                  <div
                    className="absolute -top-1.5 right-3 w-3 h-3 rotate-45 bg-white dark:bg-black border-l border-t border-[rgba(109,109,109,0.8)]"
                    aria-hidden
                  />
                  <div className="px-4 py-3 border-b border-[var(--c-border)]">
                    <p className="text-sm font-semibold text-[var(--c-text)]">Notifications</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.filter((n) => !dismissedIds.has(n.id)).length === 0 ? (
                      <p className="text-sm text-[var(--c-text-2)] text-center py-6">
                        No notifications yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col">
                        {notifications
                          .filter((n) => !dismissedIds.has(n.id))
                          .slice(0, 3)
                          .map((n) => {
                            const wasNew = newAtOpen.has(n.id);
                            if (n.kind === 'request') {
                              const r = n.data as IncomingRequest;
                              return (
                                <li
                                  key={n.id}
                                  className={`px-4 py-3 border-b border-[var(--c-border)] last:border-b-0 flex items-center gap-3 cursor-pointer hover:bg-[var(--c-nav-active)] ${wasNew ? 'bg-[var(--c-tint-yellow)]' : ''}`}
                                  onClick={() => handleNotificationClick(n.id, n.kind, '/friends')}
                                >
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-[2px] border-white text-[var(--c-text)] flex-shrink-0 overflow-hidden"
                                    style={{
                                      backgroundColor: r.avatarImage
                                        ? 'transparent'
                                        : (r.avatarColor ?? '#C68BE1'),
                                    }}
                                  >
                                    {r.avatarImage ? (
                                      <img
                                        src={r.avatarImage}
                                        alt={r.displayName ?? '?'}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      initials(r.displayName ?? '?')
                                    )}
                                  </div>
                                  <p className="text-xs text-[var(--c-text)] flex-1 min-w-0 truncate">
                                    <span className="font-semibold">
                                      {r.displayName ?? 'Someone'}
                                    </span>{' '}
                                    <span className="text-[var(--c-text-2)]">
                                      sent you a friend request
                                    </span>
                                  </p>
                                  <div
                                    className="flex gap-1 flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleBellRespond(r.id, 'accept')}
                                      className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--c-accent)] text-[var(--c-text)] border border-[var(--c-text)] hover:opacity-90 transition-opacity"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleBellRespond(r.id, 'reject')}
                                      className="px-2 py-1 rounded-full border border-[rgba(109,109,109,0.5)] bg-[var(--c-card)] text-[10px] text-[var(--c-text-2)] hover:text-[var(--c-expense)] hover:border-[var(--c-expense)] transition-colors"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </li>
                              );
                            }
                            if (n.kind === 'shared-invite') {
                              const sb = n.data as SharedBudget;
                              const inviter =
                                sb.members.find((m) => m.userId === sb.ownerId) ??
                                sb.members.find((m) => m.status === 'accepted');
                              const inviterName =
                                inviter?.displayName ?? inviter?.username ?? 'Someone';
                              const label = sb.name?.trim() || sb.category;
                              const inviterFriend = friends.find((fr) => fr.id === inviter?.userId);
                              const inviterAvatarColor = inviterFriend?.avatarColor ?? '#C5FFD8';
                              const inviterAvatarImage = inviterFriend?.avatarImage ?? null;
                              return (
                                <li
                                  key={n.id}
                                  className={`px-4 py-3 border-b border-[var(--c-border)] last:border-b-0 flex items-center gap-3 cursor-pointer hover:bg-[var(--c-nav-active)] ${wasNew ? 'bg-[var(--c-tint-yellow)]' : ''}`}
                                  onClick={() =>
                                    handleNotificationClick(n.id, n.kind, '/budgets#shared')
                                  }
                                >
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-[2px] border-white text-[var(--c-text)] flex-shrink-0 overflow-hidden"
                                    style={{
                                      backgroundColor: inviterAvatarImage
                                        ? 'transparent'
                                        : inviterAvatarColor,
                                    }}
                                  >
                                    {inviterAvatarImage ? (
                                      <img
                                        src={inviterAvatarImage}
                                        alt={inviterName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      initials(inviterName)
                                    )}
                                  </div>
                                  <p className="text-xs text-[var(--c-text)] flex-1 min-w-0 truncate">
                                    <span className="font-semibold">{inviterName}</span>{' '}
                                    <span className="text-[var(--c-text-2)]">
                                      invited you to share a{' '}
                                      <span className="capitalize">{label}</span> budget
                                    </span>
                                  </p>
                                  <div
                                    className="flex gap-1 flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleSharedRespond(sb._id, 'accept')}
                                      className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--c-accent)] text-[var(--c-text)] border border-[var(--c-text)] hover:opacity-90 transition-opacity"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleSharedRespond(sb._id, 'decline')}
                                      className="px-2 py-1 rounded-full border border-[rgba(109,109,109,0.5)] bg-[var(--c-card)] text-[10px] text-[var(--c-text-2)] hover:text-[var(--c-expense)] hover:border-[var(--c-expense)] transition-colors"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </li>
                              );
                            }
                            if (n.kind === 'friend-accepted') {
                              const a = n.data as FriendAcceptance;
                              const acceptedName = a.displayName ?? a.username ?? 'Someone';
                              const acceptedFriend = friends.find((fr) => fr.id === a.userId);
                              const acceptedAvatarColor =
                                a.avatarColor ?? acceptedFriend?.avatarColor ?? '#C68BE1';
                              const acceptedAvatarImage =
                                a.avatarImage ?? acceptedFriend?.avatarImage ?? null;
                              return (
                                <li
                                  key={n.id}
                                  className={`px-4 py-3 border-b border-[var(--c-border)] last:border-b-0 flex items-center gap-3 cursor-pointer hover:bg-[var(--c-nav-active)] ${wasNew ? 'bg-[var(--c-tint-yellow)]' : ''}`}
                                  onClick={() => handleNotificationClick(n.id, n.kind, '/friends')}
                                >
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-[2px] border-white text-[var(--c-text)] flex-shrink-0 overflow-hidden"
                                    style={{
                                      backgroundColor: acceptedAvatarImage
                                        ? 'transparent'
                                        : acceptedAvatarColor,
                                    }}
                                  >
                                    {acceptedAvatarImage ? (
                                      <img
                                        src={acceptedAvatarImage}
                                        alt={acceptedName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      initials(acceptedName)
                                    )}
                                  </div>
                                  <p className="text-xs text-[var(--c-text)] flex-1 min-w-0 truncate">
                                    <span className="font-semibold">{acceptedName}</span>{' '}
                                    <span className="text-[var(--c-text-2)]">
                                      accepted your friend request
                                    </span>
                                  </p>
                                </li>
                              );
                            }
                            const c = n.data as ReceivedCheer;
                            const name = c.fromDisplayName ?? c.fromUsername ?? 'Friend';
                            const cheerFriend = friends.find((fr) => fr.id === c.fromId);
                            const cheerColor = cheerFriend?.avatarColor ?? '#C68BE1';
                            const cheerImage = cheerFriend?.avatarImage ?? null;
                            const achMsg = achievementMessage(c.achievementKey, true).toLowerCase();
                            return (
                              <li
                                key={n.id}
                                className={`px-4 py-3 border-b border-[var(--c-border)] last:border-b-0 flex items-center gap-3 cursor-pointer hover:bg-[var(--c-nav-active)] ${wasNew ? 'bg-[var(--c-tint-yellow)]' : ''}`}
                                onClick={() => handleNotificationClick(n.id, n.kind, '/friends')}
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-[2px] border-white text-[var(--c-text)] flex-shrink-0 overflow-hidden"
                                  style={{
                                    backgroundColor: cheerImage ? 'transparent' : cheerColor,
                                  }}
                                >
                                  {cheerImage ? (
                                    <img
                                      src={cheerImage}
                                      alt={name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    initials(name)
                                  )}
                                </div>
                                <p className="text-xs text-[var(--c-text)] flex-1 min-w-0 truncate">
                                  <span className="font-semibold">{name}</span>{' '}
                                  <span className="text-[var(--c-text-2)]">liked: {achMsg}</span>
                                </p>
                                <span className="flex-shrink-0 text-[#E11D48]">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 15 15"
                                    fill="currentColor"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden
                                  >
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
                    onClick={handleSeeAll}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-[var(--c-text-2)] hover:text-[var(--c-text)] hover:bg-[var(--c-nav-active)] border-t border-[var(--c-border)] transition-colors cursor-pointer"
                  >
                    See all notifications →
                  </button>
                </div>
              )}
            </div>

            <button onClick={onThemeToggle} className={iconBtn} aria-label="Toggle theme">
              {isDark ? <IconSun /> : <IconMoon />}
            </button>

            <button
              onClick={() => signOut().then(() => navigate('/'))}
              aria-label="Log out"
              title="Log out"
              className={`${ghostBtn} flex items-center gap-1.5`}
            >
              <span className="sm:hidden" aria-hidden>
                <IconLogOut />
              </span>
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom dock — Instagram-style, hidden on sm+ */}
      <nav
        aria-label="Mobile navigation"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur bg-[color-mix(in_srgb,var(--c-bg)_92%,transparent)] border-t border-[var(--c-border)]"
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {navLinks.map(({ label, path, Icon }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                aria-label={label}
                className={`flex items-center justify-center w-12 h-12 rounded-xl transition-colors cursor-pointer ${
                  active
                    ? 'text-[var(--c-text)] bg-[var(--c-nav-active)]'
                    : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
                }`}
              >
                <span className="scale-150 origin-center">
                  <Icon />
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
