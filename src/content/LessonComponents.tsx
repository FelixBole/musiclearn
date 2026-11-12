import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Play, playByMode } from '../components/Play';
import { Staff } from '../components/Staff';
import { Keyboard, type KeyMark } from '../components/Keyboard';
import { toMidi } from '../engine/theory';
import { getExercise } from '../exercises/registry';
import { SatbStaff } from '../components/SatbStaff';
import { playMelody, playProgression, playVoicings } from '../engine/audio';
import { Counterpoint, Instrument, Layers, Motif, OrchVoicing, SoundSelect } from './ComposerComponents';
import { useLessonSound } from './soundPref';
import { type KeyCtx } from '../engine/harmony/roman';
import { parseProgression, realizeProgression } from '../engine/harmony/sequence';
import { RULE_LABELS, checkProgression, type Issue, type Satb } from '../engine/harmony/voiceleading';
import { keySigFor } from '../exercises/harmonyLogic';

/* Lesson context: quizzes register so the lesson knows when all are answered. */
interface LessonCtx {
  register(id: string): () => void;
  report(id: string, correct: boolean): void;
}
export const LessonContext = createContext<LessonCtx | null>(null);

export function useLessonQuizTracker() {
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, boolean>>({});
  const ctx: LessonCtx = {
    register(id) {
      setRegistered((s) => new Set(s).add(id));
      return () =>
        setRegistered((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
    },
    report(id, correct) {
      setResults((r) => (id in r ? r : { ...r, [id]: correct }));
    },
  };
  const answered = Object.keys(results).filter((k) => registered.has(k)).length;
  const correct = Object.entries(results).filter(([k, v]) => v && registered.has(k)).length;
  return { ctx, total: registered.size, answered, correct };
}

export function Quiz({
  q,
  options,
  answer,
  explain,
  play,
  playMode,
}: {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
  play?: string;
  playMode?: 'melody' | 'chord' | 'progression' | 'arpeggio';
}) {
  const id = useId();
  const ctx = useContext(LessonContext);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => ctx?.register(id), [ctx === null]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="quiz">
      <div className="quiz-q">
        <span className="quiz-badge">Check</span> {q}
      </div>
      {play && <Play notes={play} mode={playMode ?? 'melody'} />}
      <div className="choice-grid">
        {options.map((o, i) => {
          const cls = picked === null ? '' : i === answer ? 'correct' : i === picked ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              type="button"
              className={`choice ${cls}`}
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                ctx?.report(id, i === answer);
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`quiz-explain ${picked === answer ? 'ok' : 'bad'}`}>
          {picked === answer ? '✓ ' : '✗ '}
          {explain}
        </p>
      )}
    </div>
  );
}

export function Callout({ children, title, type = 'tip' }: { children: ReactNode; title?: string; type?: 'tip' | 'warn' | 'info' }) {
  const icon = { tip: '💡', warn: '⚠️', info: 'ℹ️' }[type];
  return (
    <aside className={`callout ${type}`}>
      <div className="callout-title">
        {icon} {title ?? (type === 'tip' ? 'Tip' : type === 'warn' ? 'Watch out' : 'Note')}
      </div>
      <div>{children}</div>
    </aside>
  );
}

/** Links a concept to orchestral / game scoring practice. */
export function Composer({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <aside className="callout composer">
      <div className="callout-title">🎻 Composer’s corner{title ? ` · ${title}` : ''}</div>
      <div>{children}</div>
    </aside>
  );
}

export function KeyboardDemo({ highlight = '', from = 'C3', to = 'C5' }: { highlight?: string; from?: string; to?: string }) {
  const marks: Record<number, KeyMark> = {};
  for (const n of highlight.split(/\s+/).filter(Boolean)) marks[toMidi(n)] = 'hint';
  return (
    <div className="kb-demo">
      <Keyboard from={toMidi(from)} to={toMidi(to)} marks={marks} showMarkedNames compact />
    </div>
  );
}

export function Try({ drill, level, children }: { drill: string; level?: number; children?: ReactNode }) {
  const ex = getExercise(drill);
  if (!ex) return null;
  return (
    <Link className="try-link" to={`/practice/${drill}${level !== undefined ? `?level=${level}` : ''}`}>
      <span>🎯 Practice: {ex.title}</span>
      <small>{children ?? ex.description}</small>
    </Link>
  );
}

/** Side-by-side notation + play button. */
export function Example({ notes, clef, keySig, chord, mode, label }: { notes: string; clef?: 'treble' | 'bass' | 'alto' | 'tenor' | 'grand'; keySig?: string; chord?: boolean; mode?: 'melody' | 'chord' | 'progression' | 'arpeggio'; label?: string }) {
  const playNotes = mode === 'progression' ? notes : notes.replace(/,/g, ' ');
  return (
    <figure className="example">
      <Staff clef={clef} notes={notes} keySig={keySig} chord={chord} maxWidth={460} />
      <figcaption>
        <Play notes={playNotes} mode={mode ?? (chord ? 'chord' : 'melody')} label={label ?? 'Listen'} />
      </figcaption>
    </figure>
  );
}

/* ---------------- Four-part harmony widgets ---------------- */

function useKey(tonic: string, minor?: boolean): KeyCtx {
  return { tonic, minor: !!minor };
}

/**
 * <Progression romans="I IV V7 I" tonic="C" /> — auto-voiced in four parts (SATB),
 * notation with Roman numerals + playback (full, bass line, soprano).
 * `romans` accepts the whole progression language: chord symbols, key changes ("G:"),
 * pivots ("vi=G:ii") and specials (N6, It+6, ct°7, Vsus4).
 */
export function Progression({
  romans,
  tonic = 'C',
  minor,
  label,
  tempo = 1.0,
  keySig,
}: {
  romans: string;
  tonic?: string;
  minor?: boolean;
  label?: string;
  tempo?: number;
  /** override the key signature, a major-key tonic (e.g. "C" for D Dorian) */
  keySig?: string;
}) {
  const key = useKey(tonic, minor);
  // the voicing search is not free: compute once per progression, not on every lesson re-render
  const res = useMemo(() => realizeProgression(romans, { tonic, minor: !!minor }), [romans, tonic, minor]);
  const [playing, setPlaying] = useState(-1);
  const [sound, setSound] = useLessonSound();
  if (!res.realization) return <p className="error">⚠ {res.error}</p>;
  const voicings = res.realization.voicings;
  const play = async () => {
    await playVoicings(
      voicings.map((v) => [...v]),
      sound,
      sound === 'piano' ? tempo : tempo * 1.35,
      { onEvent: setPlaying },
    );
    setPlaying(-1);
  };
  const k = minor ? tonic.toLowerCase() : tonic;
  return (
    <figure className="example">
      <SatbStaff chords={res.realization.names} labels={res.parsed.items.map((i) => i.label)} keySig={keySig ?? keySigFor(key)} playhead={playing} />
      <figcaption>
        <button type="button" className="play-btn" onClick={() => void play()}>
          ▶ {label ?? 'Listen'}
        </button>
        <button type="button" className="play-btn" onClick={() => void playMelody(voicings.map((v) => v[0]), tempo * 0.8)}>
          Bass
        </button>
        <button type="button" className="play-btn" onClick={() => void playMelody(voicings.map((v) => v[3]), tempo * 0.8)}>
          Soprano
        </button>
        <SoundSelect value={sound} onChange={setSound} />
        <Link className="play-btn" to={`/tools/playground?p=${encodeURIComponent(romans)}&k=${encodeURIComponent(k)}`} title="Open in the progression playground">
          ✎ Edit
        </Link>
      </figcaption>
    </figure>
  );
}

/**
 * <Chorale notes="C3,G3,E4,C5 D3,A3,F4,D5" romans="I ii" tonic="C" check />
 * Explicit voicings (bass→soprano per chord). With `check`, runs the voice-leading checker
 * and highlights problems — ideal for showing "what not to do".
 */
export function Chorale({ notes, romans, tonic = 'C', minor, check, label }: { notes: string; romans?: string; tonic?: string; minor?: boolean; check?: boolean; label?: string }) {
  const key = useKey(tonic, minor);
  const names = notes.trim().split(/\s+/).map((c) => c.split(','));
  const parsed = romans ? parseProgression(romans, key) : null;
  const voicings = names.map((c) => c.map(toMidi) as Satb);
  let issues: Issue[] = [];
  if (check && parsed) {
    const chords = parsed.items.map((i) => i.chord);
    issues = checkProgression(voicings, chords, key);
  }
  const colors: Record<string, string> = {};
  for (const i of issues) {
    const pair = /parallel|direct|overlap|unresolved|leap|melodic|cross/.test(i.rule);
    for (const ci of pair ? [i.at - 1, i.at] : [i.at]) for (const v of i.voices) colors[`${ci}:${v}`] = i.severity === 'error' ? '#c0393f' : '#c47f12';
  }
  return (
    <figure className="example">
      <SatbStaff chords={names} labels={parsed?.items.map((i) => i.label)} keySig={keySigFor(key)} colors={colors} />
      <figcaption>
        <button type="button" className="play-btn" onClick={() => void playProgression(voicings.map((v) => [...v]), 1.1)}>
          ▶ {label ?? 'Listen'}
        </button>
      </figcaption>
      {check && (
        <ul className="chorale-issues">
          {issues.length === 0 && <li className="ok">✓ No voice-leading problems</li>}
          {issues.map((i, k) => (
            <li key={k} className={`issue-${i.severity}`}>
              {i.severity === 'error' ? '✗' : '⚠'} {RULE_LABELS[i.rule]}: {i.message}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/**
 * <Voicings notes="C3,G3,E4,B4,D5 F2,C3,A3,E4,G4" labels="Cmaj9|Fmaj9" />
 * Free voicings with any number of notes (extended chords, quartal stacks, clusters, pads).
 */
export function Voicings({ notes, labels, tempo = 1.6, label }: { notes: string; labels?: string; tempo?: number; label?: string }) {
  const chords = notes.trim().split(/\s+/);
  const names = labels?.split('|').map((s) => s.trim());
  return (
    <figure className="example">
      <Staff clef="grand" notes={notes} maxWidth={Math.min(520, 180 + chords.length * 70)} />
      {names && (
        <div className="voicing-labels">
          {names.map((n, i) => (
            <span key={i} className="pill">
              {n}
            </span>
          ))}
        </div>
      )}
      <figcaption>
        <Play notes={notes} mode="progression" tempo={tempo} label={label ?? 'Listen'} />
        <button type="button" className="play-btn" onClick={() => void playByMode(chords[0].replace(/,/g, ' '), 'arpeggio', 0.3)}>
          Arpeggiate{chords.length > 1 ? ' 1st' : ''}
        </button>
      </figcaption>
    </figure>
  );
}

export const lessonComponents = { Play, Staff, Quiz, Callout, Composer, KeyboardDemo, Try, Example, Progression, Chorale, Voicings, Instrument, OrchVoicing, Motif, Counterpoint, Layers };
