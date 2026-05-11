import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../lib/auth-client', () => ({
  useSession: vi.fn(),
}));

// getMyProfile is called by RequireProfile when a session exists; mock it so
// tests that DO have a session can control its response.
vi.mock('../api/profile', () => ({
  getMyProfile: vi.fn(),
}));

import { RequireProfile } from '../App';
import { useSession } from '../lib/auth-client';
import { getMyProfile } from '../api/profile';

const mockUseSession = vi.mocked(useSession);
const mockGetMyProfile = vi.mocked(getMyProfile);

/** Render a protected route at /protected alongside a stand-in for /. */
function renderProtected(children: React.ReactNode = <div>Protected content</div>) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={<RequireProfile>{children}</RequireProfile>}
        />
        {/* The root route acts as the landing page that unauthenticated users
            are redirected to. */}
        <Route path="/" element={<div data-testid="landing">Landing page</div>} />
        <Route path="/auth" element={<div data-testid="auth">Auth page</div>} />
        <Route
          path="/profile/setup"
          element={<div data-testid="profile-setup">Profile setup</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireProfile (protected route guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to / when the user is not logged in', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false, isRefetching: false, error: null, refetch: vi.fn() });

    renderProtected();

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows a loading indicator while the session is being fetched', () => {
    // isPending=true means the session request is still in flight
    mockUseSession.mockReturnValue({ data: null, isPending: true, isRefetching: false, error: null, refetch: vi.fn() });

    renderProtected();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to /profile/setup when the user is logged in but has not completed their profile', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, session: {} },
      isPending: false,
      isRefetching: false,
      error: null,
      refetch: vi.fn(),
    });
    mockGetMyProfile.mockResolvedValue({ profileComplete: false } as never);

    renderProtected();

    await waitFor(() => {
      expect(screen.getByTestId('profile-setup')).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the protected content when the user is logged in with a complete profile', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u1', email: 'a@b.com' }, session: {} },
      isPending: false,
      isRefetching: false,
      error: null,
      refetch: vi.fn(),
    });
    mockGetMyProfile.mockResolvedValue({ profileComplete: true } as never);

    renderProtected();

    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });
});
