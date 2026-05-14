import type { Challenge, FeedPost, Meetup, Park, ParkSeed } from '@/types/park';

const samplePosts: Array<[string, string[]]> = [
  ['Hit a new PB today - 18 strict pull-ups.', ['Pull-ups']],
  ['Sunday session crew was 12 deep today. Great vibes.', ['Group']],
  ['Beginners welcome! Saturday morning intro every week at 9am. Free.', ['Beginner']],
  ['Anyone got tips for getting my first muscle-up?', ['Help']],
  ['Met some legends here today. Community is the best.', []],
  ['Hidden gem. Pop in for a quick set.', []],
  ['Anyone keen on a 6am session before work?', ['Group']],
  ['Started front-lever progression. Finally got 8s tuck hold.', ['Skills']],
  ['Free coaching for kids Sat 11am. Bring the family.', ['Kids']],
  ['Sunset session was unreal.', []]
];

const sampleUsers = [
  'Aine P',
  'Eoin K',
  'Sarah B',
  'Niamh R',
  'Tomas',
  'Rory M',
  'Lisa K',
  'Dec O',
  'Karen D',
  'Paul G',
  'Donncha',
  'Meabh',
  'Fionn',
  'Grace M',
  'Shauna',
  'Holly',
  'Adam M',
  'Cathal',
  'Jamie L',
  'Orla'
];

const sampleTimes = ['2h ago', '5h ago', 'Yesterday', '2 days ago', '3 days ago', '4 days ago', '1 week ago'];

const challengeTypes = [
  { name: 'Max Pull-ups (1 set)', unit: 'reps', baseHigh: 28 },
  { name: 'Max Dips (1 set)', unit: 'reps', baseHigh: 40 },
  { name: 'L-sit Hold', unit: 'sec', baseHigh: 35 },
  { name: 'Plank Hold', unit: 'sec', baseHigh: 250 },
  { name: 'Muscle-up Ladder', unit: 'reps', baseHigh: 9 },
  { name: 'Handstand Hold', unit: 'sec', baseHigh: 60 }
];

export function seeded(i: number) {
  return Math.abs(Math.sin(i * 9999));
}

export function hydratePark(seed: ParkSeed): Park {
  const rating = (4.0 + seeded(seed.id) * 0.9).toFixed(1);
  const members = 30 + Math.floor(seeded(seed.id + 1) * 380);
  const feed: FeedPost[] = [];
  const numPosts = 1 + Math.floor(seeded(seed.id + 2) * 4);

  for (let i = 0; i < numPosts; i += 1) {
    const post = samplePosts[Math.floor(seeded(seed.id + i * 3) * samplePosts.length)];
    feed.push({
      user: sampleUsers[Math.floor(seeded(seed.id + i * 7) * sampleUsers.length)],
      color: 1 + Math.floor(seeded(seed.id + i * 11) * 5),
      time: sampleTimes[Math.floor(seeded(seed.id + i * 13) * sampleTimes.length)],
      text: post[0],
      tags: post[1]
    });
  }

  const meetups: Meetup[] = [];
  const numMeet = Math.floor(seeded(seed.id + 20) * 3.5);
  const monthAbbrev = ['MAY', 'JUN'];
  for (let i = 0; i < numMeet; i += 1) {
    meetups.push({
      date: {
        m: monthAbbrev[Math.floor(seeded(seed.id + i * 5 + 30) * monthAbbrev.length)],
        d: 13 + Math.floor(seeded(seed.id + i * 7 + 40) * 18)
      },
      title: ['Sunday Power Session', 'Beginners Welcome', 'Skills Clinic', 'Weekend Throwdown', 'Mass Workout', 'Sunset Session'][
        Math.floor(seeded(seed.id + i * 9 + 50) * 6)
      ],
      who: sampleUsers[Math.floor(seeded(seed.id + i * 11 + 60) * sampleUsers.length)],
      going: 4 + Math.floor(seeded(seed.id + i * 13 + 70) * 30)
    });
  }

  const challenges: Challenge[] = [];
  const numCh = 1 + Math.floor(seeded(seed.id + 100) * 3);
  const used = new Set<number>();
  for (let i = 0; i < numCh; i += 1) {
    let cIdx = Math.floor(seeded(seed.id + i * 17 + 110) * challengeTypes.length);
    while (used.has(cIdx)) cIdx = (cIdx + 1) % challengeTypes.length;
    used.add(cIdx);

    const ct = challengeTypes[cIdx];
    const top = ct.baseHigh - Math.floor(seeded(seed.id + i * 19) * 6);
    const board: Array<[string, number]> = [];
    for (let j = 0; j < 4 + Math.floor(seeded(seed.id + i * 23) * 3); j += 1) {
      board.push([
        sampleUsers[Math.floor(seeded(seed.id + i * 29 + j * 31) * sampleUsers.length)],
        Math.max(1, top - j * 2 - Math.floor(seeded(seed.id + i * 33 + j * 37) * 3))
      ]);
    }
    challenges.push({ name: ct.name, unit: ct.unit, board });
  }

  return {
    ...seed,
    rating,
    members,
    feed,
    meetups,
    challenges
  };
}

export function hydrateParks(seeds: ParkSeed[]) {
  return seeds.map(hydratePark);
}
