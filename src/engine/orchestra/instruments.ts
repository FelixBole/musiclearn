/**
 * Orchestral instrument data: sounding ranges (MIDI), comfortable ranges, transpositions,
 * clefs and register character. Ranges are practical orchestral values, not extreme limits.
 */

export type Family = 'strings' | 'woodwinds' | 'brass' | 'keys';
export type SampleId = 'piano' | 'violins' | 'violas' | 'cellos' | 'basses' | 'horn' | 'trumpet' | 'trombone' | 'tuba' | 'flute' | 'oboe' | 'clarinet' | 'bassoon';

export interface Instrument {
  id: string;
  name: string;
  family: Family;
  /** sounding range [low, high], MIDI */
  range: [number, number];
  /** comfortable / most useful sounding range */
  comfortable: [number, number];
  /** written = sounding + transpose (semitones). Bb clarinet: +2, horn in F: +7, double bass: +12 */
  transpose: number;
  /** "in B♭", "in F", "sounds an octave lower" */
  transposeLabel?: string;
  clefs: string[];
  registers: { range: [number, number]; text: string }[];
  /** sample set used for playback (closest available) */
  sample: SampleId;
  /** GM program for MIDI export */
  program: number;
}

const I = (x: Instrument) => x;

export const INSTRUMENTS: Instrument[] = [
  I({
    id: 'violin',
    name: 'Violin',
    family: 'strings',
    range: [55, 100],
    comfortable: [55, 88],
    transpose: 0,
    clefs: ['treble'],
    registers: [
      { range: [55, 62], text: 'G string: dark, rich, intense; the “sul G” sound of passionate melodies.' },
      { range: [62, 81], text: 'Middle: the singing heart of the orchestra, agile and expressive.' },
      { range: [81, 100], text: 'High: brilliant, ethereal when soft, piercing when loud.' },
    ],
    sample: 'violins',
    program: 48,
  }),
  I({
    id: 'viola',
    name: 'Viola',
    family: 'strings',
    range: [48, 84],
    comfortable: [48, 79],
    transpose: 0,
    clefs: ['alto', 'treble'],
    registers: [
      { range: [48, 55], text: 'C string: dark, husky, a little nasal: perfect for brooding lines.' },
      { range: [55, 72], text: 'Middle: warm, veiled; the glue of string harmony.' },
      { range: [72, 84], text: 'High: intense and plaintive.' },
    ],
    sample: 'violas',
    program: 48,
  }),
  I({
    id: 'cello',
    name: 'Cello',
    family: 'strings',
    range: [36, 79],
    comfortable: [36, 72],
    transpose: 0,
    clefs: ['bass', 'tenor', 'treble'],
    registers: [
      { range: [36, 48], text: 'Low: deep, resonant bass foundation.' },
      { range: [48, 62], text: 'Middle: the most vocal, warm register: a “tenor singer”.' },
      { range: [62, 79], text: 'High (A string): soaring and passionate.' },
    ],
    sample: 'cellos',
    program: 48,
  }),
  I({
    id: 'bass',
    name: 'Double bass',
    family: 'strings',
    range: [28, 67],
    comfortable: [28, 55],
    transpose: 12,
    transposeLabel: 'sounds an octave lower than written',
    clefs: ['bass'],
    registers: [
      { range: [28, 40], text: 'Low: the floor of the orchestra; gives weight under the cellos.' },
      { range: [40, 55], text: 'Middle: clear, can carry bass lines on its own.' },
      { range: [55, 67], text: 'High: thin and rarely used in tutti.' },
    ],
    sample: 'basses',
    program: 43,
  }),
  I({
    id: 'flute',
    name: 'Flute',
    family: 'woodwinds',
    range: [60, 96],
    comfortable: [67, 91],
    transpose: 0,
    clefs: ['treble'],
    registers: [
      { range: [60, 67], text: 'Low: breathy, soft, mysterious; easily covered by the orchestra.' },
      { range: [67, 84], text: 'Middle: sweet, agile, the classic lyrical flute.' },
      { range: [84, 96], text: 'High: brilliant and penetrating; cuts through tutti.' },
    ],
    sample: 'flute',
    program: 73,
  }),
  I({
    id: 'oboe',
    name: 'Oboe',
    family: 'woodwinds',
    range: [58, 91],
    comfortable: [62, 86],
    transpose: 0,
    clefs: ['treble'],
    registers: [
      { range: [58, 64], text: 'Low: thick, honking, hard to play softly.' },
      { range: [64, 81], text: 'Middle: plaintive, pastoral, very expressive: the “lonely” solo.' },
      { range: [81, 91], text: 'High: thin and pinched.' },
    ],
    sample: 'oboe',
    program: 68,
  }),
  I({
    id: 'clarinet',
    name: 'Clarinet in B♭',
    family: 'woodwinds',
    range: [50, 91],
    comfortable: [52, 84],
    transpose: 2,
    transposeLabel: 'in B♭: sounds a major 2nd lower than written',
    clefs: ['treble'],
    registers: [
      { range: [50, 65], text: 'Chalumeau (low): dark, hollow, velvety.' },
      { range: [65, 71], text: 'Throat tones: weaker, slightly pale.' },
      { range: [71, 84], text: 'Clarion: clear, bright, singing.' },
      { range: [84, 91], text: 'Altissimo: shrill, use with care.' },
    ],
    sample: 'clarinet',
    program: 71,
  }),
  I({
    id: 'bassoon',
    name: 'Bassoon',
    family: 'woodwinds',
    range: [34, 75],
    comfortable: [36, 70],
    transpose: 0,
    clefs: ['bass', 'tenor'],
    registers: [
      { range: [34, 46], text: 'Low: reedy, powerful bass; also comic staccato.' },
      { range: [46, 62], text: 'Middle: warm and round; blends with horns and cellos.' },
      { range: [62, 75], text: 'High: haunting, strained (the famous high solo of “The Rite of Spring”).' },
    ],
    sample: 'bassoon',
    program: 70,
  }),
  I({
    id: 'horn',
    name: 'Horn in F',
    family: 'brass',
    range: [35, 77],
    comfortable: [41, 72],
    transpose: 7,
    transposeLabel: 'in F: sounds a perfect 5th lower than written',
    clefs: ['treble', 'bass'],
    registers: [
      { range: [35, 48], text: 'Low: dark, rough; good for pedal tones and menace.' },
      { range: [48, 67], text: 'Middle: noble, round, heroic: the classic film-score horn.' },
      { range: [67, 77], text: 'High: thrilling and strained; reserve for climaxes.' },
    ],
    sample: 'horn',
    program: 60,
  }),
  I({
    id: 'trumpet',
    name: 'Trumpet in B♭',
    family: 'brass',
    range: [52, 82],
    comfortable: [55, 79],
    transpose: 2,
    transposeLabel: 'in B♭: sounds a major 2nd lower than written',
    clefs: ['treble'],
    registers: [
      { range: [52, 60], text: 'Low: dark, weaker.' },
      { range: [60, 74], text: 'Middle: bright, heroic, fanfare.' },
      { range: [74, 82], text: 'High: brilliant, tiring; climactic.' },
    ],
    sample: 'trumpet',
    program: 56,
  }),
  I({
    id: 'trombone',
    name: 'Trombone',
    family: 'brass',
    range: [40, 72],
    comfortable: [43, 67],
    transpose: 0,
    clefs: ['bass', 'tenor'],
    registers: [
      { range: [40, 48], text: 'Low: heavy, dark, sinister.' },
      { range: [48, 65], text: 'Middle: noble, warm chorale tone; powerful fortissimo.' },
      { range: [65, 72], text: 'High: bright, intense, lyrical.' },
    ],
    sample: 'trombone',
    program: 57,
  }),
  I({
    id: 'tuba',
    name: 'Tuba',
    family: 'brass',
    range: [28, 65],
    comfortable: [31, 58],
    transpose: 0,
    clefs: ['bass'],
    registers: [
      { range: [28, 36], text: 'Low: huge, dark foundation of the brass.' },
      { range: [36, 50], text: 'Middle: round, solid bass; surprisingly agile.' },
      { range: [50, 65], text: 'High: soft and euphonium-like.' },
    ],
    sample: 'tuba',
    program: 58,
  }),
];

