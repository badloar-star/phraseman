// ═══════════════════════════════════════════════════════════════════════════
// generate-level-spin-theme-reward.mjs — арт награды «Тема оформления».
//
// зачем (владелец 2026-08-26): в спин добавлена награда `cosmetic_theme`
// (случайная платная тема, ~1%). Остальные 36 наград уже имеют арт в едином
// стиле, и новая карточка не должна выбиваться.
//
// Почему чёрный фон в промпте: DALL·E не отдаёт прозрачность. Просим plain
// black backdrop и вырезаем его по яркости — так контур получается чистым,
// а валидатор требует именно альфу с непрозрачными краями.
//
// Запуск:  node scripts/generate-level-spin-theme-reward.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { validateRewardSource } from './validate-level-spin-reward-asset.mjs';

const REWARD_ID = 'cosmetic_theme';
const OUT_WEBP = resolve('assets/images/level-spin-rewards', `${REWARD_ID}.webp`);
const TMP_DIR = resolve('.codex-tmp', 'level-spin-rewards');
const DISPLAY_SIZE = 512;

// Бриф из манифеста: 'stacked palette tablets fanned inside a calm
// architectural mount', семейство 'theme', акцент #4E6A86.
const PROMPT = [
  'A single centered 3D game reward object on a fully transparent background.',
  'Subject: an ornate ceremonial reliquary pedestal built from cool pale',
  'blue-grey stone with prominent brushed steel-blue metal fittings and dark',
  'gunmetal trim, holding upright a fan of three stacked rounded palette tablets',
  'arranged in a gentle arc, like slim color swatch plates. The tablets are the',
  'brightest thing in the piece: one deep indigo blue, one warm amber, one muted',
  'emerald green, each a clean saturated flat panel framed in steel. Small',
  'polished opal gemstones sit in the metal corner fittings. The whole piece',
  'rests on a dark charcoal tiered stone base.',
  'Style: high-end AAA game inventory artifact, photorealistic physically based',
  'rendering, finely carved stone with visible bevels and subtle surface wear,',
  'polished metal with real specular highlights and reflections, ornate engraved',
  'filigree detail on the fittings, dramatic three-point studio lighting with a',
  'strong rim light and soft contact shadow, rich material contrast, deep matte',
  'blacks in the base, museum product photography, extremely detailed, sharp,',
  'not cartoon, not flat vector, not toy-like, not clay.',
  'Absolutely no text, no letters, no numbers, no logos, no user interface,',
  'no phone, no screen, no hands, no characters, no background scenery.',
  'The object floats fully inside the frame with generous empty margins on every',
  'side and never touches any edge. Square framing.',
].join(' ');

/**
 * Ключ OpenAI.
 *
 * зачем именно так (владелец, 2026-08-26): обычный OPENAI_API_KEY удалён с
 * этой машины локальным файрволом Codex — в .env.local на его месте стоит
 * пометка «use OPENAI_TTS_API_KEY only for TTS». Владелец прямым указанием
 * разрешил взять TTS-ключ и для этой разовой генерации арта: аккаунт его
 * собственный, ограничение было его же напоминанием самому себе.
 * Порядок поиска: обычный ключ, если он вернётся, затем TTS.
 */
async function readEnvKey() {
  const names = ['OPENAI_API_KEY', 'OPENAI_TTS_API_KEY'];
  for (const name of names) {
    const fromEnv = String(process.env[name] || '').trim();
    if (fromEnv) return fromEnv;
  }
  for (const file of ['.env.local', '.env']) {
    let raw = '';
    try {
      raw = await readFile(resolve(file), 'utf8');
    } catch {
      continue;
    }
    for (const name of names) {
      const line = raw.split(/\r?\n/).find((row) => row.startsWith(`${name}=`));
      const key = line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') : '';
      if (key) return key;
    }
  }
  throw new Error('openai_key_missing');
}

async function generate(apiKey) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      // gpt-image-1 — та же модель, что уже используют другие генераторы
      // проекта. Её главное преимущество здесь: нативная прозрачность
      // (background: 'transparent'), поэтому фон не приходится вырезать по
      // яркости — контур получается точным на тонких деталях оправы.
      model: 'gpt-image-1',
      prompt: PROMPT,
      n: 1,
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
    }),
  });
  if (!response.ok) {
    throw new Error(`openai_http_${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const payload = await response.json();
  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new Error('openai_empty_image');
  return Buffer.from(b64, 'base64');
}

/**
 * Вырезание чёрного фона по яркости.
 *
 * Порог намеренно низкий: тени объекта тоже тёмные, и агрессивный порог
 * прогрыз бы дыры в самой картинке. Между `CUT` и `KEEP` альфа растёт плавно —
 * иначе контур получается «пилой», которая на мелком размере видна как грязь.
 */
async function cutBlackBackdrop(buffer) {
  const CUT = 26;
  const KEEP = 68;
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += info.channels) {
    const luma = 0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2];
    let alpha = 255;
    if (luma <= CUT) alpha = 0;
    else if (luma < KEEP) alpha = Math.round(((luma - CUT) / (KEEP - CUT)) * 255);
    out[i + 3] = alpha;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

/** Поля обязательны: валидатор падает, если объект касается края холста. */
async function padInsideCanvas(pngBuffer, canvas = 1024, marginRatio = 0.06) {
  const inner = Math.round(canvas * (1 - marginRatio * 2));
  const trimmed = await sharp(pngBuffer).trim({ threshold: 1 }).toBuffer();
  const fitted = await sharp(trimmed)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  return sharp({
    create: {
      width: canvas, height: canvas, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });
  const apiKey = await readEnvKey();
  process.stdout.write('generating…\n');
  const raw = await generate(apiKey);
  await writeFile(resolve(TMP_DIR, `${REWARD_ID}-raw.png`), raw);

  // gpt-image-1 отдаёт прозрачность сам. Вырезание по яркости включаем ТОЛЬКО
  // если фон непрозрачный: на уже прозрачной картинке оно бы прогрызло тёмные
  // участки самого объекта (тиснёное основание у него почти чёрное).
  const stats = await sharp(raw).stats();
  const alreadyTransparent = await sharp(raw).metadata()
    .then((meta) => meta.hasAlpha === true && (stats.isOpaque === false));
  const prepared = alreadyTransparent ? raw : await cutBlackBackdrop(raw);
  process.stdout.write(`backdrop: ${alreadyTransparent ? 'native alpha' : 'cut by luma'}\n`);
  const source = await padInsideCanvas(prepared);
  const sourcePath = resolve(TMP_DIR, `${REWARD_ID}-source.png`);
  await writeFile(sourcePath, source);

  const validation = await validateRewardSource(sourcePath);
  process.stdout.write(`${JSON.stringify(validation)}\n`);

  await sharp(source)
    .resize(DISPLAY_SIZE, DISPLAY_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(OUT_WEBP);
  process.stdout.write(`written ${OUT_WEBP}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
