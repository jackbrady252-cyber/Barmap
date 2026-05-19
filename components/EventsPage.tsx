'use client';

import type { Park } from '@/types/park';

export default function EventsPage({ parks }: { parks: Park[] }) {
  const events = parks.flatMap(park => park.meetups.map(meetup => ({ park, meetup }))).slice(0, 8);

  return (
    <main className="app-main app-page">
      <div className="page-kicker">Sessions</div>
      <h1>Sessions near the bars</h1>
      <div className="compact-list">
        {events.map(({ park, meetup }, index) => (
          <article className="compact-card" key={`${park.id}-${meetup.title}-${index}`}>
            <div className="event-date">
              <span>{meetup.date.m}</span>
              <b>{meetup.date.d}</b>
            </div>
            <div>
              <h3>{meetup.title}</h3>
              <p>{park.name} - {meetup.going} going</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