/** Extra transposing instruments (no samples) used in transposition drills. */
export const TRANSPOSERS: Pick<Instrument, 'id' | 'name' | 'transpose' | 'transposeLabel'>[] = [
  { id: 'clarinet', name: 'Clarinet in B♭', transpose: 2, transposeLabel: 'a major 2nd lower' },
  { id: 'trumpet', name: 'Trumpet in B♭', transpose: 2, transposeLabel: 'a major 2nd lower' },
  { id: 'horn', name: 'Horn in F', transpose: 7, transposeLabel: 'a perfect 5th lower' },
  { id: 'english-horn', name: 'English horn (in F)', transpose: 7, transposeLabel: 'a perfect 5th lower' },
  { id: 'clarinet-a', name: 'Clarinet in A', transpose: 3, transposeLabel: 'a minor 3rd lower' },
  { id: 'alto-sax', name: 'Alto sax (in E♭)', transpose: 9, transposeLabel: 'a major 6th lower' },
  { id: 'piccolo', name: 'Piccolo', transpose: -12, transposeLabel: 'an octave higher' },
  { id: 'bass', name: 'Double bass', transpose: 12, transposeLabel: 'an octave lower' },
];

export const instrumentById = (id: string) => INSTRUMENTS.find((i) => i.id === id);

/* ---------------- Ensembles: how four-part harmony is played by sections ---------------- */

