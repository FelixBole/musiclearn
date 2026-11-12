import { useEffect, useRef, useState } from 'react';
import { Staff, type StaffItem } from '../components/Staff';
import { Keyboard, type KeyMark } from '../components/Keyboard';
import { playChord, playEvents, playMelody, playProgression } from '../engine/audio';
import { useChordCapture, useNoteEvents } from '../engine/input/hooks';
import {
  chordQualityById,
  intervalById,
  keyName,
  noteToString,
  parseNote,
  prettyPc,
  toMidi,
  type Letter,
} from '../engine/theory';
import {
  DEGREES,
  cadenceChords,
  checkChordEar,
  checkChordPlayed,
  checkChordSpelled,
  checkDegree,
  checkIntervalEar,
  checkIntervalReading,
  checkKeySig,
  checkNoteName,
  checkNotePlayed,
  chordSymbol,
  intervalEarNotes,
  type ChordEarQ,
  type ChordSpellQ,
  type DegreeEarQ,
  type IntervalEarQ,
  type IntervalReadQ,
  type KeySigQ,
  type NoteReadingQ,
  type SightReadQ,
} from './logic';
import type { ExerciseViewProps } from './types';
import { ChoiceGrid, NoteNamePad } from './widgets';

const KB_RANGE: Record<string, [number, number]> = {
  treble: [57, 84],
  bass: [36, 64],
  alto: [48, 72],
  tenor: [45, 69],
  grand: [41, 79],
};

/* -------------------------- Note reading -------------------------- */

export function NoteReadingView({ q, answered, onResult, settings }: ExerciseViewProps<NoteReadingQ>) {
  const answer = (r: ReturnType<typeof checkNoteName>) => {
    onResult(r);
    void playMelody([toMidi(q.note)], 0.9);
  };
  useNoteEvents((e) => {
    if (e.type === 'on' && !answered) {
      onResult(checkNotePlayed(q, e.midi));
    }
  }, !answered);
  const [lo, hi] = KB_RANGE[q.clef];
  const marks: Record<number, KeyMark> = answered ? { [toMidi(q.note)]: 'correct' } : {};
  return (
    <div className="ex">
      <p className="prompt">Name this note{settings.showKeyboard || settings.midiEnabled ? ' — or play it at the right octave' : ''}.</p>
      <Staff clef={q.clef} notes={q.note} maxWidth={260} scale={1.3} />
      <NoteNamePad accidentals={q.accidentals} disabled={!!answered} onNote={(l, a) => answer(checkNoteName(q, l, a))} />
      {settings.showKeyboard && <Keyboard from={lo} to={hi} marks={marks} compact />}
    </div>
  );
}

/* -------------------------- Key signatures -------------------------- */

export function KeySigView({ q, answered, onResult }: ExerciseViewProps<KeySigQ>) {
  return (
    <div className="ex">
      <p className="prompt">Which {q.minor ? 'minor' : 'major'} key has this signature?</p>
      <Staff clef={q.clef} keySig={q.majorTonic} maxWidth={300} scale={1.3} />
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: keyName(o, q.minor) }))}
        correctValue={q.answer}
        answered={answered}
        onPick={(v) => onResult(checkKeySig(q, v))}
        columns={3}
      />
    </div>
  );
}

/* -------------------------- Interval ear -------------------------- */

function usePlayOnQuestion(play: () => void, q: unknown) {
  const ref = useRef(play);
  ref.current = play;
  useEffect(() => {
    const t = setTimeout(() => ref.current(), 250);
    return () => clearTimeout(t);
  }, [q]);
}

function playInterval(q: IntervalEarQ) {
  const [a, b] = intervalEarNotes(q);
  return q.direction === 'harm' ? playChord([a, b], 1.8) : playMelody([a, b], 0.75);
}

export function IntervalEarView({ q, answered, onResult }: ExerciseViewProps<IntervalEarQ>) {
  usePlayOnQuestion(() => void playInterval(q), q);
  const dirLabel = { asc: 'ascending', desc: 'descending', harm: 'harmonic' }[q.direction];
  return (
    <div className="ex">
      <p className="prompt">Which interval? <span className="muted">({dirLabel})</span></p>
      <div className="row center">
        <button type="button" className="play-btn big" onClick={() => void playInterval(q)}>
          ▶ Replay
        </button>
        {q.direction !== 'harm' && (
          <button type="button" className="play-btn" onClick={() => void playChord(intervalEarNotes(q), 1.6)}>
            Together
          </button>
        )}
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: intervalById(o).name, sub: `${intervalById(o).semitones} st` }))}
        correctValue={q.interval}
        answered={answered}
        onPick={(v) => onResult(checkIntervalEar(q, v))}
        columns={q.options.length > 6 ? 3 : 2}
      />
    </div>
  );
}

