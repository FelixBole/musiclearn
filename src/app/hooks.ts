import { useEffect, useState } from 'react';
import { getMidiStatus, onMidiStatus, type MidiStatus } from '../engine/input/midi';

export function useMidiStatus(): MidiStatus {
  const [s, setS] = useState(getMidiStatus);
  useEffect(() => onMidiStatus(setS), []);
  return s;
}
