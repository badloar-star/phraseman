import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const input = args.get('--input');
const output = args.get('--output');
const neutralizeGreenGlass = args.get('--neutralize-green-glass') === 'true';
const normalizeFraming = args.get('--normalize-framing') === 'true';
const greenExcessSpan = Number(args.get('--green-excess-span') ?? 170);
if (!input || !output) {
  process.stderr.write('Usage: node scripts/extract_generated_chroma_alpha.mjs --input in.png --output out.webp\n');
  process.exit(2);
}
if (!Number.isFinite(greenExcessSpan) || greenExcessSpan < 50 || greenExcessSpan > 220) {
  throw new Error('--green-excess-span must be a number between 50 and 220');
}

const { data, info } = await sharp(input)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const count = width * height;
let rgba = Buffer.allocUnsafe(count * 4);

// The generation prompt fixes one vivid-green matte. Alpha is estimated from
// green excess rather than one exact RGB value, so gradients and antialiased
// holes between feathers are removed without touching teal/stone/metal details.
const backgroundGreen = 238;
for (let index = 0; index < count; index += 1) {
  const source = index * channels;
  const target = index * 4;
  const r = data[source];
  const g = data[source + 1];
  const b = data[source + 2];
  const greenExcess = g - Math.max(r, b);
  let alpha = greenExcess <= 25
    ? 1
    : Math.max(0, Math.min(1, 1 - (greenExcess - 25) / greenExcessSpan));
  if (alpha < 0.14) alpha = 0;
  else if (alpha > 0.95) alpha = 1;

  if (alpha > 0 && alpha < 1) {
    const inverse = 1 - alpha;
    // Green is the contaminating channel. Keeping original red/blue avoids
    // amplifying compression noise into magenta speckles at thin metal edges.
    rgba[target] = r;
    rgba[target + 1] = Math.max(0, Math.min(255, Math.round((g - inverse * backgroundGreen) / alpha)));
    rgba[target + 2] = b;
  } else {
    rgba[target] = r;
    rgba[target + 1] = g;
    rgba[target + 2] = b;
  }
  rgba[target + 3] = Math.round(alpha * 255);
}

// Pull the matte inward by one source pixel. This removes the final green rim
// left by the generator's own antialiasing while preserving the fine feathers.
const eroded = Buffer.from(rgba);
for (let y = 1; y + 1 < height; y += 1) {
  for (let x = 1; x + 1 < width; x += 1) {
    let alpha = 255;
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        alpha = Math.min(alpha, rgba[((y + oy) * width + x + ox) * 4 + 3]);
      }
    }
    eroded[(y * width + x) * 4 + 3] = alpha;
  }
}
rgba = eroded;

// The source sometimes carries a one-pixel white matte from its original
// checkerboard. Remove only neutral bright pixels touching transparency; real
// enclosed quartz and metal highlights are preserved.
const dematted = Buffer.from(rgba);
for (let y = 4; y + 4 < height; y += 1) {
  for (let x = 4; x + 4 < width; x += 1) {
    const offset = (y * width + x) * 4;
    if (rgba[offset + 3] === 0) continue;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    if (Math.min(r, g, b) < 180 || Math.max(r, g, b) - Math.min(r, g, b) > 35) continue;
    let touchesTransparent = false;
    for (let oy = -4; oy <= 4 && !touchesTransparent; oy += 1) {
      for (let ox = -4; ox <= 4; ox += 1) {
        if (rgba[((y + oy) * width + x + ox) * 4 + 3] === 0) {
          touchesTransparent = true;
          break;
        }
      }
    }
    if (touchesTransparent) dematted[offset + 3] = 0;
  }
}
rgba = dematted;

// Clear generated glass can refract the green matte as an opaque green tint.
// This opt-in pass only trims pixels whose green channel is substantially
// stronger than both red and blue; cool-blue energy and neutral highlights stay
// untouched. Keep it opt-in because some future trophies may intentionally use
// green enamel or patina.
if (neutralizeGreenGlass) {
  const neutralized = Buffer.from(rgba);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    if (rgba[offset + 3] > 0 && g > r + 24 && g > b + 8 && b > r + 12) {
      neutralized[offset + 1] = b;
    }
  }
  rgba = neutralized;
}

fs.mkdirSync(path.dirname(output), { recursive: true });
const base = sharp(rgba, { raw: { width, height, channels: 4 } });
if (normalizeFraming) {
  const trimmed = await base
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
    .png()
    .toBuffer();
  await sharp(trimmed)
    .resize(880, 880, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: 72,
      bottom: 72,
      left: 72,
      right: 72,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 76, alphaQuality: 92, effort: 4 })
    .toFile(output);
} else {
  await base
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .webp({ quality: 76, alphaQuality: 92, effort: 4 })
    .toFile(output);
}

const metadata = await sharp(output).metadata();
if (!metadata.hasAlpha || metadata.width !== 1024 || metadata.height !== 1024) {
  throw new Error(`invalid output metadata: ${JSON.stringify(metadata)}`);
}
process.stdout.write(`${path.basename(output)}: 1024x1024, alpha=true\n`);
