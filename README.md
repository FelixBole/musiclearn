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
src/engine/audio      Tone.js sampled piano (Salamander, bundled in public/samples)
src/engine/input      unified note bus: MIDI + on-screen keyboard (+ mic later)
src/components        Staff (VexFlow), Keyboard, Play
src/exercises         logic.ts (pure generators/checkers) · views.tsx · registry.ts
src/content           curriculum.ts (tracks/units/lessons/flashcards) · lessons/*.mdx
src/progress, src/srs Dexie DB, settings, adaptive skills, FSRS scheduling
```

### Adding a lesson
1. Add a `LessonDef` (id, title, cards, unlocks) to `src/content/curriculum.ts`.
2. Create `src/content/lessons/<id>.mdx`. You can use `<Example>`, `<Staff>`, `<Play>`, `<KeyboardDemo>`, `<Quiz>`, `<Callout>`, `<Composer>` and `<Try drill="…">`.

### Adding a drill
1. Write `generate()` and a `check…()` in `src/exercises/logic.ts`, with tests in `logic.test.ts`.
2. Write a view in `views.tsx` and register it in `registry.ts`.

## Roadmap
- [x] M0–M2: scaffold, core engine, learning loop, Track A (Foundations), 8 drills, chord identifier tool
- [ ] M3: diatonic harmony (Track B), voice-leading checker, cadence/progression dictation, 4-part harmonization
- [ ] M4: chromatic & modal (Track C), progression playground, passing-chord explorer, MIDI export
- [ ] M5: composer track (Track D), orchestral samples (VSCO2 CE), voicing/range drills, motif transformer
- [ ] M6: optional Claude tutor, mic pitch detection, sync

Credits: Salamander Grand Piano (Alexander Holm, CC-BY 3.0) · VexFlow · Tonal · Tone.js · ts-fsrs.
