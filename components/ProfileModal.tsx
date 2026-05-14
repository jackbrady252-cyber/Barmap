'use client';

import { CloseIcon } from '@/components/icons';

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  return (
    <div
      className={`modal-bg${open ? ' open' : ''}`}
      id="profileModal"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <button className="panel-close" id="closeProfile" style={{ top: 12, right: 12 }} onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="modal-head">
          <div className="avatar-lg">JB</div>
          <h3>JB</h3>
          <div className="handle">@jackbrady - Dublin</div>
        </div>
        <div className="modal-body">
          <div className="modal-stats">
            <div className="stat"><div className="v">12</div><div className="l">Parks</div></div>
            <div className="stat"><div className="v">47</div><div className="l">Posts</div></div>
            <div className="stat"><div className="v">3</div><div className="l">Wins</div></div>
          </div>
          <div className="modal-section">
            <h5>Personal Bests</h5>
            <ul>
              <li><span>Max pull-ups</span><b>22</b></li>
              <li><span>Muscle-ups (set)</span><b>5</b></li>
              <li><span>Front lever hold</span><b>9s</b></li>
              <li><span>Dip max reps</span><b>34</b></li>
            </ul>
          </div>
          <div className="modal-section" style={{ marginTop: 16 }}>
            <h5>Recent Badges</h5>
            <ul>
              <li><span>Phoenix Park Pull-up King</span><b>Mar 26</b></li>
              <li><span>30-day streak</span><b>Feb 26</b></li>
              <li><span>5 cities visited</span><b>Jan 26</b></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
