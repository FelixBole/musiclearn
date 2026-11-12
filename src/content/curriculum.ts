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
