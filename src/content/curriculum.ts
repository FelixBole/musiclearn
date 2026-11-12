import type { ComponentType } from 'react';
import type { PlayMode } from '../components/Play';
import type { Clef } from '../components/Staff';

export interface CardDef {
  key: string;
  front: string;
  back: string;
  /** optional audio on the front */
  play?: { notes: string; mode: PlayMode };
  /** optional notation on the front */
  staff?: { clef?: Clef; notes?: string; keySig?: string; chord?: boolean };
}

export interface LessonDef {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  /** exercise ids unlocked/suggested after this lesson */
  unlocks?: string[];
  cards: CardDef[];
}

export interface UnitDef {
  id: string;
  title: string;
  lessons: LessonDef[];
  /** planned lessons not yet written (shown as roadmap) */
  planned?: string[];
}

export interface TrackDef {
  id: 'A' | 'B' | 'C' | 'D';
  title: string;
  subtitle: string;
  units: UnitDef[];
}

/* ------------------------------------------------------------------ */

export const TRACKS: TrackDef[] = [
  {
    id: 'A',
    title: 'Foundations',
    subtitle: 'Reading, intervals, scales, keys and chords — the vocabulary everything else is built on.',
    units: [
      {
        id: 'u1',
        title: '1 · Reading pitch',
        lessons: [
          {
            id: 'a1-staff-treble',
            title: 'The staff & treble clef',
            minutes: 5,
            summary: 'Lines, spaces, the G clef and middle C.',
            unlocks: ['note-reading'],
            cards: [
              { key: 'treble-lines', front: 'Treble clef lines, bottom to top?', back: 'E G B D F ("Every Good Boy Does Fine")', staff: { clef: 'treble', notes: 'E4 G4 B4 D5 F5' } },
              { key: 'treble-spaces', front: 'Treble clef spaces, bottom to top?', back: 'F A C E ("FACE")', staff: { clef: 'treble', notes: 'F4 A4 C5 E5' } },
              { key: 'g-clef', front: 'Why is the treble clef called the G clef?', back: 'Its curl wraps around the 2nd line, marking that line as G4 (the G above middle C).' },
              { key: 'middle-c-treble', front: 'Name this note', back: 'Middle C (C4) — one ledger line below the treble staff.', staff: { clef: 'treble', notes: 'C4' } },
            ],
          },
          {
            id: 'a1-bass-grand',
            title: 'Bass clef & the grand staff',
            minutes: 5,
            summary: 'The F clef, and how treble and bass connect through middle C.',
            unlocks: ['note-reading'],
            cards: [
              { key: 'bass-lines', front: 'Bass clef lines, bottom to top?', back: 'G B D F A ("Good Boys Do Fine Always")', staff: { clef: 'bass', notes: 'G2 B2 D3 F3 A3' } },
              { key: 'bass-spaces', front: 'Bass clef spaces, bottom to top?', back: 'A C E G ("All Cows Eat Grass")', staff: { clef: 'bass', notes: 'A2 C3 E3 G3' } },
              { key: 'f-clef', front: 'Which line do the two dots of the bass clef surround?', back: 'The 4th line — F3, the F below middle C.' },
              { key: 'middle-c-bass', front: 'Name this note', back: 'Middle C (C4) — one ledger line above the bass staff.', staff: { clef: 'bass', notes: 'C4' } },
            ],
          },
          {
            id: 'a1-accidentals',
            title: 'Sharps, flats & octave names',
            minutes: 6,
            summary: 'Half and whole steps, accidentals, enharmonics — and why your DAW might call middle C “C3”.',
            unlocks: ['note-reading'],
            cards: [
              { key: 'half-step', front: 'Where are the natural half steps (no black key between)?', back: 'E–F and B–C' },
              { key: 'enharmonic', front: 'What is an enharmonic equivalent?', back: 'Same pitch, different name: C♯ = D♭, E♯ = F, B = C♭.' },
              { key: 'acc-bar', front: 'How long does an accidental last?', back: 'Until the end of the bar, for that line/space (same octave). The barline cancels it.' },
              { key: 'octave-names', front: 'Middle C in scientific pitch notation?', back: 'C4. (Some DAWs label it C3 — Ableton, Cubase/Logic default — FL Studio uses C5.)' },
            ],
          },
          {
            id: 'a1-c-clefs',
            title: 'C clefs: alto & tenor',
            minutes: 6,
            summary: 'Read viola, cello, bassoon and trombone parts.',
            unlocks: ['note-reading'],
            cards: [
              { key: 'alto-middle', front: 'In alto clef, which line is middle C?', back: 'The middle (3rd) line. Used by the viola.', staff: { clef: 'alto', notes: 'C4' } },
              { key: 'tenor-middle', front: 'In tenor clef, which line is middle C?', back: 'The 4th line. Used for high cello, bassoon and trombone passages.', staff: { clef: 'tenor', notes: 'C4' } },
              { key: 'why-c-clefs', front: 'Why do C clefs exist?', back: 'To keep an instrument’s range on the staff without lots of ledger lines.' },
            ],
          },
        ],
      },
      {
        id: 'u2',
        title: '2 · Rhythm & meter',
        lessons: [
          {
            id: 'a2-note-values',
            title: 'Note values, rests, dots & ties',
            minutes: 5,
            summary: 'How long notes last, and how to write it.',
            cards: [
              { key: 'values', front: 'How many eighth notes in a half note?', back: '4 (half = 2 quarters = 4 eighths).' },
              { key: 'dot', front: 'What does a dot after a note do?', back: 'Adds half of the note’s value: dotted quarter = quarter + eighth (1.5 beats).' },
              { key: 'tie', front: 'Tie vs slur?', back: 'A tie joins two notes of the SAME pitch into one sound; a slur groups DIFFERENT pitches to be played legato.' },
            ],
          },
          {
            id: 'a2-meter',
            title: 'Meter: simple, compound & odd',
            minutes: 6,
            summary: '4/4 vs 6/8 vs 3/4, syncopation and tuplets.',
            cards: [
              { key: 'simple-compound', front: 'Simple vs compound meter?', back: 'Simple: beats divide in 2 (2/4, 3/4, 4/4). Compound: beats divide in 3 (6/8, 9/8, 12/8) — top number ÷ 3 = beats.' },
              { key: '68-34', front: '6/8 vs 3/4 — same 6 eighths, what differs?', back: '6/8 = 2 beats of 3 eighths (ONE-two-three FOUR-five-six). 3/4 = 3 beats of 2 eighths.' },
              { key: 'syncopation', front: 'What is syncopation?', back: 'Accenting a weak beat or off-beat — e.g. a note starting on the “and” held across the next beat.' },
              { key: 'triplet', front: 'What is a triplet?', back: 'Three notes in the time of two of the same value.' },
            ],
          },
        ],
      },
      {
        id: 'u3',
        title: '3 · Intervals',
        lessons: [
          {
            id: 'a3-interval-size',
            title: 'Interval size',
            minutes: 5,
            summary: 'Count letter names — the 3rd, 5th, octave.',
            unlocks: ['interval-reading', 'interval-ear'],
            cards: [
              { key: 'count', front: 'How do you find an interval’s number?', back: 'Count letter names from the lower to upper note, including both. C→G = C D E F G = 5th.' },
              { key: 'line-space', front: 'Both notes on lines (or both in spaces), one line apart — which interval?', back: 'A 3rd. Line-to-adjacent-line or space-to-adjacent-space = 3rd.', staff: { clef: 'treble', notes: 'E4,G4', chord: true } },
              { key: 'P5-sound', front: 'Name the interval', back: 'Perfect 5th — Star Wars opening leap.', play: { notes: 'C4 G4', mode: 'melody' } },
              { key: 'P8-sound', front: 'Name the interval', back: 'Octave — “Some-where” over the rainbow.', play: { notes: 'C4 C5', mode: 'melody' } },
            ],
          },
          {
            id: 'a3-interval-quality',
            title: 'Interval quality',
            minutes: 7,
            summary: 'Major, minor, perfect, augmented, diminished — and inversion.',
            unlocks: ['interval-reading', 'interval-ear'],
            cards: [
              { key: 'perfect-family', front: 'Which interval numbers are “perfect” types?', back: 'Unison, 4th, 5th, octave (1, 4, 5, 8). The rest (2, 3, 6, 7) are major/minor.' },
              { key: 'semis-M3', front: 'Semitones in a major 3rd / minor 3rd?', back: 'M3 = 4, m3 = 3.' },
              { key: 'semis-P5', front: 'Semitones in a P4 / P5 / tritone?', back: 'P4 = 5, P5 = 7, tritone (A4/d5) = 6.' },
              { key: 'inversion', front: 'Interval inversion rule?', back: 'Numbers add to 9 (3rd ↔ 6th); major ↔ minor, aug ↔ dim, perfect stays perfect.' },
              { key: 'M6-sound', front: 'Name the interval', back: 'Major 6th — “My Bon-nie”.', play: { notes: 'G3 E4', mode: 'melody' } },
              { key: 'm3-sound', front: 'Name the interval', back: 'minor 3rd — Greensleeves / Smoke on the Water.', play: { notes: 'A3 C4', mode: 'melody' } },
            ],
          },
        ],
      },
      {
        id: 'u4',
        title: '4 · Scales & keys',
        lessons: [
          {
            id: 'a4-major-scale',
            title: 'The major scale & scale degrees',
            minutes: 6,
            summary: 'W-W-H-W-W-W-H, degree names and solfège.',
            unlocks: ['scale-degree-ear'],
            cards: [
              { key: 'pattern', front: 'Major scale step pattern?', back: 'W W H W W W H' },
              { key: 'degree-names', front: 'Names of scale degrees 1–7?', back: 'Tonic, Supertonic, Mediant, Subdominant, Dominant, Submediant, Leading tone.' },
              { key: 'leading-tone', front: 'Why is degree 7 called the leading tone?', back: 'It is a half step below the tonic and strongly “leads” (resolves) up to it.' },
              { key: 'D-major', front: 'Spell D major', back: 'D E F♯ G A B C♯ D' },
            ],
          },
          {
            id: 'a4-key-signatures',
            title: 'Key signatures & the circle of fifths',
            minutes: 7,
            summary: 'Read any key at a glance.',
            unlocks: ['key-signatures'],
            cards: [
              { key: 'sharp-order', front: 'Order of sharps?', back: 'F C G D A E B (“Father Charles Goes Down And Ends Battle”)' },
              { key: 'flat-order', front: 'Order of flats?', back: 'B E A D G C F (sharps reversed: “BEAD Greatest Common Factor”)' },
              { key: 'sharp-trick', front: 'Sharp keys: how to find the key name?', back: 'Last sharp + a half step. (F♯ C♯ G♯ → A major.)' },
              { key: 'flat-trick', front: 'Flat keys: how to find the key name?', back: 'Second-to-last flat. (B♭ E♭ A♭ → E♭ major.) One flat = F major.' },
              { key: 'ks-Eb', front: 'Which major key?', back: 'E♭ major (3 flats)', staff: { clef: 'treble', keySig: 'Eb' } },
              { key: 'ks-A', front: 'Which major key?', back: 'A major (3 sharps)', staff: { clef: 'treble', keySig: 'A' } },
            ],
          },
          {
            id: 'a4-minor',
            title: 'Minor scales: natural, harmonic, melodic',
            minutes: 7,
            summary: 'Relative & parallel minor, and why the harmonic minor sounds so epic.',
            unlocks: ['key-signatures', 'scale-degree-ear'],
            cards: [
              { key: 'relative', front: 'How do you find the relative minor of a major key?', back: 'Go down a minor 3rd (or up to degree 6). C major → A minor; same key signature.' },
              { key: 'parallel', front: 'What is the parallel minor of C major?', back: 'C minor — same tonic, different key signature (3 flats).' },
              { key: 'harmonic-minor', front: 'Harmonic minor = natural minor with…?', back: 'A raised 7th (leading tone). Creates the major V chord and the exotic augmented 2nd between 6 and 7.' },
              { key: 'melodic-minor', front: 'Melodic minor (classical) = natural minor with…?', back: 'Raised 6th and 7th ascending; natural minor descending.' },
              { key: 'hm-sound', front: 'Which scale?', back: 'A harmonic minor (G♯ leading tone; augmented 2nd F–G♯).', play: { notes: 'A3 B3 C4 D4 E4 F4 G#4 A4', mode: 'melody' } },
            ],
          },
        ],
      },
      {
        id: 'u5',
        title: '5 · Chords',
        lessons: [
          {
            id: 'a5-triads',
            title: 'Triads: four qualities',
            minutes: 6,
            summary: 'Stacking thirds: major, minor, diminished, augmented.',
            unlocks: ['chord-spelling', 'chord-quality-ear'],
            cards: [
              { key: 'maj-triad', front: 'Major triad = which thirds?', back: 'Major 3rd + minor 3rd (root–M3–P5). C E G.' },
              { key: 'min-triad', front: 'Minor triad = which thirds?', back: 'minor 3rd + Major 3rd (root–m3–P5). A C E.' },
              { key: 'dim-triad', front: 'Diminished triad?', back: 'Two minor 3rds (root–m3–d5). B D F.' },
              { key: 'aug-triad', front: 'Augmented triad?', back: 'Two major 3rds (root–M3–A5). C E G♯.' },
              { key: 'q-maj', front: 'Which quality?', back: 'Major', play: { notes: 'F3 A3 C4', mode: 'chord' } },
              { key: 'q-dim', front: 'Which quality?', back: 'Diminished', play: { notes: 'B3 D4 F4', mode: 'chord' } },
            ],
          },
          {
            id: 'a5-diatonic',
            title: 'Diatonic chords & Roman numerals',
            minutes: 7,
            summary: 'The seven chords of a key: I ii iii IV V vi vii°.',
            unlocks: ['chord-spelling'],
            cards: [
              { key: 'major-qualities', front: 'Triad qualities in a major key?', back: 'I ii iii IV V vi vii° → Major on 1, 4, 5; minor on 2, 3, 6; diminished on 7.' },
              { key: 'minor-qualities', front: 'Triad qualities in a minor key (with harmonic-minor V)?', back: 'i ii° III iv V VI vii° — the V and vii° use the raised 7th.' },
              { key: 'roman-case', front: 'Uppercase vs lowercase Roman numerals?', back: 'Uppercase = major (V), lowercase = minor (ii), ° = diminished, + = augmented.' },
              { key: 'G-vi', front: 'What is vi in G major?', back: 'E minor (E G B).' },
              { key: 'F-IV', front: 'What is IV in F major?', back: 'B♭ major (B♭ D F).' },
            ],
          },
          {
            id: 'a5-inversions',
            title: 'Inversions, figured bass & slash chords',
            minutes: 6,
            summary: 'Which note is in the bass changes everything.',
            unlocks: ['chord-quality-ear'],
            cards: [
              { key: 'first-inv', front: 'First inversion = which note in the bass? Figured bass?', back: 'The 3rd. Figured “6” (e.g. I6). Slash: C/E.' },
              { key: 'second-inv', front: 'Second inversion = which note in the bass? Figured bass?', back: 'The 5th. Figured “6/4” (e.g. I64). Slash: C/G.' },
              { key: 'slash', front: 'What does G/B mean?', back: 'G major chord with B (its 3rd) in the bass — first inversion.' },
              { key: 'inv-why', front: 'Why use inversions?', back: 'Smoother bass lines (stepwise motion), lighter/less final sound, and variety without changing the harmony.' },
            ],
          },
          {
            id: 'a5-sevenths',
            title: 'Seventh chords',
            minutes: 7,
            summary: 'maj7, 7, m7, ø7, °7 — colour and tension.',
            unlocks: ['chord-spelling', 'chord-quality-ear'],
            cards: [
              { key: 'dom7', front: 'Dominant 7th = ?', back: 'Major triad + minor 7th (G B D F). Lives on V; wants to resolve to I.' },
              { key: 'maj7', front: 'Major 7th chord = ?', back: 'Major triad + major 7th (C E G B). Lush, on I and IV.' },
              { key: 'hd7', front: 'Half-diminished (ø7) = ?', back: 'Diminished triad + minor 7th (B D F A). vii in major, ii in minor.' },
              { key: 'dim7', front: 'Fully diminished (°7) = ?', back: 'Diminished triad + diminished 7th (B D F A♭) — all minor 3rds; vii°7 in minor.' },
              { key: 'q-dom7', front: 'Which seventh chord?', back: 'Dominant 7th', play: { notes: 'G3 B3 D4 F4', mode: 'chord' } },
              { key: 'q-maj7', front: 'Which seventh chord?', back: 'Major 7th', play: { notes: 'C4 E4 G4 B4', mode: 'chord' } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'B',
    title: 'Diatonic harmony',
    subtitle: 'Function, cadences, voice leading — how chords move.',
    units: [
      { id: 'u6', title: '6 · Function & cadences', lessons: [], planned: ['Tonic, predominant, dominant', 'Cadences: authentic, half, plagal, deceptive'] },
      { id: 'u7', title: '7 · Four-part voice leading', lessons: [], planned: ['SATB ranges & spacing', 'Doubling rules', 'Parallels & smooth motion', 'Voice leading for orchestral sections'] },
      { id: 'u8', title: '8 · Inversions in use', lessons: [], planned: ['First inversion in practice', 'The three 6/4 chords'] },
      { id: 'u9', title: '9 · Non-chord tones', lessons: [], planned: ['Passing & neighbor tones', 'Suspensions & appoggiaturas', 'Anticipations & pedal points'] },
      { id: 'u10', title: '10 · Diatonic sequences', lessons: [], planned: ['Descending fifths', 'Ascending 5–6', 'The Pachelbel sequence'] },
      { id: 'u11', title: '11 · Harmonizing melodies', lessons: [], planned: ['Choosing chords for a melody', 'Harmonic rhythm'] },
    ],
  },
  {
    id: 'C',
    title: 'Chromatic & modal harmony',
    subtitle: 'Secondary dominants, mixture, mediants, modes — the colours of epic music.',
    units: [
      { id: 'u12', title: '12 · Secondary dominants', lessons: [], planned: ['V/V and friends', 'Leading-tone chords & tonicization'] },
      { id: 'u13', title: '13 · Modulation', lessons: [], planned: ['Pivot chords', 'Common-tone & direct modulation'] },
      { id: 'u14', title: '14 · Modal mixture', lessons: [], planned: ['Borrowed chords: ♭VI ♭VII iv ♭III', 'The Picardy third'] },
      { id: 'u15', title: '15 · Neapolitan & augmented 6ths', lessons: [], planned: ['The Neapolitan', 'Italian, French & German 6ths'] },
      { id: 'u16', title: '16 · Cinematic harmony', lessons: [], planned: ['Chromatic mediants', 'Major↔minor shifts & minor plagal', 'Lydian IV and common-tone diminished'] },
      { id: 'u17', title: '17 · Modes', lessons: [], planned: ['The modes by colour', 'Modal cadences, pedals & ostinatos'] },
      { id: 'u18', title: '18 · Extended & hybrid harmony', lessons: [], planned: ['9ths, 11ths, 13ths', 'Sus, quartal & clusters', 'Polychords'] },
    ],
  },
  {
    id: 'D',
    title: 'Composer: orchestral & hybrid',
    subtitle: 'Ranges, voicing, texture, motif development and game-music form.',
    units: [
      { id: 'u19', title: '19 · Instruments', lessons: [], planned: ['Ranges & sweet spots', 'Transposing instruments'] },
      { id: 'u20', title: '20 · Orchestral voicing', lessons: [], planned: ['The harmonic series as a voicing guide', 'Doubling & avoiding mud'] },
      { id: 'u21', title: '21 · Texture & layering', lessons: [], planned: ['Melody / countermelody / pad / bass / ostinato', 'Strings, brass, woodwinds'] },
      { id: 'u22', title: '22 · Counterpoint for composers', lessons: [], planned: ['First & second species', 'Writing countermelodies'] },
      { id: 'u23', title: '23 · Leitmotif development', lessons: [], planned: ['Mode change & reharmonization', 'Augmentation, diminution, fragmentation'] },
      { id: 'u24', title: '24 · Game-music form', lessons: [], planned: ['Loops & stingers', 'Vertical layering & horizontal resequencing'] },
      { id: 'u25', title: '25 · Cue analysis', lessons: [], planned: ['Analysis templates'] },
    ],
  },
];

export const ALL_LESSONS: LessonDef[] = TRACKS.flatMap((t) => t.units.flatMap((u) => u.lessons));

export function findLesson(id: string) {
  for (const t of TRACKS)
    for (const u of t.units) {
      const i = u.lessons.findIndex((l) => l.id === id);
      if (i >= 0) return { track: t, unit: u, lesson: u.lessons[i] };
    }
  return undefined;
}

export function findCard(cardId: string): { lesson: LessonDef; card: CardDef } | undefined {
  const [lessonId, key] = cardId.split(':');
  const found = findLesson(lessonId);
  const card = found?.lesson.cards.find((c) => c.key === key);
  return found && card ? { lesson: found.lesson, card } : undefined;
}

/* Lesson bodies (MDX), lazy loaded */
const bodies = import.meta.glob<{ default: ComponentType<{ components?: Record<string, unknown> }> }>('./lessons/*.mdx');

export function loadLessonBody(id: string) {
  const loader = bodies[`./lessons/${id}.mdx`];
  if (!loader) return Promise.reject(new Error(`Lesson body not found: ${id}`));
  return loader();
}

export function nextLesson(completed: Set<string>): LessonDef | undefined {
  return ALL_LESSONS.find((l) => !completed.has(l.id));
}

/** Exercises unlocked by completed lessons. */
export function unlockedExercises(completed: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const l of ALL_LESSONS) if (completed.has(l.id)) for (const e of l.unlocks ?? []) out.add(e);
  return out;
}
