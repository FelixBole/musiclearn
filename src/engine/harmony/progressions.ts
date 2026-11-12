/**
 * Functional progression generator (a small Markov grammar of tonal harmony).
 */
import type { Rng } from '../rng';

export type Cadence = 'PAC' | 'IAC' | 'HC' | 'plagal' | 'deceptive';

export const CADENCE_INFO: Record<Cadence, { name: string; desc: string }> = {
  PAC: { name: 'Perfect authentic', desc: 'V → I, both root position, soprano ends on the tonic: full stop.' },
  IAC: { name: 'Imperfect authentic', desc: 'V → I but weaker: soprano not on the tonic (or an inversion). A comma.' },
  HC: { name: 'Half cadence', desc: 'Ends on V: a question, an open door.' },
  plagal: { name: 'Plagal', desc: 'IV → I: the “Amen”, warm and hymn-like.' },
  deceptive: { name: 'Deceptive', desc: 'V → vi: the ear expects I and gets a surprise.' },
};

/** Allowed next chords for each chord (major key). */
const MAJOR_NEXT: Record<string, string[]> = {
  I: ['IV', 'ii', 'vi', 'V', 'I6', 'iii'],
  I6: ['IV', 'ii', 'ii6', 'V', 'V6'],
  ii: ['V', 'V7', 'I64'],
  ii6: ['V', 'V7', 'I64'],
  ii7: ['V', 'V7'],
  ii65: ['V', 'V7', 'I64'],
  iii: ['vi', 'IV'],
  IV: ['V', 'I', 'ii', 'I64', 'V7'],
  IV6: ['V6', 'V'],
  V: ['I', 'vi', 'I6'],
  V6: ['I'],
  V7: ['I', 'vi'],
  V65: ['I'],
  I64: ['V', 'V7'],
  vi: ['IV', 'ii', 'ii6', 'V'],
};

const MINOR_NEXT: Record<string, string[]> = {
  i: ['iv', 'VI', 'V', 'ii°6', 'i6'],
  i6: ['iv', 'ii°6', 'V'],
  iv: ['V', 'i', 'V7'],
  'ii°6': ['V', 'V7'],
  VI: ['iv', 'ii°6', 'V'],
  V: ['i', 'VI'],
  V7: ['i', 'VI'],
  III: ['VI', 'iv'],
};

export interface ProgressionSpec {
  minor: boolean;
  /** chords allowed in the body of the progression */
  vocabulary: string[];
  length: number;
  cadence?: Cadence;
}

const CADENCE_END: Record<Cadence, { major: string[]; minor: string[] }> = {
  PAC: { major: ['V', 'I'], minor: ['V', 'i'] },
  IAC: { major: ['V', 'I'], minor: ['V', 'i'] },
  HC: { major: ['V'], minor: ['V'] },
  plagal: { major: ['IV', 'I'], minor: ['iv', 'i'] },
  deceptive: { major: ['V', 'vi'], minor: ['V', 'VI'] },
};

/** Generate a progression that starts on the tonic and obeys the grammar. */
export function generateProgression(spec: ProgressionSpec, rng: Rng): string[] {
  const table = spec.minor ? MINOR_NEXT : MAJOR_NEXT;
  const tonic = spec.minor ? 'i' : 'I';
  const end = spec.cadence ? CADENCE_END[spec.cadence][spec.minor ? 'minor' : 'major'] : [];
  for (let attempt = 0; attempt < 500; attempt++) {
    const out = [tonic];
    const bodyLen = spec.length - end.length;
    let ok = true;
    while (out.length < bodyLen) {
      const opts = (table[out[out.length - 1]] ?? []).filter((c) => spec.vocabulary.includes(c) && c !== out[out.length - 1]);
      if (!opts.length) {
        ok = false;
        break;
      }
      out.push(rng.pick(opts));
    }
    if (!ok) continue;
    if (end.length) {
      const last = out[out.length - 1];
      const first = end[0];
      if (last === first) continue;
      if (!(table[last] ?? []).includes(first) && !(first === 'V' && ['I', tonic].includes(last))) continue;
      out.push(...end);
    }
    if (out.length === spec.length) return out;
  }
  throw new Error('Could not generate a progression for the given spec');
}

export { MAJOR_NEXT, MINOR_NEXT };
