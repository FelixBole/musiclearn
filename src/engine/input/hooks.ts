import { useEffect, useRef, useState } from 'react';
import { heldNotes, subscribeNotes, type NoteEvent } from './noteBus';

/** Subscribe to note events; handler may change between renders without resubscribing. */
export function useNoteEvents(handler: (e: NoteEvent) => void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    return subscribeNotes((e) => ref.current(e));
  }, [enabled]);
}

/** Currently held notes from any source. */
export function useHeldNotes(): number[] {
  const [notes, setNotes] = useState<number[]>(heldNotes);
  useEffect(() => subscribeNotes(() => setNotes(heldNotes())), []);
  return notes;
}

/**
 * Collect a chord: notes that were held together. The chord is "committed" when
 * all keys are released (MIDI) — returns the max simultaneous set.
 */
export function useChordCapture(onChord: (notes: number[]) => void, enabled = true) {
  const peak = useRef<Set<number>>(new Set());
  const cb = useRef(onChord);
  cb.current = onChord;
  useEffect(() => {
    if (!enabled) return;
    return subscribeNotes((e) => {
      if (e.source !== 'midi') return; // on-screen chord entry uses explicit submit
      const held = heldNotes();
      if (e.type === 'on') {
        if (held.length > peak.current.size) peak.current = new Set(held);
      } else if (held.length === 0 && peak.current.size > 0) {
        const notes = [...peak.current].sort((a, b) => a - b);
        peak.current = new Set();
        cb.current(notes);
      }
    });
  }, [enabled]);
}
