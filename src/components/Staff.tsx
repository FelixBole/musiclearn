import { useEffect, useRef, useState } from 'react';
import {
  Accidental,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
  type StemmableNote,
} from 'vexflow/bravura';
import { toMidi, vexKey } from '../engine/theory';

export type Clef = 'treble' | 'bass' | 'alto' | 'tenor' | 'grand';

export interface StaffItem {
  /** Scientific note names, e.g. ["C4","E4","G4"]. Empty = rest/spacer. */
  keys: string[];
  /** VexFlow duration: w h q 8 16 (default w for 1 item, q otherwise) */
  duration?: string;
  color?: string;
  /** For grand staff: force all keys to one staff. */
  staff?: 'upper' | 'lower';
}

export interface StaffProps {
  clef?: Clef;
  /** Major key tonic for key signature (e.g. "D", "Bb"). */
  keySig?: string;
  time?: string;
  /** Shorthand: "C4 E4 G4" (sequence) or "C4,E4,G4 D4,F4,A4" (chords). */
  notes?: string;
  items?: StaffItem[];
  /** Render all notes of `notes` as one chord. */
  chord?: boolean;
  /** CSS max width in px (the svg scales responsively) */
  maxWidth?: number;
  /** Scale factor for the notation size */
  scale?: number;
  className?: string;
}

let fontsReady: Promise<unknown> | null = null;
export function loadFonts() {
  if (!fontsReady) {
    fontsReady =
      typeof document !== 'undefined' && document.fonts
        ? Promise.all([document.fonts.load('30px Bravura'), document.fonts.load('12px Academico')]).catch(() => {})
        : Promise.resolve();
  }
  return fontsReady;
}

export function parseStaffNotes(notes: string, chord = false): StaffItem[] {
  const groups = notes.trim().split(/\s+/).filter(Boolean);
  if (chord) return [{ keys: groups.flatMap((g) => g.split(',')) }];
  return groups.map((g) => (g === '_' ? { keys: [] } : { keys: g.split(',') }));
}

export const INK = '#1d1a24';

function buildNote(keys: string[], duration: string, clef: string, color?: string): StemmableNote {
  if (keys.length === 0) return new GhostNote({ duration });
  const sorted = [...keys].sort((a, b) => toMidi(a) - toMidi(b));
  const n = new StaveNote({ keys: sorted.map(vexKey), duration, clef, autoStem: true });
  const c = color ?? INK;
  n.setStyle({ fillStyle: c, strokeStyle: c });
  return n;
}

export function Staff({
  clef = 'treble',
  keySig,
  time,
  notes,
  items,
  chord,
  maxWidth,
  scale = 1,
  className,
}: StaffProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadFonts().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const list: StaffItem[] = items ?? (notes ? parseStaffNotes(notes, chord) : []);
  const signature = JSON.stringify([clef, keySig, time, list]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    el.innerHTML = '';
    try {
      renderStaff(el, { clef, keySig, time, list, scale });
    } catch (err) {
      el.textContent = `⚠ notation error: ${(err as Error).message}`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready, scale]);

  return (
    <div
      className={`staff-paper ${className ?? ''}`}
      style={maxWidth ? { maxWidth } : undefined}
      ref={ref}
      aria-label={`Staff: ${list.map((i) => i.keys.join('+')).join(', ')}`}
      role="img"
    />
  );
}

function renderStaff(
  el: HTMLDivElement,
  opts: { clef: Clef; keySig?: string; time?: string; list: StaffItem[]; scale: number },
) {
  const { clef, keySig, time, list, scale } = opts;
  const grand = clef === 'grand';
  const clefs = grand ? ['treble', 'bass'] : [clef];
  const keySigWidth = keySig ? 12 + 11 * keySigCount(keySig) : 0;
  const perItem = list.length <= 1 ? 90 : Math.max(44, list.some((i) => i.keys.length > 2) ? 56 : 46);
  const width = Math.max(200, 80 + keySigWidth + (time ? 30 : 0) + perItem * Math.max(1, list.length) + 20);
  const staveGap = 100;
  const top = 30;
  const height = top + (grand ? staveGap : 0) + 110;

  // Draw at logical size; the SVG viewBox + CSS handle scaling responsively.
  const renderer = new Renderer(el, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.setFillStyle(INK);
  ctx.setStrokeStyle(INK);

  const staves = clefs.map((c, i) => {
    const s = new Stave(10, top + i * staveGap, width - 20);
    s.addClef(c);
    if (keySig) s.addKeySignature(keySig);
    if (time) s.addTimeSignature(time);
    s.setContext(ctx).draw();
    return s;
  });

  if (grand) {
    new StaveConnector(staves[0], staves[1]).setType('brace').setContext(ctx).draw();
    new StaveConnector(staves[0], staves[1]).setType('singleLeft').setContext(ctx).draw();
  }

  if (list.length > 0) {
    const defaultDur = list.length === 1 ? 'w' : 'q';
    const voices = clefs.map((c, si) => {
      const tickables = list.map((item) => {
        let keys = item.keys;
        if (grand) {
          const upper = (k: string) => (item.staff ? item.staff === 'upper' : toMidi(k) >= 60);
          keys = item.keys.filter((k) => (si === 0 ? upper(k) : !upper(k)));
        }
        return buildNote(keys, item.duration ?? defaultDur, c, item.color);
      });
      const v = new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT);
      v.addTickables(tickables);
      return v;
    });
    Accidental.applyAccidentals(voices, keySig ?? 'C');
    const formatter = new Formatter();
    voices.forEach((v) => formatter.joinVoices([v]));
    const available = staves[0].getNoteEndX() - staves[0].getNoteStartX() - 20;
    formatter.format(voices, available);
    voices.forEach((v, i) => v.draw(ctx, staves[i]));
  }

  const svg = el.querySelector('svg');
  if (svg) {
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.maxWidth = `${width * scale * 1.4}px`;
  }
}

function keySigCount(keySig: string): number {
  const counts: Record<string, number> = {
    C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
    F: 1, Bb: 2, Eb: 3, Ab: 4, Db: 5, Gb: 6, Cb: 7,
  };
  return counts[keySig] ?? 2;
}
