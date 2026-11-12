import { useEffect, useRef, useState } from 'react';
import { SatbStaff } from '../components/SatbStaff';
import { Keyboard, type KeyMark } from '../components/Keyboard';
import { playChord, playMelody, playProgression } from '../engine/audio';
import { useChordCapture } from '../engine/input/hooks';
import { CADENCE_INFO, type Cadence } from '../engine/harmony/progressions';
import { parseRoman, prettyRoman } from '../engine/harmony/roman';
import { realize, spellMidi } from '../engine/harmony/voicing';
import type { Issue, Satb } from '../engine/harmony/voiceleading';
import {
  SPOT_LABELS,
  checkAnalysis,
  checkCadence,
  checkDictation,
  checkErrorSpot,
  checkVoiceNext,
  gradeHarmonization,
  keyLabel,
  keySigFor,
  type AnalysisQ,
  type CadenceQ,
  type DictationQ,
  type ErrorSpotQ,
  type HarmonizationGrade,
  type HarmonizeQ,
  type SpotTarget,
  type VoiceNextQ,
} from './harmonyLogic';
import type { ExerciseViewProps } from './types';
import { ChoiceGrid } from './widgets';

const ERR = '#c0393f';
const WARN = '#c47f12';

function usePlayOnQuestion(play: () => void, q: unknown) {
  const ref = useRef(play);
  ref.current = play;
  useEffect(() => {
    const t = setTimeout(() => ref.current(), 300);
    return () => clearTimeout(t);
  }, [q]);
}

const playSatb = (v: Satb[], d = 1.0) => playProgression(v.map((x) => [...x]), d);

function colorsFor(issues: Issue[], chordCount: number, offset = 0): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const color = i.severity === 'error' ? ERR : WARN;
    const pairRule = /parallel|direct|overlap|unresolved|leap|melodic/.test(i.rule);
    const idxs = pairRule ? [i.at - 1, i.at] : [i.at];
    for (const ci of idxs) {
      if (ci < 0 || ci >= chordCount) continue;
      for (const v of i.voices) {
        const k = `${ci + offset}:${v}`;
        if (out[k] !== ERR) out[k] = color;
      }
    }
  }
  return out;
}

function KeyBadge({ k }: { k: { tonic: string; minor: boolean } }) {
  return <span className="pill">{keyLabel(k)}</span>;
}

/* ---------------- Slot picker: fill a sequence of Roman numerals ---------------- */

