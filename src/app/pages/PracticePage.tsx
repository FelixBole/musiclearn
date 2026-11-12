import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../progress/db';
import { EXERCISES } from '../../exercises/registry';
import { AREA_LABELS, type Area } from '../../exercises/types';
import { mastery } from '../../progress/skills';
import { unlockedExercises } from '../../content/curriculum';

export function PracticePage() {
  const data = useLiveQuery(async () => ({ skills: await db.skills.toArray(), lessons: await db.lessons.toArray() }), []);
  const unlocked = unlockedExercises(new Set((data?.lessons ?? []).map((l) => l.id)));
  const areas = Object.keys(AREA_LABELS) as Area[];
  return (
    <div className="page practice">
      <h1>Practice</h1>
      <p className="muted">Every drill adapts: 85% accuracy moves you up a level, under 60% moves you back down. Pick any drill at any time; those marked ✦ are unlocked by lessons you've completed.</p>
      {areas.map((area) => {
        const list = EXERCISES.filter((e) => e.area === area);
        if (!list.length) return null;
        return (
          <section key={area}>
            <h2>{AREA_LABELS[area]}</h2>
            <div className="ex-grid">
              {list.map((ex) => {
                const sk = data?.skills.find((s) => s.id === ex.id);
                const m = mastery(sk, ex.levels.length);
                return (
                  <Link key={ex.id} to={`/practice/${ex.id}`} className="ex-card">
                    <div className="ex-card-head">
                      <h3>
                        {unlocked.has(ex.id) && <span className="unlocked">✦ </span>}
                        {ex.title}
                      </h3>
                      <span className="pill small">
                        L{(sk?.level ?? 0) + 1}/{ex.levels.length}
                      </span>
                    </div>
                    <p className="muted">{ex.description}</p>
                    <div className="meter" aria-label={`mastery ${Math.round(m * 100)}%`}>
                      <div style={{ width: `${m * 100}%` }} />
                    </div>
                    <small className="muted">
                      {ex.levels[sk?.level ?? 0]}
                      {sk?.attempts ? ` · ${Math.round((sk.correct / sk.attempts) * 100)}% of ${sk.attempts}` : ''}
                    </small>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
