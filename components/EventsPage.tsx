'use client';

import type { Park } from '@/types/park';

export default function EventsPage({ parks }: { parks: Park[] }) {
  const base = parks.flatMap(park => park.meetups.map(meetup => ({ park, meetup }))).slice(0, 4);
  const names = ['Sunrise Bars', 'Saturday Crew Session', 'Mobility + Dip Work', 'Sea Swim + Bars'];
  const times = ['06:45', '10:30', '18:15', '08:00'];
  const hosts = ['Aine Power', 'Rory Malone', 'Shauna Keane', 'Cathal Doyle'];
  const sessions = base.map((item, index) => ({
    ...item,
    title: names[index] || item.meetup.title,
    time: times[index] || '10:00',
    host: hosts[index] || item.meetup.who
  }));

  return (
    <main className="app-main app-page session-page">
      <section className="section-hero">
        <div>
          <span className="page-kicker">Sessions</span>
          <h1>Train with people nearby</h1>
          <p>Sessions are lightweight meetups for bars, mobility, circuits, and local crews. Join one or host a simple training window.</p>
        </div>
        <button className="btn btn-primary" type="button">Host a Session</button>
      </section>
      <div className="session-list">
        {sessions.map(({ park, meetup, title, time, host }, index) => (
          <article className="session-card" key={`${park.id}-${title}-${index}`}>
            <div className="event-date">
              <span>{meetup.date.m}</span>
              <b>{meetup.date.d}</b>
            </div>
            <div className="session-card__body">
              <span>{time} · hosted by {host}</span>
              <h3>{title}</h3>
              <p>{park.name} · {park.area}</p>
              <b>{meetup.going} going</b>
            </div>
            <button className="btn btn-ghost" type="button">Join</button>
          </article>
        ))}
      </div>
    </main>
  );
}
