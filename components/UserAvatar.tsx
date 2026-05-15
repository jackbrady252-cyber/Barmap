import type { SocialUser } from '@/types/social';

type UserAvatarProps = {
  user: SocialUser;
  size?: 'sm' | 'md';
};

export default function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  return (
    <div className={`user-avatar user-avatar--${size}`} aria-label={user.name}>
      {user.initials}
    </div>
  );
}