export function SlotPicker({
  values,
  setValues,
  options,
  fixed = {},
  results,
  disabled,
}: {
  values: (string | null)[];
  setValues: (v: (string | null)[]) => void;
  options: (i: number) => string[];
  fixed?: Record<number, string>;
  results?: boolean[];
  disabled?: boolean;
}) {
  const firstOpen = values.findIndex((v, i) => v === null && !(i in fixed));
  const [active, setActive] = useState(firstOpen < 0 ? 0 : firstOpen);
  const pick = (val: string) => {
    const next = [...values];
    next[active] = val;
    setValues(next);
    const after = next.findIndex((v, i) => i > active && v === null && !(i in fixed));
    if (after >= 0) setActive(after);
  };
  return (
    <div className="slot-picker">
      <div className="slots">
        {values.map((v, i) => {
          const isFixed = i in fixed;
          const r = results?.[i];
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || isFixed}
              className={`slot ${i === active && !disabled ? 'active' : ''} ${isFixed ? 'fixed' : ''} ${r === true ? 'ok' : r === false ? 'bad' : ''}`}
              onClick={() => setActive(i)}
            >
              {isFixed ? prettyRoman(fixed[i]) : v ? prettyRoman(v) : '?'}
            </button>
          );
        })}
      </div>
      {!disabled && (
        <div className="roman-pad">
          {options(active).map((o) => (
            <button key={o} type="button" className={`choice ${values[active] === o ? 'picked' : ''}`} onClick={() => pick(o)}>
              {prettyRoman(o)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Cadences ---------------- */

export function CadenceEarView({ q, answered, onResult }: ExerciseViewProps<CadenceQ>) {
  usePlayOnQuestion(() => void playSatb(q.voicings), q);
  return (
    <div className="ex">
      <p className="prompt">
        How does this phrase end? <KeyBadge k={q.key} />
      </p>
      <div className="row center">
        <button type="button" className="play-btn big" onClick={() => void playSatb(q.voicings)}>
          ▶ Replay
        </button>
        <button type="button" className="play-btn" onClick={() => void playSatb(q.voicings.slice(-2), 1.3)}>
          Last two chords
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((c) => ({ value: c, label: CADENCE_INFO[c].name }))}
        correctValue={q.cadence}
        answered={answered}
        onPick={(v) => onResult(checkCadence(q, v as Cadence))}
        columns={2}
      />
      {answered && (
        <SatbStaff
          chords={q.voicings.map((v, i) => q.voicings[i] && spellAll(v, q.symbols[i], q.key))}
          labels={q.symbols.map(prettyRoman)}
          keySig={keySigFor(q.key)}
        />
      )}
    </div>
  );
}

function spellAll(v: Satb, symbol: string, key: { tonic: string; minor: boolean }) {
  const c = parseRoman(symbol, key);
  return v.map((m) => spellMidi(m, c.pcs));
}

/* ---------------- Progression dictation ---------------- */

export function DictationView({ q, answered, onResult }: ExerciseViewProps<DictationQ>) {
  const [values, setValues] = useState<(string | null)[]>(() => q.symbols.map((s, i) => (i === 0 ? s : null)));
  const [results, setResults] = useState<boolean[] | undefined>();
  usePlayOnQuestion(() => void playSatb(q.voicings), q);
  const complete = values.every((v) => v !== null);
  const check = () => {
    const r = checkDictation(q, values as string[]);
    setResults(r.perChord);
    onResult(r);
  };
  return (
    <div className="ex">
      <p className="prompt">
        Write the progression <KeyBadge k={q.key} />
      </p>
      <div className="row center">
        <button type="button" className="play-btn big" onClick={() => void playSatb(q.voicings)}>
          ▶ Play
        </button>
        <button type="button" className="play-btn" onClick={() => void playMelody(q.voicings.map((v) => v[0]), 0.8)}>
          Bass line
        </button>
        <button type="button" className="play-btn" onClick={() => void playMelody(q.voicings.map((v) => v[3]), 0.8)}>
          Melody
        </button>
      </div>
      <SlotPicker values={values} setValues={setValues} options={() => q.vocabulary} fixed={{ 0: q.symbols[0] }} results={results} disabled={!!answered} />
      {!answered && (
        <div className="row center">
          <button type="button" className="btn" disabled={!complete} onClick={check}>
            Check
          </button>
        </div>
      )}
      {answered && <SatbStaff chords={q.voicings.map((v, i) => spellAll(v, q.symbols[i], q.key))} labels={q.symbols.map(prettyRoman)} keySig={keySigFor(q.key)} />}
    </div>
  );
}

/* ---------------- Roman numeral analysis ---------------- */

export function AnalysisView({ q, answered, onResult }: ExerciseViewProps<AnalysisQ>) {
  return (
    <div className="ex">
      <p className="prompt">
        Name this chord <KeyBadge k={q.key} />
      </p>
      <SatbStaff chords={[q.names]} keySig={keySigFor(q.key)} labels={[answered ? prettyRoman(q.symbol) : undefined]} maxWidth={300} />
      <div className="row center">
        <button type="button" className="play-btn" onClick={() => void playChord([...q.voicing], 1.8)}>
          ▶ Hear it
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: prettyRoman(o) }))}
        correctValue={q.symbol}
        answered={answered}
        onPick={(v) => onResult(checkAnalysis(q, v))}
        columns={3}
      />
    </div>
  );
}

/* ---------------- Spot the error ---------------- */

export function ErrorSpotView({ q, answered, onResult }: ExerciseViewProps<ErrorSpotQ>) {
  const colors = answered ? colorsFor(q.issues.filter((i) => i.severity === 'error'), 2) : {};
  return (
    <div className="ex">
      <p className="prompt">
        What's wrong here? <KeyBadge k={q.key} />
      </p>
      <SatbStaff chords={q.names} labels={q.symbols.map(prettyRoman)} keySig={keySigFor(q.key)} colors={colors} maxWidth={360} />
      <div className="row center">
        <button type="button" className="play-btn" onClick={() => void playSatb(q.voicings, 1.2)}>
          ▶ Hear it
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: SPOT_LABELS[o] }))}
        correctValue={q.target}
        answered={answered}
        onPick={(v) => onResult(checkErrorSpot(q, v as SpotTarget))}
        columns={2}
      />
    </div>
  );
}

/* ---------------- Voice the next chord ---------------- */

