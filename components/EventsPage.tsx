'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { Park } from '@/types/park';

export default function EventsPage({ parks }: { parks: Park[] }) {
  const [joinedSessions, setJoinedSessions] = useState<Record<string, boolean>>({});
  const [hostOpen, setHostOpen] = useState(false);
  const [hostMessage, setHostMessage] = useState('');
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

  function submitHostSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHostMessage('Session draft saved locally.');
    window.setTimeout(() => {
      setHostOpen(false);
      setHostMessage('');
    }, 1000);
  }

  return (
    <main className="app-main app-page session-page">
      <section className="section-hero">
        <div>
          <span className="page-kicker">Sessions</span>
          <h1>Train with people nearby</h1>
          <p>Sessions are lightweight meetups for bars, mobility, circuits, and local crews. Join one or host a simple training window.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setHostOpen(true)}>Host a Session</button>
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
            <button
              className={joinedSessions[title] ? 'btn btn-primary' : 'btn btn-ghost'}
              type="button"
              onClick={() => setJoinedSessions(current => ({ ...current, [title]: !current[title] }))}
            >
              {joinedSessions[title] ? 'Going' : 'Join'}
            </button>
          </article>
        ))}
      </div>
      {hostOpen && (
        <div className="sheet-backdrop" onClick={() => setHostOpen(false)}>
          <form className="action-sheet" onSubmit={submitHostSession} onClick={event => event.stopPropagation()}>
            <span className="sheet-kicker">Host session</span>
            <h3>Create a local session draft</h3>
            <div className="auth-body">
              <div className="form-field">
                <label htmlFor="host-title">Title</label>
                <input id="host-title" required placeholder="Saturday bars" />
              </div>
              <div className="form-field">
                <label htmlFor="host-location">Location</label>
                <input id="host-location" required placeholder="Park or area" />
              </div>
              <div className="form-field">
                <label htmlFor="host-time">Time</label>
                <input id="host-time" required placeholder="10:30 Saturday" />
              </div>
              {hostMessage && <p className="auth-message">{hostMessage}</p>}
              <div className="auth-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setHostOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Save Draft</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
