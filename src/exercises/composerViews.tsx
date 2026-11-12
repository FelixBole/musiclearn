import { Staff, type StaffItem } from '../components/Staff';
import { playLine, playVoicings } from '../engine/audio';
import { instrumentById } from '../engine/orchestra/instruments';
import { midiToName, prettyNote, toMidi } from '../engine/theory';
import { vexDuration, type MotifNote } from '../engine/motif';
import type { KeyCtx } from '../engine/harmony/roman';
import {
  DOCTOR_LABELS,
  RANGE_LABELS,
  TRANSFORM_LABELS,
  checkDoctor,
  checkMotifEar,
  checkRange,
  checkTransposition,
  clefForNote,
  transposerName,
  type DoctorQ,
  type DoctorTarget,
  type MotifEarQ,
  type MotifTransform,
  type RangeAnswer,
  type RangeQ,
  type TransposeQ,
} from './composerLogic';
import { usePlayOnQuestion } from './harmonyViews';
import type { ExerciseViewProps } from './types';
import { ChoiceGrid } from './widgets';

/* ---------------- helpers ---------------- */

const usesFlats = (k: KeyCtx) => /b/.test(k.tonic) || k.tonic === 'F' || (k.minor && ['D', 'G', 'C', 'F'].includes(k.tonic));

export function motifItems(notes: MotifNote[], flats: boolean): StaffItem[] {
  return notes.map((n) => (n.midi === null ? { keys: [], rest: true, duration: vexDuration(n.dur) } : { keys: [midiToName(n.midi, flats)], duration: vexDuration(n.dur) }));
}

export function playMotif(notes: MotifNote[], beat = 0.42, sample: Parameters<typeof playLine>[2] = 'piano') {
  return playLine(
    notes.map((n) => n.midi),
    notes.map((n) => n.dur * beat),
    sample,
  );
}

/* ---------------- Instrument ranges ---------------- */

export function InstrumentRangeView({ q, answered, onResult }: ExerciseViewProps<RangeQ>) {
  const inst = instrumentById(q.instrument)!;
  const midi = toMidi(q.note);
  const play = () => void playLine([midi], [1.6], q.kind === 'judge' && midi >= inst.range[0] && midi <= inst.range[1] ? inst.sample : 'piano');
  return (
    <div className="ex">
      {q.kind === 'judge' ? (
        <p className="prompt">
          Can the <b>{inst.name.toLowerCase()}</b> play this note? <span className="muted">(sounding pitch)</span>
        </p>
      ) : (
        <p className="prompt">Which instrument can play this note comfortably? <span className="muted">(sounding pitch)</span></p>
      )}
      <Staff clef={clefForNote(q.note)} notes={q.note} maxWidth={220} />
      <p className="center muted">{prettyNote(q.note, true)}</p>
      <div className="row center">
        <button type="button" className="play-btn" onClick={play}>
          ▶ Hear it
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: q.kind === 'judge' ? RANGE_LABELS[o as RangeAnswer] : instrumentById(o)!.name }))}
        correctValue={q.answer}
        answered={answered}
        onPick={(v) => onResult(checkRange(q, v))}
        columns={q.kind === 'judge' ? 1 : 2}
      />
    </div>
  );
}

/* ---------------- Transposition ---------------- */

export function TranspositionView({ q, answered, onResult }: ExerciseViewProps<TransposeQ>) {
  const name = transposerName(q.instrument);
  return (
    <div className="ex">
      {q.direction === 'to-written' ? (
        <p className="prompt">
          The <b>{name}</b> must <i>sound</i> this note. What do you write in its part?
        </p>
      ) : (
        <p className="prompt">
          The <b>{name}</b> part shows this note. What pitch actually <i>sounds</i>?
        </p>
      )}
      <Staff clef={clefForNote(q.shown)} notes={q.shown} maxWidth={220} />
      <p className="center muted">
        {q.direction === 'to-written' ? 'Sounding' : 'Written'}: {prettyNote(q.shown, true)}
      </p>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: prettyNote(o, true) }))}
        correctValue={q.answer}
        answered={answered}
        onPick={(v) => onResult(checkTransposition(q, v))}
        columns={2}
      />
      {answered && <Staff clef={clefForNote(q.answer)} notes={`${q.shown} ${q.answer}`} maxWidth={260} />}
    </div>
  );
}

/* ---------------- Voicing doctor ---------------- */

export function VoicingDoctorView({ q, answered, onResult }: ExerciseViewProps<DoctorQ>) {
  const play = () => void playVoicings([q.notes], q.ensemble, 2.6);
  usePlayOnQuestion(play, q);
  const names = q.notes.map((m) => midiToName(m, /b/.test(q.chordName)));
  return (
    <div className="ex">
      <p className="prompt">
        <span className="chord-name">{q.chordName}</span> for {q.ensemble}: how is it voiced?
      </p>
      <Staff clef="grand" notes={names.join(',')} chord maxWidth={240} />
      <div className="row center">
        <button type="button" className="play-btn big" onClick={play}>
          ▶ Replay
        </button>
        <button type="button" className="play-btn" onClick={() => void playVoicings([q.notes], 'piano', 2)}>
          Piano
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: DOCTOR_LABELS[o] }))}
        correctValue={q.target}
        answered={answered}
        onPick={(v) => onResult(checkDoctor(q, v as DoctorTarget))}
        columns={2}
      />
    </div>
  );
}

/* ---------------- Motif transformations by ear ---------------- */

export function MotifEarView({ q, answered, onResult }: ExerciseViewProps<MotifEarQ>) {
  const both = async () => {
    await playMotif(q.original);
    await new Promise((r) => setTimeout(r, 450));
    await playMotif(q.variant);
  };
  usePlayOnQuestion(() => void both(), q);
  const flats = usesFlats(q.key);
  return (
    <div className="ex">
      <p className="prompt">How was the motif transformed?</p>
      <Staff items={motifItems(q.original, flats)} maxWidth={420} />
      <div className="row center">
        <button type="button" className="play-btn big" onClick={() => void both()}>
          ▶ Both
        </button>
        <button type="button" className="play-btn" onClick={() => void playMotif(q.original)}>
          Original
        </button>
        <button type="button" className="play-btn" onClick={() => void playMotif(q.variant)}>
          Variation
        </button>
      </div>
      <ChoiceGrid
        choices={q.options.map((o) => ({ value: o, label: TRANSFORM_LABELS[o] }))}
        correctValue={q.transform}
        answered={answered}
        onPick={(v) => onResult(checkMotifEar(q, v as MotifTransform))}
        columns={1}
      />
      {answered && <Staff items={motifItems(q.variant, flats)} maxWidth={520} />}
    </div>
  );
}