/* -------------------------- Chord ear -------------------------- */

export function ChordEarView({ q, answered, onResult }: ExerciseViewProps<ChordEarQ>) {
  usePlayOnQuestion(() => void playChord(q.midis, 1.8), q);
  return (
    <div className="ex">
      <p className="prompt">What quality is this chord?</p>
      <div className="row center">
        <button type="button" className="play-btn big" onClick={() => void playChord(q.midis, 1.8)}>
          ▶ Replay
        </button>
        <button type="button" className="play-btn" onClick={() => void playMelody(q.midis, 0.4)}>
          Arpeggiate
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: chordQualityById(o).name }))}
        correctValue={q.quality}
        answered={answered}
        onPick={(v) => onResult(checkChordEar(q, v))}
        columns={q.options.length > 4 ? 3 : 2}
      />
    </div>
  );
}

/* -------------------------- Interval reading -------------------------- */

export function IntervalReadingView({ q, answered, onResult }: ExerciseViewProps<IntervalReadQ>) {
  return (
    <div className="ex">
      <p className="prompt">{q.withQuality ? 'Name the interval (quality + size)' : 'What size is this interval?'}</p>
      <Staff
        clef={q.clef}
        items={[{ keys: [q.lower], duration: 'h' }, { keys: [q.upper], duration: 'h' }]}
        maxWidth={300}
        scale={1.3}
      />
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: o }))}
        correctValue={q.answer}
        answered={answered}
        onPick={(v) => {
          onResult(checkIntervalReading(q, v));
          void playMelody([toMidi(q.lower), toMidi(q.upper)], 0.7);
        }}
        columns={q.options.length > 5 ? 4 : 3}
      />
    </div>
  );
}

/* -------------------------- Chord spelling -------------------------- */

