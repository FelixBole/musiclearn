import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export interface Settings {
  /** Use Web MIDI keyboard input */
  midiEnabled: boolean;
  /** Play sound when MIDI keys are pressed (turn off if your keyboard has its own sound) */
  midiEcho: boolean;
  /** No-equipment mode: hide piano-first answers, prefer buttons/multiple choice */
  mobileMode: boolean;
  /** Show on-screen piano in drills */
  showKeyboard: boolean;
  /** Questions per drill session */
  sessionLength: number;
  /** Master volume in dB */
  volume: number;
  /** Max new lessons suggested per day on Today */
  lessonsPerDay: number;
}

export const DEFAULT_SETTINGS: Settings = {
  midiEnabled: false,
  midiEcho: true,
  mobileMode: false,
  showKeyboard: true,
  sessionLength: 10,
  volume: -4,
  lessonsPerDay: 1,
};

export function useSettings(): Settings {
  const stored = useLiveQuery(() => db.kv.get('settings'), []);
  return { ...DEFAULT_SETTINGS, ...((stored?.value as Partial<Settings>) ?? {}) };
}

export async function getSettings(): Promise<Settings> {
  const stored = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((stored?.value as Partial<Settings>) ?? {}) };
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  await db.kv.put({ key: 'settings', value: { ...current, ...patch } });
}
