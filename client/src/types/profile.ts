export interface Profile {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  currency: string;
  profileComplete: boolean;
}

export interface PublicProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
}

export interface ProfileUpdate {
  username?: string;
  displayName?: string;
  bio?: string;
  currency?: string;
  profileComplete?: boolean;
}
