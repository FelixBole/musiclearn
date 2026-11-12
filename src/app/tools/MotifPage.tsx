import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Staff } from '../../components/Staff';
import { Keyboard } from '../../components/Keyboard';
import { ensureAudio, playLine, playVoicings, stopPlayback } from '../../engine/audio';
import { useNoteEvents } from '../../engine/input/hooks';
import { FLAVOUR_INFO, harmonize, motifToText, padVoicing, parseMotif, variations, type HarmonyFlavour, type MotifNote, type Variation } from '../../engine/motif';
import { ENSEMBLES, ENSEMBLE_IDS, type EnsembleId, type SampleId } from '../../engine/orchestra/instruments';
import { prettyRoman, type KeyCtx } from '../../engine/harmony/roman';
import { midiToName } from '../../engine/theory';
import { downloadMidi, midiFileName, tracksToMidi } from '../../engine/midiExport';
import { motifItems } from '../../exercises/composerViews';
import { KEY_CODES, codeFromKey, keyCodeLabel, keyFromCode } from './toolData';

const PRESETS: { name: string; key: string; text: string }[] = [
  { name: 'Hero call (rising 4th)', key: 'C', text: 'G4:q C5:q. D5:8 E5:q D5:q C5:h' },
  { name: 'Mystery (minor, chromatic)', key: 'a', text: 'A4:q C5:q B4:q G#4:q A4:h r:h' },
  { name: 'Lullaby / village', key: 'F', text: 'C5:q A4:8 Bb4:8 C5:q F4:q G4:h' },
  { name: 'Villain (descending)', key: 'd', text: 'D5:h C#5:q A4:q Bb4:q. G4:8 A4:h' },
  { name: 'Adventure (dotted)', key: 'D', text: 'D4:q. A4:8 A4:q B4:8 C#5:8 D5:h A4:h' },
];

const DURS: [string, number][] = [
  ['𝅘𝅥𝅯 16th', 0.25],
  ['♪ 8th', 0.5],
  ['♩ quarter', 1],
  ['♩. dotted', 1.5],
  ['𝅗𝅥 half', 2],
  ['𝅝 whole', 4],
];

const MELODY_SAMPLE: Record<EnsembleId, SampleId> = { piano: 'piano', strings: 'violins', brass: 'horn', woodwinds: 'flute', orchestra: 'violins' };

function usesFlats(k: KeyCtx) {
  return /b/.test(k.tonic) || k.tonic === 'F' || (k.minor && ['D', 'G', 'C', 'F'].includes(k.tonic));
}

