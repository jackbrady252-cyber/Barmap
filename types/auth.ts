export type UserStatus = 'pending' | 'approved' | 'rejected';

export type UserProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  homeCity: string;
  userStatus: UserStatus;
  createdAt: string;
};

export type AuthMode = 'login' | 'signup';
