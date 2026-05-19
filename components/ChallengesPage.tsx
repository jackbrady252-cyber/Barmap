'use client';

import type { Park } from '@/types/park';

export default function ChallengesPage({ parks }: { parks: Park[] }) {
  const challenges = parks.flatMap(park => park.challenges.slice(0, 1).map(challenge => ({ park, challenge }))).slice(0, 8);

  return (
    <main className="app-main app-page">
      <div className="page-kicker">Missions</div>
      <h1>Underground missions</h1>
      <div className="compact-list">
        {challenges.map(({ park, challenge }) => (
          <article className="compact-card" key={`${park.id}-${challenge.name}`}>
            <div>
              <h3>{challenge.name}</h3>
              <p>{park.name}</p>
            </div>
            <div className="score-pill">{challenge.board[0]?.[1]} {challenge.unit}</div>
          </article>
        ))}
      </div>
    </main>
  );
}
