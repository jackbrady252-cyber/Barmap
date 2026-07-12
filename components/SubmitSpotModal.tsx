'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import type { User } from '@supabase/supabase-js';
import { filesToMedia, revokeMediaPreviews, type SelectedMediaFile } from '@/lib/media';
import { createSubmittedSpot, equipmentFromInput, uploadSubmissionMediaFiles } from '@/lib/submissions';

type SubmitSpotModalProps = {
  pickedLatLng: {
    lat: number;
    lng: number;
  } | null;
  canSubmit: boolean;
  user: User | null;
  onRestrictedAction: () => void;
  onClose: () => void;
  onSaved: () => void;
};

const initialForm = {
  name: '',
  area: '',
  hiddenLevel: 'Easy to find',
  equipment: '',
  bestTime: '',
  notes: ''
};

export default function SubmitSpotModal({ pickedLatLng, canSubmit, user, onRestrictedAction, onClose, onSaved }: SubmitSpotModalProps) {
  const [form, setForm] = useState(initialForm);
  const [media, setMedia] = useState<SelectedMediaFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  useEffect(() => {
    if (pickedLatLng) {
      setForm(initialForm);
      setMedia(current => {
        revokeMediaPreviews(current);
        return [];
      });
      setError('');
      setProgress('');
    }
  }, [pickedLatLng]);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pickedLatLng) return;
    if (!canSubmit) {
      onRestrictedAction();
      return;
    }
    if (!user) {
      setError('Log in to submit a park.');
      return;
    }

    const equipment = equipmentFromInput(form.equipment);
    if (!form.name.trim() || !form.area.trim() || media.length === 0) {
      setError('Park name, location, and at least one photo or video are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setProgress(`Uploading 0/${media.length}`);
      const mediaUrls = await uploadSubmissionMediaFiles(user.id, media, (completed, total) => {
        setProgress(`Uploading ${completed}/${total}`);
      });
      await createSubmittedSpot({
        name: form.name.trim(),
        area: form.area.trim(),
        equipment,
        hiddenLevel: form.hiddenLevel,
        bestTime: form.bestTime.trim(),
        notes: form.notes.trim(),
        photoUrl: mediaUrls[0],
        mediaUrls,
        lat: pickedLatLng.lat,
        lng: pickedLatLng.lng
      });

      onClose();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Park submission failed.');
    } finally {
      setSaving(false);
    }
  }

  function addMedia(files: FileList | null) {
    if (!files) return;
    const next = filesToMedia(files);
    setError(next.errors.join(' '));
    setMedia(current => [...current, ...next.media].slice(0, 8));
  }

  function removeMedia(id: string) {
    setMedia(current => {
      const target = current.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter(item => item.id !== id);
    });
  }

  return (
    <div className={`modal-bg${pickedLatLng ? ' open' : ''}`} id="hiddenSpotModal" onClick={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="modal">
        <button className="panel-close" id="closeHiddenSpot" style={{ top: 12, right: 12 }} type="button" onClick={onClose}>
          <CloseIcon />
        </button>
        <div className="modal-head">
          <h3>Submit a Park</h3>
          <div className="handle">Pin the bars. It stays off the public map until verified.</div>
        </div>
        <form className="spot-form" id="hiddenSpotForm" onSubmit={submit}>
          <div className="form-help">
            Location selected:{' '}
            <span className="map-coordinate" id="spotCoordinate">
              {pickedLatLng ? `${pickedLatLng.lat.toFixed(5)}, ${pickedLatLng.lng.toFixed(5)}` : 'Pick a point on the map'}
            </span>
          </div>
          <div className="form-grid">
            <div className="form-field full">
              <label htmlFor="spotName">Spot name</label>
              <input
                id="spotName"
                required
                maxLength={80}
                placeholder="e.g. Quiet pull-up bars behind the pitches"
                value={form.name}
                onChange={event => updateField('name', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="spotArea">Area / location</label>
              <input
                id="spotArea"
                required
                maxLength={80}
                placeholder="e.g. Rathmines, Dublin"
                value={form.area}
                onChange={event => updateField('area', event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="hiddenLevel">Hidden level</label>
              <select id="hiddenLevel" required value={form.hiddenLevel} onChange={event => updateField('hiddenLevel', event.target.value)}>
                <option value="Easy to find">Easy to find</option>
                <option value="Tucked away">Tucked away</option>
                <option value="Local knowledge">Local knowledge</option>
                <option value="Hard to spot">Hard to spot</option>
              </select>
            </div>
            <div className="form-field full">
              <label htmlFor="spotEquipment">Equipment optional</label>
              <input
                id="spotEquipment"
                maxLength={160}
                placeholder="Pull-up bars, dip bars, rings..."
                value={form.equipment}
                onChange={event => updateField('equipment', event.target.value)}
              />
            </div>
            <div className="form-field full">
              <label htmlFor="bestTime">Best time to train optional</label>
              <input
                id="bestTime"
                maxLength={100}
                placeholder="e.g. Early morning; quiet after 7pm"
                value={form.bestTime}
                onChange={event => updateField('bestTime', event.target.value)}
              />
            </div>
            <div className="form-field full">
              <label htmlFor="spotPhoto">Photo or video proof</label>
              <input
                id="spotPhoto"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
                capture="environment"
                multiple
                required
                onChange={event => addMedia(event.target.files)}
              />
            </div>
            {media.length > 0 && (
              <div className="media-preview-grid full">
                {media.map(item => (
                  <div className="media-preview" key={item.id}>
                    {item.mediaType === 'image' ? (
                      <img src={item.previewUrl} alt="" />
                    ) : (
                      <video src={item.previewUrl} muted playsInline />
                    )}
                    <button type="button" onClick={() => removeMedia(item.id)} aria-label={`Remove ${item.file.name}`}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="form-field full">
              <label htmlFor="spotNotes">Notes optional</label>
              <textarea
                id="spotNotes"
                maxLength={500}
                placeholder="Condition, how to find it, lighting, ground surface, nearby parking..."
                value={form.notes}
                onChange={event => updateField('notes', event.target.value)}
              />
            </div>
          </div>
          {progress && <p className="form-help">{progress}</p>}
          {error && <p className="auth-message">{error}</p>}
          <div className="form-actions">
            <button className="btn btn-ghost" id="cancelHiddenSpot" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Submitting...' : canSubmit ? 'Submit for review' : 'Sign in required'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
