import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayKey } from '../../progress/db';
import { ALL_LESSONS, findLesson, nextLesson, unlockedExercises } from '../../content/curriculum';
import { EXERCISES } from '../../exercises/registry';
import { mastery } from '../../progress/skills';
import type { SkillRecord } from '../../progress/db';
import { useSettings } from '../../progress/settings';

const WARMUP = ['note-reading', 'interval-ear'];

export function pickDrills(unlocked: Set<string>, skills: SkillRecord[], count = 3, now = Date.now()): string[] {
  const pool = unlocked.size ? [...unlocked] : WARMUP;
  const scored = pool
    .map((id) => {
      const ex = EXERCISES.find((e) => e.id === id);
      const sk = skills.find((s) => s.id === id);
      const m = ex ? mastery(sk, ex.levels.length) : 0;
      const daysSince = sk?.lastPracticed ? (now - sk.lastPracticed) / 86400000 : 3;
      return { id, score: 1 - m + Math.min(daysSince, 7) * 0.15 };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.id);
}

export function TodayPage() {
  const settings = useSettings();
  const data = useLiveQuery(async () => {
    const [lessons, dueCount, skills, today] = await Promise.all([
      db.lessons.toArray(),
      db.cards.where('due').belowOrEqual(Date.now()).count(),
      db.skills.toArray(),
      db.days.get(todayKey()),
    ]);
    return { lessons, dueCount, skills, today };
  }, []);

  if (!data) return <div className="loading">Loading…</div>;
  const completed = new Set(data.lessons.map((l) => l.id));
  const next = nextLesson(completed);
  const lessonsToday = data.today?.lessons.length ?? 0;
  const drills = pickDrills(unlockedExercises(completed), data.skills);
  const drillsDone = new Set(data.today?.drills ?? []);
  const reviewsDone = data.today?.reviews ?? 0;
  const progress = Math.round((completed.size / ALL_LESSONS.length) * 100);
  const nextLoc = next ? findLesson(next.id) : undefined;
  const firstTime = completed.size === 0 && data.skills.length === 0;

  return (
    <div className="page today">
      <h1>Today</h1>
      {firstTime && (
        <div className="card intro">
          <h2>Welcome 👋</h2>
          <p>
            Each day: clear your <b>reviews</b>, take <b>one short lesson</b>, then a few <b>drills</b> picked for your weakest skills. 15–20 minutes is plenty —
            consistency beats marathons.
          </p>
          <p className="muted">
            Got a MIDI keyboard? Enable it in <Link to="/settings">Settings</Link>. On the go, everything works with the on-screen piano and buttons.
          </p>
        </div>
      )}

      <ol className="steps">
        <li className={`step ${data.dueCount === 0 ? 'done' : ''}`}>
          <div className="step-head">
            <span className="step-num">1</span>
            <div>
              <h3>Review</h3>
              <p className="muted">
                {data.dueCount > 0
                  ? `${data.dueCount} card${data.dueCount > 1 ? 's' : ''} due`
                  : reviewsDone
                    ? `All caught up · ${reviewsDone} reviewed today`
                    : 'Nothing due — cards appear as you complete lessons'}
              </p>
            </div>
          </div>
          {data.dueCount > 0 && (
            <Link className="btn" to="/review">
              Start review
            </Link>
          )}
        </li>

        <li className={`step ${lessonsToday >= settings.lessonsPerDay ? 'done' : ''}`}>
          <div className="step-head">
            <span className="step-num">2</span>
            <div>
              <h3>Lesson</h3>
              {next && nextLoc ? (
                <p className="muted">
                  {nextLoc.track.title} · {nextLoc.unit.title}
                  <br />
                  <b className="fg">{next.title}</b> · {next.minutes} min
                </p>
              ) : (
                <p className="muted">All available lessons complete — new tracks are on the way.</p>
              )}
            </div>
          </div>
          {next && (
            <Link className={`btn ${lessonsToday >= settings.lessonsPerDay ? 'ghost' : ''}`} to={`/learn/${next.id}`}>
              {lessonsToday >= settings.lessonsPerDay ? 'One more?' : 'Start lesson'}
            </Link>
          )}
        </li>

        <li className={`step ${drills.every((d) => drillsDone.has(d)) ? 'done' : ''}`}>
          <div className="step-head">
            <span className="step-num">3</span>
            <div>
              <h3>Practice</h3>
              <p className="muted">Picked for your weakest and least recent skills.</p>
            </div>
          </div>
          <div className="drill-list">
            {drills.map((id) => {
              const ex = EXERCISES.find((e) => e.id === id)!;
              const sk = data.skills.find((s) => s.id === id);
              return (
                <Link key={id} to={`/practice/${id}?daily=1`} className={`drill-chip ${drillsDone.has(id) ? 'done' : ''}`}>
                  <span>{drillsDone.has(id) ? '✓ ' : ''}{ex.title}</span>
                  <small>{ex.levels[sk?.level ?? 0]}</small>
                </Link>
              );
            })}
          </div>
        </li>
      </ol>

      <div className="card stats">
        <div>
          <div className="stat">{progress}%</div>
          <div className="muted">curriculum</div>
        </div>
        <div>
          <div className="stat">{data.today?.answers ?? 0}</div>
          <div className="muted">answers today</div>
        </div>
        <div>
          <div className="stat">{data.today?.answers ? Math.round(((data.today.correct ?? 0) / data.today.answers) * 100) : 0}%</div>
          <div className="muted">accuracy</div>
        </div>
      </div>
    </div>
  );
}
