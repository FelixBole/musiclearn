import { createEmptyCard, fsrs, generatorParameters, Rating, type Grade } from 'ts-fsrs';
import { db, updateDay, type CardRecord, type MusicLearnDB } from '../progress/db';

export { Rating };
export type { Grade };

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

export function newCard(id: string, lessonId: string, now = new Date()): CardRecord {
  const fsrsCard = createEmptyCard(now);
  return { id, lessonId, fsrs: fsrsCard, due: fsrsCard.due.getTime() };
}

/** Pure scheduling step. */
export function gradeCard(card: CardRecord, grade: Grade, now = new Date()): CardRecord {
  const { card: next } = scheduler.next(card.fsrs, now, grade);
  return { ...card, fsrs: next, due: next.due.getTime() };
}

/** Human readable "next interval" preview per grade, e.g. { 1: '1m', 3: '10m', ... } */
export function previewIntervals(card: CardRecord, now = new Date()): Record<number, string> {
  const preview = scheduler.repeat(card.fsrs, now);
  const out: Record<number, string> = {};
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    out[g] = formatInterval(preview[g].card.due.getTime() - now.getTime());
  }
  return out;
}

export function formatInterval(ms: number): string {
  const min = ms / 60000;
  if (min < 60) return `${Math.max(1, Math.round(min))}m`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)}h`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d`;
  const mo = d / 30;
  if (mo < 12) return `${Math.round(mo)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

export async function addLessonCards(lessonId: string, cardKeys: string[], database: MusicLearnDB = db) {
  const now = new Date();
  await database.transaction('rw', database.cards, async () => {
    for (const key of cardKeys) {
      const id = `${lessonId}:${key}`;
      if (!(await database.cards.get(id))) await database.cards.put(newCard(id, lessonId, now));
    }
  });
}

export async function dueCards(limit = 50, database: MusicLearnDB = db, now = Date.now()): Promise<CardRecord[]> {
  const cards = await database.cards.where('due').belowOrEqual(now).limit(limit * 2).toArray();
  return cards.filter((c) => !c.suspended).slice(0, limit);
}

export async function reviewCard(card: CardRecord, grade: Grade, database: MusicLearnDB = db) {
  const next = gradeCard(card, grade);
  await database.cards.put(next);
  await updateDay((d) => {
    d.reviews++;
  }, database);
  return next;
}
