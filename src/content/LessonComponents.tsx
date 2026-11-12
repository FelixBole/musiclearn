import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Play } from '../components/Play';
import { Staff } from '../components/Staff';
import { Keyboard, type KeyMark } from '../components/Keyboard';
import { toMidi } from '../engine/theory';
import { getExercise } from '../exercises/registry';

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

export const lessonComponents = { Play, Staff, Quiz, Callout, Composer, KeyboardDemo, Try, Example };
