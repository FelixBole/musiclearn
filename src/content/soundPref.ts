import { useSyncExternalStore } from 'react';
import { ENSEMBLES, type EnsembleId } from '../engine/orchestra/instruments';

/** The ensemble lesson examples play with (remembered per device). */
const KEY = 'lesson:sound';
const listeners = new Set<() => void>();

function read(): EnsembleId {
  try {
    const v = localStorage.getItem(KEY) as EnsembleId | null;
    return v && v in ENSEMBLES ? v : 'piano';
  } catch {
    return 'piano';
  }
}

let current: EnsembleId = typeof localStorage === 'undefined' ? 'piano' : read();

export function setLessonSound(s: EnsembleId) {
  current = s;
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}

export function useLessonSound(): [EnsembleId, (s: EnsembleId) => void] {
  const v = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
  return [v, setLessonSound];
}
