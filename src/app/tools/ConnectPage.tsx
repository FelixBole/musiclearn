import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { SatbStaff } from '../../components/SatbStaff';
import { ensureAudio, playProgression, stopPlayback } from '../../engine/audio';
import { FAMILY_LABELS, findBridges, type BridgeFamily, type RealizedBridge } from '../../engine/harmony/connect';
import { parseRoman, prettyRoman } from '../../engine/harmony/roman';
import { tokenize } from '../../engine/harmony/sequence';
import { keySigFor } from '../../exercises/harmonyLogic';
import { KEY_CODES, keyCodeLabel, keyFromCode, palettes } from './toolData';

const PLAYHEAD = '#2f6fdf';

function BridgeCard({ br, keySig, onUse, useLabel }: { br: RealizedBridge; keySig: string; onUse: () => void; useLabel: string }) {
  const [playing, setPlaying] = useState(-1);
  const r = br.realization;
  const play = async () => {
    await ensureAudio();
    stopPlayback();
    await playProgression(
      r.voicings.map((v) => [...v]),
      1.1,
      { onEvent: setPlaying },
    );
    setPlaying(-1);
  };
  const colors: Record<string, string> = {};
  // inserted chords are tinted so the eye finds them
  for (let i = 1; i < br.symbols.length - 1; i++) for (let v = 0; v < 4; v++) colors[`${i}:${v}`] = '#7b4fb8';
  if (playing >= 0) for (let v = 0; v < 4; v++) colors[`${playing}:${v}`] = PLAYHEAD;
  return (
    <article className={`card bridge fam-${br.family}`}>
      <header>
        <span className="pill small">{FAMILY_LABELS[br.family]}</span>
        <h3>{br.title}</h3>
      </header>
      <div className="bridge-chords">
        {br.symbols.map((s, i) => (
          <span key={i} className={i > 0 && i < br.symbols.length - 1 ? 'ins' : ''}>
            {prettyRoman(s)}
          </span>
        ))}
      </div>
      <SatbStaff chords={r.names} labels={br.symbols.map(prettyRoman)} keySig={keySig} colors={colors} maxWidth={420} />
      <p>{br.explain}</p>
      <div className="row">
        <button type="button" className="play-btn" onClick={() => void play()}>
          ▶ Play
        </button>
        {br.insert.length > 0 && (
          <button type="button" className="btn ghost small" onClick={onUse}>
            {useLabel}
          </button>
        )}
      </div>
    </article>
  );
}

/** Passing-chord explorer: every classic way to get from chord A to chord B. */
export function ConnectPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const from = params.get('from');
  const at = Number(params.get('at') ?? -1);
  const fromKey = params.get('fk') ?? 'C';
  const [keyCode, setKeyCode] = useState(params.get('k') ?? 'C');
  const [a, setA] = useState(params.get('a') ?? 'I');
  const [b, setB] = useState(params.get('b') ?? 'V');
  const [active, setActive] = useState<'a' | 'b'>('b');
  const [custom, setCustom] = useState('');
  const [results, setResults] = useState<RealizedBridge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BridgeFamily | 'all'>('all');
  const key = keyFromCode(keyCode);

  useEffect(() => {
    setResults(null);
    setError(null);
    // let the "Finding…" state paint before the (few hundred ms) search
    const t = setTimeout(() => {
      try {
        parseRoman(a, key);
        parseRoman(b, key);
        setResults(findBridges(a, b, key));
      } catch (e) {
        setError((e as Error).message);
      }
    }, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, keyCode]);
  useEffect(() => () => stopPlayback(), []);

  const set = (v: string) => {
    if (active === 'a') {
      setA(v);
      setActive('b');
    } else setB(v);
  };
  const chips = palettes(key.minor)
    .filter((p) => p.id !== 'key')
    .flatMap((p) => p.chords)
    .filter((c) => !/sus|It|Fr|Ger|ct/.test(c));

  const use = (br: RealizedBridge) => {
    if (from !== null && at >= 0) {
      const tokens = tokenize(from);
      tokens.splice(at + 1, 0, ...br.insert);
      navigate(`/tools/playground?p=${encodeURIComponent(tokens.join(' '))}&k=${encodeURIComponent(fromKey)}`);
    } else {
      navigate(`/tools/playground?p=${encodeURIComponent(br.symbols.join(' '))}&k=${encodeURIComponent(keyCode)}`);
    }
  };
  const families = results ? [...new Set(results.map((r) => r.family))] : [];
  const shown = results?.filter((r) => filter === 'all' || r.family === filter || r.family === 'direct');

  return (
    <div className="page tools connect" onPointerDown={() => void ensureAudio()}>
      <p className="crumbs">
        <Link to="/tools">Tools</Link> ›{from !== null && <Link to={`/tools/playground?p=${encodeURIComponent(from)}&k=${encodeURIComponent(fromKey)}`}> Back to playground</Link>}
      </p>
      <h1>Passing-chord explorer</h1>
      <section className="card">
        <p className="muted">
          Pick two chords. You get every classic way to connect them, each voiced in four parts, checked and explained. Stop guessing: hear the options side by side.
        </p>
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
        </div>
        <div className="slots connect-slots">
          <button type="button" className={`slot ${active === 'a' ? 'active' : ''}`} onClick={() => setActive('a')}>
            <small>From</small> {prettyRoman(a)}
          </button>
          <span className="arrow">→</span>
          <button type="button" className={`slot ${active === 'b' ? 'active' : ''}`} onClick={() => setActive('b')}>
            <small>To</small> {prettyRoman(b)}
          </button>
        </div>
        <div className="roman-pad">
          {chips.map((c) => (
            <button key={c} type="button" className={`choice ${(active === 'a' ? a : b) === c ? 'picked' : ''}`} onClick={() => set(c)}>
              {prettyRoman(c)}
            </button>
          ))}
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) set(custom.trim());
            setCustom('');
          }}
        >
          <input className="grow" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Any numeral, e.g. ii65, bVI, V7/vi" aria-label="Custom chord" autoCapitalize="off" autoCorrect="off" />
          <button type="submit" className="btn ghost">
            Set {active === 'a' ? 'From' : 'To'}
          </button>
        </form>
        {error && <p className="parse-error">⚠ {error}</p>}
      </section>

      {!results && !error && <p className="muted center">Finding connections…</p>}
      {results && (
        <>
          <div className="seg wrap">
            <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              All ({results.length - 1})
            </button>
            {families
              .filter((f) => f !== 'direct')
              .map((f) => (
                <button key={f} type="button" className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                  {FAMILY_LABELS[f]}
                </button>
              ))}
          </div>
          {shown!.map((br) => (
            <BridgeCard key={br.id} br={br} keySig={keySigFor(key)} onUse={() => use(br)} useLabel={from !== null ? '⤵ Insert into my progression' : '✎ Open in playground'} />
          ))}
          {results.length <= 1 && <p className="muted center">No clean connection found for this pair. Try another inversion of the target chord.</p>}
        </>
      )}
    </div>
  );
}
