// Splits each content JSON into small per-chunk files so each audit agent reads
// one tiny file by path. Writes chunks/ manifest with {track, file, count}.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CH = resolve(__dirname, 'chunks');
try { rmSync(CH, { recursive: true, force: true }); } catch {}
mkdirSync(CH, { recursive: true });

function chunk(arr, n) { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; }
const manifest = [];

function emit(track, file, size) {
  const data = JSON.parse(readFileSync(resolve(__dirname, file), 'utf8'));
  const parts = chunk(data, size);
  parts.forEach((p, i) => {
    const fname = `chunks/${track}_${String(i).padStart(3, '0')}.json`;
    writeFileSync(resolve(__dirname, fname), JSON.stringify(p), 'utf8');
    manifest.push({ track, file: fname.replace('chunks/', ''), count: p.length });
  });
}

emit('phrase', 'PHRASES_FOR_SEMANTIC.json', 25);
emit('word', 'CONTENT_WORDS.json', 60);
emit('intro', 'CONTENT_INTROS.json', 40);

writeFileSync(resolve(CH, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
const byTrack = {};
for (const m of manifest) byTrack[m.track] = (byTrack[m.track] || 0) + 1;
console.log('chunks per track:', JSON.stringify(byTrack), '| total files:', manifest.length);
