import { useMemo, useState } from 'react';
import { Staff, type StaffItem } from '../components/Staff';
import { playEvents, playLine, playVoicings, stopPlayback } from '../engine/audio';
import { ENSEMBLES, ENSEMBLE_IDS, instrumentById, type EnsembleId, type SampleId } from '../engine/orchestra/instruments';
import { CP_LABELS, checkCounterpoint } from '../engine/counterpoint';
import { realizeProgression } from '../engine/harmony/sequence';
import { ORCH_RULE_LABELS, checkOrchestralVoicing, noteLabel } from '../engine/orchestra/voicingCheck';
import { harmonize, padVoicing, parseMotif, variations, type MotifNote } from '../engine/motif';
import { midiToName, toMidi } from '../engine/theory';
import { motifItems } from '../exercises/composerViews';
import { prettyRoman } from '../engine/harmony/roman';
import { useLessonSound } from './soundPref';

/** Compact ensemble picker shown next to play buttons. */
export function SoundSelect({ value, onChange }: { value: EnsembleId; onChange: (s: EnsembleId) => void }) {
  return (
    <select className="sound-select" value={value} onChange={(e) => onChange(e.target.value as EnsembleId)} aria-label="Sound" title="Play with…">
      {ENSEMBLE_IDS.map((id) => (
        <option key={id} value={id}>
          {ENSEMBLES[id].name}
        </option>
      ))}
    </select>
  );
}

/**
 * <Instrument id="horn" /> — range card: sounding range on the staff (outer = extreme,
 * inner = comfortable), transposition, clefs and register character with audio.
 */
