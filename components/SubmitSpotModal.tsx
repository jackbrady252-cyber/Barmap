'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { createSubmittedSpot, equipmentFromInput } from '@/lib/submissions';

type SubmitSpotModalProps = {
  pickedLatLng: {
    lat: number;
    lng: number;
  } | null;
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

export default function SubmitSpotModal({ pickedLatLng, onClose, onSaved }: SubmitSpotModalProps) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (pickedLatLng) setForm(initialForm);
  }, [pickedLatLng]);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pickedLatLng) return;

    const equipment = equipmentFromInput(form.equipment);
    if (!form.name.trim() || !form.area.trim() || equipment.length === 0) return;

    await createSubmittedSpot({
      name: form.name.trim(),
      area: form.area.trim(),
      equipment,
      hiddenLevel: form.hiddenLevel,
      bestTime: form.bestTime.trim(),
      notes: form.notes.trim(),
      lat: pickedLatLng.lat,
      lng: pickedLatLng.lng
    });

    onClose();
    onSaved();
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
              <label htmlFor="spotArea">Area</label>
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
              <label htmlFor="spotEquipment">Equipment</label>
              <input
                id="spotEquipment"
                required
                maxLength={160}
                placeholder="Pull-up bars, dip bars, rings..."
                value={form.equipment}
                onChange={event => updateField('equipment', event.target.value)}
              />
            </div>
            <div className="form-field full">
              <label htmlFor="bestTime">Best time to train</label>
              <input
                id="bestTime"
                maxLength={100}
                placeholder="e.g. Early morning; quiet after 7pm"
                value={form.bestTime}
                onChange={event => updateField('bestTime', event.target.value)}
              />
            </div>
            <div className="form-field full">
              <label htmlFor="spotNotes">Notes</label>
              <textarea
                id="spotNotes"
                maxLength={500}
                placeholder="Condition, how to find it, lighting, ground surface, nearby parking..."
                value={form.notes}
                onChange={event => updateField('notes', event.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" id="cancelHiddenSpot" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              Save for review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
