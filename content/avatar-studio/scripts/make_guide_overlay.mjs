// зачем: сетка-подсказка из паспорта кадра — её прикладывают в чат ИИ-генератора
// («use this grid as framing guide») и по ней же проверяют кадр глазами.
import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const pipelineRoot = path.resolve(import.meta.dirname, '..');
const passport = JSON.parse(await readFile(path.join(pipelineRoot, 'frame_passport.v1.json'), 'utf8'));
const { width, height } = passport.canvas;
const pupilY = Math.round(passport.anchor.pupilLineY * height);
const headHeight = Math.round(passport.anchor.headHeightFrac * height);
const headTop = Math.round(pupilY - headHeight * 0.45);
const marginTop = Math.round(passport.safeMargins.top * height);
const marginSide = Math.round(passport.safeMargins.sides * width);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="${passport.background}"/>
  <rect x="${marginSide}" y="${marginTop}" width="${width - 2 * marginSide}" height="${height - marginTop}"
        fill="none" stroke="#C94F3D" stroke-width="4" stroke-dasharray="18 12"/>
  <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="#B98A3C" stroke-width="3" stroke-dasharray="10 10"/>
  <line x1="0" y1="${pupilY}" x2="${width}" y2="${pupilY}" stroke="#B98A3C" stroke-width="5"/>
  <rect x="${Math.round(width * 0.30)}" y="${headTop}" width="${Math.round(width * 0.40)}" height="${headHeight}"
        fill="none" stroke="#6E4E7E" stroke-width="4"/>
  <text x="${width / 2 + 14}" y="${pupilY - 14}" font-family="Arial" font-size="34" fill="#8A6B2E">pupil line 38%</text>
  <text x="${Math.round(width * 0.30) + 12}" y="${headTop + 44}" font-family="Arial" font-size="34" fill="#6E4E7E">head 42%</text>
  <text x="${marginSide + 12}" y="${marginTop + 46}" font-family="Arial" font-size="34" fill="#C94F3D">safe area</text>
</svg>`;

const outputDirectory = path.join(pipelineRoot, 'guides');
await mkdir(outputDirectory, { recursive: true });
const output = path.join(outputDirectory, `guide_${width}x${height}.png`);
await sharp(Buffer.from(svg)).png().toFile(output);
process.stdout.write(output + '\n');