export function Instrument({ id }: { id: string }) {
  const inst = instrumentById(id);
  if (!inst) return <p className="error">Unknown instrument {id}</p>;
  const grand = inst.range[1] - inst.range[0] > 30 || (inst.range[0] < 55 && inst.range[1] > 72);
  const clef = grand ? 'grand' : inst.range[0] >= 55 ? 'treble' : 'bass';
  const items: StaffItem[] = [
    { keys: [midiToName(inst.range[0], true)], color: '#9a93a8' },
    { keys: [midiToName(inst.comfortable[0], true)] },
    { keys: [midiToName(inst.comfortable[1], true)] },
    { keys: [midiToName(inst.range[1], true)], color: '#9a93a8' },
  ];
  const playRegister = (lo: number, hi: number) => {
    const mid = Math.round((lo + hi) / 2);
    void playLine([lo, mid, hi], [0.7, 0.7, 1.4], inst.sample);
  };
  return (
    <figure className="example instrument-card">
      <header>
        <b>{inst.name}</b> <span className="pill small">{inst.family}</span>
      </header>
      <Staff clef={clef} items={items} maxWidth={320} />
      <figcaption className="instrument-meta">
        <span>
          Range {noteLabel(inst.range[0])}–{noteLabel(inst.range[1])} · comfortable {noteLabel(inst.comfortable[0])}–{noteLabel(inst.comfortable[1])} (sounding)
        </span>
        <span>
          Clef{inst.clefs.length > 1 ? 's' : ''}: {inst.clefs.join(', ')}
          {inst.transposeLabel ? ` · ${inst.transposeLabel}` : ' · non-transposing'}
        </span>
      </figcaption>
      <ul className="registers">
        {inst.registers.map((r, i) => (
          <li key={i}>
            <button type="button" className="play-btn small" onClick={() => playRegister(r.range[0], r.range[1])} aria-label={`Play ${noteLabel(r.range[0])}–${noteLabel(r.range[1])}`}>
              ▶
            </button>
            <span>
              <b>
                {noteLabel(r.range[0])}–{noteLabel(r.range[1])}
              </b>{' '}
              {r.text}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/**
 * <OrchVoicing notes="C2,C3,G3,E4,G4" sound="strings" check label="…" />
 * One or more free voicings played by an ensemble, optionally run through the orchestral voicing check.
 */
export function OrchVoicing({ notes, sound, check, label, labels, third }: { notes: string; sound?: EnsembleId; check?: boolean; label?: string; labels?: string; third?: string }) {
  const [pref, setPref] = useLessonSound();
  const [local, setLocal] = useState<EnsembleId | null>(sound ?? null);
  const ens = local ?? pref;
  const chords = notes.trim().split(/\s+/).map((c) => c.split(',').map(toMidi));
  const names = labels?.split('|').map((s) => s.trim());
  const thirdPc = third ? ((toMidi(`${third}4`) % 12) + 12) % 12 : undefined;
  const issues = check ? chords.map((c) => checkOrchestralVoicing(c, { thirdPc })) : [];
  return (
    <figure className="example">
      <Staff clef="grand" notes={notes} maxWidth={Math.min(480, 170 + chords.length * 80)} />
      {names && (
        <div className="voicing-labels">
          {names.map((n, i) => (
            <span key={i} className="pill">
              {n}
            </span>
          ))}
        </div>
      )}
      <figcaption>
        <button type="button" className="play-btn" onClick={() => void playVoicings(chords, ens, 2.2)}>
          ▶ {label ?? 'Listen'}
        </button>
        <SoundSelect
          value={ens}
          onChange={(s) => {
            setLocal(s);
            setPref(s);
          }}
        />
      </figcaption>
      {check && (
        <ul className="chorale-issues">
          {issues.every((x) => x.length === 0) && <li className="ok">✓ Clear voicing: wide intervals low, close intervals high</li>}
          {issues.flatMap((list, ci) =>
            list.map((i, k) => (
              <li key={`${ci}-${k}`} className={`issue-${i.severity}`}>
                {i.severity === 'error' ? '✗' : '⚠'} {names?.[ci] ? `${names[ci]} · ` : ''}
                {ORCH_RULE_LABELS[i.rule]}: {i.message}
              </li>
            )),
          )}
        </ul>
      )}
    </figure>
  );
}

/**
 * <Motif notes="E4:q G4:8 A4:8 B4:h" tonic="E" minor show="original,mode,augmentation" />
 * A leitmotif and selected transformations, each playable (melody + optional pad).
 */
export function Motif({ notes, tonic = 'C', minor, show = 'original', harmony }: { notes: string; tonic?: string; minor?: boolean; show?: string; harmony?: 'diatonic' | 'modal' | 'cinematic' }) {
  const key = useMemo(() => ({ tonic, minor: !!minor }), [tonic, minor]);
  const res = useMemo(() => {
    try {
      const m = parseMotif(notes);
      const all = variations(m, key);
      const ids = show.split(',').map((s) => s.trim());
      return { list: ids.map((id) => all.find((v) => v.id === id)).filter((v): v is NonNullable<typeof v> => !!v), error: null };
    } catch (e) {
      return { list: [], error: (e as Error).message };
    }
  }, [notes, key, show]);
  const [sound] = useLessonSound();
  if (res.error) return <p className="error">⚠ {res.error}</p>;
  const flats = /b/.test(tonic) || tonic === 'F' || (!!minor && ['D', 'G', 'C', 'F'].includes(tonic));
  const play = (m: MotifNote[]) => {
    const beat = 0.45;
    const melodySample = sound === 'brass' ? 'horn' : sound === 'woodwinds' ? 'flute' : sound === 'piano' ? 'piano' : 'violins';
    void playLine(
      m.map((n) => n.midi),
      m.map((n) => n.dur * beat),
      melodySample,
    );
    if (harmony) {
      const h = harmonize(m, key, harmony, 2);
      const top = Math.min(...m.filter((n) => n.midi !== null).map((n) => n.midi!));
      void playVoicings(
        h.romans.map((r) => padVoicing(r, key, top)),
        sound === 'piano' ? 'piano' : 'strings',
        2 * beat,
      );
    }
  };
  return (
    <div className="motif-list">
      {res.list.map((v) => {
        const h = harmony ? harmonize(v.notes, key, harmony, 2) : null;
        return (
          <figure key={v.id} className="example motif">
            <figcaption className="motif-head">
              <b>{v.name}</b> <span className="muted small">{v.desc}</span>
            </figcaption>
            <Staff items={motifItems(v.notes, flats)} maxWidth={Math.min(520, 140 + v.notes.length * 46)} />
            {h && <p className="muted small center">{h.romans.map(prettyRoman).join(' · ')}</p>}
            <figcaption>
              <button type="button" className="play-btn" onClick={() => play(v.notes)}>
                ▶ Play
              </button>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/* ---------------- Counterpoint ---------------- */

const LINE_SAMPLES: Record<EnsembleId, [SampleId, SampleId]> = {
  piano: ['piano', 'piano'],
  strings: ['violins', 'cellos'],
  brass: ['horn', 'trombone'],
  woodwinds: ['flute', 'bassoon'],
  orchestra: ['violins', 'cellos'],
};

/**
 * <Counterpoint upper="A3:w C4:w …" lower="D3:w F3:w …" check />
 * Two independent lines (motif syntax), played together; `check` runs the species rules.
 */
export function Counterpoint({ upper, lower, check, label, beat = 0.42 }: { upper: string; lower: string; check?: boolean; label?: string; beat?: number }) {
  const [sound, setSound] = useLessonSound();
  const res = useMemo(() => {
    try {
      const u = parseMotif(upper);
      const l = parseMotif(lower);
      return { u, l, issues: check ? checkCounterpoint(u, l) : [], error: null };
    } catch (e) {
      return { u: [], l: [], issues: [], error: (e as Error).message };
    }
  }, [upper, lower, check]);
  if (res.error) return <p className="error">⚠ {res.error}</p>;
  const [su, sl] = LINE_SAMPLES[sound];
  const events = (line: MotifNote[], sample: SampleId) => {
    let t = 0;
    return line.map((n) => {
      const ev = { notes: n.midi === null ? [] : [n.midi], duration: n.dur * beat, at: t * beat, sample };
      t += n.dur;
      return ev;
    });
  };
  const play = () => {
    stopPlayback();
    void playEvents([...events(res.u, su), ...events(res.l, sl)].sort((a, b) => a.at - b.at));
  };
  const clefOf = (line: MotifNote[]) => (Math.min(...line.filter((n) => n.midi !== null).map((n) => n.midi!)) >= 57 ? 'treble' : 'bass');
  return (
    <figure className="example counterpoint">
      <Staff clef={clefOf(res.u)} items={motifItems(res.u, false)} maxWidth={Math.min(520, 120 + res.u.length * 40)} />
      <Staff clef={clefOf(res.l)} items={motifItems(res.l, false)} maxWidth={Math.min(520, 120 + res.l.length * 40)} />
      <figcaption>
        <button type="button" className="play-btn" onClick={play}>
          ▶ {label ?? 'Listen'}
        </button>
        <SoundSelect value={sound} onChange={setSound} />
      </figcaption>
      {check && (
        <ul className="chorale-issues">
          {res.issues.length === 0 && <li className="ok">✓ Follows the species rules</li>}
          {res.issues.map((i, k) => (
            <li key={k} className={`issue-${i.severity}`}>
              {i.severity === 'error' ? '✗' : '⚠'} <b>Bar {Math.floor(i.at / 4) + 1}</b> · {CP_LABELS[i.rule]}: {i.message}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/* ---------------- Vertical layering demo ---------------- */

type LayerId = 'pad' | 'bass' | 'melody' | 'shimmer';
const LAYER_INFO: Record<LayerId, string> = {
  pad: 'Pad (violas & violins)',
  bass: 'Bass ostinato (cellos)',
  melody: 'Melody (horn)',
  shimmer: 'High shimmer (flute)',
};

/**
 * <Layers romans="i VI III VII" tonic="D" minor melody="…" />
 * The same loop with switchable layers: how adaptive game music raises intensity.
 */
export function Layers({ romans, tonic = 'C', minor, melody, beat = 0.42 }: { romans: string; tonic?: string; minor?: boolean; melody?: string; beat?: number }) {
  const key = useMemo(() => ({ tonic, minor: !!minor }), [tonic, minor]);
  const [on, setOn] = useState<Record<LayerId, boolean>>({ pad: true, bass: false, melody: false, shimmer: false });
  const res = useMemo(() => realizeProgression(romans, key), [romans, key]);
  const mel = useMemo(() => {
    try {
      return melody ? parseMotif(melody) : null;
    } catch {
      return null;
    }
  }, [melody]);
  if (!res.realization) return <p className="error">⚠ {res.error}</p>;
  const voicings = res.realization.voicings;
  const bar = 4;
  const loops = 2;
  const preset = (layers: LayerId[]) => setOn({ pad: layers.includes('pad'), bass: layers.includes('bass'), melody: layers.includes('melody'), shimmer: layers.includes('shimmer') });
  const play = () => {
    const evs: { notes: number[]; duration: number; at: number; sample: SampleId; velocity?: number }[] = [];
    const total = voicings.length * bar;
    for (let lp = 0; lp < loops; lp++) {
      const off = lp * total;
      voicings.forEach((v, ci) => {
        const t0 = off + ci * bar;
        const root = 36 + (((v[0] % 12) + 12) % 12);
        const fifth = root + 7;
        if (on.pad) {
          evs.push({ notes: [v[1]], duration: bar * beat, at: t0 * beat, sample: 'violas', velocity: 0.6 });
          evs.push({ notes: [v[2], v[3]], duration: bar * beat, at: t0 * beat, sample: 'violins', velocity: 0.6 });
        }
        if (on.bass) {
          const pattern = [root, root, root + 12, root, fifth, root, root + 12, fifth];
          pattern.forEach((m, k) => evs.push({ notes: [m], duration: 0.5 * beat, at: (t0 + k * 0.5) * beat, sample: 'cellos', velocity: 0.8 }));
        }
        if (on.shimmer) {
          // the chord's upper tones an octave or so higher, arpeggiated in 8ths
          const upper = [...new Set(v.slice(1).map((m) => ((m % 12) + 12) % 12))].map((pc) => 72 + pc).sort((a, b) => a - b);
          const arp = [...upper, upper[1] ?? upper[0]];
          for (let k = 0; k < 8; k++) evs.push({ notes: [arp[k % arp.length]], duration: 0.5 * beat, at: (t0 + k * 0.5) * beat, sample: 'flute', velocity: 0.45 });
        }
      });
      if (on.melody && mel) {
        let t = off;
        for (const n of mel) {
          if (n.midi !== null && t < off + total) evs.push({ notes: [n.midi], duration: n.dur * beat, at: t * beat, sample: 'horn', velocity: 0.8 });
          t += n.dur;
        }
      }
    }
    stopPlayback();
    void playEvents(evs.sort((a, b) => a.at - b.at));
  };
  return (
    <figure className="example layers">
      <p className="center chord-row">{res.parsed.items.map((i) => i.label).join('  ·  ')}</p>
      <div className="layer-toggles">
        {(Object.keys(LAYER_INFO) as LayerId[])
          .filter((l) => l !== 'melody' || mel)
          .map((l) => (
            <label key={l} className="toggle inline">
              <input type="checkbox" checked={on[l]} onChange={(e) => setOn({ ...on, [l]: e.target.checked })} /> {LAYER_INFO[l]}
            </label>
          ))}
      </div>
      <figcaption>
        <button type="button" className="btn ghost small" onClick={() => preset(['pad'])}>
          Explore
        </button>
        <button type="button" className="btn ghost small" onClick={() => preset(['pad', 'bass'])}>
          Tension
        </button>
        <button type="button" className="btn ghost small" onClick={() => preset(['pad', 'bass', 'melody', 'shimmer'])}>
          Combat
        </button>
        <button type="button" className="play-btn" onClick={play}>
          ▶ Play loop
        </button>
        <button type="button" className="play-btn" onClick={() => stopPlayback()} aria-label="Stop">
          ■
        </button>
      </figcaption>
    </figure>
  );
}