export function VoiceNextView({ q, answered, onResult, settings }: ExerciseViewProps<VoiceNextQ>) {
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<ReturnType<typeof checkVoiceNext> | null>(null);
  const target = parseRoman(q.symbols[1], q.key);

  const submit = (notes: number[]) => {
    const r = checkVoiceNext(q, notes);
    setSelected(notes);
    if (r.issues.length === 0 && !r.voicing && !r.correct) {
      // wrong note count: let them try again without spending the question
      setResult(r);
      return;
    }
    setResult(r);
    onResult(r);
    void playSatb([q.first, (r.voicing ?? q.model) as Satb], 1.1);
  };

  useChordCapture((notes) => !answered && submit(notes), !answered);

  const marks: Record<number, KeyMark> = {};
  for (const m of selected) marks[m] = 'selected';
  for (const m of q.first) marks[m] = marks[m] ?? 'hint';

  const yours = result?.voicing;
  return (
    <div className="ex">
      <p className="prompt">
        Play the <span className="chord-name">{prettyRoman(q.symbols[1])}</span> chord next <KeyBadge k={q.key} />
      </p>
      <p className="hint">
        Four notes (B T A S). Chord tones: {target.pcs.join(' ')} · bass: {target.bass}. Keep common tones, move the others to the nearest chord tone.
      </p>
      <SatbStaff
        chords={[q.firstNames, yours ? spellAll(yours, q.symbols[1], q.key) : null]}
        labels={q.symbols.map(prettyRoman)}
        keySig={keySigFor(q.key)}
        colors={result ? colorsFor(result.issues, 2) : {}}
        maxWidth={360}
      />
      <div className="row center">
        <button type="button" className="play-btn" onClick={() => void playChord([...q.first], 1.6)}>
          ▶ First chord
        </button>
        {answered && (
          <button type="button" className="play-btn" onClick={() => void playSatb([q.first, q.model], 1.1)}>
            ▶ Model answer
          </button>
        )}
      </div>
      {result && !answered && <p className="hint warn">{result.feedback}</p>}
      {!answered && (
        <>
          <Keyboard
            from={40}
            to={79}
            marks={marks}
            compact
            onKey={(m) => setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}
          />
          <div className="row center">
            <button type="button" className="btn ghost" onClick={() => setSelected([])} disabled={!selected.length}>
              Clear
            </button>
            <button type="button" className="btn" disabled={selected.length < 1} onClick={() => submit(selected)}>
              Check ({selected.length}/4)
            </button>
          </div>
          {settings.midiEnabled && <p className="hint">Or play all four notes together on your MIDI keyboard.</p>}
        </>
      )}
      {answered && (
        <>
          <p className="hint">Model answer:</p>
          <SatbStaff chords={[q.firstNames, q.modelNames]} labels={q.symbols.map(prettyRoman)} keySig={keySigFor(q.key)} maxWidth={360} />
        </>
      )}
    </div>
  );
}

/* ---------------- Harmonize a melody ---------------- */

export function HarmonizeView({ q, answered, onResult }: ExerciseViewProps<HarmonizeQ>) {
  const [values, setValues] = useState<(string | null)[]>(() => q.melody.map(() => null));
  const [grade, setGrade] = useState<HarmonizationGrade | null>(null);
  const complete = values.every((v) => v !== null);
  const melodyChords = q.melodyNames.map((n) => [null, null, null, n]);
  const check = () => {
    const g = gradeHarmonization(q, values as string[]);
    setGrade(g);
    onResult(g);
    if (g.realization) void playSatb(g.realization.voicings, 1.0);
  };
  return (
    <div className="ex">
      <p className="prompt">
        Choose a chord for each melody note <KeyBadge k={q.key} />
      </p>
      <SatbStaff
        chords={grade?.realization ? grade.realization.names : melodyChords}
        labels={values.map((v) => (v ? prettyRoman(v) : undefined))}
        keySig={keySigFor(q.key)}
      />
      <div className="row center">
        <button type="button" className="play-btn" onClick={() => void playMelody(q.melody, 0.7)}>
          ▶ Melody
        </button>
        {grade?.realization && (
          <button type="button" className="play-btn" onClick={() => void playSatb(grade.realization!.voicings, 1.0)}>
            ▶ Your harmonization
          </button>
        )}
        {answered && (
          <button
            type="button"
            className="play-btn"
            onClick={() => void playSatb(realize(q.model, q.key, { soprano: q.melody }).voicings, 1.0)}
          >
            ▶ Model answer
          </button>
        )}
      </div>
      <SlotPicker values={values} setValues={setValues} options={(i) => q.choices[i]} disabled={!!answered} />
      <p className="hint">Only chords containing the melody note are offered. Start on the tonic and end with V → {q.key.minor ? 'i' : 'I'}.</p>
      {!answered && (
        <div className="row center">
          <button type="button" className="btn" disabled={!complete} onClick={check}>
            Check & hear it
          </button>
        </div>
      )}
    </div>
  );
}
