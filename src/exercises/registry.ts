import type { ExerciseDef } from './types';
import {
  chordQualityEar,
  chordSpelling,
  intervalEar,
  intervalReading,
  keySignatures,
  noteReading,
  scaleDegreeEar,
  sightReading,
} from './logic';
import {
  ChordEarView,
  ChordSpellingView,
  DegreeEarView,
  IntervalEarView,
  IntervalReadingView,
  KeySigView,
  NoteReadingView,
  SightReadingView,
} from './views';

export const EXERCISES: ExerciseDef[] = [
  { ...noteReading, View: NoteReadingView, input: 'mixed', secondsPerQuestion: 6 },
  { ...keySignatures, View: KeySigView, input: 'choices', secondsPerQuestion: 8 },
  { ...intervalReading, View: IntervalReadingView, input: 'choices', secondsPerQuestion: 8 },
  { ...intervalEar, View: IntervalEarView, input: 'choices', secondsPerQuestion: 8 },
  { ...chordQualityEar, View: ChordEarView, input: 'choices', secondsPerQuestion: 8 },
  { ...scaleDegreeEar, View: DegreeEarView, input: 'choices', secondsPerQuestion: 12 },
  { ...chordSpelling, View: ChordSpellingView, input: 'mixed', secondsPerQuestion: 15 },
  { ...sightReading, View: SightReadingView, input: 'keyboard', secondsPerQuestion: 20 },
];

export function getExercise(id: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id);
}
