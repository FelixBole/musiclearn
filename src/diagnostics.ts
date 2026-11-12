/**
 * On-device diagnostics: an error log that survives reloads (localStorage, never IndexedDB,
 * so it still works when the database is the thing that's broken), a report you can copy
 * from Settings, and recovery actions.
 */
import { db, DB_NAME } from './progress/db';

const LOG_KEY = 'musiclearn:errors';

export interface LoggedError {
  t: string;
  kind: string;
  msg: string;
}

export function logError(kind: string, err: unknown) {
  const msg =
    err instanceof Error ? `${err.name}: ${err.message}${err.stack ? `\n${err.stack.split('\n').slice(1, 4).join('\n')}` : ''}` : String(err);
  try {
    const list: LoggedError[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    list.push({ t: new Date().toISOString(), kind, msg: msg.slice(0, 1500) });
    localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-30)));
  } catch {
    /* storage unavailable — nothing else we can do */
  }
  console.error(`[${kind}]`, err);
}

export function getErrors(): LoggedError[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function clearErrors() {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
}

export function installGlobalErrorLog() {
  window.addEventListener('error', (e) => logError('error', e.error ?? `${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => logError('unhandled-rejection', e.reason));
}

export class TimeoutError extends Error {
  constructor(what: string, ms: number) {
    super(`${what} did not finish within ${ms / 1000}s`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(what, ms)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Text report for copy/paste. Every probe has its own timeout so a hung DB can't hang the report. */
export async function collectDiagnostics(): Promise<string> {
  const lines: string[] = [];
  const add = (k: string, v: unknown) => lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  const probe = async (k: string, f: () => Promise<unknown>) => {
    try {
      add(k, await withTimeout(f(), 3000, k));
    } catch (e) {
      add(k, `ERROR ${(e as Error).name}: ${(e as Error).message}`);
    }
  };
  add('app', __APP_VERSION__);
  add('time', new Date().toString());
  add('userAgent', navigator.userAgent);
  add('standalone (installed PWA)', window.matchMedia('(display-mode: standalone)').matches);
  add('url', location.href);
  add('sw controller', navigator.serviceWorker?.controller?.scriptURL ?? 'none');
  await probe('sw registrations', async () => (await navigator.serviceWorker?.getRegistrations())?.map((r) => ({ scope: r.scope, active: r.active?.state, waiting: !!r.waiting })));
  await probe('caches', async () => (await caches.keys()));
  await probe('storage estimate', async () => {
    const e = await navigator.storage?.estimate?.();
    return e ? { usageMB: ((e.usage ?? 0) / 1e6).toFixed(1), quotaMB: ((e.quota ?? 0) / 1e6).toFixed(0) } : 'n/a';
  });
  await probe('storage persisted', async () => (await navigator.storage?.persisted?.()) ?? 'n/a');
  await probe('indexedDB databases', async () => (await indexedDB.databases?.())?.map((d) => `${d.name} v${d.version}`) ?? 'n/a');
  add('dexie isOpen', db.isOpen());
  add('dexie hasFailed', db.hasFailed());
  // DB probes run in parallel (each may time out when the DB is stuck), printed in order
  const dbProbes: [string, () => Promise<unknown>][] = [
    ['db open', async () => (await db.open(), 'ok')],
    ...(['lessons', 'cards', 'skills', 'days', 'kv'] as const).map((t) => [`count ${t}`, () => db.table(t).count()] as [string, () => Promise<unknown>]),
    ['raw IDB open (bypassing Dexie)', () => rawOpenProbe()],
  ];
  const results = await Promise.all(
    dbProbes.map(([k, f]) =>
      withTimeout(f(), 3000, k).then(
        (v) => (typeof v === 'string' ? v : JSON.stringify(v)),
        (e: Error) => `ERROR ${e.name}: ${e.message}`,
      ),
    ),
  );
  dbProbes.forEach(([k], i) => lines.push(`${k}: ${results[i]}`));
  const errs = getErrors();
  lines.push('', `--- last ${errs.length} logged errors ---`);
  for (const e of errs) lines.push(`${e.t} [${e.kind}] ${e.msg}`);
  return lines.join('\n');
}

function rawOpenProbe(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => {
      const d = req.result;
      const stores = [...d.objectStoreNames];
      d.close();
      resolve(`ok v${d.version} [${stores.join(',')}]`);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve('BLOCKED by another open connection');
  });
}

/**
 * Delete the local database with the raw API so we can detect "blocked"
 * (another window/tab of the app holding it open).
 */
export function deleteDatabase(onBlocked: () => void): Promise<void> {
  db.close();
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => onBlocked();
    }),
    15000,
    'Deleting the local database',
  );
}

/** Unregister the service worker and drop all caches, then reload from the network. */
export async function clearAppCacheAndReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch (e) {
    logError('clear-cache', e);
  }
  location.reload();
}
