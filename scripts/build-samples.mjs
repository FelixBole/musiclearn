/**
 * Builds the small orchestral sample set from VSCO 2 Community Edition (CC0).
 *
 *   node scripts/build-samples.mjs <cacheDir>
 *
 * For each instrument: one dynamic layer, every sampled note, trimmed to a few seconds,
 * mono 48 kbps MP3. VSCO's octave numbering differs between instruments, so each sample's
 * real pitch is detected (YIN) and the octave corrected by majority vote.
 * Output: public/samples/orchestra/<id>/<note>.mp3 + src/engine/audio/orchestraManifest.ts
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.argv[2] ?? join(ROOT, '.sample-cache');
const OUT = join(ROOT, 'public', 'samples', 'orchestra');
const REPO = 'sgossner/VSCO-2-CE';
const RAW = `https://raw.githubusercontent.com/${REPO}/master/`;

/** dir, preferred velocity tags (first match wins), seconds kept */
const INSTRUMENTS = {
  violins: { dir: 'Strings/Violin Section/susVib', vel: ['_v1'], secs: 4.2 },
  violas: { dir: 'Strings/Viola Section/susvib', vel: ['_v1_'], secs: 4.2 },
  cellos: { dir: 'Strings/Cello Section/susvib', vel: ['_v1_1'], secs: 4.2 },
  basses: { dir: 'Strings/Solo Contrabass/SusVib', vel: ['_v1_'], secs: 4.0 },
  horn: { dir: 'Brass/F Horn/sus', vel: ['_v2_', '_v1_'], secs: 3.6 },
  trumpet: { dir: 'Brass/Trumpet/sus', vel: ['_v3_', '_v1_'], secs: 3.4 },
  trombone: { dir: 'Brass/Tenor Trombone/sus', vel: ['_v2_', '_v1_'], secs: 3.4 },
  tuba: { dir: 'Brass/Tuba/sus', vel: ['_v2_', '_v1_'], secs: 3.4 },
  flute: { dir: 'Woodwinds/Flute/susNV', vel: ['_v1_'], secs: 3.4 },
  oboe: { dir: 'Woodwinds/Oboe/Sus', vel: ['_v3_', '_v1_'], secs: 3.4 },
  clarinet: { dir: 'Woodwinds/Clarinet/susLong', vel: ['_v2_', '_v1_'], secs: 3.4 },
  bassoon: { dir: 'Woodwinds/Bassoon/sus', vel: ['_v2_', '_v1_'], secs: 3.4 },
};

const NOTE_RE = /_([A-G]#?)(-?\d)(?=_)/;
const PCS = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
const midiOf = (pc, oct) => (oct + 1) * 12 + PCS[pc];
const nameOf = (m) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'sample-builder' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function download(path) {
  const file = join(CACHE, path.replace(/[\\/]/g, '__'));
  if (existsSync(file)) return readFileSync(file);
  const url = RAW + path.split('/').map(encodeURIComponent).join('/');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(file, buf);
  return buf;
}

/** Minimal WAV reader: PCM 16/24/32-bit int or 32-bit float → mono Float32Array. */
function decodeWav(buf) {
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      let format = buf.readUInt16LE(body);
      const channels = buf.readUInt16LE(body + 2);
      const rate = buf.readUInt32LE(body + 4);
      const bits = buf.readUInt16LE(body + 14);
      if (format === 0xfffe) format = buf.readUInt16LE(body + 24); // WAVE_FORMAT_EXTENSIBLE
      fmt = { format, channels, rate, bits };
    } else if (id === 'data') data = { start: body, size: Math.min(size, buf.length - body) };
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('bad wav');
  const bps = fmt.bits / 8;
  const frames = Math.floor(data.size / (bps * fmt.channels));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const o = data.start + (i * fmt.channels + c) * bps;
      let v;
      if (fmt.format === 3) v = buf.readFloatLE(o);
      else if (fmt.bits === 16) v = buf.readInt16LE(o) / 32768;
      else if (fmt.bits === 24) v = buf.readIntLE(o, 3) / 8388608;
      else v = buf.readInt32LE(o) / 2147483648;
      sum += v;
    }
    out[i] = sum / fmt.channels;
  }
  return { samples: out, rate: fmt.rate };
}

