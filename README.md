# MusicLearn

A daily music theory, harmony, ear-training and orchestration trainer: bite-sized lessons, adaptive drills and spaced-repetition review. It is an installable web app (PWA) that works offline on Android and desktop. Each lesson relates its topic to orchestral, epic and hybrid game scoring.

## Daily loop
1. **Review**: flashcards from completed lessons, scheduled with FSRS.
2. **Lesson**: one 5–8 minute lesson with live notation, audio and checks.
3. **Practice**: 3 drills, picked from your weakest and least recently practised skills. Drills adapt: 85% accuracy moves you up a level, under 60% moves you down.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173 (localhost allows Web MIDI)
npm test           # unit tests (theory engine, generators, checkers, SRS)
npm run e2e        # Playwright smoke tests (uses your installed Chrome)
npm run build      # production build in dist/
npm run preview    # serve the build locally to test PWA/offline
```

## Use on your phone
Push to GitHub with Pages enabled (Settings → Pages → Source: GitHub Actions). The workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main`. Open the URL in Chrome on Android, then choose **⋮ → Add to Home screen / Install app**. After the first load it works offline.

Progress is stored locally (IndexedDB) on each device. Move it between PC and phone with **Settings → Export / Import backup**.

**MIDI**: enable it in Settings. It needs Chrome or Edge, and a USB-OTG adapter on Android. Without a keyboard, every drill works with the on-screen piano, note-name buttons or multiple choice; "On-the-go mode" prefers these.

## Project layout
```
src/engine/theory     note/interval/chord/key helpers on top of tonal (tested)
src/engine/harmony    Roman numerals (incl. N6, It/Fr/Ger+6, ct°7, sus), chord symbols, progression text
                      (key changes, pivots), voice-leading checker, SATB voicing engine, passing-chord explorer
src/engine/midiExport.ts   Standard MIDI file export (one track per voice)
src/app/tools         Progression playground, passing-chord explorer, motif transformer
src/engine/orchestra  Instrument data (ranges, transpositions), ensembles, orchestral voicing checker
src/engine/motif.ts   Motif transformations + reharmonization · src/engine/counterpoint.ts species checker
scripts/build-samples.mjs  Rebuilds public/samples/orchestra from VSCO 2 CE (node scripts/build-samples.mjs <cacheDir>)
src/engine/audio      Tone.js sampled piano (Salamander, bundled in public/samples)
src/engine/input      unified note bus: MIDI + on-screen keyboard (+ mic later)
src/components        Staff (VexFlow), Keyboard, Play
src/exercises         logic.ts (pure generators/checkers) · views.tsx · registry.ts
src/content           curriculum.ts (tracks/units/lessons/flashcards) · lessons/*.mdx
src/progress, src/srs Dexie DB, settings, adaptive skills, FSRS scheduling
```

### Adding a lesson
1. Add a `LessonDef` (id, title, cards, unlocks) to `src/content/curriculum.ts`.
2. Create `src/content/lessons/<id>.mdx`. You can use `<Example>`, `<Staff>`, `<Play>`, `<KeyboardDemo>`, `<Quiz>`, `<Callout>`, `<Composer>`, `<Try drill="…">`, `<Progression romans="I IV V I" tonic="C">` (auto-voiced SATB; accepts chord symbols, key changes `G:`, pivots `vi=G:ii`, and `keySig` for modes), `<Voicings notes="C3,G3,E4,B4,D5 …" labels="Cmaj9|…">` (free voicings, any number of notes) and `<Chorale notes="C3,G3,E4,C5 …" romans="I …" check>` (explicit voicings, with the checker highlighting problems). `npm test` verifies every `<Progression>` voices without errors.

### Adding a drill
1. Write `generate()` and a `check…()` in `src/exercises/logic.ts`, with tests in `logic.test.ts`.
2. Write a view in `views.tsx` and register it in `registry.ts`.

## Roadmap
- [x] M0–M2: scaffold, core engine, learning loop, Track A (Foundations), 8 drills, chord identifier tool
- [x] M3: diatonic harmony (Track B, 13 lessons), voice-leading checker, SATB auto-voicing engine, 6 harmony drills (cadences, dictation, Roman-numeral analysis, error spotting, voice-the-next-chord, melody harmonization)
- [x] M4: chromatic & modal (Track C, 15 lessons), 3 drills (chromatic chords by ear, chromatic spelling, modes by ear), progression playground, passing-chord explorer, MIDI export
- [x] M5: composer track (Track D, 14 lessons), orchestral samples (VSCO 2 CE, 12 instruments, ~2.9 MB, loaded on demand), 4 drills (instrument ranges, transposition, voicing doctor, motif transformations by ear), motif transformer, orchestral playback in playground/lessons/chord identifier
- [ ] M6: optional Claude tutor, mic pitch detection, sync

Credits: Salamander Grand Piano (Alexander Holm, CC-BY 3.0) · VexFlow · Tonal · Tone.js · ts-fsrs.
