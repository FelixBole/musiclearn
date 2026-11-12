import { useEffect, useRef, useState } from 'react';
import { emitNote } from '../engine/input/noteBus';
import { useHeldNotes } from '../engine/input/hooks';
import { ensureAudio, noteOff, noteOn } from '../engine/audio';
import { midiToName } from '../engine/theory';

export type KeyMark = 'correct' | 'wrong' | 'hint' | 'selected';

export interface KeyboardProps {
  /** lowest midi note (snapped down to a white key) */
  from?: number;
  /** highest midi note */
  to?: number;
  /** marks to color keys */
  marks?: Record<number, KeyMark>;
  /** tap callback (in addition to emitting to the note bus) */
  onKey?: (midi: number) => void;
  /** emit to the note bus + sound (default true) */
  live?: boolean;
  /** show C labels */
  labels?: boolean;
  /** show note names on all keys that are marked */
  showMarkedNames?: boolean;
  compact?: boolean;
}

const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

export function Keyboard({
  from = 48,
  to = 72,
  marks = {},
  onKey,
  live = true,
  labels = true,
  showMarkedNames = false,
  compact = false,
}: KeyboardProps) {
  const start = isBlack(from) ? from - 1 : from;
  const end = isBlack(to) ? to + 1 : to;
  const keys: number[] = [];
  for (let m = start; m <= end; m++) keys.push(m);
  const whites = keys.filter((m) => !isBlack(m));
  const held = useHeldNotes();
  const pointerNotes = useRef(new Map<number, number>());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);

  // On narrow screens the keyboard scrolls horizontally: start centered.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [from, to]);

  useEffect(() => {
    const pn = pointerNotes.current;
    return () => {
      for (const midi of pn.values()) {
        noteOff(midi);
        emitNote({ type: 'off', midi, velocity: 0, source: 'screen' });
      }
      pn.clear();
    };
  }, []);

  const press = (midi: number, pointerId: number) => {
    void ensureAudio();
    pointerNotes.current.set(pointerId, midi);
    if (live) {
      noteOn(midi, 0.75);
      emitNote({ type: 'on', midi, velocity: 0.75, source: 'screen' });
    }
    onKey?.(midi);
    force((x) => x + 1);
  };
  const release = (pointerId: number) => {
    const midi = pointerNotes.current.get(pointerId);
    if (midi === undefined) return;
    pointerNotes.current.delete(pointerId);
    if (live) {
      noteOff(midi);
      emitNote({ type: 'off', midi, velocity: 0, source: 'screen' });
    }
    force((x) => x + 1);
  };

  const whiteW = 100 / whites.length;
  const whiteIndex = (m: number) => whites.indexOf(m);

  return (
    <div className="kb-scroll" ref={scrollRef}>
    <div
      className={`keyboard ${compact ? 'compact' : ''}`}
      style={{ minWidth: whites.length * (compact ? 24 : 32) }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {keys.map((m) => {
        const black = isBlack(m);
        const left = black ? (whiteIndex(m - 1) + 1) * whiteW - whiteW * 0.32 : whiteIndex(m) * whiteW;
        const mark = marks[m];
        const down = held.includes(m);
        const name = midiToName(m);
        return (
          <button
            key={m}
            type="button"
            aria-label={name}
            className={`key ${black ? 'black' : 'white'} ${mark ?? ''} ${down ? 'down' : ''}`}
            style={{ left: `${left}%`, width: `${black ? whiteW * 0.64 : whiteW}%` }}
            onPointerDown={(e) => {
              e.preventDefault();
              try {
                // allow pointerleave to fire when sliding off a key
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
              } catch {
                /* no active capture for this pointer */
              }
              press(m, e.pointerId);
            }}
            onPointerUp={(e) => release(e.pointerId)}
            onPointerCancel={(e) => release(e.pointerId)}
            onPointerLeave={(e) => release(e.pointerId)}
          >
            {(mark && showMarkedNames) || (labels && m % 12 === 0) ? (
              <span className="key-label">{mark && showMarkedNames ? name.replace(/\d+$/, '') : name}</span>
            ) : null}
          </button>
        );
      })}
    </div>
    </div>
  );
}
