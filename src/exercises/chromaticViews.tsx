import { SatbStaff } from '../components/SatbStaff';
import { playMelody, playProgression } from '../engine/audio';
import { prettyRoman } from '../engine/harmony/roman';
import type { Satb } from '../engine/harmony/voiceleading';
import { keyName } from '../engine/theory';
import {
  CHROMATIC_INFO,
  MODES,
  checkChromaticEar,
  checkChromaticSpelling,
  checkModeEar,
  type ChromEarQ,
  type ChromSpellQ,
  type ModeEarQ,
  type ModeId,
} from './chromaticLogic';
import { keySigFor } from './harmonyLogic';
import { KeyBadge, usePlayOnQuestion } from './harmonyViews';
import type { ExerciseViewProps } from './types';
import { ChoiceGrid } from './widgets';

const playSatb = (v: Satb[], d = 1.0) => playProgression(v.map((x) => [...x]), d);

/* ---------------- Chromatic chords by ear ---------------- */

export function ChromaticEarView({ q, answered, onResult }: ExerciseViewProps<ChromEarQ>) {
  usePlayOnQuestion(() => void playSatb(q.voicings), q);
  const labels = q.symbols.map((s, i) => (i === 1 && !answered ? '?' : prettyRoman(s)));
  return (
    <div className="ex">
      <p className="prompt">
        Which chord comes 2nd? <KeyBadge k={q.key} />
      </p>
      <div className="row center">
        <button type="button" className="play-btn big" onClick={() => void playSatb(q.voicings)}>
          ▶ Replay
        </button>
        <button type="button" className="play-btn" onClick={() => void playSatb(q.voicings.slice(0, 2), 1.4)}>
          First two
        </button>
        <button type="button" className="play-btn" onClick={() => void playMelody(q.voicings.map((v) => v[0]), 0.8)}>
          Bass line
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: CHROMATIC_INFO[o].name }))}
        correctValue={q.target}
        answered={answered}
        onPick={(v) => onResult(checkChromaticEar(q, v))}
        columns={2}
      />
      {answered && <SatbStaff chords={q.names} labels={labels} keySig={keySigFor(q.key)} />}
    </div>
  );
}

/* ---------------- Chromatic spelling ---------------- */

export function ChromaticSpellingView({ q, answered, onResult }: ExerciseViewProps<ChromSpellQ>) {
  const key = keyName(q.key.tonic, q.key.minor);
  return (
    <div className="ex">
      {q.reverse ? (
        <p className="prompt">
          In <b>{key}</b>, the chord <span className="chord-name">{q.name}</span> is…
        </p>
      ) : (
        <p className="prompt">
          In <b>{key}</b>, <span className="chord-name">{prettyRoman(q.symbol)}</span> is…
        </p>
      )}
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: q.reverse ? prettyRoman(o) : o }))}
        correctValue={q.answer}
        answered={answered}
        onPick={(v) => onResult(checkChromaticSpelling(q, v))}
        columns={2}
      />
    </div>
  );
}

/* ---------------- Modes by ear ---------------- */

export function ModeEarView({ q, answered, onResult }: ExerciseViewProps<ModeEarQ>) {
  const play = async () => {
    if (q.playScale) await playMelody(q.scale, 0.32);
    await playSatb(q.voicings, 1.1);
  };
  usePlayOnQuestion(() => void play(), q);
  const m = MODES[q.mode];
  return (
    <div className="ex">
      <p className="prompt">Which mode is this?</p>
      <div className="row center">
        <button type="button" className="play-btn big" onClick={() => void play()}>
          ▶ Replay
        </button>
        <button type="button" className="play-btn" onClick={() => void playSatb(q.voicings, 1.1)}>
          Vamp
        </button>
        {(q.playScale || answered) && (
          <button type="button" className="play-btn" onClick={() => void playMelody(q.scale, 0.32)}>
            Scale
          </button>
        )}
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: MODES[o].name }))}
        correctValue={q.mode}
        answered={answered}
        onPick={(v) => onResult(checkModeEar(q, v as ModeId))}
        columns={2}
      />
      {answered && (
        <p className="muted center">
          {m.vamp.map(prettyRoman).join(' – ')}
        </p>
      )}
    </div>
  );
}
