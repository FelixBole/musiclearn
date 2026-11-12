import { emitNote } from './noteBus';
import { noteOff, noteOn } from '../audio';

/** Web MIDI: connects every input device and forwards notes to the note bus. */

export interface MidiStatus {
  supported: boolean;
  enabled: boolean;
  devices: string[];
  error?: string;
}

let access: MIDIAccess | null = null;
let echo = true;
let statusListeners = new Set<(s: MidiStatus) => void>();
let status: MidiStatus = {
  supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
  enabled: false,
  devices: [],
};

function setStatus(s: Partial<MidiStatus>) {
  status = { ...status, ...s };
  for (const l of statusListeners) l(status);
}

export function getMidiStatus() {
  return status;
}

export function onMidiStatus(l: (s: MidiStatus) => void) {
  statusListeners.add(l);
  return () => {
    statusListeners.delete(l);
  };
}

export function setMidiEcho(on: boolean) {
  echo = on;
}

function handleMessage(e: MIDIMessageEvent) {
  const data = e.data;
  if (!data || data.length < 3) return;
  const cmd = data[0] & 0xf0;
  const note = data[1];
  const vel = data[2];
  if (cmd === 0x90 && vel > 0) {
    if (echo) noteOn(note, vel / 127);
    emitNote({ type: 'on', midi: note, velocity: vel / 127, source: 'midi' });
  } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
    if (echo) noteOff(note);
    emitNote({ type: 'off', midi: note, velocity: 0, source: 'midi' });
  }
}

function wireInputs() {
  if (!access) return;
  const names: string[] = [];
  access.inputs.forEach((input) => {
    input.onmidimessage = handleMessage;
    names.push(input.name ?? 'MIDI device');
  });
  setStatus({ devices: names });
}

export async function enableMidi(): Promise<MidiStatus> {
  if (!status.supported) return status;
  if (access) return status;
  try {
    access = await navigator.requestMIDIAccess();
    access.onstatechange = () => wireInputs();
    wireInputs();
    setStatus({ enabled: true, error: undefined });
  } catch (err) {
    setStatus({ enabled: false, error: err instanceof Error ? err.message : String(err) });
  }
  return status;
}

export function disableMidi() {
  if (access) {
    access.inputs.forEach((i) => (i.onmidimessage = null));
    access.onstatechange = null;
  }
  access = null;
  setStatus({ enabled: false, devices: [] });
}
