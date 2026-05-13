import { createContext, useContext, useState, type ReactNode } from 'react';

interface ProfileAvatarCtx {
  avatarColor: string;
  avatarImage: string | null;
  setAvatarColor: (c: string) => void;
  setAvatarImage: (img: string | null) => void;
}

const ProfileAvatarContext = createContext<ProfileAvatarCtx>({
  avatarColor: '#C68BE1',
  avatarImage: null,
  setAvatarColor: () => {},
  setAvatarImage: () => {},
});

export function ProfileAvatarProvider({
  initial,
  children,
}: {
  initial: { avatarColor: string; avatarImage: string | null };
  children: ReactNode;
}) {
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor);
  const [avatarImage, setAvatarImage] = useState<string | null>(initial.avatarImage);

  return (
    <ProfileAvatarContext.Provider
      value={{ avatarColor, avatarImage, setAvatarColor, setAvatarImage }}
    >
      {children}
    </ProfileAvatarContext.Provider>
  );
}

export function useProfileAvatar() {
  return useContext(ProfileAvatarContext);
}
