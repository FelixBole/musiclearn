import Dexie, { type Table } from 'dexie';
import type { Card } from 'ts-fsrs';

export interface LessonRecord {
  id: string;
  completedAt: number;
  quizCorrect: number;
  quizTotal: number;
}

export interface CardRecord {
  /** `${lessonId}:${cardKey}` */
  id: string;
  lessonId: string;
  fsrs: Card;
  /** epoch ms, indexed for "due" queries */
  due: number;
  suspended?: boolean;
}

export interface SkillRecord {
  /** exercise id */
  id: string;
  level: number;
  bestLevel: number;
  /** rolling window of results at the current level (true = correct) */
  recent: boolean[];
  attempts: number;
  correct: number;
  lastPracticed: number;
}

export interface DayRecord {
  /** YYYY-MM-DD (local) */
  date: string;
  reviews: number;
  answers: number;
  correct: number;
  lessons: string[];
  /** exercise ids for which a full session was completed */
  drills: string[];
  /** seconds of active practice (approx) */
  seconds: number;
}

export interface KV {
  key: string;
  value: unknown;
}

export class MusicLearnDB extends Dexie {
  lessons!: Table<LessonRecord, string>;
  cards!: Table<CardRecord, string>;
  skills!: Table<SkillRecord, string>;
  days!: Table<DayRecord, string>;
  kv!: Table<KV, string>;

  constructor(name = 'musiclearn') {
    super(name);
    this.version(1).stores({
      lessons: 'id, completedAt',
      cards: 'id, lessonId, due',
      skills: 'id, lastPracticed',
      days: 'date',
      kv: 'key',
    });
  }
}

export const DB_NAME = 'musiclearn';
export const db = new MusicLearnDB(DB_NAME);

/* Connection health, observable by the UI (see DbGate). */
type DbIssue = null | { kind: 'blocked' | 'versionchange'; at: number };
let dbIssue: DbIssue = null;
const issueListeners = new Set<(i: DbIssue) => void>();
export function onDbIssue(l: (i: DbIssue) => void) {
  issueListeners.add(l);
  return () => {
    issueListeners.delete(l);
  };
}
export function getDbIssue() {
  return dbIssue;
}
function setDbIssue(i: DbIssue) {
  dbIssue = i;
  issueListeners.forEach((l) => l(i));
}
// Another window of the app is holding an old connection open (e.g. a frozen background tab).
db.on('blocked', () => setDbIssue({ kind: 'blocked', at: Date.now() }));
// Another window wants to delete/upgrade the DB: let go of our connection so it isn't blocked.
db.on('versionchange', () => {
  db.close();
  setDbIssue({ kind: 'versionchange', at: Date.now() });
  return false;
});

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function updateDay(mutate: (d: DayRecord) => void, database: MusicLearnDB = db) {
  const date = todayKey();
  await database.transaction('rw', database.days, async () => {
    const d = (await database.days.get(date)) ?? {
      date,
      reviews: 0,
      answers: 0,
      correct: 0,
      lessons: [],
      drills: [],
      seconds: 0,
    };
    mutate(d);
    await database.days.put(d);
  });
}

/** Consecutive days (ending today or yesterday) with any activity. */
export function computeStreak(days: DayRecord[], now = new Date()): number {
  const active = new Set(
    days.filter((d) => d.reviews + d.answers + d.lessons.length > 0).map((d) => d.date),
  );
  const cursor = new Date(now);
  if (!active.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (active.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ---------- Backup ---------- */

export async function exportBackup(database: MusicLearnDB = db): Promise<string> {
  const data = {
    app: 'musiclearn',
    version: 1,
    exportedAt: new Date().toISOString(),
    lessons: await database.lessons.toArray(),
    cards: await database.cards.toArray(),
    skills: await database.skills.toArray(),
    days: await database.days.toArray(),
    kv: await database.kv.toArray(),
  };
  return JSON.stringify(data);
}

export async function importBackup(json: string, database: MusicLearnDB = db) {
  const data = JSON.parse(json);
  if (data.app !== 'musiclearn') throw new Error('Not a MusicLearn backup file');
  const reviveCard = (c: CardRecord): CardRecord => ({
    ...c,
    fsrs: {
      ...c.fsrs,
      due: new Date(c.fsrs.due),
      last_review: c.fsrs.last_review ? new Date(c.fsrs.last_review) : undefined,
    },
  });
  await database.transaction('rw', [database.lessons, database.cards, database.skills, database.days, database.kv], async () => {
    await Promise.all([
      database.lessons.clear(),
      database.cards.clear(),
      database.skills.clear(),
      database.days.clear(),
      database.kv.clear(),
    ]);
    await database.lessons.bulkPut(data.lessons ?? []);
    await database.cards.bulkPut((data.cards ?? []).map(reviveCard));
    await database.skills.bulkPut(data.skills ?? []);
    await database.days.bulkPut(data.days ?? []);
    await database.kv.bulkPut(data.kv ?? []);
  });
}

/** Test helper: wipe and reopen a database instance. The UI uses diagnostics.deleteDatabase. */
export async function resetAll(database: MusicLearnDB = db) {
  await database.delete();
  await database.open();
}
