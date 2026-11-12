import { useRef, useState } from 'react';
import { updateSettings, useSettings } from '../../progress/settings';
import { exportBackup, importBackup } from '../../progress/db';
import { RepairTools } from '../Resilience';
import { useMidiStatus } from '../hooks';
import { ensureAudio, playMelody } from '../../engine/audio';

export function SettingsPage() {
  const s = useSettings();
  const midi = useMidiStatus();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const download = async () => {
    const json = await exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `musiclearn-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restore = async (file: File) => {
    try {
      await importBackup(await file.text());
      setMsg('Backup restored ✓');
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="page settings">
      <h1>Settings</h1>

      <section className="card">
        <h2>MIDI keyboard</h2>
        {!midi.supported ? (
          <p className="muted">Web MIDI isn't supported in this browser. Use Chrome or Edge (desktop or Android) to connect a MIDI keyboard.</p>
        ) : (
          <>
            <label className="toggle">
              <input type="checkbox" checked={s.midiEnabled} onChange={(e) => void updateSettings({ midiEnabled: e.target.checked })} />
              Use MIDI keyboard input
            </label>
            {s.midiEnabled && (
              <p className="muted small">
                {midi.error
                  ? `Error: ${midi.error}`
                  : midi.devices.length
                    ? `Connected: ${midi.devices.join(', ')}`
                    : 'No device detected. Plug in your keyboard (USB-OTG on Android) — it will appear automatically.'}
              </p>
            )}
            <label className="toggle">
              <input type="checkbox" checked={s.midiEcho} onChange={(e) => void updateSettings({ midiEcho: e.target.checked })} />
              Play sound for MIDI notes (turn off if your keyboard has its own speakers)
            </label>
          </>
        )}
      </section>

      <section className="card">
        <h2>Practice</h2>
        <label className="toggle">
          <input type="checkbox" checked={s.mobileMode} onChange={(e) => void updateSettings({ mobileMode: e.target.checked })} />
          On-the-go mode (prefer buttons and spelling over playing)
        </label>
        <label className="toggle">
          <input type="checkbox" checked={s.showKeyboard} onChange={(e) => void updateSettings({ showKeyboard: e.target.checked })} />
          Show on-screen piano in reading drills
        </label>
        <label className="field">
          <span>Questions per drill</span>
          <select value={s.sessionLength} onChange={(e) => void updateSettings({ sessionLength: Number(e.target.value) })}>
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>New lessons per day (Today screen)</span>
          <select value={s.lessonsPerDay} onChange={(e) => void updateSettings({ lessonsPerDay: Number(e.target.value) })}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Volume</span>
          <input
            type="range"
            min={-30}
            max={6}
            value={s.volume}
            onChange={(e) => void updateSettings({ volume: Number(e.target.value) })}
            onPointerUp={() => void ensureAudio().then(() => playMelody([60, 64, 67], 0.25))}
          />
        </label>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="muted small">Progress is stored only on this device. Export a backup to move it to another device (e.g. PC ↔ phone).</p>
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => void download()}>
            Export backup
          </button>
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && void restore(e.target.files[0])}
          />
        </div>
        {msg && <p className="small">{msg}</p>}
        <p className="muted small">To start over, use “Delete local database” below.</p>
      </section>

      <RepairTools />

      <section className="card muted-card">
        <h2>About</h2>
        <p className="small muted">
          MusicLearn v{__APP_VERSION__}. Piano: Salamander Grand Piano by Alexander Holm (CC-BY 3.0). Notation: VexFlow. Theory: Tonal. Scheduling: FSRS.
        </p>
      </section>
    </div>
  );
}
