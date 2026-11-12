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
      {
        id: 'u6',
        title: '6 · Function & cadences',
        lessons: [
          {
            id: 'b6-function',
            title: 'Tonic, predominant, dominant',
            minutes: 7,
            summary: 'Why some progressions feel inevitable: the T → PD → D → T cycle.',
            unlocks: ['progression-ear'],
            cards: [
              { key: 'families', front: 'The three chord families in a major key?', back: 'Tonic: I (vi, iii) · Predominant: IV, ii · Dominant: V, vii°' },
              { key: 'cycle', front: 'The basic functional cycle?', back: 'T → PD → D → T (e.g. I – IV – V – I, I – ii – V – I).' },
              { key: 'retrogression', front: 'What is a retrogression?', back: 'Moving “backwards” in the cycle, e.g. V → IV. Common in rock and film music, avoided in classical style.' },
              { key: 'strong-root', front: 'Strongest root motions?', back: 'Down a 5th (V–I, ii–V), down a 3rd (I–vi), up a step (IV–V).' },
              { key: 'ii-sound', front: 'Which chord is the predominant here?', back: 'ii (D minor) — I – ii – V – I.', play: { notes: 'C3,G3,E4,C5 D3,A3,F4,D5 G2,B3,D4,G4 C3,C4,E4,C5', mode: 'progression' } },
            ],
          },
          {
            id: 'b6-cadences',
            title: 'Cadences',
            minutes: 7,
            summary: 'Musical punctuation: full stops, commas, questions and surprises.',
            unlocks: ['cadence-ear'],
            cards: [
              { key: 'pac', front: 'Perfect authentic cadence (PAC)?', back: 'V → I, both root position, soprano ends on the tonic. The strongest ending.' },
              { key: 'iac', front: 'Imperfect authentic cadence (IAC)?', back: 'V → I but weaker: soprano on 3 or 5, or an inverted chord.' },
              { key: 'hc', front: 'Half cadence (HC)?', back: 'Ends on V — sounds open, like a question.' },
              { key: 'plagal', front: 'Plagal cadence?', back: 'IV → I, the “Amen” cadence.' },
              { key: 'deceptive', front: 'Deceptive cadence?', back: 'V → vi: the ear expects I and gets the relative minor.' },
            ],
          },
        ],
      },
      {
        id: 'u7',
        title: '7 · Four-part voice leading',
        lessons: [
          {
            id: 'b7-satb',
            title: 'SATB: ranges, spacing & doubling',
            minutes: 8,
            summary: 'Four voices, one chord: where each voice lives and which note to double.',
            unlocks: ['roman-analysis'],
            cards: [
              { key: 'ranges', front: 'SATB ranges (approx.)?', back: 'Soprano C4–G5 · Alto G3–D5 · Tenor C3–G4 · Bass E2–C4' },
              { key: 'spacing', front: 'Spacing rule for upper voices?', back: 'No more than an octave between soprano–alto and alto–tenor. The tenor–bass gap can be wider.' },
              { key: 'doubling', front: 'Default doubling in a root-position triad?', back: 'Double the root. Never double the leading tone (or a chordal 7th).' },
              { key: 'complete', front: 'Which chord tone may be left out?', back: 'Only the 5th. The 3rd defines major/minor and must be present.' },
            ],
          },
          {
            id: 'b7-motion',
            title: 'Motion & parallels',
            minutes: 7,
            summary: 'Contrary motion, and why parallel 5ths and octaves were banned.',
            unlocks: ['error-spotting'],
            cards: [
              { key: 'motion-types', front: 'Four types of motion between two voices?', back: 'Parallel, similar, contrary, oblique (one voice holds).' },
              { key: 'why-parallels', front: 'Why avoid parallel 5ths and octaves (in part writing)?', back: 'The two voices fuse into one and lose their independence — four parts sound like three.' },
              { key: 'hidden', front: 'Direct (hidden) 5ths/octaves?', back: 'Outer voices move in the same direction INTO a 5th/octave with a leap in the soprano. Avoid in outer voices.' },
              { key: 'contrary', front: 'Best motion between bass and soprano?', back: 'Contrary motion — it keeps the outer voices independent and the texture clear.' },
            ],
          },
          {
            id: 'b7-connecting',
            title: 'Connecting chords smoothly',
            minutes: 8,
            summary: 'Common tones, shortest paths and tendency tones.',
            unlocks: ['voice-next'],
            cards: [
              { key: 'common-tone', front: 'First rule of smooth connection?', back: 'Keep common tones in the same voice; move the other voices to the nearest chord tone.' },
              { key: 'lt-res', front: 'How does the leading tone resolve in V → I?', back: 'Up a half step to the tonic (required in the soprano; an inner voice may drop to the 5th).' },
              { key: 'seventh-res', front: 'How does a chordal 7th resolve?', back: 'Down by step (F → E in G7 → C).' },
              { key: 'iv-v', front: 'IV → V has no common tones. How do the upper voices move?', back: 'In contrary motion to the bass (bass up, upper voices down to the nearest chord tones).' },
            ],
          },
          {
            id: 'b7-orchestra',
            title: 'Voice leading in the orchestra',
            minutes: 8,
            summary: 'From SATB to strings and brass — and when breaking the rules is the point.',
            cards: [
              { key: 'strings-satb', front: 'A string section as SATB?', back: 'Violin I = soprano, Violin II = alto, Viola = tenor, Cello (+ bass an octave lower) = bass.' },
              { key: 'doubling-vs-parallels', front: 'Is doubling a line in octaves a “parallel octaves” error?', back: 'No — orchestral doubling reinforces ONE line. Parallels matter between independent voices.' },
              { key: 'planing', front: 'What is planing (parallel chords)?', back: 'Moving a whole chord shape in parallel — deliberate parallel 5ths/triads for medieval, epic or impressionist colour.' },
            ],
          },
        ],
      },
      {
        id: 'u8',
        title: '8 · Inversions in use',
        lessons: [
          {
            id: 'b8-first-inversion',
            title: 'First inversion in practice',
            minutes: 6,
            summary: 'I6, V6, ii6: lighter chords and singing bass lines.',
            unlocks: ['progression-ear'],
            cards: [
              { key: 'ii6', front: 'Why is ii6 so common before V?', back: 'Its bass (scale degree 4) steps up to 5 — a strong, smooth predominant.' },
              { key: 'v6', front: 'V6 → I: bass motion?', back: 'Leading tone in the bass rises to the tonic (7 → 1).' },
              { key: 'first-inv-weight', front: 'How does a first-inversion chord feel compared to root position?', back: 'Lighter, less final — good mid-phrase, not for the final chord.' },
            ],
          },
          {
            id: 'b8-six-four',
            title: 'The three 6/4 chords',
            minutes: 7,
            summary: 'Cadential, passing and pedal 6/4 — the only safe ways to use second inversion.',
            cards: [
              { key: 'cad64', front: 'Cadential 6/4?', back: 'I64 → V (same bass note). The 6 and 4 above the bass fall to 5 and 3: really a decorated V.' },
              { key: 'pass64', front: 'Passing 6/4?', back: 'Bass passes by step between two positions of one chord: I – V64 – I6.' },
              { key: 'pedal64', front: 'Pedal (neighbour) 6/4?', back: 'Bass holds while upper voices move: I – IV64 – I.' },
            ],
          },
        ],
      },
      {
        id: 'u9',
        title: '9 · Non-chord tones',
        lessons: [
          {
            id: 'b9-passing-neighbor',
            title: 'Passing & neighbour tones',
            minutes: 6,
            summary: 'The notes between the chords that make lines sing.',
            cards: [
              { key: 'passing', front: 'Passing tone?', back: 'A non-chord tone that connects two chord tones by step in the same direction.' },
              { key: 'neighbor', front: 'Neighbour tone?', back: 'Steps away from a chord tone and back to the same note (upper or lower neighbour).' },
              { key: 'accented', front: 'Accented vs unaccented non-chord tone?', back: 'Accented falls on the beat (more tension, more expressive); unaccented on the weak part.' },
            ],
          },
          {
            id: 'b9-suspensions',
            title: 'Suspensions, appoggiaturas & pedals',
            minutes: 7,
            summary: 'Delay, lean, sustain — the expressive dissonances of film music.',
            cards: [
              { key: 'suspension', front: 'Three stages of a suspension?', back: 'Preparation (consonant) → suspension (held into the next chord, dissonant) → resolution (down by step).' },
              { key: 'sus-types', front: 'Common suspensions (above the bass)?', back: '4–3, 7–6, 9–8 (and 2–3 in the bass).' },
              { key: 'appoggiatura', front: 'Appoggiatura?', back: 'Accented non-chord tone approached by LEAP, resolved by step — the “sigh”.' },
              { key: 'pedal', front: 'Pedal point?', back: 'A held (usually bass) note while harmonies change above it — tonic or dominant pedals build tension.' },
            ],
          },
        ],
      },
      {
        id: 'u10',
        title: '10 · Diatonic sequences',
        lessons: [
          {
            id: 'b10-sequences',
            title: 'Sequences: fifths, 5–6 and Pachelbel',
            minutes: 8,
            summary: 'Repeating patterns that carry harmony forward on autopilot.',
            cards: [
              { key: 'desc5', front: 'The descending-fifths sequence in major?', back: 'I – IV – vii° – iii – vi – ii – V – I (roots fall by 5ths).' },
              { key: 'pachelbel', front: 'Pachelbel progression?', back: 'I – V – vi – iii – IV – I – IV – V (down a 4th, up a 2nd, repeated).' },
              { key: 'asc56', front: 'Ascending 5–6 sequence?', back: 'Above a rising bass, 5ths alternate with 6ths: I – vi6 – ii – vii°6 – iii …, climbing step by step.' },
            ],
          },
        ],
      },
      {
        id: 'u11',
        title: '11 · Harmonizing melodies',
        lessons: [
          {
            id: 'b11-harmonizing',
            title: 'Harmonizing a melody',
            minutes: 8,
            summary: 'A method: cadence first, then chords that contain each note, in functional order.',
            unlocks: ['harmonize-melody'],
            cards: [
              { key: 'method', front: 'Order of work when harmonizing?', back: '1. Cadence  2. Possible chords per note  3. Functional path T→PD→D  4. Bass line in contrary motion  5. Inner voices.' },
              { key: 'note-chords', front: 'Which diatonic triads contain scale degree 1?', back: 'I, IV and vi.' },
              { key: 'note-chords-2', front: 'Which diatonic triads contain scale degree 2?', back: 'ii, V and vii°.' },
            ],
          },
          {
            id: 'b11-harmonic-rhythm',
            title: 'Harmonic rhythm',
            minutes: 6,
            summary: 'How often chords change — and how it shapes energy.',
            cards: [
              { key: 'hr', front: 'What is harmonic rhythm?', back: 'The rate at which chords change, independent of the melody’s rhythm.' },
              { key: 'hr-cadence', front: 'Typical harmonic rhythm toward a cadence?', back: 'It speeds up — e.g. one chord per bar, then two or more in the cadence bar.' },
              { key: 'hr-games', front: 'Exploration vs combat music: harmonic rhythm?', back: 'Exploration: slow (long pads, pedals). Combat: faster changes or driving ostinatos over shifting harmony.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'C',
    title: 'Chromatic & modal harmony',
    subtitle: 'Secondary dominants, mixture, mediants, modes — the colours of epic music.',
    units: [
      {
        id: 'u12',
        title: '12 · Secondary dominants',
        lessons: [
          {
            id: 'c12-secondary-dominants',
            title: 'V/V and friends',
            minutes: 7,
            summary: 'Give any chord its own dominant: the first and most useful chromatic chord.',
            unlocks: ['chromatic-spelling'],
            cards: [
              { key: 'def', front: 'What is a secondary (applied) dominant?', back: 'The V or V7 of a chord other than the tonic, e.g. V/V. It briefly treats that chord as a tonic.' },
              { key: 'vv-c', front: 'V7/V in C major?', back: 'D7 (D F♯ A C): the dominant of G. F♯ is the borrowed leading tone that rises to G.' },
              { key: 'spell', front: 'How do you spell V7/x?', back: 'Find the root of x, go up a perfect 5th, build a dominant 7th (major triad + minor 7th) on it.' },
              { key: 'no-dim', front: 'Which diatonic chord can’t be tonicized in major?', back: 'vii° — a diminished triad can’t act as a temporary tonic.' },
            ],
          },
          {
            id: 'c12-leading-tone-chords',
            title: 'Leading-tone chords & tonicization',
            minutes: 7,
            summary: 'vii°7/x, the symmetry of the diminished 7th, and when a tonicization becomes a modulation.',
            cards: [
              { key: 'vii7v', front: 'vii°7/V in C major?', back: 'F♯°7 (F♯ A C E♭): the diminished 7th on G’s leading tone.' },
              { key: 'dim-sym', front: 'Why are there only three different diminished 7th chords?', back: 'They’re stacked minor 3rds that divide the octave equally: every inversion is another dim7 (enharmonically), so any one can resolve to four different keys.' },
              { key: 'tonic-vs-mod', front: 'Tonicization vs modulation?', back: 'Tonicization: a brief visit (an applied chord or two). Modulation: the new key is confirmed by a cadence and stays.' },
            ],
          },
        ],
      },
      {
        id: 'u13',
        title: '13 · Modulation',
        lessons: [
          {
            id: 'c13-pivot',
            title: 'Pivot-chord modulation',
            minutes: 7,
            summary: 'Slide into a new key through a chord that belongs to both.',
            cards: [
              { key: 'close', front: 'Closely related keys of C major?', back: 'G, F, A minor, E minor, D minor (keys whose signatures differ by at most one accidental).' },
              { key: 'pivot', front: 'Good pivot chord from C major to G major?', back: 'A minor: vi in C = ii in G (a predominant in the new key, followed by D7 – G).' },
              { key: 'confirm', front: 'What confirms a modulation?', back: 'A cadence (usually V–I) in the new key.' },
            ],
          },
          {
            id: 'c13-direct',
            title: 'Common-tone & direct modulation',
            minutes: 6,
            summary: 'Jump keys on purpose: through a held note, or with no preparation at all.',
            cards: [
              { key: 'ct-mod', front: 'Common-tone modulation?', back: 'One note is held (often in a sustained voice) while the harmony around it moves to a distant key, e.g. C major → A♭ major holding C.' },
              { key: 'direct', front: 'Direct (phrase) modulation?', back: 'A new phrase simply starts in the new key, often after a cadence or a pause. No pivot.' },
              { key: 'truck', front: 'The “truck-driver” modulation?', back: 'Repeat the last section a half or whole step higher: an instant energy boost (use sparingly).' },
            ],
          },
        ],
      },
      {
        id: 'u14',
        title: '14 · Modal mixture',
        lessons: [
          {
            id: 'c14-mixture',
            title: 'Borrowed chords: iv ♭VI ♭VII ♭III',
            minutes: 8,
            summary: 'Borrow chords from the parallel minor: the core of the epic sound.',
            unlocks: ['chromatic-ear'],
            cards: [
              { key: 'def', front: 'What is modal mixture?', back: 'Borrowing chords from the parallel key (C minor chords inside C major), using ♭3, ♭6 and ♭7.' },
              { key: 'bvi', front: '♭VI and ♭VII in C major?', back: 'A♭ major and B♭ major.' },
              { key: 'victory', front: 'The ♭VI – ♭VII – I cadence?', back: 'Two borrowed major chords climbing by step into the major tonic: triumphant, heroic.' },
              { key: 'iv', front: 'Effect of minor iv in a major key?', back: 'The 6th degree drops a half step (A → A♭ in C): a sudden, wistful shadow.' },
            ],
          },
          {
            id: 'c14-picardy',
            title: 'Picardy third & major/minor shifts',
            minutes: 6,
            summary: 'End minor pieces in major, and flip the tonic between major and minor.',
            cards: [
              { key: 'picardy', front: 'Picardy third?', back: 'Ending a minor-key piece on a MAJOR tonic chord (raised 3rd).' },
              { key: 'minor-plagal', front: 'Minor plagal cadence?', back: 'iv → I in a major key: bittersweet, nostalgic.' },
              { key: 'shift', front: 'I → i (same root, major to minor): dramatic effect?', back: 'The light goes out: one note (the 3rd) drops a half step and the whole mood flips. Classic “something’s wrong” moment.' },
            ],
          },
        ],
      },
      {
        id: 'u15',
        title: '15 · Neapolitan & augmented 6ths',
        lessons: [
          {
            id: 'c15-neapolitan',
            title: 'The Neapolitan',
            minutes: 6,
            summary: 'A major chord on the lowered 2nd degree: tragic pre-dominant.',
            cards: [
              { key: 'n6', front: 'Neapolitan 6th (N⁶) in A minor?', back: 'B♭ major in first inversion: D in the bass (B♭ D F over D).' },
              { key: 'n6-double', front: 'What do you double in N⁶?', back: 'The bass (the 4th scale degree).' },
              { key: 'n6-resolve', front: 'Where does ♭2 go?', back: 'Down: to the leading tone over V (a diminished 3rd), or to the tonic over a cadential 6/4 first.' },
            ],
          },
          {
            id: 'c15-aug-sixths',
            title: 'Italian, French & German 6ths',
            minutes: 8,
            summary: 'Two notes that expand outward onto the dominant: maximum pull.',
            cards: [
              { key: 'it', front: 'Italian augmented 6th in C?', back: 'A♭ – C – F♯ (♭6, 1, ♯4).' },
              { key: 'fr-ger', front: 'French vs German 6th?', back: 'French adds the 2nd degree (A♭ C D F♯), German adds ♭3 (A♭ C E♭ F♯).' },
              { key: 'resolve', front: 'How does an augmented 6th resolve?', back: '♭6 falls and ♯4 rises, both by half step, to the octave on 5 (the dominant).' },
              { key: 'ger-dom', front: 'Why does the German 6th sound like a dominant 7th?', back: 'A♭ C E♭ F♯ = A♭ C E♭ G♭ enharmonically: A♭7. Only the spelling (and resolution) differs.' },
            ],
          },
        ],
      },
      {
        id: 'u16',
        title: '16 · Cinematic harmony',
        lessons: [
          {
            id: 'c16-mediants',
            title: 'Chromatic mediants',
            minutes: 7,
            summary: 'Jumps by a third with one common tone: the signature of film music.',
            cards: [
              { key: 'def', front: 'Chromatic mediant?', back: 'Two chords of the same quality whose roots are a 3rd apart, sharing one common tone (e.g. C major → E major or A♭ major).' },
              { key: 'list', front: 'Chromatic mediants of C major?', back: 'E, A, E♭ and A♭ major.' },
              { key: 'voice', front: 'Key to voicing a chromatic mediant?', back: 'Hold the common tone in the same voice; move every other voice by half or whole step.' },
            ],
          },
          {
            id: 'c16-cinematic',
            title: 'Lydian II, common-tone °7 & the epic loop',
            minutes: 7,
            summary: 'Three more moves from the film-score toolbox.',
            cards: [
              { key: 'lyd', front: 'I → II (major II) in a major key?', back: 'The raised 4th (F♯ in C) of Lydian: floating, magical “wonder” sound.' },
              { key: 'ctdim', front: 'Common-tone diminished 7th?', back: 'A dim7 that shares one note with the chord it decorates (C under D♯ F♯ A C → C E G). The other notes slide by half step.' },
              { key: 'epic-loop', front: 'The modern “epic” minor loop?', back: 'i – VI – III – VII (A minor: Am F C G): all-major colours around a minor tonic, no dominant.' },
            ],
          },
        ],
      },
      {
        id: 'u17',
        title: '17 · Modes',
        lessons: [
          {
            id: 'c17-modes',
            title: 'The modes by colour',
            minutes: 8,
            summary: 'Seven modes, bright to dark, each with one characteristic note and chord.',
            unlocks: ['mode-ear'],
            cards: [
              { key: 'order', front: 'Modes from brightest to darkest?', back: 'Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian (each lowers one more note).' },
              { key: 'lyd', front: 'Lydian characteristic note & chord?', back: '♯4 — the major II chord.' },
              { key: 'mixo', front: 'Mixolydian characteristic note & chord?', back: '♭7 — the ♭VII chord (and a minor v).' },
              { key: 'dor', front: 'Dorian characteristic note & chord?', back: 'Raised 6 (in minor) — the major IV chord.' },
              { key: 'phr', front: 'Phrygian characteristic note & chord?', back: '♭2 — the ♭II chord.' },
            ],
          },
          {
            id: 'c17-modal-harmony',
            title: 'Modal cadences, pedals & ostinatos',
            minutes: 7,
            summary: 'How to keep a mode from turning back into major/minor.',
            cards: [
              { key: 'avoid', front: 'Why avoid V7 → I in modal writing?', back: 'Its leading tone drags the ear back to plain major/minor; use the mode’s characteristic chord instead.' },
              { key: 'cad', front: 'Typical modal cadences?', back: '♭VII–I (Mixolydian), IV–i (Dorian), ♭II–i (Phrygian), II–I (Lydian), ♭VI–♭VII–i (Aeolian).' },
              { key: 'pedal', front: 'Pedal point?', back: 'A sustained (usually bass) note held while harmonies change above it: it anchors the tonic, so modes stay clear.' },
            ],
          },
        ],
      },
      {
        id: 'u18',
        title: '18 · Extended & hybrid harmony',
        lessons: [
          {
            id: 'c18-extensions',
            title: '9ths, 11ths, 13ths & add chords',
            minutes: 7,
            summary: 'Stack more thirds for richer colour, and voice them so they don’t turn to mud.',
            cards: [
              { key: 'ext', front: 'Extensions of a chord?', back: '9th, 11th, 13th: thirds stacked above the 7th (the 2nd, 4th and 6th an octave up).' },
              { key: 'add', front: 'Cadd9 vs C9?', back: 'Cadd9 = C E G D (no 7th). C9 = C E G B♭ D (dominant 7th + 9th).' },
              { key: 'omit', front: 'What can you leave out of a 13th chord?', back: 'The 5th, often the root (bass player has it) and the 11th; keep 3rd, 7th and 13th.' },
              { key: 'mud', front: 'Where do extensions belong in an orchestral voicing?', back: 'High: keep the low register to roots and 5ths, put 9ths/13ths in upper strings or winds.' },
            ],
          },
          {
            id: 'c18-sus-quartal',
            title: 'Sus, quartal & cluster voicings',
            minutes: 7,
            summary: 'Open, ambiguous sounds: suspensions without resolution, stacks of 4ths, tone clusters.',
            cards: [
              { key: 'sus', front: 'Why are sus chords so common in trailers?', back: 'No 3rd: neither major nor minor, so they sound open, unresolved and powerful.' },
              { key: 'quartal', front: 'Quartal voicing?', back: 'A chord built from stacked 4ths (D G C F): modern, open, modal.' },
              { key: 'cluster', front: 'Cluster: where does it work?', back: 'Adjacent seconds; shimmering when high and soft, tense in the middle, pure mud in the bass.' },
            ],
          },
          {
            id: 'c18-polychords',
            title: 'Polychords & hybrid textures',
            minutes: 6,
            summary: 'Stack two chords, and layer simple lows under colourful highs.',
            cards: [
              { key: 'poly', front: 'What is D/C as a polychord?', back: 'A D major triad on top of a C major triad (or C bass): C Lydian colour, C(maj7)(9)(♯11)-ish.' },
              { key: 'upper', front: 'Upper-structure triad?', back: 'A simple triad placed above a different bass/chord, implying extensions in a clean, playable way.' },
              { key: 'petr', front: 'C major + F♯ major together?', back: 'Two triads a tritone apart (“Petrushka chord”): bright but clashing, magical chaos.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'D',
    title: 'Composer: orchestral & hybrid',
    subtitle: 'Ranges, voicing, texture, motif development and game-music form.',
    units: [
      {
        id: 'u19',
        title: '19 · Instruments',
        lessons: [
          {
            id: 'd19-strings',
            title: 'The string section',
            minutes: 7,
            summary: 'Violins, violas, cellos, basses: ranges, registers and what each does best.',
            unlocks: ['instrument-range'],
            cards: [
              { key: 'lowest', front: 'Lowest notes of violin, viola, cello (sounding)?', back: 'Violin G3, viola C3, cello C2 (their lowest open strings).' },
              { key: 'bass', front: 'How does the double bass transpose?', back: 'It sounds an octave lower than written.' },
              { key: 'roles', front: 'Typical roles in a string section?', back: 'Violins I: melody · Violins II & violas: harmony, inner lines · Cellos: bass or tenor melody · Basses: the octave below the cellos.' },
            ],
          },
          {
            id: 'd19-winds-brass',
            title: 'Woodwinds & brass',
            minutes: 8,
            summary: 'Ranges, sweet spots and colours of the winds and the brass.',
            cards: [
              { key: 'flute-low', front: 'Low flute (around C4–G4): strength?', back: 'Breathy and soft: beautiful, but easily covered. Thin out the orchestra around it.' },
              { key: 'clar-reg', front: 'Clarinet registers?', back: 'Chalumeau (low, dark, velvety), throat tones (weaker), clarion (bright, singing), altissimo (shrill).' },
              { key: 'horn-sweet', front: 'The horn’s heroic register?', back: 'Roughly C3–F4 (sounding): round, noble, the classic film-score horn.' },
              { key: 'brass-weight', front: 'Roughly how many horns balance one trumpet or trombone at forte?', back: 'About two: the horn is softer-edged. That’s why orchestras have four horns.' },
            ],
          },
          {
            id: 'd19-transposing',
            title: 'Transposing instruments',
            minutes: 6,
            summary: 'Why a horn part says G when the horn sounds C — and how to read and write it.',
            unlocks: ['transposition'],
            cards: [
              { key: 'bb', front: 'B♭ clarinet / trumpet: written vs sounding?', back: 'Sounds a major 2nd lower than written. To get concert C, write D.' },
              { key: 'f', front: 'Horn in F: written vs sounding?', back: 'Sounds a perfect 5th lower than written. To get concert C, write G.' },
              { key: 'octave', front: 'Piccolo and double bass?', back: 'Piccolo sounds an octave higher than written; double bass an octave lower.' },
              { key: 'rule', front: 'An instrument “in X”: what sounds when it plays a written C?', back: 'X. (Clarinet in B♭ plays written C → B♭ sounds.)' },
            ],
          },
        ],
      },
      {
        id: 'u20',
        title: '20 · Orchestral voicing',
        lessons: [
          {
            id: 'd20-harmonic-series',
            title: 'The harmonic series as a voicing guide',
            minutes: 8,
            summary: 'Wide intervals low, close intervals high: why nature’s spacing sounds best.',
            unlocks: ['voicing-doctor'],
            cards: [
              { key: 'series', front: 'First intervals of the harmonic series (from the bottom)?', back: 'Octave, 5th, 4th, major 3rd, minor 3rd… intervals shrink as you go up.' },
              { key: 'rule', front: 'The voicing rule the harmonic series gives you?', back: 'Wide intervals (octaves, 5ths) in the bass, closer intervals (3rds, 2nds) higher up.' },
              { key: 'lil', front: 'Low interval limit of a major 3rd?', back: 'Around B♭2 (lower note). Below that, a 3rd sounds muddy.' },
            ],
          },
          {
            id: 'd20-doubling',
            title: 'Doubling & avoiding mud',
            minutes: 7,
            summary: 'What to double, octave doublings across sections, and how to keep a tutti clear.',
            cards: [
              { key: 'double', front: 'Safest notes to double in a big tutti chord?', back: 'Root (most), then 5th. Double the 3rd only in the upper register; never double the leading tone or a 7th low.' },
              { key: 'octaves', front: 'Why double a melody in octaves?', back: 'More power and presence without thickening the harmony (e.g. violins + flutes 8va, cellos + horns).' },
              { key: 'mud', front: 'Three quick fixes for a muddy orchestral mix?', back: 'Open up low intervals, remove instruments from the low-mid register (C3–C4), give each layer its own register.' },
            ],
          },
        ],
      },
      {
        id: 'u21',
        title: '21 · Texture & layering',
        lessons: [
          {
            id: 'd21-layers',
            title: 'Melody, countermelody, pad, bass, ostinato',
            minutes: 7,
            summary: 'The five jobs in any orchestral texture, and how to give each its own space.',
            cards: [
              { key: 'jobs', front: 'Five layers of a typical cinematic texture?', back: 'Melody, countermelody, harmony/pad, bass, rhythm/ostinato.' },
              { key: 'space', front: 'How do layers stay clear?', back: 'Different registers, different rhythms (long vs short) and different colours (sections).' },
              { key: 'ostinato', front: 'What does an ostinato add?', back: 'Momentum and rhythm without needing new harmony; it can drive a loop for minutes.' },
            ],
          },
          {
            id: 'd21-sections',
            title: 'Combining the sections',
            minutes: 7,
            summary: 'Strings, brass and winds alone and together: classic combinations that always work.',
            cards: [
              { key: 'strings', front: 'Why is the string section the “default” of the orchestra?', back: 'Wide range, endless sustain, every dynamic, every articulation; it never tires.' },
              { key: 'horns-cellos', front: 'A classic warm melodic doubling?', back: 'Horns + cellos in unison (or violas + clarinets): rich, heroic, never shrill.' },
              { key: 'brass-chord', front: 'How to voice a brass chorale?', back: 'Trombones and tuba low (wide), horns in the middle, trumpets on top; avoid close low intervals.' },
            ],
          },
        ],
      },
      {
        id: 'u22',
        title: '22 · Counterpoint for composers',
        lessons: [
          {
            id: 'd22-species',
            title: 'First & second species',
            minutes: 8,
            summary: 'Two independent lines: consonances, contrary motion, passing tones.',
            cards: [
              { key: 'first', front: 'First species rules in one sentence?', back: 'Note against note, only consonances, no parallel 5ths/8ves, prefer contrary motion, begin and end on perfect consonances.' },
              { key: 'consonances', front: 'Consonant intervals in counterpoint?', back: 'Unison, 3rds, 5th, 6ths, octave (the 4th counts as a dissonance above the bass).' },
              { key: 'second', front: 'Second species: when may a dissonance appear?', back: 'On the weak beat, as a passing tone (approached and left by step in the same direction).' },
            ],
          },
          {
            id: 'd22-countermelody',
            title: 'Writing countermelodies',
            minutes: 7,
            summary: 'A second melody that complements the first instead of competing with it.',
            cards: [
              { key: 'rhythm', front: 'Rhythmic rule of thumb for a countermelody?', back: 'Move when the melody holds, hold when the melody moves.' },
              { key: 'contour', front: 'Contour rule for a countermelody?', back: 'Mostly contrary or oblique motion; peaks at different moments than the melody.' },
              { key: 'register', front: 'Where to place the countermelody?', back: 'In a different register and colour: e.g. melody in violins, countermelody in horns or cellos.' },
            ],
          },
        ],
      },
      {
        id: 'u23',
        title: '23 · Leitmotif development',
        lessons: [
          {
            id: 'd23-motif-mode',
            title: 'Mode change & reharmonization',
            minutes: 7,
            summary: 'Keep the motif’s identity; change its mood with mode and harmony.',
            cards: [
              { key: 'leit', front: 'What is a leitmotif?', back: 'A short musical idea tied to a character, place or idea, varied as the story changes.' },
              { key: 'identity', front: 'What keeps a motif recognisable when transformed?', back: 'Its rhythm and contour. Change the pitches’ mode or harmony, keep those two.' },
              { key: 'reharm', front: 'Reharmonization trick for a darker version?', back: 'Keep the melody, put borrowed (♭VI, iv) or chromatic-mediant chords under it.' },
            ],
          },
          {
            id: 'd23-motif-rhythm',
            title: 'Augmentation, diminution, fragmentation',
            minutes: 7,
            summary: 'Stretch, compress and break a motif to build a whole score from one idea.',
            unlocks: ['motif-ear'],
            cards: [
              { key: 'aug', front: 'Augmentation and its typical use?', back: 'Doubling the note values: grandeur, solemnity (finales, end credits, funerals).' },
              { key: 'dim', front: 'Diminution and its typical use?', back: 'Halving the note values: urgency, playfulness, action.' },
              { key: 'frag', front: 'Fragmentation?', back: 'Using only part of the motif (often its head), repeated and sequenced: development and build-ups.' },
              { key: 'inv', front: 'Inversion vs retrograde?', back: 'Inversion: intervals upside down (same rhythm). Retrograde: the motif backwards (rhythm reversed too).' },
            ],
          },
        ],
      },
      {
        id: 'u24',
        title: '24 · Game-music form',
        lessons: [
          {
            id: 'd24-loops-stingers',
            title: 'Loops & stingers',
            minutes: 7,
            summary: 'Music that repeats without wearing out, and short cues that react to events.',
            cards: [
              { key: 'loop', front: 'Harmonic trick for a seamless loop?', back: 'End the loop on a chord that leads back to the first (V, ♭VII, IV…), not on a full cadence.' },
              { key: 'tail', front: 'What breaks most loops audibly?', back: 'Reverb tails and sustained notes cut at the loop point; plan releases, or render the tail into the start.' },
              { key: 'stinger', front: 'What is a stinger?', back: 'A short musical cue (1–5 s) triggered by an event: item found, enemy spotted, quest complete, death.' },
            ],
          },
          {
            id: 'd24-adaptive',
            title: 'Vertical layering & horizontal resequencing',
            minutes: 8,
            summary: 'Two ways to make music react to gameplay, and how to write for them.',
            cards: [
              { key: 'vertical', front: 'Vertical layering?', back: 'Several synchronized stems of one cue; layers fade in and out with intensity (explore → tension → combat).' },
              { key: 'horizontal', front: 'Horizontal resequencing?', back: 'Switching between different sections/cues at musical boundaries (bar or phrase), often through transition pieces.' },
              { key: 'write', front: 'Writing rule for vertical layers?', back: 'Every combination of layers must sound complete: same tempo, key and harmony, each layer in its own register.' },
            ],
          },
        ],
      },
      {
        id: 'u25',
        title: '25 · Cue analysis',
        lessons: [
          {
            id: 'd25-analysis',
            title: 'Analysing a cue',
            minutes: 8,
            summary: 'A repeatable template for learning from the scores you love.',
            cards: [
              { key: 'order', front: 'The order of a quick cue analysis?', back: 'Function & mood → tempo/meter → key/mode & harmony → motifs → layers & orchestration → form & loop → dynamics curve.' },
              { key: 'harmony', front: 'Fast way to find the harmony of a cue?', back: 'Find the bass line first (it gives the roots), then the chord colours above it; check against the progression playground.' },
              { key: 'steal', front: 'What do you take away from an analysis?', back: 'Techniques, not notes: a progression type, a voicing, a layering scheme, a form you can reuse in your own cue.' },
            ],
          },
        ],
      },
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
