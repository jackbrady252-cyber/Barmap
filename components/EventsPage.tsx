'use client';

import { useState } from 'react';
import type { TrainingSession } from '@/lib/sessions';
import type { Park } from '@/types/park';

export default function EventsPage({
  parks,
  sessions,
  canInteract,
  onRestrictedAction,
  onCreateSession
}: {
  parks: Park[];
  sessions: TrainingSession[];
  canInteract: boolean;
  onRestrictedAction: () => void;
  onCreateSession: () => void;
}) {
  const [joinedSessions, setJoinedSessions] = useState<Record<string, boolean>>({});
  const base = parks.flatMap(park => park.meetups.map(meetup => ({ park, meetup }))).slice(0, 4);
  const names = ['Sunrise Bars', 'Saturday Crew Session', 'Mobility + Dip Work', 'Sea Swim + Bars'];
  const times = ['06:45', '10:30', '18:15', '08:00'];
  const hosts = ['Aine Power', 'Rory Malone', 'Shauna Keane', 'Cathal Doyle'];
  const seededSessions = base.map((item, index) => ({
    ...item,
    title: names[index] || item.meetup.title,
    time: times[index] || '10:00',
    host: hosts[index] || item.meetup.who
  }));

  const persistedSessions = sessions.map(session => ({
    id: session.id,
    title: session.title,
    parkName: session.parkName,
    parkArea: session.parkArea,
    host: 'Community host',
    timeLabel: formatSessionTime(session.startAt, session.endAt),
    date: formatSessionDate(session.startAt),
    going: session.participantLimit ? `${session.participantLimit} max` : 'Open crew'
  }));

  return (
    <main className="app-main app-page session-page">
      <section className="section-hero">
        <div>
          <span className="page-kicker">Sessions</span>
          <h1>Train with people nearby</h1>
          <p>Sessions are lightweight meetups for bars, mobility, circuits, and local crews. Join one or host a simple training window.</p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            if (!canInteract) {
              onRestrictedAction();
              return;
            }
            onCreateSession();
          }}
        >
          Use Create tab to host
        </button>
      </section>
      <div className="session-list">
        {persistedSessions.map(session => (
          <article className="session-card" key={session.id}>
            <div className="event-date">
              <span>{session.date.month}</span>
              <b>{session.date.day}</b>
            </div>
            <div className="session-card__body">
              <span>{session.timeLabel} · {session.host}</span>
              <h3>{session.title}</h3>
              <p>{session.parkName} · {session.parkArea}</p>
              <b>{session.going}</b>
            </div>
            <button
              className={joinedSessions[session.id] ? 'btn btn-primary' : 'btn btn-ghost'}
              type="button"
              onClick={() => {
                if (!canInteract) {
                  onRestrictedAction();
                  return;
                }
                setJoinedSessions(current => ({ ...current, [session.id]: !current[session.id] }));
              }}
            >
              {joinedSessions[session.id] ? 'Going' : 'Join'}
            </button>
          </article>
        ))}
        {seededSessions.map(({ park, meetup, title, time, host }, index) => (
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
              onClick={() => {
                if (!canInteract) {
                  onRestrictedAction();
                  return;
                }
                setJoinedSessions(current => ({ ...current, [title]: !current[title] }));
              }}
            >
              {joinedSessions[title] ? 'Going' : 'Join'}
            </button>
          </article>
        ))}
        {persistedSessions.length === 0 && seededSessions.length === 0 && (
          <div className="premium-empty">
            <b>No upcoming sessions yet</b>
            <span>Use the Create tab to host the first local training window.</span>
          </div>
        )}
      </div>
    </main>
  );
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.getDate()
  };
}

function formatSessionTime(start: string, end: string) {
  const startLabel = new Date(start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (!end) return startLabel;
  const endLabel = new Date(end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${startLabel} - ${endLabel}`;
}
