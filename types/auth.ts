export type UserProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  homeCity: string;
  createdAt: string;
};

export type AuthMode = 'login' | 'signup';
