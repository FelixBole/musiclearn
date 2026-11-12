import { useState } from 'react';
import { playArpeggioThenChord, playChord, playEvents, playMelody, playProgression, type PlayEvent } from '../engine/audio';
import { toMidi } from '../engine/theory';

export type PlayMode = 'chord' | 'melody' | 'arpeggio' | 'progression' | 'harmonic';

export interface PlayProps {
  /** "C4 E4 G4" for melody/chord; "C4,E4,G4 F4,A4,C5" for progression */
  notes?: string;
  midis?: number[];
  events?: PlayEvent[];
  mode?: PlayMode;
  label?: string;
  tempo?: number; // seconds per note/chord
  className?: string;
  big?: boolean;
}

export function playByMode(notes: string, mode: PlayMode, tempo?: number) {
  if (mode === 'progression') {
    const chords = notes.trim().split(/\s+/).map((g) => g.split(',').map(toMidi));
    return playProgression(chords, tempo ?? 1.1);
  }
  const midis = notes.trim().split(/[\s,]+/).map(toMidi);
  if (mode === 'chord' || mode === 'harmonic') return playChord(midis, tempo ?? 1.6);
  if (mode === 'arpeggio') return playArpeggioThenChord(midis, tempo ?? 0.45);
  return playMelody(midis, tempo ?? 0.6);
}

/** A play button usable in lessons and exercises. */
export function Play({ notes, midis, events, mode = 'melody', label, tempo, className, big }: PlayProps) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      if (events) await playEvents(events);
      else if (midis) await (mode === 'chord' ? playChord(midis, tempo) : playMelody(midis, tempo));
      else if (notes) await playByMode(notes, mode, tempo);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={`play-btn ${big ? 'big' : ''} ${busy ? 'busy' : ''} ${className ?? ''}`} onClick={run}>
      <span className="play-icon" aria-hidden>
        {busy ? '♪' : '▶'}
      </span>
      {label ?? 'Play'}
    </button>
  );
}
