'use client';

import type { Park } from '@/types/park';

export default function ChallengesPage({ parks }: { parks: Park[] }) {
  const sourceParks = parks.slice(0, 4);
  const missions = [
    {
      title: 'Pull-Up Ladder',
      difficulty: 'Medium',
      reward: '120 rep points',
      progress: 42,
      park: sourceParks[0],
      detail: 'Build clean reps across three verified bar spots.'
    },
    {
      title: 'Hidden Spot Hunt',
      difficulty: 'Easy',
      reward: '80 rep points',
      progress: 18,
      park: sourceParks[1],
      detail: 'Find and log lesser-known outdoor training setups.'
    },
    {
      title: '5 Park Circuit',
      difficulty: 'Hard',
      reward: '240 rep points',
      progress: 64,
      park: sourceParks[2],
      detail: 'Train five locations in one week and tag each session.'
    },
    {
      title: 'Weekend Warrior',
      difficulty: 'Medium',
      reward: '150 rep points',
      progress: 28,
      park: sourceParks[3],
      detail: 'Complete two community sessions before Monday.'
    }
  ].filter(mission => mission.park);

  return (
    <main className="app-main app-page mission-page">
      <section className="section-hero">
        <div>
          <span className="page-kicker">Missions</span>
          <h1>Progress through the city</h1>
          <p>Missions turn training into exploration: complete reps, discover parks, and build a verified movement trail.</p>
        </div>
      </section>
      <div className="mission-list">
        {missions.map(mission => (
          <article className="mission-card" key={mission.title}>
            <div className="mission-card__top">
              <span>{mission.difficulty}</span>
              <b>{mission.reward}</b>
            </div>
            <h3>{mission.title}</h3>
            <p>{mission.detail}</p>
            <div className="mission-location">{mission.park.name} · {mission.park.area}</div>
            <div className="progress-track" aria-label={`${mission.progress}% progress`}>
              <div style={{ width: `${mission.progress}%` }} />
            </div>
            <button className="btn btn-primary" type="button">Join Mission</button>
          </article>
        ))}
      </div>
    </main>
  );
}
