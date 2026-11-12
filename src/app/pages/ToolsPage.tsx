import { useState } from 'react';
import { Link } from 'react-router';
import { Keyboard, type KeyMark } from '../../components/Keyboard';
import { Staff } from '../../components/Staff';
import { useChordCapture, useHeldNotes } from '../../engine/input/hooks';
import { ensureAudio, playVoicings } from '../../engine/audio';
import { ENSEMBLES, ENSEMBLE_IDS, type EnsembleId } from '../../engine/orchestra/instruments';
import { ORCH_RULE_LABELS, checkOrchestralVoicing } from '../../engine/orchestra/voicingCheck';
import { detectChord, intervalNameBetween, prettyNote, spellForChord } from '../../engine/theory';
import { useMidiStatus } from '../hooks';

/** Chord identifier: play or tap notes and see the chord name, notation and intervals. */
export function ToolsPage() {
  const held = useHeldNotes();
  const midi = useMidiStatus();
  const [latched, setLatched] = useState<number[]>([]);
  const [flats, setFlats] = useState(false);
  const [sound, setSound] = useState<EnsembleId>('piano');

  useChordCapture((notes) => setLatched(notes));
  // while MIDI keys are down show them live; otherwise show the last captured / tapped chord
  const notes = midi.enabled && held.length >= 2 ? held : latched;
  const sorted = [...new Set(notes)].sort((a, b) => a - b);
  const names = spellForChord(sorted, flats);
  const chords = detectChord(sorted, flats);
  const marks: Record<number, KeyMark> = {};
  for (const m of sorted) marks[m] = 'selected';

  const toggle = (m: number) => setLatched((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m].sort((a, b) => a - b)));

  return (
    <div className="page tools" onPointerDown={() => void ensureAudio()}>
      <h1>Tools</h1>
      <nav className="tool-links">
        <Link to="/tools/playground" className="tool-link">
          <b>🎼 Progression playground</b>
          <span>Type numerals or chord symbols, hear them voiced in four parts, check the voice leading, export MIDI to your DAW.</span>
        </Link>
        <Link to="/tools/connect" className="tool-link">
          <b>🔀 Passing-chord explorer</b>
          <span>Pick two chords and hear every classic way to connect them, from secondary dominants to chromatic mediants.</span>
        </Link>
        <Link to="/tools/motif" className="tool-link">
          <b>🧬 Motif transformer</b>
          <span>Turn a leitmotif into its variations: other modes, inversion, augmentation, fragmentation, and reharmonized.</span>
        </Link>
      </nav>
      <section className="card">
        <h2>Chord identifier</h2>
        <p className="muted">
          Play a chord on your MIDI keyboard{midi.enabled ? '' : ' (enable in Settings)'} or tap keys below. Shows the chord name, notation and intervals above the bass —
          handy for figuring out what you just improvised.
        </p>
        <div className="chord-readout">
          <div className="chord-names">
            {chords.length ? (
              <>
                <span className="chord-name">{chords[0]}</span>
                {chords.slice(1, 4).map((c) => (
                  <span key={c} className="alt">
                    {c}
                  </span>
                ))}
              </>
            ) : (
              <span className="muted">{sorted.length < 2 ? 'Play or tap 2+ notes' : 'No common chord name'}</span>
            )}
          </div>
          {/* Fixed-size body: staff is always drawn (empty when no notes), intervals box has a fixed height */}
          <div className="readout-body">
            <Staff clef="grand" notes={names.join(',')} chord maxWidth={260} />
            <ul className="intervals">
              {sorted.length === 0 && <li className="muted">Intervals above the bass appear here</li>}
              {sorted.length > 0 && (
                <li>
                  <b>{prettyNote(names[0], true)}</b> <span className="muted">bass</span>
                </li>
              )}
              {sorted.slice(1).map((m, i) => {
                let label: string;
                try {
                  label = intervalNameBetween(names[0], names[i + 1]);
                } catch {
                  label = `${m - sorted[0]} semitones`;
                }
                return (
                  <li key={m}>
                    <b>{prettyNote(names[i + 1], true)}</b> <span className="muted">{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <Keyboard from={36} to={84} marks={marks} onKey={toggle} compact />
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setLatched([])} disabled={!latched.length}>
            Clear
          </button>
          <button type="button" className="btn ghost" onClick={() => void playVoicings([sorted], sound, 2.4)} disabled={!sorted.length}>
            ▶ Play
          </button>
          <select className="sound-select" value={sound} onChange={(e) => setSound(e.target.value as EnsembleId)} aria-label="Sound">
            {ENSEMBLE_IDS.map((id) => (
              <option key={id} value={id}>
                {ENSEMBLES[id].name}
              </option>
            ))}
          </select>
          <label className="toggle">
            <input type="checkbox" checked={flats} onChange={(e) => setFlats(e.target.checked)} /> Prefer flats
          </label>
        </div>
        {sorted.length >= 3 && <VoicingReport notes={sorted} />}
      </section>
      <section className="card muted-card">
        <h2>Coming next</h2>
        <ul>
          <li>Optional AI tutor for questions about your own music</li>
          <li>Sight-singing with microphone pitch detection</li>
        </ul>
      </section>
    </div>
  );
}

/** Orchestral voicing check of the chord on the keyboard (mud, holes, spacing). */
function VoicingReport({ notes }: { notes: number[] }) {
  const issues = checkOrchestralVoicing(notes);
  return (
    <div className="voicing-report">
      <h3>Orchestral voicing check</h3>
      <ul className="chorale-issues">
        {issues.length === 0 && <li className="ok">✓ Clear: wide intervals low, close intervals high</li>}
        {issues.map((i, k) => (
          <li key={k} className={`issue-${i.severity}`}>
            {i.severity === 'error' ? '✗' : '⚠'} {ORCH_RULE_LABELS[i.rule]}: {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
