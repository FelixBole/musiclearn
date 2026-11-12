import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../progress/db';
import { TRACKS } from '../../content/curriculum';

export function LearnPage() {
  const lessons = useLiveQuery(() => db.lessons.toArray(), []);
  const done = new Set((lessons ?? []).map((l) => l.id));
  return (
    <div className="page learn">
      <h1>Learn</h1>
      {TRACKS.map((t) => {
        const total = t.units.reduce((n, u) => n + u.lessons.length, 0);
        const completed = t.units.reduce((n, u) => n + u.lessons.filter((l) => done.has(l.id)).length, 0);
        return (
          <section key={t.id} className="track">
            <div className="track-head">
              <span className="track-letter">{t.id}</span>
              <div>
                <h2>{t.title}</h2>
                <p className="muted">{t.subtitle}</p>
              </div>
              {total > 0 && (
                <span className="pill">
                  {completed}/{total}
                </span>
              )}
            </div>
            {t.units.map((u) => (
              <div key={u.id} className="unit">
                <h3>{u.title}</h3>
                <ul className="lesson-list">
                  {u.lessons.map((l) => (
                    <li key={l.id}>
                      <Link to={`/learn/${l.id}`} className={done.has(l.id) ? 'done' : ''}>
                        <span className="check">{done.has(l.id) ? '✓' : '○'}</span>
                        <span className="grow">
                          {l.title}
                          <small>{l.summary}</small>
                        </span>
                        <span className="muted">{l.minutes}′</span>
                      </Link>
                    </li>
                  ))}
                  {(u.planned ?? []).map((p) => (
                    <li key={p} className="planned">
                      <span className="check">·</span>
                      <span className="grow">{p}</span>
                      <span className="pill small">soon</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
