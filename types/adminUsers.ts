import type { UserStatus } from '@/types/auth';

export type PendingUserApplication = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  homeCity: string;
  userStatus: UserStatus;
  createdAt: string;
};