export function MotifPage() {
  const [keyCode, setKeyCode] = useState('C');
  const [text, setText] = useState(PRESETS[0].text);
  const [flavour, setFlavour] = useState<HarmonyFlavour | 'none'>('diatonic');
  const [sound, setSound] = useState<EnsembleId>('strings');
  const [bpm, setBpm] = useState(84);
  const [record, setRecord] = useState(false);
  const [dur, setDur] = useState(1);
  const key = keyFromCode(keyCode);
  const flats = usesFlats(key);

  const parsed = useMemo(() => {
    try {
      const m = parseMotif(text);
      if (!m.length) return { motif: null, error: 'Enter a few notes' };
      return { motif: m, error: null };
    } catch (e) {
      return { motif: null, error: (e as Error).message };
    }
  }, [text]);
  const vars = useMemo(() => (parsed.motif ? variations(parsed.motif, key) : []), [parsed.motif, keyCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useNoteEvents((e) => {
    if (e.type !== 'on') return;
    setText((t) => `${t.trim()} ${midiToName(e.midi, flats)}:${durToken(dur)}`.trim());
  }, record);

  const beat = 60 / bpm;
  const harmonyFor = (m: MotifNote[]) => (flavour === 'none' ? null : harmonize(m, key, flavour, 2));
  const play = async (v: Variation) => {
    await ensureAudio();
    stopPlayback();
    void playLine(
      v.notes.map((n) => n.midi),
      v.notes.map((n) => n.dur * beat),
      MELODY_SAMPLE[sound],
    );
    const h = harmonyFor(v.notes);
    if (h) {
      const top = Math.min(...v.notes.filter((n) => n.midi !== null).map((n) => n.midi!));
      void playVoicings(
        h.romans.map((r) => padVoicing(r, key, top)),
        sound,
        h.segBeats * beat,
      );
    }
  };
  const exportMidi = (v: Variation) => {
    let t = 0;
    const melody = v.notes.flatMap((n) => {
      const out = n.midi === null ? [] : [{ midi: n.midi, start: t, dur: n.dur }];
      t += n.dur;
      return out;
    });
    const tracks = [{ name: `${v.name} (melody)`, program: 40, notes: melody }];
    const h = harmonyFor(v.notes);
    if (h) {
      const top = Math.min(...melody.map((n) => n.midi));
      tracks.push({
        name: `Harmony (${FLAVOUR_INFO[h.flavour].name})`,
        program: 48,
        notes: h.romans.flatMap((r, i) => padVoicing(r, key, top).map((midi) => ({ midi, start: i * h.segBeats, dur: h.segBeats }))),
      });
    }
    downloadMidi(tracksToMidi(tracks, bpm, v.name), midiFileName(`motif ${keyCodeLabel(keyCode)} ${v.name}`));
  };

  return (
    <div className="page tools motif-page" onPointerDown={() => void ensureAudio()}>
      <p className="crumbs">
        <Link to="/tools">Tools</Link> ›
      </p>
      <h1>Motif transformer</h1>
      <section className="card">
        <p className="muted">Write a short motif (or play it in), then hear it in other modes, upside down, backwards, slower, faster, fragmented and reharmonized: the leitmotif toolbox.</p>
        <div className="row">
          <label className="field">
            <span>Key</span>
            <select value={keyCode} onChange={(e) => setKeyCode(e.target.value)}>
              {KEY_CODES.map((c) => (
                <option key={c} value={c}>
                  {keyCodeLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span>Presets</span>
            <select
              value=""
              onChange={(e) => {
                const p = PRESETS[Number(e.target.value)];
                if (p) {
                  setKeyCode(p.key);
                  setText(p.text);
                }
              }}
            >
              <option value="">Load a motif…</option>
              {PRESETS.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name} ({keyCodeLabel(p.key)})
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea className="prog-input" value={text} onChange={(e) => setText(e.target.value)} rows={2} spellCheck={false} autoCapitalize="off" aria-label="Motif" />
        {parsed.error && <p className="parse-error">⚠ {parsed.error}</p>}
        <details className="help">
          <summary>Syntax</summary>
          <p>
            <code>note:duration</code> separated by spaces. Durations: <code>16 8 q h w</code>, dotted <code>8. q. h.</code>; <code>r</code> is a rest. Example: <code>E4:q G4:8 A4:8 B4:h r:q</code>.
          </p>
        </details>
        <label className="toggle">
          <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} /> Enter notes by playing (MIDI keyboard or the keys below)
        </label>
        {record && (
          <>
            <div className="seg wrap">
              {DURS.map(([label, d]) => (
                <button key={d} type="button" className={dur === d ? 'active' : ''} onClick={() => setDur(d)}>
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => setText((t) => `${t.trim()} r:${durToken(dur)}`.trim())}>
                Rest
              </button>
              <button type="button" onClick={() => setText((t) => t.trim().split(/\s+/).slice(0, -1).join(' '))}>
                ⌫
              </button>
              <button type="button" onClick={() => setText('')}>
                Clear
              </button>
            </div>
            <Keyboard from={53} to={84} compact />
          </>
        )}
        <div className="row">
          <label className="field">
            <span>Harmony</span>
            <select value={flavour} onChange={(e) => setFlavour(e.target.value as HarmonyFlavour | 'none')}>
              <option value="none">Melody only</option>
              {(Object.keys(FLAVOUR_INFO) as HarmonyFlavour[]).map((f) => (
                <option key={f} value={f}>
                  {FLAVOUR_INFO[f].name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sound</span>
            <select value={sound} onChange={(e) => setSound(e.target.value as EnsembleId)}>
              {ENSEMBLE_IDS.map((id) => (
                <option key={id} value={id}>
                  {ENSEMBLES[id].name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tempo {bpm} BPM</span>
            <input type="range" min={50} max={160} step={2} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          </label>
        </div>
        {flavour !== 'none' && <p className="muted small">{FLAVOUR_INFO[flavour].desc}</p>}
      </section>

      {vars.map((v) => {
        const h = harmonyFor(v.notes);
        return (
          <article key={v.id} className="card motif-card">
            <header>
              <h3>{v.name}</h3>
              <p className="muted small">{v.desc}</p>
            </header>
            <div className="scroll-x">
              <div style={{ minWidth: Math.min(700, 140 + v.notes.length * 40) }}>
                <Staff items={motifItems(v.notes, flats)} keySig={undefined} maxWidth={Math.min(700, 160 + v.notes.length * 46)} />
              </div>
            </div>
            {h && <p className="center chord-row">{h.romans.map(prettyRoman).join('  ·  ')}</p>}
            <div className="row">
              <button type="button" className="play-btn" onClick={() => void play(v)}>
                ▶ Play
              </button>
              <button type="button" className="btn ghost small" onClick={() => exportMidi(v)}>
                ⤓ MIDI
              </button>
              {v.id !== 'original' && (
                <button type="button" className="btn ghost small" onClick={() => setText(motifToText(v.notes, (m) => midiToName(m, flats)))}>
                  Use as new motif
                </button>
              )}
              {h && (
                <Link className="btn ghost small" to={`/tools/playground?p=${encodeURIComponent(h.romans.join(' '))}&k=${encodeURIComponent(codeFromKey(key))}`}>
                  Harmony in playground
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function durToken(d: number): string {
  return { 0.25: '16', 0.5: '8', 1: 'q', 1.5: 'q.', 2: 'h', 4: 'w' }[d] ?? 'q';
}
