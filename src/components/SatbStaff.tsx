import { useEffect, useRef, useState } from 'react';
import { Accidental, Annotation, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, Stem, Voice, type StemmableNote } from 'vexflow/bravura';
import { vexKey } from '../engine/theory';
import { INK, loadFonts } from './Staff';

export interface SatbStaffProps {
  /** per chord: [bass, tenor, alto, soprano] note names; null = empty voice / chord */
  chords: ((string | null)[] | null)[];
  /** Roman numeral (or other) label under each chord */
  labels?: (string | undefined)[];
  /** major-key tonic for the key signature */
  keySig?: string;
  /** colors: key `${chordIndex}:${voiceIndex}` (voice 0 = bass … 3 = soprano) */
  colors?: Record<string, string>;
  maxWidth?: number;
  /** index of the chord being played (-1 / undefined = none). Moves a bar, no re-render. */
  playhead?: number;
}

/**
 * Four-part chorale notation: soprano (stems up) + alto (down) on the treble staff,
 * tenor (up) + bass (down) on the bass staff, labels under the bass.
 */
export function SatbStaff({ chords, labels, keySig, colors = {}, maxWidth = 520, playhead = -1 }: SatbStaffProps) {
  const ref = useRef<HTMLDivElement>(null);
  const xs = useRef<number[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadFonts().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  const sig = JSON.stringify([chords, labels, keySig, colors]);
  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    el.innerHTML = '';
    try {
      xs.current = render(el, chords, labels, keySig, colors);
    } catch (e) {
      el.textContent = `⚠ notation error: ${(e as Error).message}`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ready]);
  // the playhead only moves an existing <rect>: playing never rebuilds the notation
  useEffect(() => {
    const rect = ref.current?.querySelector<SVGRectElement>('rect.satb-playhead');
    if (!rect) return;
    const x = xs.current[playhead];
    if (playhead < 0 || x === undefined) rect.setAttribute('visibility', 'hidden');
    else {
      rect.setAttribute('x', String(x - 15));
      rect.setAttribute('visibility', 'visible');
    }
  }, [playhead, sig, ready]);
  return <div className="staff-paper" style={{ maxWidth }} ref={ref} role="img" aria-label="Four-part chorale" />;
}

function render(
  el: HTMLDivElement,
  chords: ((string | null)[] | null)[],
  labels: (string | undefined)[] | undefined,
  keySig: string | undefined,
  colors: Record<string, string>,
): number[] {
  const n = Math.max(1, chords.length);
  const keyW = keySig ? 70 : 0;
  const width = Math.max(220, 90 + keyW + n * 62);
  const height = 270;
  const renderer = new Renderer(el, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.setFillStyle(INK);
  ctx.setStrokeStyle(INK);
  const treble = new Stave(10, 20, width - 20).addClef('treble');
  const bass = new Stave(10, 130, width - 20).addClef('bass');
  if (keySig) {
    treble.addKeySignature(keySig);
    bass.addKeySignature(keySig);
  }
  treble.setContext(ctx).draw();
  bass.setContext(ctx).draw();
  new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
  new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
  new StaveConnector(treble, bass).setType('singleRight').setContext(ctx).draw();

  // voice index → (clef, stem)
  const spec = [
    { clef: 'bass', stem: Stem.DOWN },
    { clef: 'bass', stem: Stem.UP },
    { clef: 'treble', stem: Stem.DOWN },
    { clef: 'treble', stem: Stem.UP },
  ];
  const voices = spec.map(({ clef, stem }, vi) => {
    const notes: StemmableNote[] = chords.map((ch, ci) => {
      const name = ch?.[vi];
      if (!name) {
        // empty chord slot: show a "?" under the bass for placeholders
        const g = new GhostNote({ duration: 'q' });
        return g;
      }
      const note = new StaveNote({ keys: [vexKey(name)], duration: 'q', clef, stemDirection: stem });
      const c = colors[`${ci}:${vi}`] ?? INK;
      note.setStyle({ fillStyle: c, strokeStyle: c });
      if (vi === 0 && labels?.[ci]) {
        note.addModifier(new Annotation(labels[ci]!).setVerticalJustification(Annotation.VerticalJustify.BOTTOM), 0);
      }
      return note;
    });
    return new Voice({ numBeats: Math.max(1, n), beatValue: 4 }).setMode(Voice.Mode.SOFT).addTickables(notes);
  });
  Accidental.applyAccidentals([voices[2], voices[3]], keySig ?? 'C');
  Accidental.applyAccidentals([voices[0], voices[1]], keySig ?? 'C');
  const f = new Formatter();
  f.joinVoices([voices[2], voices[3]]);
  f.joinVoices([voices[0], voices[1]]);
  f.format(voices, treble.getNoteEndX() - treble.getNoteStartX() - 16);
  voices[3].draw(ctx, treble);
  voices[2].draw(ctx, treble);
  voices[1].draw(ctx, bass);
  voices[0].draw(ctx, bass);

  // labels for empty slots (placeholders) drawn as plain text
  chords.forEach((ch, ci) => {
    if (ch && ch[0]) return;
    const label = labels?.[ci];
    if (!label) return;
    const x = voices[0].getTickables()[ci].getAbsoluteX();
    ctx.save();
    ctx.setFont('Academico', 13);
    ctx.fillText(label, x - 4, 250);
    ctx.restore();
  });

  const xs = voices[0].getTickables().map((t) => t.getAbsoluteX() + 6);
  const svg = el.querySelector('svg');
  if (svg) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'satb-playhead');
    rect.setAttribute('y', '12');
    rect.setAttribute('width', '30');
    rect.setAttribute('height', String(height - 52));
    rect.setAttribute('stroke', 'none');
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', 'rgba(47, 111, 223, 0.18)');
    rect.setAttribute('visibility', 'hidden');
    svg.insertBefore(rect, svg.firstChild);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.maxWidth = `${width * 1.5}px`;
  }
  return xs;
}
