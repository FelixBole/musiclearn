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

import { cadenceEar, errorSpotting, harmonizeMelody, progressionEar, romanAnalysis, voiceNext } from './harmonyLogic';
import { AnalysisView, CadenceEarView, DictationView, ErrorSpotView, HarmonizeView, VoiceNextView } from './harmonyViews';

export const EXERCISES: ExerciseDef[] = [
  { ...noteReading, View: NoteReadingView, input: 'mixed', secondsPerQuestion: 6 },
  { ...keySignatures, View: KeySigView, input: 'choices', secondsPerQuestion: 8 },
  { ...intervalReading, View: IntervalReadingView, input: 'choices', secondsPerQuestion: 8 },
  { ...intervalEar, View: IntervalEarView, input: 'choices', secondsPerQuestion: 8 },
  { ...chordQualityEar, View: ChordEarView, input: 'choices', secondsPerQuestion: 8 },
  { ...scaleDegreeEar, View: DegreeEarView, input: 'choices', secondsPerQuestion: 12 },
  { ...chordSpelling, View: ChordSpellingView, input: 'mixed', secondsPerQuestion: 15 },
  { ...sightReading, View: SightReadingView, input: 'keyboard', secondsPerQuestion: 20 },
  // Track B — diatonic harmony
  { ...cadenceEar, View: CadenceEarView, input: 'choices', secondsPerQuestion: 12 },
  { ...progressionEar, View: DictationView, input: 'choices', secondsPerQuestion: 35 },
  { ...romanAnalysis, View: AnalysisView, input: 'choices', secondsPerQuestion: 12 },
  { ...errorSpotting, View: ErrorSpotView, input: 'choices', secondsPerQuestion: 20 },
  { ...voiceNext, View: VoiceNextView, input: 'keyboard', secondsPerQuestion: 40 },
  { ...harmonizeMelody, View: HarmonizeView, input: 'choices', secondsPerQuestion: 60 },
];

export function getExercise(id: string): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id);
}