export type EnsembleId = 'piano' | 'strings' | 'brass' | 'woodwinds' | 'orchestra';

/** Per SATB voice (bass, tenor, alto, soprano): instruments with octave offsets. */
export const ENSEMBLES: Record<EnsembleId, { name: string; voices: { sample: SampleId; octave?: number }[][] }> = {
  piano: { name: 'Piano', voices: [[{ sample: 'piano' }], [{ sample: 'piano' }], [{ sample: 'piano' }], [{ sample: 'piano' }]] },
  strings: {
    name: 'Strings',
    voices: [[{ sample: 'cellos' }, { sample: 'basses', octave: -1 }], [{ sample: 'violas' }], [{ sample: 'violins' }], [{ sample: 'violins' }]],
  },
  brass: { name: 'Brass', voices: [[{ sample: 'tuba' }], [{ sample: 'trombone' }], [{ sample: 'horn' }], [{ sample: 'trumpet' }]] },
  woodwinds: { name: 'Woodwinds', voices: [[{ sample: 'bassoon' }], [{ sample: 'clarinet' }], [{ sample: 'oboe' }], [{ sample: 'flute' }]] },
  orchestra: {
    name: 'Full orchestra',
    voices: [
      [{ sample: 'cellos' }, { sample: 'basses', octave: -1 }, { sample: 'bassoon' }],
      [{ sample: 'violas' }, { sample: 'horn' }],
      [{ sample: 'violins' }, { sample: 'horn' }],
      [{ sample: 'violins' }, { sample: 'flute', octave: 1 }],
    ],
  },
};

/** MIDI export: track names and GM programs per SATB voice (bass → soprano). */
export const ENSEMBLE_TRACKS: Record<EnsembleId, { names: string[]; programs: number[] }> = {
  piano: { names: ['Bass', 'Tenor', 'Alto', 'Soprano'], programs: [0, 0, 0, 0] },
  strings: { names: ['Cellos (+ basses 8vb)', 'Violas', 'Violins II', 'Violins I'], programs: [42, 41, 40, 40] },
  brass: { names: ['Tuba', 'Trombone', 'Horn', 'Trumpet'], programs: [58, 57, 60, 56] },
  woodwinds: { names: ['Bassoon', 'Clarinet', 'Oboe', 'Flute'], programs: [70, 71, 68, 73] },
  orchestra: { names: ['Low strings & bassoon', 'Violas & horn', 'Violins II & horn', 'Violins I & flute'], programs: [42, 41, 40, 40] },
};

export const ENSEMBLE_IDS = Object.keys(ENSEMBLES) as EnsembleId[];

const SAMPLE_RANGE: Record<SampleId, [number, number]> = {
  piano: [21, 108],
  violins: [55, 100],
  violas: [48, 84],
  cellos: [36, 79],
  basses: [28, 67],
  horn: [35, 77],
  trumpet: [52, 82],
  trombone: [40, 72],
  tuba: [28, 65],
  flute: [60, 96],
  oboe: [58, 91],
  clarinet: [50, 91],
  bassoon: [34, 75],
};

/** Notes (MIDI) → which samples play them, for an SATB voicing played by an ensemble. */
export function orchestrateSatb(voicing: number[], ensemble: EnsembleId): { midi: number; sample: SampleId }[] {
  const out: { midi: number; sample: SampleId }[] = [];
  const voices = ENSEMBLES[ensemble].voices;
  voicing.forEach((m, vi) => {
    for (const { sample, octave = 0 } of voices[Math.min(vi, voices.length - 1)]) {
      const midi = m + octave * 12;
      const [lo, hi] = SAMPLE_RANGE[sample];
      if (midi >= lo && midi <= hi) out.push({ midi, sample });
    }
  });
  return out;
}

/** Any set of notes → samples, choosing per note the section whose range fits (free voicings). */
export function orchestrateFree(notes: number[], ensemble: EnsembleId): { midi: number; sample: SampleId }[] {
  if (ensemble === 'piano') return notes.map((midi) => ({ midi, sample: 'piano' as SampleId }));
  const pool = [...new Set(ENSEMBLES[ensemble].voices.flat().map((v) => v.sample))];
  return [...notes]
    .sort((a, b) => a - b)
    .map((midi) => {
      const fits = pool.filter((s) => midi >= SAMPLE_RANGE[s][0] && midi <= SAMPLE_RANGE[s][1]);
      const cand = fits.length ? fits : pool;
      const best = cand.reduce((a, b) => {
        const ca = Math.abs(midi - (SAMPLE_RANGE[a][0] + SAMPLE_RANGE[a][1]) / 2);
        const cb = Math.abs(midi - (SAMPLE_RANGE[b][0] + SAMPLE_RANGE[b][1]) / 2);
        return cb < ca ? b : a;
      });
      return { midi, sample: best };
    });
}
