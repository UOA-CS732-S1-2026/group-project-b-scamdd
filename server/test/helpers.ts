export const authMocks = {
  currentUserId: 'test-user-1' as string | null,
  getSessionShouldThrow: false,
};

export function setAuthUser(id: string | null): void {
  authMocks.currentUserId = id;
  authMocks.getSessionShouldThrow = false;
}

export function makeAuthThrow(): void {
  authMocks.getSessionShouldThrow = true;
}
