import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { accentAlignment } from '../../scripts/accent_alignment.mjs';

// Extract the marked accent from the same raster pixels. Never redraw or shift it.
const inset = Math.max(0, Math.min(4, Number(process.argv.find(v=>v.startsWith('--inset='))?.slice(8)) || 0));
const files = process.argv.slice(2).filter(v=>!v.startsWith('--'));
if (!files.length) throw new Error('Pass one or more *.source.png paths.');
const results = [];
for (const source of files) {
  if (!source.endsWith('.source.png')) throw new Error('Expected a versioned source PNG.');
  const { data, info } = await sharp(source).resize(1024, 1024, {
    fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = Buffer.from(data);
  const accent = Buffer.alloc(data.length);
  let visible = 0, accentPixels = 0, transparent = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = data.subarray(i, i + 4);
    if (!a) transparent++;
    if (a > 128) visible++;
    // Cyan/turquoise is a temporary segmentation marker, absent elsewhere in the image.
    const colorSeparation = Math.min(g - r, b - r);
    const weight = Math.max(0, Math.min(1, (colorSeparation - 12) / 22));
    if (weight > 0 && a > 0) {
      const neutral = Math.round(.2126 * r + .7152 * g + .0722 * b);
      for (let c = 0; c < 3; c++) base[i + c] = Math.round(data[i + c] * (1 - weight) + neutral * weight);
      accent[i] = accent[i + 1] = accent[i + 2] = 255;
      accent[i + 3] = Math.round(a * weight * .9);
      if (accent[i + 3] > 128) accentPixels++;
    }
  }
  if (!transparent || !visible) throw new Error('Missing usable source alpha: ' + source);
  if (!accentPixels) throw new Error('Missing segmentation marker: ' + source);
  if (inset) {
    // A small inward alpha edge avoids painting the neutral bevel surrounding a raised detail.
    // Positions and camera remain unchanged; the actual base raster is not moved.
    const originalAlpha = Buffer.from(accent);
    for (let y=inset;y<info.height-inset;y++) for(let x=inset;x<info.width-inset;x++) {
      const i=(y*info.width+x)*4;
      if (!originalAlpha[i+3]) continue;
      let a=originalAlpha[i+3];
      for(let dy=-inset;dy<=inset;dy++) for(let dx=-inset;dx<=inset;dx++) {
        a=Math.min(a,originalAlpha[((y+dy)*info.width+x+dx)*4+3]);
      }
      accent[i+3]=a;
    }
    accentPixels=0;
    for(let i=3;i<accent.length;i+=4) if(accent[i]>128) accentPixels++;
  }
  const dest = source.replace('.source.png', '.webp');
  const accentDest = source.replace('.source.png', '.accent.webp');
  await sharp(base, { raw: info }).webp({ quality: 92, alphaQuality: 100 }).toFile(dest);
  await sharp(accent, { raw: info }).webp({ lossless: true }).toFile(accentDest);
  const alignment = await accentAlignment(dest, accentDest);
  results.push({ source, base: dest, accent: accentDest, size: [info.width, info.height],
    bytes: fs.statSync(dest).size, maskInsetPx:inset, accentFramePct: +(100 * accentPixels / (1024 * 1024)).toFixed(3),
    transparentPct: +(100 * transparent / (1024 * 1024)).toFixed(2), alignment });
}
const report = path.resolve('ART_STYLE_FOR_CODEX/trials/interactive/candidate-preparation-report.json');
let previous = [];
if (fs.existsSync(report)) previous = JSON.parse(fs.readFileSync(report, 'utf8'));
const refreshed = new Map(previous.map(r => [path.resolve(r.source), r]));
for (const r of results) refreshed.set(path.resolve(r.source), r);
fs.writeFileSync(report, JSON.stringify([...refreshed.values()], null, 2));
for (const r of results) console.log(JSON.stringify(r));
