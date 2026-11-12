/** Shared data for the progression playground and the passing-chord explorer. */
import { parseKeyName } from '../../engine/harmony/sequence';
import type { KeyCtx } from '../../engine/harmony/roman';
import { keyName } from '../../engine/theory';

/** Key codes: uppercase = major, lowercase = minor (same as "G:" / "g:" in progression text). */
export const KEY_CODES = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'a', 'e', 'b', 'f#', 'c#', 'd', 'g', 'c', 'f', 'bb'];

export const keyFromCode = (code: string): KeyCtx => {
  try {
    return parseKeyName(code);
  } catch {
    return { tonic: 'C', minor: false };
  }
};
export const codeFromKey = (k: KeyCtx) => (k.minor ? k.tonic.toLowerCase() : k.tonic);
export const keyCodeLabel = (code: string) => {
  const k = keyFromCode(code);
  return keyName(k.tonic, k.minor);
};

export interface Palette {
  id: string;
  label: string;
  chords: string[];
}

/** Chord buttons for quick entry (tap to append). */
export function palettes(minor: boolean): Palette[] {
  return minor
    ? [
        { id: 'dia', label: 'Diatonic', chords: ['i', 'ii°', 'III', 'iv', 'v', 'V', 'VI', 'VII', 'vii°', 'i6', 'i64', 'iv6', 'ii°6', 'V7', 'V65', 'V43', 'vii°7', 'iiø7'] },
        { id: 'app', label: 'Applied', chords: ['V/III', 'V/iv', 'V7/iv', 'V/V', 'V7/V', 'V/VI', 'V/VII', 'vii°7/V', 'vii°7/iv'] },
        { id: 'mix', label: 'Modal', chords: ['I', 'IV', 'bII', 'II', 'VII', 'v', 'i°'] },
        { id: 'chr', label: 'Chromatic', chords: ['N6', 'It+6', 'Fr+6', 'Ger+6', 'ct°7', 'Vsus4', 'V7sus4', 'isus4'] },
        { id: 'key', label: 'Keys', chords: ['C:', 'G:', 'F:', 'a:', 'e:', 'd:', 'c:', 'g:'] },
      ]
    : [
        { id: 'dia', label: 'Diatonic', chords: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I6', 'I64', 'ii6', 'IV6', 'V6', 'V7', 'V65', 'V43', 'V42', 'ii7', 'ii65', 'vii°7'] },
        { id: 'app', label: 'Applied', chords: ['V/ii', 'V7/ii', 'V/iii', 'V/IV', 'V7/IV', 'V/V', 'V7/V', 'V65/V', 'V/vi', 'V7/vi', 'vii°7/V', 'vii°7/ii', 'vii°7/vi'] },
        { id: 'mix', label: 'Borrowed', chords: ['i', 'iv', 'iv6', 'bVI', 'bVII', 'bIII', 'ii°', 'iiø7', 'iiø65', 'v'] },
        { id: 'chr', label: 'Chromatic', chords: ['N6', 'It+6', 'Fr+6', 'Ger+6', 'ct°7', 'III', 'VI', 'II', 'bII', 'Vsus4', 'V7sus4', 'Isus4'] },
        { id: 'key', label: 'Keys', chords: ['C:', 'G:', 'D:', 'F:', 'Bb:', 'a:', 'e:', 'd:', 'c:'] },
      ];
}

export interface Preset {
  name: string;
  key: string;
  text: string;
  note: string;
}

/** Starting points with a game/film flavour; every one must voice without errors (tested). */
export const PRESETS: Preset[] = [
  { name: 'Epic minor loop', key: 'a', text: 'i VI III VII', note: 'The modern “epic” loop: no dominant, all major chords around a minor tonic.' },
  { name: 'Victory cadence', key: 'C', text: 'I IV bVI bVII I', note: '♭VI–♭VII–I: the triumphant borrowed-chord climb.' },
  { name: 'Heroic Mixolydian', key: 'D', text: 'I bVII IV I', note: 'Adventure and folk-rock: ♭VII instead of V.' },
  { name: 'Sad battle loop', key: 'd', text: 'i iv VI V', note: 'Minor loop with a real leading tone at the end: drives back to i.' },
  { name: 'Chromatic mediant wonder', key: 'C', text: 'I bVI I III IV I', note: 'Common-tone jumps by thirds: the “discovery” sound.' },
  { name: 'Lydian flight', key: 'F', text: 'I II I II I', note: 'Major II = raised 4th: floating, magical.' },
  { name: 'Dorian hope', key: 'd', text: 'i IV i IV VII i', note: 'Minor with a major IV: noble, unbroken.' },
  { name: 'Phrygian menace', key: 'e', text: 'i bII i bII i', note: 'The lowered 2nd: dark, exotic, threatening.' },
  { name: 'Romantic cadence', key: 'C', text: 'I vi IV Ger+6 I64 V7 I', note: 'German augmented 6th into the cadential 6/4.' },
  { name: 'Neapolitan drama', key: 'c', text: 'i iv N6 V7 i', note: 'The Neapolitan 6th: tragic, operatic.' },
  { name: 'Secondary dominants', key: 'C', text: 'I V7/vi vi V7/IV IV V65/V V I', note: 'Each chord borrows its own dominant.' },
  { name: 'Pivot modulation C → G', key: 'C', text: 'I IV vi=G:ii V7 I', note: 'vi in C is ii in G: the pivot chord.' },
  { name: 'Pachelbel', key: 'D', text: 'I V vi iii IV I IV V I', note: 'The descending pattern behind a thousand ballads.' },
  { name: 'Lament bass (minor)', key: 'a', text: 'i v6 iv6 V', note: 'A bass descending step by step from tonic to dominant: grief.' },
];
