import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { SatbStaff } from '../../components/SatbStaff';
import { ensureAudio, playMelody, playVoicings, stopPlayback } from '../../engine/audio';
import { ENSEMBLES, ENSEMBLE_IDS, ENSEMBLE_TRACKS, type EnsembleId } from '../../engine/orchestra/instruments';
import { useChordCapture } from '../../engine/input/hooks';
import { detectChord } from '../../engine/theory';
import { realizeProgression, tokenize } from '../../engine/harmony/sequence';
import { RULE_LABELS, checkProgression } from '../../engine/harmony/voiceleading';
import { downloadMidi, midiFileName, progressionToMidi } from '../../engine/midiExport';
import { keySigFor } from '../../exercises/harmonyLogic';
import { db } from '../../progress/db';
import { useMidiStatus } from '../hooks';
import { KEY_CODES, PRESETS, codeFromKey, keyCodeLabel, keyFromCode, palettes } from './toolData';

interface Saved {
  name: string;
  key: string;
  text: string;
}

const LAST = 'playground:last';
const SAVED = 'playground:saved';
const ERR = '#c0393f';
const WARN = '#c47f12';

function loadLast(): { text: string; key: string } | null {
  try {
    const raw = localStorage.getItem(LAST);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** detectChord gives pretty names (B♭ø7); turn them back into parseable symbols. */
const symbolToken = (pretty: string) =>
  pretty.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/°7/g, 'dim7').replace(/°/g, 'dim').replace(/ø7?/g, 'm7b5');

export function PlaygroundPage() {
  const [params, setParams] = useSearchParams();
  const initial = useMemo(() => {
    const p = params.get('p');
    if (p) return { text: p, key: params.get('k') ?? 'C' };
    return loadLast() ?? { text: 'I vi IV V7 I', key: 'C' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [text, setText] = useState(initial.text);
  const [keyCode, setKeyCode] = useState(KEY_CODES.includes(initial.key) ? initial.key : 'C');
  const [bpm, setBpm] = useState(80);
  const [beats, setBeats] = useState(2);
  const [loop, setLoop] = useState(false);
  const [showCheck, setShowCheck] = useState(true);
  const [palette, setPalette] = useState('dia');
  const [sound, setSound] = useState<EnsembleId>(() => {
    try {
      const v = localStorage.getItem('playground:sound') as EnsembleId | null;
      return v && v in ENSEMBLES ? v : 'piano';
    } catch {
      return 'piano';
    }
  });
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(-1);
  const [fromMidi, setFromMidi] = useState(false);
  const [saveName, setSaveName] = useState('');
  const midi = useMidiStatus();
  const playId = useRef(0);

  // the URL params are a one-shot hand-off (from lessons / explorer); drop them once read
  useEffect(() => {
    if (params.has('p')) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LAST, JSON.stringify({ text, key: keyCode }));
    } catch {
      /* private mode: fine */
    }
  }, [text, keyCode]);
  useEffect(() => () => stopPlayback(), []);
  useEffect(() => {
    try {
      localStorage.setItem('playground:sound', sound);
    } catch {
      /* ignore */
    }
  }, [sound]);

  const key = keyFromCode(keyCode);
  const deferredText = useDeferredValue(text);
  const res = useMemo(() => realizeProgression(deferredText, key), [deferredText, keyCode]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = res.realization;
  const issues = useMemo(() => (r ? checkProgression(r.voicings, r.chords, key) : []), [r]); // eslint-disable-line react-hooks/exhaustive-deps
  const chordSecs = (beats * 60) / bpm;

  const saved = useLiveQuery(async () => ((await db.kv.get(SAVED))?.value as Saved[] | undefined) ?? [], []);

  useChordCapture((notes) => {
    const names = detectChord(notes);
    if (names.length) append(symbolToken(names[0]));
  }, fromMidi);

  function append(tok: string) {
    setText((t) => `${t.trim()} ${tok}`.trim());
  }
  function backspace() {
    setText((t) => tokenize(t).slice(0, -1).join(' '));
  }

  async function play() {
    if (!r) return;
    await ensureAudio();
    stopPlayback();
    const id = ++playId.current;
    setLoading(sound !== 'piano');
    do {
      await playVoicings(
        r.voicings.map((v) => [...v]),
        sound,
        chordSecs,
        {
          onEvent: (i) => {
            if (id !== playId.current) return;
            setLoading(false);
            setPlaying(i);
          },
        },
      );
    } while (loopRef.current && id === playId.current);
    setLoading(false);
    if (id === playId.current) setPlaying(-1);
  }
  const loopRef = useRef(loop);
  loopRef.current = loop;
  function stop() {
    playId.current++;
    stopPlayback();
    setPlaying(-1);
  }

  function exportMidi() {
    if (!r) return;
    const bytes = progressionToMidi(
      r.voicings.map((v) => [...v]),
      { bpm, beatsPerChord: beats, name: text, trackNames: ENSEMBLE_TRACKS[sound].names, programs: ENSEMBLE_TRACKS[sound].programs },
    );
    downloadMidi(bytes, midiFileName(`${keyCodeLabel(keyCode)} ${text}`));
  }

  async function save() {
    const name = saveName.trim() || text.slice(0, 30);
    const list = [...(saved ?? []).filter((s) => s.name !== name), { name, key: keyCode, text }];
    await db.kv.put({ key: SAVED, value: list });
    setSaveName('');
  }
  async function remove(name: string) {
    await db.kv.put({ key: SAVED, value: (saved ?? []).filter((s) => s.name !== name) });
  }

  const colors: Record<string, string> = {};
  if (showCheck) {
    for (const i of issues) {
      const pair = /parallel|direct|overlap|unresolved|leap|melodic|cross/.test(i.rule);
      for (const ci of pair ? [i.at - 1, i.at] : [i.at]) for (const v of i.voices) if (colors[`${ci}:${v}`] !== ERR) colors[`${ci}:${v}`] = i.severity === 'error' ? ERR : WARN;
    }
  }

  // pairs of adjacent Roman-numeral chords that the explorer can connect
  const items = res.parsed.items;
  const pairs = items.slice(1).map((b, i) => ({ a: items[i], b, i })).filter(({ a, b }) => !a.chord.kind && !b.chord.kind && !a.token.includes('=') && !b.token.includes('='));
  const explorerLink = (i: number) => {
    const a = items[i];
    const b = items[i + 1];
    const k = codeFromKey(b.chord.key);
    return `/tools/connect?k=${encodeURIComponent(k)}&a=${encodeURIComponent(a.token)}&b=${encodeURIComponent(b.token)}&from=${encodeURIComponent(text)}&fk=${encodeURIComponent(keyCode)}&at=${a.tokenIndex}`;
  };
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const labels = items.map((i) => i.label);
  const nChords = r?.voicings.length ?? 0;

  return (
    <div className="page tools playground" onPointerDown={() => void ensureAudio()}>
      <p className="crumbs">
        <Link to="/tools">Tools</Link> ›
      </p>
      <h1>Progression playground</h1>
      <section className="card">
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
              <option value="">Load a starting point…</option>
              {PRESETS.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name} ({keyCodeLabel(p.key)})
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea
          className="prog-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Progression"
          placeholder="I vi IV V7 I   ·   Cm Ab Eb Bb   ·   G: ii V7 I"
        />
        {res.error && <p className="parse-error">⚠ {res.error}</p>}
        <div className="seg">
          {palettes(key.minor).map((p) => (
            <button key={p.id} type="button" className={palette === p.id ? 'active' : ''} onClick={() => setPalette(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="roman-pad">
          {palettes(key.minor)
            .find((p) => p.id === palette)!
            .chords.map((c) => (
              <button key={c} type="button" className="choice" onClick={() => append(c)}>
                {c.endsWith(':') ? c : c.replace(/^b/, '♭').replace(/^#/, '♯')}
              </button>
            ))}
          <button type="button" className="choice" onClick={backspace} aria-label="Remove last chord">
            ⌫
          </button>
        </div>
        <details className="help">
          <summary>Syntax</summary>
          <ul>
            <li>
              Roman numerals: <code>I ii V7 V65 vii°7 viiø7 bVI iv6</code>, applied chords <code>V7/V vii°7/vi</code>
            </li>
            <li>
              Specials: <code>N6 It+6 Fr+6 Ger+6 ct°7 Vsus4 V7sus4</code>
            </li>
            <li>
              Chord symbols, mixed freely: <code>Cm Ab/C Fmaj7 G7sus4 C/D</code>
            </li>
            <li>
              Key change <code>G:</code> (lowercase = minor, <code>e:</code>), pivot chord <code>vi=G:ii</code>. Bar lines <code>|</code> are ignored.
            </li>
          </ul>
        </details>
        {midi.enabled && (
          <label className="toggle">
            <input type="checkbox" checked={fromMidi} onChange={(e) => setFromMidi(e.target.checked)} /> Add chords by playing them on the MIDI keyboard
          </label>
        )}
      </section>

      <section className="card">
        <div className="scroll-x">
          <div style={{ minWidth: Math.max(300, 120 + nChords * 52) }}>
            {r ? <SatbStaff chords={r.names} labels={labels} keySig={keySigFor(key)} colors={colors} playhead={playing} maxWidth={Math.max(520, 140 + nChords * 64)} /> : <div className="staff-placeholder muted">Type a progression above</div>}
          </div>
        </div>
        <div className="row center">
          {playing >= 0 ? (
            <button type="button" className="play-btn big" onClick={stop}>
              ■ Stop
            </button>
          ) : (
            <button type="button" className="play-btn big" onClick={() => void play()} disabled={!r}>
              ▶ Play
            </button>
          )}
          <button type="button" className="play-btn" disabled={!r} onClick={() => r && void playMelody(r.voicings.map((v) => v[0]), chordSecs * 0.7)}>
            Bass
          </button>
          <button type="button" className="play-btn" disabled={!r} onClick={() => r && void playMelody(r.voicings.map((v) => v[3]), chordSecs * 0.7)}>
            Soprano
          </button>
          <label className="toggle inline">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
          </label>
        </div>
        {loading && <p className="muted small center">Loading {ENSEMBLES[sound].name.toLowerCase()} samples…</p>}
        <div className="row">
          <label className="field">
            <span>Sound</span>
            <select value={sound} onChange={(e) => setSound(e.target.value as EnsembleId)} aria-label="Sound">
              {ENSEMBLE_IDS.map((id) => (
                <option key={id} value={id}>
                  {ENSEMBLES[id].name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tempo {bpm} BPM</span>
            <input type="range" min={40} max={160} step={2} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Beats / chord</span>
            <select value={beats} onChange={(e) => setBeats(Number(e.target.value))}>
              {[1, 2, 3, 4, 8].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn ghost" disabled={!r} onClick={exportMidi} title="Standard MIDI file, one track per voice">
            ⤓ Export MIDI
          </button>
        </div>
      </section>

      {r && (
        <section className="card">
          <label className="toggle">
            <input type="checkbox" checked={showCheck} onChange={(e) => setShowCheck(e.target.checked)} />
            <span>
              Voice-leading check <span className="muted">· classical four-part rules; film and pop break some on purpose, but break them knowingly</span>
            </span>
          </label>
          {showCheck && (
            <ul className="chorale-issues">
              {issues.length === 0 && <li className="ok">✓ No voice-leading problems</li>}
              {[...errors, ...warnings].map((i, k) => (
                <li key={k} className={`issue-${i.severity}`}>
                  {i.severity === 'error' ? '✗' : '⚠'} <b>{/parallel|direct|overlap|unresolved|leap|melodic|cross/.test(i.rule) ? `${labels[i.at - 1]} → ${labels[i.at]}` : labels[i.at]}</b> · {RULE_LABELS[i.rule]}: {i.message}
                </li>
              ))}
            </ul>
          )}
          {pairs.length > 0 && (
            <>
              <h3>Find a passing chord</h3>
              <p className="muted small">Pick two neighbouring chords to see every way to connect them; you can insert the result here.</p>
              <div className="pair-links">
                {pairs.map(({ a, b, i }) => (
                  <Link key={i} className="pill link" to={explorerLink(i)}>
                    {a.label} → {b.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <section className="card">
        <h2>Saved progressions</h2>
        <div className="row">
          <input className="grow" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Name (e.g. Forest theme B section)" aria-label="Name" />
          <button type="button" className="btn" onClick={() => void save()} disabled={!text.trim()}>
            Save
          </button>
        </div>
        {saved && saved.length > 0 ? (
          <ul className="saved-list">
            {saved.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  className="linklike"
                  onClick={() => {
                    setKeyCode(s.key);
                    setText(s.text);
                  }}
                >
                  <b>{s.name}</b> <span className="muted">{keyCodeLabel(s.key)} · {s.text}</span>
                </button>
                <button type="button" className="btn ghost small" onClick={() => void remove(s.name)} aria-label={`Delete ${s.name}`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Nothing saved yet. Saved progressions stay on this device (and in your backup).</p>
        )}
      </section>
    </div>
  );
}
