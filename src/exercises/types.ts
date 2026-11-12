import type { ComponentType } from 'react';
import type { Rng } from '../engine/rng';
import type { Settings } from '../progress/settings';

export type Area = 'ear' | 'reading' | 'theory' | 'keyboard';

export const AREA_LABELS: Record<Area, string> = {
  ear: 'Ear training',
  reading: 'Reading',
  theory: 'Theory',
  keyboard: 'Keyboard & writing',
};

export interface CheckResult {
  correct: boolean;
  /** human readable correct answer */
  expected: string;
  /** what the user answered (human readable) */
  given?: string;
  /** extra explanation */
  feedback?: string;
}

export interface ExerciseViewProps<Q> {
  q: Q;
  level: number;
  answered: CheckResult | null;
  onResult: (r: CheckResult) => void;
  settings: Settings;
}

export interface ExerciseLogic<Q> {
  id: string;
  title: string;
  area: Area;
  description: string;
  /** level names, easiest first */
  levels: string[];
  generate(level: number, rng: Rng): Q;
}

export interface ExerciseDef<Q = any> extends ExerciseLogic<Q> {
  View: ComponentType<ExerciseViewProps<Q>>;
  /** Primary input. 'keyboard' drills still work with the on-screen piano. */
  input: 'choices' | 'keyboard' | 'mixed';
  /** Typical seconds per question, for session time estimates */
  secondsPerQuestion: number;
}
