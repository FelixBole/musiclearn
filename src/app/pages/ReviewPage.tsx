import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { findCard } from '../../content/curriculum';
import { db, type CardRecord } from '../../progress/db';
import { dueCards, previewIntervals, Rating, reviewCard, type Grade } from '../../srs';
import { Staff } from '../../components/Staff';
import { Play, playByMode } from '../../components/Play';
import { ensureAudio } from '../../engine/audio';

const GRADES: { g: Grade; label: string; cls: string }[] = [
  { g: Rating.Again as Grade, label: 'Again', cls: 'again' },
  { g: Rating.Hard as Grade, label: 'Hard', cls: 'hard' },
  { g: Rating.Good as Grade, label: 'Good', cls: 'good' },
  { g: Rating.Easy as Grade, label: 'Easy', cls: 'easy' },
];

export function ReviewPage() {
  const [queue, setQueue] = useState<CardRecord[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const loading = useRef(false);

  const load = async () => {
    if (loading.current) return;
    loading.current = true;
    const cards = await dueCards(100);
    // drop cards whose content no longer exists
    const valid: CardRecord[] = [];
    for (const c of cards) {
      if (findCard(c.id)) valid.push(c);
      else await db.cards.update(c.id, { suspended: true });
    }
    setQueue(valid.sort(() => Math.random() - 0.5));
    loading.current = false;
  };

  useEffect(() => {
    void load();
  }, []);

  const current = queue?.[0];
  const content = current ? findCard(current.id) : undefined;

  useEffect(() => {
    setRevealed(false);
    if (content?.card.play) {
      const p = content.card.play;
      const t = setTimeout(() => void playByMode(p.notes, p.mode), 300);
      return () => clearTimeout(t);
    }
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const grading = useRef(false);
  const grade = async (g: Grade) => {
    if (!current || grading.current) return;
    grading.current = true;
    const updated = await reviewCard(current, g).finally(() => {
      grading.current = false;
    });
    setDoneCount((n) => n + 1);
    setQueue((q) => {
      const rest = (q ?? []).slice(1);
      // short (re)learning step: see it again at the end of this session
      if (updated.due - Date.now() < 15 * 60 * 1000) rest.push(updated);
      return rest;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        void grade(GRADES[Number(e.key) - 1].g);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!queue) return <div className="loading">Loading…</div>;

  if (!current || !content) {
    return (
      <div className="page review">
        <h1>Review</h1>
        <div className="card center">
          <div className="big-score">✓</div>
          <p>{doneCount ? `${doneCount} reviews done. Nicely done!` : 'No cards due right now.'}</p>
          <Link className="btn" to="/">
            Back to Today
          </Link>
        </div>
      </div>
    );
  }

  const { card, lesson } = content;
  const preview = previewIntervals(current);
  return (
    <div className="page review" onPointerDown={() => void ensureAudio()}>
      <div className="drill-top">
        <Link to="/" className="close" aria-label="Stop reviewing">
          ✕
        </Link>
        <span className="muted">{queue.length} left</span>
        <span className="pill small">{lesson.title}</span>
      </div>
      <div className="flashcard">
        <div className="front">
          <p className="card-q">{card.front}</p>
          {card.staff && <Staff clef={card.staff.clef} notes={card.staff.notes} keySig={card.staff.keySig} chord={card.staff.chord} maxWidth={320} scale={1.2} />}
          {card.play && <Play notes={card.play.notes} mode={card.play.mode} label="Replay" />}
        </div>
        {revealed ? (
          <>
            <div className="back">{card.back}</div>
            <div className="grades">
              {GRADES.map(({ g, label, cls }, i) => (
                <button key={label} type="button" className={`grade ${cls}`} onClick={() => void grade(g)}>
                  {label}
                  <small>
                    {preview[g]} · {i + 1}
                  </small>
                </button>
              ))}
            </div>
          </>
        ) : (
          <button type="button" className="btn big" onClick={() => setRevealed(true)}>
            Show answer
          </button>
        )}
      </div>
    </div>
  );
}
