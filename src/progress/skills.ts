import { db, updateDay, type MusicLearnDB, type SkillRecord } from './db';

/** Adaptive difficulty rules. */
export const WINDOW = 12;
export const MIN_SAMPLES = 10;
export const PROMOTE_AT = 0.85;
export const DEMOTE_BELOW = 0.6;

export function emptySkill(id: string): SkillRecord {
  return { id, level: 0, bestLevel: 0, recent: [], attempts: 0, correct: 0, lastPracticed: 0 };
}

export type LevelChange = 'up' | 'down' | null;

/** Pure: apply one result to a skill record. */
export function applyResult(skill: SkillRecord, correct: boolean, maxLevel: number, now = Date.now()): { skill: SkillRecord; change: LevelChange } {
  const s: SkillRecord = { ...skill, recent: [...skill.recent, correct].slice(-WINDOW) };
  s.attempts++;
  if (correct) s.correct++;
  s.lastPracticed = now;
  let change: LevelChange = null;
  if (s.recent.length >= MIN_SAMPLES) {
    const acc = s.recent.filter(Boolean).length / s.recent.length;
    if (acc >= PROMOTE_AT && s.level < maxLevel) {
      s.level++;
      s.recent = [];
      change = 'up';
    } else if (acc < DEMOTE_BELOW && s.level > 0) {
      s.level--;
      s.recent = [];
      change = 'down';
    }
  }
  s.bestLevel = Math.max(s.bestLevel, s.level);
  return { skill: s, change };
}

export async function getSkill(id: string, database: MusicLearnDB = db): Promise<SkillRecord> {
  return (await database.skills.get(id)) ?? emptySkill(id);
}

export async function recordAnswer(id: string, correct: boolean, maxLevel: number, database: MusicLearnDB = db): Promise<{ skill: SkillRecord; change: LevelChange }> {
  const current = await getSkill(id, database);
  const result = applyResult(current, correct, maxLevel);
  await database.skills.put(result.skill);
  await updateDay((d) => {
    d.answers++;
    if (correct) d.correct++;
  }, database);
  return result;
}

export async function setSkillLevel(id: string, level: number) {
  const current = await getSkill(id);
  await db.skills.put({ ...current, level, recent: [], bestLevel: Math.max(current.bestLevel, level) });
}

/** 0..1 mastery estimate used for skill maps and drill picking. */
export function mastery(skill: SkillRecord | undefined, levelCount: number): number {
  if (!skill || skill.attempts === 0) return 0;
  const acc = skill.recent.length ? skill.recent.filter(Boolean).length / skill.recent.length : 0.5;
  return Math.min(1, (skill.level + acc) / levelCount);
}