export function ChordSpellingView({ q, answered, onResult, settings }: ExerciseViewProps<ChordSpellQ>) {
  const [mode, setMode] = useState<'play' | 'spell'>(settings.mobileMode ? 'spell' : 'play');
  const [selected, setSelected] = useState<number[]>([]);
  const [spelled, setSpelled] = useState<string[]>([]);

  useEffect(() => {
    setSelected([]);
    setSpelled([]);
  }, [q]);

  const finish = (r: ReturnType<typeof checkChordPlayed>) => {
    onResult(r);
    void playChord(q.voicing.map(toMidi), 1.8);
  };

  useChordCapture((notes) => {
    if (!answered && mode === 'play' && notes.length >= 2) {
      setSelected(notes);
      finish(checkChordPlayed(q, notes));
    }
  }, !answered && mode === 'play');

  const marks: Record<number, KeyMark> = {};
  for (const m of selected) marks[m] = 'selected';
  if (answered) for (const n of q.voicing) marks[toMidi(n)] = 'correct';

  return (
    <div className="ex">
      <p className="prompt">
        Build <span className="chord-name">{chordSymbol(q.root, q.quality)}</span>
        <span className="muted"> ({prettyPc(q.root)} {chordQualityById(q.quality).name.toLowerCase()})</span>
      </p>
      <div className="segmented small">
        <button type="button" className={mode === 'play' ? 'active' : ''} onClick={() => setMode('play')}>
          🎹 Play it
        </button>
        <button type="button" className={mode === 'spell' ? 'active' : ''} onClick={() => setMode('spell')}>
          ✎ Spell it
        </button>
      </div>
      {mode === 'play' ? (
        <>
          <p className="hint">Play the chord on your MIDI keyboard (any voicing), or tap the keys below and press Check.</p>
          <Keyboard
            from={48}
            to={76}
            marks={marks}
            compact
            onKey={(m) => !answered && setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}
          />
          {!answered && (
            <div className="row center">
              <button type="button" className="btn ghost" onClick={() => setSelected([])} disabled={!selected.length}>
                Clear
              </button>
              <button type="button" className="btn" disabled={selected.length < 2} onClick={() => finish(checkChordPlayed(q, selected))}>
                Check
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="hint">Spell the chord tones (root first is fine, any order accepted). Spelling matters: E♭ ≠ D♯ here.</p>
          <div className="spelled">{spelled.length ? spelled.map(prettyPc).join(' – ') : <span className="muted">…</span>}</div>
          <NoteNamePad
            accidentals
            disabled={!!answered}
            onNote={(l: Letter, a: number) => setSpelled((s) => [...s, `${l}${a > 0 ? '#'.repeat(a) : 'b'.repeat(-a)}`])}
          />
          {!answered && (
            <div className="row center">
              <button type="button" className="btn ghost" onClick={() => setSpelled((s) => s.slice(0, -1))} disabled={!spelled.length}>
                Undo
              </button>
              <button type="button" className="btn" disabled={spelled.length < 3} onClick={() => finish(checkChordSpelled(q, spelled))}>
                Check
              </button>
            </div>
          )}
        </>
      )}
      {answered && <Staff notes={q.voicing.join(',')} chord maxWidth={220} />}
    </div>
  );
}

/* -------------------------- Sight-reading -------------------------- */

export function SightReadingView({ q, answered, onResult }: ExerciseViewProps<SightReadQ>) {
  const [idx, setIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const started = useRef<number>(Date.now());

  useEffect(() => {
    setIdx(0);
    setMistakes(0);
    setWrong(null);
    started.current = Date.now();
  }, [q]);

  useNoteEvents((e) => {
    if (e.type !== 'on' || answered || idx >= q.notes.length) return;
    if (e.midi === toMidi(q.notes[idx])) {
      setWrong(null);
      const next = idx + 1;
      setIdx(next);
      if (next === q.notes.length) {
        const secs = Math.round((Date.now() - started.current) / 100) / 10;
        onResult({
          correct: mistakes === 0,
          expected: 'all notes without mistakes',
          feedback: `${mistakes === 0 ? 'Clean run!' : `${mistakes} wrong key${mistakes > 1 ? 's' : ''}.`} ${secs}s (${(secs / q.notes.length).toFixed(1)}s per note).`,
        });
      }
    } else {
      setMistakes((m) => m + 1);
      setWrong(e.midi);
    }
  }, !answered);

  const items: StaffItem[] = q.notes.map((n, i) => ({
    keys: [n],
    color: i < idx ? '#2e9d5b' : i === idx ? '#2f6fd6' : undefined,
  }));
  const [lo, hi] = KB_RANGE[q.clef];
  const marks: Record<number, KeyMark> = wrong !== null ? { [wrong]: 'wrong' } : {};
  return (
    <div className="ex">
      <p className="prompt">
        Play the notes left to right <span className="muted">({idx}/{q.notes.length}{mistakes ? ` · ${mistakes} miss` : ''})</span>
      </p>
      <Staff clef={q.clef} keySig={q.keySig === 'C' ? undefined : q.keySig} items={items} maxWidth={520} />
      <Keyboard from={lo} to={hi} marks={marks} compact />
    </div>
  );
}

/* -------------------------- Scale degrees -------------------------- */

async function playDegreeQuestion(q: DegreeEarQ) {
  await playProgression(cadenceChords(q.tonic, q.minor), 0.8);
  await new Promise((r) => setTimeout(r, 300));
  await playMelody([q.target], 1.2);
}

export function DegreeEarView({ q, answered, onResult }: ExerciseViewProps<DegreeEarQ>) {
  usePlayOnQuestion(() => void playDegreeQuestion(q), q);
  const resolve = () => {
    // play the note then walk/jump to the nearest tonic
    const pcFromTonic = (((q.target - q.tonic) % 12) + 12) % 12;
    const down = q.target - pcFromTonic;
    const up = down + 12;
    const tonicTarget = q.target - down <= up - q.target ? down : up;
    return playEvents([
      { notes: [q.target], duration: 0.7 },
      { notes: [tonicTarget], duration: 1.2 },
    ]);
  };
  return (
    <div className="ex">
      <p className="prompt">
        In this {q.minor ? 'minor' : 'major'} key, which scale degree is the last note?
      </p>
      <div className="row center">
        <button type="button" className="play-btn big" onClick={() => void playDegreeQuestion(q)}>
          ▶ Cadence + note
        </button>
        <button type="button" className="play-btn" onClick={() => void playMelody([q.target], 1.2)}>
          Note only
        </button>
        <button type="button" className="play-btn" onClick={() => void playMelody([q.tonic], 1.2)}>
          Tonic
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: o.replace('b', '♭').replace('#', '♯'), sub: DEGREES[o].solfege }))}
        correctValue={q.degree}
        answered={answered}
        onPick={(v) => {
          onResult(checkDegree(q, v));
          void resolve();
        }}
        columns={q.options.length > 8 ? 4 : q.options.length > 3 ? 4 : 3}
      />
    </div>
  );
}

export { noteToString, parseNote };
