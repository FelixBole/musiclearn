import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { getExercise } from '../../exercises/registry';
import type { CheckResult, ExerciseDef } from '../../exercises/types';
import { Feedback } from '../../exercises/widgets';
import { createRng } from '../../engine/rng';
import { ensureAudio, stopAll } from '../../engine/audio';
import { getSkill, recordAnswer, setSkillLevel } from '../../progress/skills';
import { updateDay } from '../../progress/db';
import { useSettings } from '../../progress/settings';
import { useMidiStatus } from '../hooks';

export function DrillPage() {
  const { exerciseId = '' } = useParams();
  const location = useLocation();
  const ex = getExercise(exerciseId);
  if (!ex) return <div className="page">Unknown drill. <Link to="/practice">Back</Link></div>;
  // remount on every navigation (e.g. ?level= changes) so no stale question survives
  // (location.key is "default" for hash changes without history state, so include search too)
  return <DrillRunner key={`${ex.id}:${location.search}:${location.key}`} ex={ex} />;
}

type Phase = 'intro' | 'run' | 'done';

function DrillRunner({ ex }: { ex: ExerciseDef }) {
  const [search] = useSearchParams();
  const settings = useSettings();
  const midi = useMidiStatus();
  const rng = useMemo(() => createRng(), []);
  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState<number | null>(null);
  const [skillLevel, setSkillLevelState] = useState(0);
  const [q, setQ] = useState<unknown>(null);
  const [qIndex, setQIndex] = useState(0);
  const [answered, setAnswered] = useState<CheckResult | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [levelMsg, setLevelMsg] = useState<string | null>(null);
  const started = useRef(0);
  const total = settings.sessionLength;
  const levelRef = useRef(0);

  useEffect(() => {
    void getSkill(ex.id).then((s) => {
      const override = search.get('level');
      const lvl = override !== null ? Math.min(Number(override), ex.levels.length - 1) : s.level;
      setSkillLevelState(s.level);
      setLevel(lvl);
    });
  }, [ex, search]);

  useEffect(() => () => stopAll(), []);

  const start = async () => {
    if (level === null) return;
    void ensureAudio();
    if (level !== skillLevel) await setSkillLevel(ex.id, level);
    levelRef.current = level;
    started.current = Date.now();
    setResults([]);
    setQIndex(0);
    setAnswered(null);
    setLevelMsg(null);
    setQ(ex.generate(level, rng));
    setPhase('run');
  };

  const finish = useCallback(async () => {
    setPhase('done');
    stopAll();
    const secs = Math.min((Date.now() - started.current) / 1000, total * 90);
    await updateDay((d) => {
      if (!d.drills.includes(ex.id)) d.drills.push(ex.id);
      d.seconds += Math.round(secs);
    });
  }, [ex.id, total]);

  const next = useCallback(() => {
    if (qIndex + 1 >= total) {
      void finish();
      return;
    }
    setQIndex((i) => i + 1);
    setAnswered(null);
    setQ(ex.generate(levelRef.current, rng));
  }, [qIndex, total, ex, rng, finish]);

  const onResult = (r: CheckResult) => {
    if (answered) return;
    setAnswered(r);
    setResults((rs) => [...rs, r.correct]);
    void recordAnswer(ex.id, r.correct, ex.levels.length - 1).then(({ skill, change }) => {
      if (change) {
        levelRef.current = skill.level;
        setLevel(skill.level);
        setSkillLevelState(skill.level);
        setLevelMsg(change === 'up' ? `⬆ Level up! Now: ${ex.levels[skill.level]}` : `⬇ Easing off to: ${ex.levels[skill.level]}`);
      }
    });
  };

  // auto-advance after a correct answer
  useEffect(() => {
    if (phase !== 'run' || !answered?.correct) return;
    const t = setTimeout(next, ex.id === 'sight-reading' ? 1800 : 1100);
    return () => clearTimeout(t);
  }, [answered, phase, next, ex.id]);

  // Enter / Space for next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'run' && answered && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, answered, next]);

  if (level === null) return <div className="loading">Loading…</div>;

  if (phase === 'intro') {
    return (
      <div className="page drill">
        <nav className="crumbs">
          <Link to="/practice">Practice</Link> › {ex.title}
        </nav>
        <h1>{ex.title}</h1>
        <p className="lead">{ex.description}</p>
        <div className="card">
          <label className="field">
            <span>Level</span>
            <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {ex.levels.map((l, i) => (
                <option key={l} value={i}>
                  {i + 1}. {l}
                  {i === skillLevel ? '  (current)' : ''}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small">
            {total} questions · ~{Math.round((total * ex.secondsPerQuestion) / 60) || 1} min
            {ex.input !== 'choices' && (midi.enabled && midi.devices.length ? ` · 🎹 ${midi.devices.join(', ')}` : ' · on-screen piano (enable MIDI in Settings)')}
          </p>
          <button type="button" className="btn big" onClick={() => void start()}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((correct / Math.max(1, results.length)) * 100);
    return (
      <div className="page drill">
        <h1>{ex.title}</h1>
        <div className="card center">
          <div className="big-score">
            {correct}/{results.length}
          </div>
          <p>{pct >= 90 ? 'Excellent! 🎉' : pct >= 70 ? 'Solid work.' : 'Good practice — repetition is how this sticks.'}</p>
          <p className="muted">Level: {ex.levels[level]}</p>
          {levelMsg && <p className="level-msg">{levelMsg}</p>}
          <div className="row center">
            <button type="button" className="btn" onClick={() => void start()}>
              Another round
            </button>
            <Link className="btn ghost" to={search.get('daily') ? '/' : '/practice'}>
              {search.get('daily') ? 'Back to Today' : 'All drills'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const View = ex.View;
  return (
    <div className="page drill running">
      <div className="drill-top">
        <Link to="/practice" className="close" aria-label="Quit drill" onClick={() => stopAll()}>
          ✕
        </Link>
        <div className="progress">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < results.length ? (results[i] ? 'ok' : 'bad') : i === qIndex ? 'cur' : ''} />
          ))}
        </div>
        <span className="pill small" title={ex.levels[level]}>
          L{level + 1}
        </span>
      </div>
      {levelMsg && <div className="level-msg">{levelMsg}</div>}
      <View key={qIndex} q={q} level={level} answered={answered} onResult={onResult} settings={settings} />
      <Feedback result={answered} />
      {answered && (
        <div className="row center">
          <button type="button" className="btn" onClick={next}>
            {qIndex + 1 >= total ? 'Finish' : 'Next'} ↵
          </button>
        </div>
      )}
    </div>
  );
}