/** YIN fundamental frequency estimate on a window of the signal. */
function detectPitch(x, rate, start) {
  const W = 4096;
  const maxTau = Math.min(2048, Math.floor(rate / 30));
  const minTau = Math.floor(rate / 2500);
  if (start + W + maxTau > x.length) start = Math.max(0, x.length - W - maxTau - 1);
  const d = new Float64Array(maxTau);
  for (let tau = 1; tau < maxTau; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const diff = x[start + i] - x[start + i + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }
  let running = 0;
  const cmnd = new Float64Array(maxTau);
  cmnd[0] = 1;
  for (let tau = 1; tau < maxTau; tau++) {
    running += d[tau];
    cmnd[tau] = (d[tau] * tau) / (running || 1);
  }
  let best = -1;
  for (let tau = minTau; tau < maxTau - 1; tau++) {
    if (cmnd[tau] < 0.12 && cmnd[tau] < cmnd[tau + 1]) {
      best = tau;
      break;
    }
  }
  if (best < 0) {
    let min = Infinity;
    for (let tau = minTau; tau < maxTau; tau++) if (cmnd[tau] < min) (min = cmnd[tau]), (best = tau);
  }
  return rate / best;
}

function shapeSample(x, rate, secs) {
  // trim leading silence (40 dB below the sample's peak) so attacks are on time
  let pk = 0;
  for (const v of x) pk = Math.max(pk, Math.abs(v));
  const thr = pk * 10 ** (-40 / 20);
  let s = 0;
  while (s < x.length && Math.abs(x[s]) < thr) s++;
  s = Math.max(0, s - Math.floor(rate * 0.005));
  const n = Math.min(x.length - s, Math.floor(rate * secs));
  const y = x.slice(s, s + n);
  // loudness: normalize RMS of the first 1.5 s to -20 dBFS, cap peaks at -1 dBFS
  const m = Math.min(y.length, Math.floor(rate * 1.5));
  let e = 0;
  for (let i = 0; i < m; i++) e += y[i] * y[i];
  const rms = Math.sqrt(e / m) || 1e-6;
  let gain = 10 ** (-20 / 20) / rms;
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  gain = Math.min(gain, 0.89 / (peak || 1));
  const fade = Math.floor(rate * 0.6);
  for (let i = 0; i < y.length; i++) {
    let g = gain;
    if (i > y.length - fade) g *= (y.length - i) / fade;
    y[i] *= g;
  }
  return y;
}

function encodeMp3(y, rate) {
  const enc = new Mp3Encoder(1, rate, 48);
  const pcm = new Int16Array(y.length);
  for (let i = 0; i < y.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(y[i] * 32767)));
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const c = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (c.length) chunks.push(Buffer.from(c));
  }
  const end = enc.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const tree = await fetchJson(`https://api.github.com/repos/${REPO}/git/trees/master?recursive=1`);
  const manifest = {};
  let total = 0;
  for (const [id, cfg] of Object.entries(INSTRUMENTS)) {
    const files = tree.tree.filter((e) => e.type === 'blob' && e.path.startsWith(cfg.dir + '/') && !e.path.slice(cfg.dir.length + 1).includes('/') && e.path.endsWith('.wav'));
    // one file per nominal note, preferred velocity layer
    const byNote = new Map();
    for (const f of files) {
      const m = NOTE_RE.exec(f.path.split('/').pop());
      if (!m) continue;
      const key = `${m[1]}${m[2]}`;
      const rank = cfg.vel.findIndex((v) => f.path.includes(v));
      if (rank < 0) continue;
      const cur = byNote.get(key);
      if (!cur || rank < cur.rank || (rank === cur.rank && f.path < cur.path)) byNote.set(key, { path: f.path, rank, pc: m[1], oct: Number(m[2]) });
    }
    const decoded = [];
    for (const [, f] of byNote) {
      const { samples, rate } = decodeWav(await download(f.path));
      const nominal = midiOf(f.pc, f.oct);
      const hz = detectPitch(samples, rate, Math.floor(rate * 0.6));
      const detected = 69 + 12 * Math.log2(hz / 440);
      decoded.push({ ...f, samples, rate, nominal, detected });
    }
    // octave offset by majority vote (pitch detectors occasionally jump an octave)
    const votes = new Map();
    for (const d of decoded) {
      const off = Math.round((d.detected - d.nominal) / 12) * 12;
      votes.set(off, (votes.get(off) ?? 0) + 1);
    }
    const offset = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const dir = join(OUT, id);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    manifest[id] = {};
    let size = 0;
    for (const d of decoded.sort((a, b) => a.nominal - b.nominal)) {
      const midi = d.nominal + offset;
      const name = nameOf(midi);
      const mp3 = encodeMp3(shapeSample(d.samples, d.rate, cfg.secs), d.rate);
      writeFileSync(join(dir, `${name}.mp3`), mp3);
      manifest[id][name.replace('s', '#')] = `${name}.mp3`;
      size += mp3.length;
      const off = d.detected - midi;
      if (Math.abs(off) > 1) console.warn(`  ! ${id} ${name}: detected ${d.detected.toFixed(1)} (${off.toFixed(1)} st off)`);
    }
    total += size;
    console.log(`${id.padEnd(9)} offset ${offset >= 0 ? '+' : ''}${offset}  ${decoded.length} notes  ${(size / 1024).toFixed(0)} KB  ${Object.keys(manifest[id]).join(' ')}`);
  }
  const ts = `/* Generated by scripts/build-samples.mjs — VSCO 2 Community Edition (CC0). Do not edit. */
export const ORCHESTRA_SAMPLES: Record<string, Record<string, string>> = ${JSON.stringify(manifest, null, 2)};
`;
  writeFileSync(join(ROOT, 'src', 'engine', 'audio', 'orchestraManifest.ts'), ts);
  console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
