'use client';

export default function ProfilePage() {
  return (
    <main className="app-main app-page profile-page">
      <div className="profile-hero">
        <div className="avatar profile-avatar">JB</div>
        <h1>JB</h1>
        <p>@jackbrady - Dublin</p>
      </div>
      <div className="profile-grid">
        <div><b>12</b><span>Parks</span></div>
        <div><b>47</b><span>Posts</span></div>
        <div><b>3</b><span>Wins</span></div>
      </div>
      <section className="profile-section">
        <h3>Personal bests</h3>
        <div className="compact-card"><span>Max pull-ups</span><b>22</b></div>
        <div className="compact-card"><span>Muscle-ups</span><b>5</b></div>
        <div className="compact-card"><span>Front lever</span><b>9s</b></div>
      </section>
    </main>
  );
}
