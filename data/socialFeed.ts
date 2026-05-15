import type { Park } from '@/types/park';
import type { SocialPost, SocialUser } from '@/types/social';

export const seededUsers: SocialUser[] = [
  { id: 'aine-p', name: 'Aine Power', handle: '@ainebars', initials: 'AP', home: 'Dublin 9', role: 'rings + strict form' },
  { id: 'rory-m', name: 'Rory Malone', handle: '@rorysets', initials: 'RM', home: 'Cork City', role: 'weighted basics' },
  { id: 'shauna-k', name: 'Shauna Keane', handle: '@shaunaflow', initials: 'SK', home: 'Waterford', role: 'mobility + flow' },
  { id: 'cathal-d', name: 'Cathal Doyle', handle: '@cathalreps', initials: 'CD', home: 'Tallaght', role: 'community sessions' },
  { id: 'orla-n', name: 'Orla Nolan', handle: '@orla_moves', initials: 'ON', home: 'Galway', role: 'skills practice' },
  { id: 'dec-o', name: 'Dec OConnell', handle: '@decoutdoors', initials: 'DO', home: 'Lucan', role: 'morning crew' },
  { id: 'grace-m', name: 'Grace Murphy', handle: '@graceholds', initials: 'GM', home: 'Dublin 7', role: 'static holds' },
  { id: 'jb', name: 'Jack Brady', handle: '@jackbrady', initials: 'JB', home: 'Ireland', role: 'spot hunter' }
];

type SeedPost = {
  id: string;
  userId: string;
  parkName: string;
  fallbackArea: string;
  mediaType: 'image' | 'video';
  caption: string;
  challenge?: string;
  tags: string[];
  likes: number;
  comments: number;
  saved?: boolean;
  time: string;
  distance?: string;
  commentPreview?: string;
};

const seededPostData: SeedPost[] = [
  {
    id: 'feed-001',
    userId: 'aine-p',
    parkName: 'Albert College Park',
    fallbackArea: 'Whitehall, Dublin',
    mediaType: 'video',
    caption: 'Quiet evening rounds. Five sets, long rests, clean reps. The park was empty until two lads jumped in for dips.',
    challenge: 'Max Pull-ups',
    tags: ['strict', 'northside', 'pullups'],
    likes: 64,
    comments: 12,
    time: '18 min',
    distance: '3.1 km from home',
    commentPreview: 'Rory: That bar height is perfect.'
  },
  {
    id: 'feed-002',
    userId: 'rory-m',
    parkName: 'Ballycannon Park',
    fallbackArea: 'Cork',
    mediaType: 'image',
    caption: 'First dry session in a week. Cork crew kept it simple: pull, dip, squat, repeat.',
    challenge: 'Dips For Reps',
    tags: ['cork', 'basics', 'community'],
    likes: 91,
    comments: 18,
    saved: true,
    time: '42 min',
    commentPreview: 'Shauna: Weekend session here soon.'
  },
  {
    id: 'feed-003',
    userId: 'shauna-k',
    parkName: 'Dungarvan',
    fallbackArea: 'Dungarvan, Waterford',
    mediaType: 'image',
    caption: 'Low intensity day by the coast. Scap pulls, hollow holds, wrist prep. Not every session needs to be loud.',
    tags: ['mobility', 'coast', 'recovery'],
    likes: 38,
    comments: 6,
    time: '1h',
    distance: 'Waterford route'
  },
  {
    id: 'feed-004',
    userId: 'cathal-d',
    parkName: 'Tymon Park',
    fallbackArea: 'Tallaght, Dublin',
    mediaType: 'video',
    caption: 'Saturday beginners circle. Ten people, zero ego. Everyone left with one clean progression to work on.',
    challenge: 'L-sit Hold',
    tags: ['beginners', 'southside', 'session'],
    likes: 128,
    comments: 24,
    time: '2h',
    commentPreview: 'Grace: This is the energy.'
  },
  {
    id: 'feed-005',
    userId: 'orla-n',
    parkName: 'Knocknashee',
    fallbackArea: 'County Roscommon',
    mediaType: 'image',
    caption: 'Stopped off on the drive west. Small setup, good air, enough room for a proper warm-up.',
    tags: ['roadtrip', 'hidden', 'skills'],
    likes: 46,
    comments: 5,
    time: 'Yesterday'
  },
  {
    id: 'feed-006',
    userId: 'dec-o',
    parkName: 'Balgaddy',
    fallbackArea: 'Lucan, Dublin',
    mediaType: 'video',
    caption: '6:40am crew. Coffee after, wrists before, no skipped rows.',
    challenge: 'Muscle-up Ladder',
    tags: ['lucan', 'morningcrew', 'muscleup'],
    likes: 77,
    comments: 14,
    saved: true,
    time: 'Yesterday',
    distance: '1.8 km warm-up'
  },
  {
    id: 'feed-007',
    userId: 'grace-m',
    parkName: 'Smithfield Outdoor Gym',
    fallbackArea: 'Smithfield, Dublin',
    mediaType: 'image',
    caption: 'Short lunch break holds. Thirty minutes is plenty when the phone stays in the bag.',
    challenge: 'Handstand Hold',
    tags: ['city', 'holds', 'lunchbreak'],
    likes: 53,
    comments: 9,
    time: '2 days',
    commentPreview: 'Aine: Need the wrist warm-up.'
  },
  {
    id: 'feed-008',
    userId: 'jb',
    parkName: 'Tramore Valley',
    fallbackArea: 'Cork',
    mediaType: 'image',
    caption: 'Logged another verified Cork spot. Bars are solid, approach is easy, good place for a weekend circuit.',
    tags: ['verified', 'cork', 'spotcheck'],
    likes: 112,
    comments: 16,
    time: '3 days',
    distance: 'Spot check'
  }
];

function findPark(parks: Park[], name: string, fallbackArea: string) {
  return (
    parks.find(park => park.name === name) ||
    parks.find(park => park.name.toLowerCase().includes(name.toLowerCase())) ||
    parks.find(park => park.area.toLowerCase().includes(fallbackArea.toLowerCase().split(',')[0])) ||
    parks[0]
  );
}

export function getSeededFeedPosts(parks: Park[]): SocialPost[] {
  return seededPostData.reduce<SocialPost[]>((posts, post) => {
    const user = seededUsers.find(candidate => candidate.id === post.userId);
    const park = findPark(parks, post.parkName, post.fallbackArea);
    if (!user || !park) return posts;

    posts.push({
      id: post.id,
      user,
      park,
      mediaType: post.mediaType,
      caption: post.caption,
      challenge: post.challenge,
      tags: post.tags,
      likes: post.likes,
      comments: post.comments,
      saved: Boolean(post.saved),
      time: post.time,
      distance: post.distance,
      commentPreview: post.commentPreview
    });

    return posts;
  }, []);
}
