import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Hoist mocks before any imports so they apply when Auth.tsx is loaded.
vi.mock('../lib/auth-client', () => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  requestPasswordReset: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({ isDark: false, toggle: vi.fn() })),
}));

import Auth from '../pages/Auth';
import { signIn, useSession } from '../lib/auth-client';

// Narrow the type so TypeScript knows these are vi.fn() mocks.
const mockUseSession = vi.mocked(useSession);
const mockSignInEmail = vi.mocked(signIn.email);

function renderAuth() {
  return render(
    <MemoryRouter initialEntries={['/auth']}>
      <Auth />
    </MemoryRouter>,
  );
}

describe('Auth page — login form', () => {
  beforeEach(() => {
    // No active session, not loading
    mockUseSession.mockReturnValue({ data: null, isPending: false, isRefetching: false, error: null, refetch: vi.fn() });
    mockSignInEmail.mockReset();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  it('renders the email field, password field, and Sign in button', () => {
    renderAuth();
    // Auth.tsx uses htmlFor/id so getByLabelText works here
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByText('Sign in', { selector: 'button[type="submit"]' }),
    ).toBeInTheDocument();
  });

  it('shows "Welcome back" as the heading when on the sign-in tab', () => {
    renderAuth();
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Empty-field validation
  // ---------------------------------------------------------------------------
  it('does not call signIn.email when the form is submitted with empty fields', async () => {
    renderAuth();
    // Click the submit button without typing anything — HTML5 `required` should
    // block the submission before handleSubmit is reached.
    await userEvent.click(
      screen.getByText('Sign in', { selector: 'button[type="submit"]' }),
    );
    expect(mockSignInEmail).not.toHaveBeenCalled();
  });

  it('does not call signIn.email when only the email is filled (password missing)', async () => {
    renderAuth();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(
      screen.getByText('Sign in', { selector: 'button[type="submit"]' }),
    );
    expect(mockSignInEmail).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Failed-login error display
  // ---------------------------------------------------------------------------
  it('displays the error message returned by the server on failed login', async () => {
    mockSignInEmail.mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid email or password',
        status: 401,
        code: 'INVALID_CREDENTIALS',
        statusText: 'Unauthorized',
      },
    });

    renderAuth();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    // Password needs ≥ 8 chars to pass the minLength={8} HTML5 constraint
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(
      screen.getByText('Sign in', { selector: 'button[type="submit"]' }),
    );

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('calls signIn.email with the entered credentials on submit', async () => {
    mockSignInEmail.mockResolvedValue({ data: { user: {}, session: {} }, error: null });

    renderAuth();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correctpassword');
    await user.click(
      screen.getByText('Sign in', { selector: 'button[type="submit"]' }),
    );

    expect(mockSignInEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'correctpassword',
    });
  });
});
