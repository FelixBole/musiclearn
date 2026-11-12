import { useState } from 'react';
import { LETTERS, type Letter } from '../engine/theory';
import type { CheckResult } from './types';

export interface Choice {
  value: string;
  label: string;
  sub?: string;
}

/** Multiple-choice buttons that colour themselves after answering. */
export function ChoiceGrid({
  choices,
  onPick,
  answered,
  correctValue,
  columns,
}: {
  choices: Choice[];
  onPick: (value: string) => void;
  answered: CheckResult | null;
  correctValue: string;
  columns?: number;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="choice-grid" style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}>
      {choices.map((c) => {
        let cls = '';
        if (answered) {
          if (c.value === correctValue) cls = 'correct';
          else if (c.value === picked) cls = 'wrong';
          else cls = 'dim';
        }
        return (
          <button
            key={c.value}
            type="button"
            className={`choice ${cls}`}
            disabled={!!answered}
            onClick={() => {
              setPicked(c.value);
              onPick(c.value);
            }}
          >
            <span>{c.label}</span>
            {c.sub ? <small>{c.sub}</small> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Letter buttons with optional accidental selector. Calls onNote(letter, acc). */
export function NoteNamePad({
  onNote,
  accidentals,
  disabled,
  doubleAccidentals = false,
}: {
  onNote: (letter: Letter, acc: number) => void;
  accidentals: boolean;
  disabled?: boolean;
  doubleAccidentals?: boolean;
}) {
  const [acc, setAcc] = useState(0);
  const accs = doubleAccidentals ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
  const sym = (a: number) => ({ [-2]: '𝄫', [-1]: '♭', 0: '♮', 1: '♯', 2: '𝄪' })[a];
  return (
    <div className="note-pad">
      {accidentals && (
        <div className="segmented">
          {accs.map((a) => (
            <button key={a} type="button" className={a === acc ? 'active' : ''} onClick={() => setAcc(a)} disabled={disabled}>
              {sym(a)}
            </button>
          ))}
        </div>
      )}
      <div className="letters">
        {LETTERS.map((l) => (
          <button
            key={l}
            type="button"
            className="choice letter"
            disabled={disabled}
            onClick={() => {
              onNote(l, acc);
              setAcc(0);
            }}
          >
            {l}
            {accidentals && acc !== 0 ? sym(acc) : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Feedback({ result }: { result: CheckResult | null }) {
  if (!result) return null;
  return (
    <div className={`feedback ${result.correct ? 'ok' : 'bad'}`} role="status">
      <strong>{result.correct ? '✓ Correct' : '✗ Not quite'}</strong>
      {!result.correct && (
        <span>
          {' '}
          — answer: <b>{result.expected}</b>
          {result.given ? <> (you said {result.given})</> : null}
        </span>
      )}
      {result.feedback ? <p>{result.feedback}</p> : null}
    </div>
  );
}
