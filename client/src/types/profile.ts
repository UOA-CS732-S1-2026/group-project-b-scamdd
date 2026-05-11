export interface Profile {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  currency: string;
  phone: string | null;
  avatarColor: string | null;
  avatarImage: string | null;
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
  phone?: string;
  avatarColor?: string;
  avatarImage?: string;
  profileComplete?: boolean;
}
