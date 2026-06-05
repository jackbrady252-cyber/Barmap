'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { CloseIcon } from '@/components/icons';
import type { MissionSubmission } from '@/types/activity';
import type { Park } from '@/types/park';

type Mission = {
  title: string;
  difficulty: string;
  reward: string;
  park: Park;
  detail: string;
  resultLabel: string;
};

type ChallengesPageProps = {
  parks: Park[];
  submissions: MissionSubmission[];
  canInteract: boolean;
  onRestrictedAction: () => void;
  onSubmitMission: (submission: Omit<MissionSubmission, 'id' | 'verificationStatus' | 'createdAt'>) => void;
};

export default function ChallengesPage({ parks, submissions, canInteract, onRestrictedAction, onSubmitMission }: ChallengesPageProps) {
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [result, setResult] = useState('');
  const [videoProof, setVideoProof] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const sourceParks = parks.slice(0, 4);
  const missions: Mission[] = [
    {
      title: 'Pull-Up Ladder',
      difficulty: 'Medium',
      reward: '120 rep points',
      park: sourceParks[0],
      detail: 'Submit your clean max-rep pull-up set with video proof.',
      resultLabel: 'Result, e.g. 20 pull-ups'
    },
    {
      title: 'Hidden Spot Hunt',
      difficulty: 'Easy',
      reward: '80 rep points',
      park: sourceParks[1],
      detail: 'Find a verified outdoor setup and submit a short proof clip.',
      resultLabel: 'Result, e.g. 1 verified spot'
    },
    {
      title: '5 Park Circuit',
      difficulty: 'Hard',
      reward: '240 rep points',
      park: sourceParks[2],
      detail: 'Complete a circuit across five parks and submit route proof.',
      resultLabel: 'Result, e.g. 5 parks completed'
    },
    {
      title: 'Weekend Warrior',
      difficulty: 'Medium',
      reward: '150 rep points',
      park: sourceParks[3],
      detail: 'Complete two weekend sessions and submit proof from each.',
      resultLabel: 'Result, e.g. 2 sessions completed'
    }
  ].filter(mission => mission.park);
  const approvedSubmissions = submissions.filter(submission => submission.verificationStatus === 'approved');

  function openMission(mission: Mission) {
    if (!canInteract) {
      onRestrictedAction();
      return;
    }

    setActiveMission(mission);
    setResult('');
    setVideoProof(null);
    setMessage('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeMission) return;
    if (!canInteract) {
      onRestrictedAction();
      return;
    }
    if (!videoProof) {
      setMessage('Video proof is required before a mission can be submitted.');
      return;
    }

    onSubmitMission({
      missionTitle: activeMission.title,
      result: result.trim(),
      videoProofName: videoProof.name
    });
    setMessage('Pending Review');
    window.setTimeout(() => setActiveMission(null), 700);
  }

  return (
    <main className="app-main app-page mission-page">
      <section className="section-hero">
        <div>
          <span className="page-kicker">Missions</span>
          <h1>Submit proof. Get verified. Climb the board.</h1>
          <p>Missions are proof-based challenges. Upload video, wait for review, and only approved results reach the leaderboard.</p>
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
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => openMission(mission)}
            >
              Submit Proof
            </button>
          </article>
        ))}
      </div>
      <section className="mission-leaderboard">
        <span className="page-kicker">Verified leaderboard</span>
        {approvedSubmissions.length > 0 ? (
          approvedSubmissions.map(submission => (
            <article className="compact-card" key={submission.id}>
              <div>
                <h3>{submission.missionTitle}</h3>
                <p>{submission.result}</p>
              </div>
              <div className="score-pill">Approved</div>
            </article>
          ))
        ) : (
          <div className="premium-empty compact">
            <b>No verified results yet</b>
            <span>Pending submissions stay private until reviewed.</span>
          </div>
        )}
      </section>
      {activeMission && (
        <div className="modal-bg open" onClick={event => {
          if (event.target === event.currentTarget) setActiveMission(null);
        }}>
          <form className="modal auth-modal" onSubmit={submit}>
            <button className="panel-close" type="button" aria-label="Close mission submission" onClick={() => setActiveMission(null)}>
              <CloseIcon />
            </button>
            <div className="modal-head">
              <h3>{activeMission.title}</h3>
              <div className="handle">Video proof required · status starts as Pending Review</div>
            </div>
            <div className="auth-body modal-body">
              <div className="form-field">
                <label htmlFor="mission-result">Result</label>
                <input
                  id="mission-result"
                  value={result}
                  onChange={event => setResult(event.target.value)}
                  placeholder={activeMission.resultLabel}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="mission-video">Video proof</label>
                <input
                  id="mission-video"
                  type="file"
                  accept="video/*"
                  onChange={event => setVideoProof(event.target.files?.[0] || null)}
                  required
                />
              </div>
              <p className="form-help">Results without video proof cannot be submitted or shown on leaderboards.</p>
              {message && <p className="auth-message">{message}</p>}
              <div className="auth-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setActiveMission(null)}>Cancel</button>
                <button className="btn btn-primary" type="submit">Submit for Review</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
