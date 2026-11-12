import { Component, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { db, getDbIssue, onDbIssue } from '../progress/db';
import { clearAppCacheAndReload, collectDiagnostics, deleteDatabase, logError, withTimeout } from '../diagnostics';

/* ------------------------------------------------------------------ */
/* Loading indicator that offers help instead of spinning forever      */
/* ------------------------------------------------------------------ */

export function Loading({ what = 'Loading' }: { what?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="loading">
      {what}…
      {slow && (
        <p className="small">
          This is taking unusually long. <Link to="/settings#diagnostics">Open diagnostics</Link> to see what's wrong.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DB gate: open the database first, with a timeout and recovery UI    */
/* ------------------------------------------------------------------ */

type GateState = { s: 'opening' } | { s: 'ok' } | { s: 'error'; error: Error };

export function DbGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ s: 'opening' });
  const [attempt, setAttempt] = useState(0);
  const [issue, setIssue] = useState(getDbIssue);

  useEffect(() => onDbIssue(setIssue), []);

  useEffect(() => {
    let alive = true;
    setState({ s: 'opening' });
    withTimeout(db.open(), 8000, 'Opening the local database')
      .then(() => {
        if (!alive) return;
        setState({ s: 'ok' });
        // installed PWAs usually get persistent storage: protects progress from eviction
        void navigator.storage?.persist?.().catch(() => {});
      })
      .catch((e: Error) => {
        logError('db-open', e);
        if (alive) setState({ s: 'error', error: e });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (issue?.kind === 'versionchange') {
    return (
      <Recovery title="Updated in another window" retry={() => location.reload()}>
        The local database was reset or upgraded from another MusicLearn window. Reload to continue.
      </Recovery>
    );
  }
  if (state.s === 'error') {
    return (
      <Recovery title="Can't open your progress database" error={state.error} retry={() => setAttempt((a) => a + 1)}>
        {issue?.kind === 'blocked' || state.error.name === 'TimeoutError' ? (
          <p>
            Another copy of MusicLearn is most likely holding the database open. On Android that's often a <b>Chrome tab</b> of the same address left
            open in the background next to the installed app. Close every other MusicLearn tab/window (check Chrome's tab switcher), then press Retry.
          </p>
        ) : (
          <p>The browser refused to open local storage.</p>
        )}
      </Recovery>
    );
  }
  if (state.s === 'opening') return <Loading what="Opening your progress" />;
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/* Recovery screen (works without the database)                         */
/* ------------------------------------------------------------------ */

export function Recovery({ title, error, retry, children }: { title: string; error?: Error; retry: () => void; children?: ReactNode }) {
  return (
    <div className="page recovery">
      <h1>⚠ {title}</h1>
      <div className="card">
        {children}
        {error && (
          <p className="muted small">
            <code>
              {error.name}: {error.message}
            </code>
          </p>
        )}
        <div className="row">
          <button type="button" className="btn" onClick={retry}>
            Retry
          </button>
        </div>
      </div>
      <RepairTools />
    </div>
  );
}

/** Diagnostics + repair actions. Usable even when IndexedDB is stuck. */
export function RepairTools() {
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [collecting, setCollecting] = useState(false);
  // independent of `busy`: diagnostics must stay available while a delete is waiting
  const showReport = async () => {
    setCollecting(true);
    setReport(await collectDiagnostics());
    setCollecting(false);
  };

  const wipe = async () => {
    if (!confirm('Delete ALL local progress on this device and start fresh? (Export a backup first if you can.)')) return;
    setBusy('Deleting local database');
    setMsg(null);
    try {
      await deleteDatabase(() =>
        setMsg('Waiting: another MusicLearn window/tab is holding the database. Close it (check Chrome’s tab switcher) — deletion continues automatically.'),
      );
      setMsg('Database deleted. Reloading…');
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      logError('db-delete', e);
      setMsg(`Could not delete: ${(e as Error).message}. Close other MusicLearn tabs/windows and try again.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card" id="diagnostics">
      <h2>Diagnostics &amp; repair</h2>
      <p className="muted small">If something is stuck: copy the report and send it over — it includes the errors this device has logged.</p>
      <div className="row">
        <button type="button" className="btn ghost" disabled={collecting} onClick={() => void showReport()}>
          {collecting ? 'Collecting…' : 'Show diagnostics'}
        </button>
        <button type="button" className="btn ghost" disabled={!!busy} onClick={() => void clearAppCacheAndReload()}>
          Clear app cache &amp; reload
        </button>
        <button type="button" className="btn danger" disabled={!!busy} onClick={() => void wipe()}>
          Delete local database
        </button>
      </div>
      {busy && <p className="small muted">{busy}…</p>}
      {msg && <p className="small">{msg}</p>}
      {report && (
        <>
          <pre className="diag">{report}</pre>
          <button type="button" className="btn ghost" onClick={() => void navigator.clipboard?.writeText(report).then(() => setMsg('Copied ✓'))}>
            Copy report
          </button>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Error boundary: show the error instead of a blank screen             */
/* ------------------------------------------------------------------ */

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    logError('render', error);
  }
  render() {
    if (this.state.error) {
      return (
        <Recovery title="Something went wrong" error={this.state.error} retry={() => this.setState({ error: null })}>
          <p>This error has been logged on the device; the diagnostics report below includes it.</p>
        </Recovery>
      );
    }
    return this.props.children;
  }
}
