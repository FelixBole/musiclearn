/**
 * Standard MIDI File export, for dragging progressions into a DAW.
 * One track per voice (bass, tenor, alto, soprano) so each line can go to its own instrument.
 */
import { Midi } from '@tonejs/midi';

export interface MidiExportOptions {
  bpm?: number;
  /** quarter notes per chord */
  beatsPerChord?: number;
  name?: string;
  /** one track per voice (default) or a single "Chords" track */
  splitVoices?: boolean;
  /** GM program number (0 = piano, 48 = string ensemble) */
  program?: number;
}

const VOICE_TRACKS = ['Bass', 'Tenor', 'Alto', 'Soprano'];

/** voicings: one array of MIDI notes per chord, ordered low → high. */
export function progressionToMidi(voicings: number[][], opts: MidiExportOptions = {}): Uint8Array {
  const { bpm = 80, beatsPerChord = 4, name = 'Progression', splitVoices = true, program = 0 } = opts;
  const midi = new Midi();
  midi.name = name;
  midi.header.setTempo(bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4] });
  midi.header.update();
  const ppq = midi.header.ppq;
  const len = ppq * beatsPerChord;
  const voices = Math.max(...voicings.map((v) => v.length), 0);
  const trackCount = splitVoices ? voices : 1;
  const tracks = Array.from({ length: trackCount }, (_, i) => {
    const t = midi.addTrack();
    t.name = splitVoices ? (voices === 4 ? VOICE_TRACKS[i] : `Voice ${i + 1}`) : 'Chords';
    t.channel = i;
    t.instrument.number = program;
    return t;
  });
  voicings.forEach((chord, ci) => {
    const sorted = [...chord].sort((a, b) => a - b);
    sorted.forEach((note, vi) => {
      // tie repeated notes across chords in the same voice (common tones held, like a real pad)
      const prev = voicings[ci - 1] ? [...voicings[ci - 1]].sort((a, b) => a - b)[vi] : undefined;
      const track = tracks[splitVoices ? vi : 0];
      if (splitVoices && prev === note) {
        const last = track.notes[track.notes.length - 1];
        if (last && last.midi === note) {
          last.durationTicks += len;
          return;
        }
      }
      track.addNote({ midi: note, ticks: ci * len, durationTicks: len, velocity: 0.7 });
    });
  });
  return midi.toArray();
}

export function midiFileName(text: string): string {
  const base = text
    .replace(/[^\w#♯♭+°ø-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${base || 'progression'}.mid`;
}

/** Trigger a browser download of the file. */
export function downloadMidi(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
