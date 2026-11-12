import { useEffect, useState, type ComponentType } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { MDXProvider } from '@mdx-js/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ALL_LESSONS, findLesson, loadLessonBody } from '../../content/curriculum';
import { LessonContext, lessonComponents, useLessonQuizTracker } from '../../content/LessonComponents';
import { db, updateDay } from '../../progress/db';
import { addLessonCards } from '../../srs';
import { ensureAudio } from '../../engine/audio';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  // remount per lesson so quiz tracking state never leaks between lessons
  return <LessonView key={lessonId} lessonId={lessonId} />;
}

function LessonView({ lessonId }: { lessonId: string }) {
  const found = findLesson(lessonId);
  const navigate = useNavigate();
  const [Body, setBody] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tracker = useLessonQuizTracker();
  const record = useLiveQuery(() => db.lessons.get(lessonId), [lessonId]);

  useEffect(() => {
    setBody(null);
    setError(null);
    window.scrollTo(0, 0);
    loadLessonBody(lessonId)
      .then((m) => setBody(() => m.default as ComponentType))
      .catch((e: Error) => setError(e.message));
  }, [lessonId]);

  if (!found) return <div className="page">Lesson not found. <Link to="/learn">Back to lessons</Link></div>;
  const { lesson, unit, track } = found;
  const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId);
  const next = ALL_LESSONS[idx + 1];
  const allAnswered = tracker.answered >= tracker.total;

  const complete = async () => {
    await db.lessons.put({ id: lesson.id, completedAt: Date.now(), quizCorrect: tracker.correct, quizTotal: tracker.total });
    await addLessonCards(lesson.id, lesson.cards.map((c) => c.key));
    await updateDay((d) => {
      if (!d.lessons.includes(lesson.id)) d.lessons.push(lesson.id);
      d.seconds += lesson.minutes * 60;
    });
    navigate(next ? `/learn/${next.id}` : '/');
  };

  return (
    <article className="page lesson" onPointerDown={() => void ensureAudio()}>
      <nav className="crumbs">
        <Link to="/learn">Learn</Link> › {track.title} › {unit.title}
      </nav>
      <h1>{lesson.title}</h1>
      <p className="lead">{lesson.summary}</p>
      {error && <p className="error">{error}</p>}
      {Body ? (
        <LessonContext.Provider value={tracker.ctx}>
          <MDXProvider components={lessonComponents}>
            <div className="prose">
              <Body />
            </div>
          </MDXProvider>
        </LessonContext.Provider>
      ) : (
        !error && <div className="loading">Loading lesson…</div>
      )}

      <footer className="lesson-footer card">
        {record ? (
          <p>
            ✓ Completed {new Date(record.completedAt).toLocaleDateString()}
            {record.quizTotal ? ` · ${record.quizCorrect}/${record.quizTotal} checks right` : ''}
          </p>
        ) : (
          <p className="muted">
            {tracker.total > 0 && !allAnswered
              ? `Answer the ${tracker.total - tracker.answered} remaining check${tracker.total - tracker.answered > 1 ? 's' : ''} to complete the lesson.`
              : `Completing adds ${lesson.cards.length} flashcards to your daily review.`}
          </p>
        )}
        <div className="row">
          {!record && (
            <button type="button" className="btn" disabled={!allAnswered || !Body} onClick={() => void complete()}>
              Complete lesson{next ? ' → next' : ''}
            </button>
          )}
          {record && next && (
            <Link className="btn" to={`/learn/${next.id}`}>
              Next: {next.title}
            </Link>
          )}
          <Link className="btn ghost" to="/">
            Today
          </Link>
        </div>
      </footer>
    </article>
  );
}
