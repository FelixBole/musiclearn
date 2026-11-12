/**
 * Unified note input. MIDI keyboards, the on-screen piano and (later) a mic pitch
 * detector all publish here; exercises subscribe without caring about the source.
 */
export type NoteSource = 'midi' | 'screen' | 'mic';

export interface NoteEvent {
  type: 'on' | 'off';
  midi: number;
  velocity: number;
  source: NoteSource;
}

type Listener = (e: NoteEvent) => void;

const listeners = new Set<Listener>();
const held = new Map<number, NoteSource>();

export function emitNote(e: NoteEvent) {
  if (e.type === 'on') held.set(e.midi, e.source);
  else held.delete(e.midi);
  for (const l of listeners) l(e);
}

export function subscribeNotes(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function heldNotes(): number[] {
  return [...held.keys()].sort((a, b) => a - b);
}

/** Test helper */
export function _resetNoteBus() {
  listeners.clear();
  held.clear();
}
