import type { Park } from '@/types/park';

export type SocialUser = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  home: string;
  role: string;
};

export type SocialPost = {
  id: string;
  user: SocialUser;
  park?: Park;
  mediaType: 'image' | 'video';
  mediaUrl?: string;
  caption: string;
  challenge?: string;
  tags: string[];
  likes: number;
  comments: number;
  saved: boolean;
  time: string;
  distance?: string;
  commentPreview?: string;
  createdBy?: string;
  createdAt?: string;
};
