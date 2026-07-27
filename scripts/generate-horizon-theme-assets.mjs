// Генератор полного комплекта ассетов темы «Горизонт» (gpt-image-1 → webp).
//
// зачем: «Горизонт» — бесплатная тема-витрина для новых юзеров (решение владельца
// 2026-07-27). Её ассеты должны быть в том же материале, что у остальных тем
// (объёмный 3D-объект, глянец, рим-лайт, прозрачный фон), но в закатной палитре:
// персик #FFAD7A + роза #FF5E8A на сливово-синем сумраке.
//
// По умолчанию — DRY-RUN: печатает план и точную оценку стоимости, ничего не тратит.
// Реальная генерация — только с явным разрешением на трату:
//   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/generate-horizon-theme-assets.mjs --run
//
// Полезные флаги:
//   --run                 реально генерировать (иначе dry-run)
//   --only=home_menu,...  ограничить наборами (см. ключи SETS)
//   --limit=N             не больше N картинок за запуск
//   --force               перегенерировать даже если файл уже есть
//   --quality=low|medium|high  (по умолчанию medium)

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { requireOpenAiDevSpendGuard, requireCodexOpenAiTtsOnly } from './openai-dev-guard.mjs';

const ROOT = process.cwd();

// Цена gpt-image-1 за картинку 1024×1024 по качеству (USD, на 2026-07).
const PRICE_PER_IMAGE = { low: 0.011, medium: 0.042, high: 0.167 };

// ─── МАТЕРИАЛ ТЕМЫ ───────────────────────────────────────────────────────────
// Общая «подпись» стиля: она же держит консистентность с ember/midnight-наборами.
const HORIZON_MATERIAL = [
  'premium 3D game-art icon for a language learning mobile app',
  'sunset duotone palette: warm peach #FFAD7A and glossy rose #FF5E8A highlights',
  'deep plum-indigo #1D1630 shadows, subtle violet ambient bounce',
  'glossy enamel and soft polished metal, warm rim light from upper left',
  'rich volumetric shading, gentle bloom, no harsh outlines',
  'centered single object, transparent background, no background scenery',
  'no text, no letters, no numbers, no logo, no watermark, no human hands',
  'readable at 48px, app-store quality, 1024 square',
].join(', ');

const prompt = (subject) => `${HORIZON_MATERIAL}. Subject: ${subject}.`;

// ─── НАБОРЫ ──────────────────────────────────────────────────────────────────
// dir      — куда класть webp (относительно assets/images)
// name     — как назвать файл (без расширения)
// size     — сторона финального webp (иконки меню крупнее, мелкие значки меньше)
const SETS = {
  home_menu: {
    dir: 'home_menu/horizon',
    size: 512,
    items: [
      ['home-horizon-lessons', 'an open study book with warm peach page glow and a rose ribbon bookmark'],
      ['home-horizon-cards', 'a fanned stack of phrase flashcards with glossy peach edges'],
      ['home-horizon-daily-tasks', 'a daily checklist tablet with peach checkmarks and a rose progress ring'],
      ['home-horizon-league', 'a tournament trophy cup in warm peach metal with rose enamel inlay'],
      ['home-horizon-diagnostic-test', 'a clipboard with a level gauge and peach diagnostic sparkles'],
      ['home-horizon-practice', 'a training dumbbell fused with a speech bubble, peach and rose gloss'],
      ['home-horizon-dialogs', 'two overlapping chat bubbles, peach front bubble and rose back bubble'],
      ['home-horizon-exam', 'a graduation certificate scroll with a rose wax seal and peach ribbon'],
      ['home-horizon-shop', 'a small shopping bag with peach gloss and a rose sparkle tag'],
      ['home-horizon-hero-map', 'a rolled treasure map with a glowing peach route line and rose destination pin'],
    ],
  },
  flashcards_modes: {
    dir: 'flashcards/mode_icons/horizon',
    size: 256,
    items: [
      ['saved', 'a bookmark ribbon over a phrase card, peach gloss'],
      ['custom', 'a pencil writing on a blank phrase card, rose accent'],
      ['training', 'a rotating repeat loop around a phrase card, peach arrows'],
      ['audio', 'a sound wave emerging from a speaker orb, rose glow'],
      ['arena', 'two crossed tournament swords with a peach shield'],
      ['collection', 'a small treasure chest full of glowing phrase cards'],
    ],
  },
  personal_plan: {
    dir: 'personal_plan_tasks_fit/horizon',
    size: 256,
    items: [
      ['core_lesson', 'an open lesson book with a peach glowing page'],
      ['route_gavan', 'a harbour anchor with a rose rope coil'],
      ['route_voyazh', 'a travel suitcase with a peach boarding tag'],
      ['route_mitap', 'two coffee cups meeting over a chat bubble'],
      ['route_impuls', 'a lightning bolt inside a peach energy orb'],
      ['route_echo', 'concentric sound ripples radiating from a rose core'],
      ['recall', 'a brain-shaped memory loop with peach neural sparks'],
      ['quiz', 'a question mark card with a rose pulse ring'],
      ['practice', 'a training target with a peach arrow in the bullseye'],
      ['choice', 'three answer chips with the correct one glowing peach'],
      ['listening', 'headphones with a rose sound wave passing through'],
      ['sentence_build', 'word blocks assembling into a sentence bar, peach gloss'],
      ['speaking', 'a microphone with a warm peach voice wave'],
      ['trainer', 'a coach whistle with a rose motion streak'],
      ['flashcards', 'a stack of flip cards mid-flip, peach and rose faces'],
    ],
  },
  trainer_icons: {
    dir: 'trainer_theme_icons/horizon',
    size: 256,
    items: [
      ['phrases', 'a phrase card with a peach quotation mark emblem'],
      ['words', 'three vocabulary cubes stacked, rose and peach faces'],
      ['analytics', 'a rising bar chart with a peach trend arrow'],
    ],
  },
  weekly_boons: {
    dir: 'weekly_boon_icons/png/horizon',
    size: 256,
    items: [
      ['streak_saver', 'a protective shield with a warm flame emblem inside'],
      ['mystery_monday', 'a wrapped mystery gift box with a rose question mark'],
      ['turbo_regen', 'a battery charging fast with peach energy arcs'],
      ['energy_free_window', 'an open window frame with free-flowing peach energy bolts'],
      ['double_xp', 'a bold upward arrow with two peach stars trailing it'],
      ['flashcard_friday', 'a flip card with a small calendar corner, rose accent'],
      ['arena_saturday', 'a tournament crest with crossed peach swords'],
      ['speaking_saturday', 'a microphone with a rose sparkle burst'],
      ['early_bird', 'a small bird silhouette rising over a peach sunrise arc'],
      ['perfect_week', 'a seven-segment ring completed with peach checkmarks'],
      ['comeback', 'a circular return arrow with a warm welcome-back glow'],
    ],
  },
  singles: {
    dir: '',
    size: 256,
    items: [
      ['currency/pearl_horizon', 'a glossy iridescent pearl sphere with peach-to-rose sunset sheen'],
      ['energy/energy-horizon', 'a lightning bolt energy token in glossy peach metal'],
      ['generated_theme_icons/lesson-exam-horizon', 'a diploma scroll with a rose wax seal and peach ribbon'],
      ['league_bonus/horizon-chest', 'a closed treasure chest with peach metal bands and rose gem lock'],
      ['social_icons/social-chat-horizon', 'a single rounded chat bubble in glossy peach enamel'],
      ['social_icons/social-friends-horizon', 'two friendly overlapping person silhouettes, peach and rose'],
      ['weekly_compass_icons/horizon', 'a nautical compass with a peach needle and rose enamel dial'],
    ],
  },
  streak_fire: {
    dir: 'streak_icons/horizon',
    size: 256,
    items: [
      ['streak-fire-horizon-001', 'a tiny single flame spark, peach core'],
      ['streak-fire-horizon-002', 'a small steady flame, peach with rose tip'],
      ['streak-fire-horizon-003', 'a growing flame with three tongues, peach and rose'],
      ['streak-fire-horizon-005', 'a confident flame with a warm inner glow'],
      ['streak-fire-horizon-007', 'a tall flame wrapped in a thin rose spiral'],
      ['streak-fire-horizon-010', 'a strong flame on a small peach metal base'],
      ['streak-fire-horizon-020', 'a powerful twin-tongue flame with rose embers'],
      ['streak-fire-horizon-035', 'a blazing flame crowned with a small peach ring'],
      ['streak-fire-horizon-060', 'a majestic flame with a rose gem at its heart'],
      ['streak-fire-horizon-100', 'a legendary flame with a peach crown and rose aura'],
      ['streak-freeze-horizon', 'a protective shield with a warm flame emblem, rose frost edge'],
    ],
  },
};

function parseArgs(argv) {
  const has = (flag) => argv.includes(flag);
  const value = (prefix, fallback) => {
    const found = argv.find((a) => a.startsWith(prefix));
    return found ? found.slice(prefix.length) : fallback;
  };
  const only = value('--only=', '');
  const quality = value('--quality=', 'medium');
  if (!PRICE_PER_IMAGE[quality]) {
    throw new Error(`unknown --quality=${quality}; use low|medium|high`);
  }
  return {
    run: has('--run'),
    force: has('--force'),
    quality,
    limit: Number(value('--limit=', '0')) || Infinity,
    only: only ? only.split(',').map((s) => s.trim()).filter(Boolean) : [],
  };
}

async function readDotEnv(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key]) continue;
      process.env[key] = raw.replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // .env.local может отсутствовать — не ошибка
  }
}

/** Плоский список задач: {setKey, outPath, subject}. */
function buildPlan({ only }) {
  const plan = [];
  for (const [setKey, set] of Object.entries(SETS)) {
    if (only.length && !only.includes(setKey)) continue;
    for (const [name, subject] of set.items) {
      const rel = set.dir ? path.join(set.dir, `${name}.webp`) : `${name}.webp`;
      plan.push({
        setKey,
        subject,
        size: set.size,
        outPath: path.join(ROOT, 'assets', 'images', rel),
        relPath: path.join('assets', 'images', rel).replace(/\\/g, '/'),
      });
    }
  }
  return plan;
}

async function generateOne({ apiKey, quality, subject, outPath, size }) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: prompt(subject),
      size: '1024x1024',
      quality,
      background: 'transparent',
      output_format: 'png',
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`image_api_${response.status}: ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('image_api_no_b64');

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  // Прозрачность обязана пережить ресайз — webp с alpha, без подложки.
  await sharp(Buffer.from(b64, 'base64'))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(outPath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await readDotEnv(path.join(ROOT, '.env.local'));

  const plan = buildPlan(args);
  const pending = [];
  for (const task of plan) {
    const exists = await fs.stat(task.outPath).then(() => true).catch(() => false);
    if (exists && !args.force) continue;
    pending.push(task);
    if (pending.length >= args.limit) break;
  }

  const price = PRICE_PER_IMAGE[args.quality];
  const cost = pending.length * price;

  const bySet = {};
  for (const task of pending) bySet[task.setKey] = (bySet[task.setKey] ?? 0) + 1;

  console.log('─── «Горизонт»: план генерации ассетов ───');
  console.log(`всего в каталоге:  ${plan.length}`);
  console.log(`к генерации:       ${pending.length}${args.force ? ' (--force)' : ' (пропущены существующие)'}`);
  for (const [setKey, n] of Object.entries(bySet)) console.log(`  ${setKey.padEnd(18)} ${n}`);
  console.log(`качество:          ${args.quality} ($${price.toFixed(3)}/шт)`);
  console.log(`оценка стоимости:  $${cost.toFixed(2)}`);

  if (!args.run) {
    console.log('');
    console.log('DRY-RUN — ничего не сгенерировано и не потрачено.');
    console.log('Для реальной генерации:');
    console.log(`  PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/generate-horizon-theme-assets.mjs --run --quality=${args.quality}`);
    return;
  }

  if (!pending.length) {
    console.log('Нечего генерировать — все файлы на месте.');
    return;
  }

  requireCodexOpenAiTtsOnly({
    action: 'Horizon theme asset generation',
    endpoint: 'images/generations',
  });
  requireOpenAiDevSpendGuard({
    action: 'Horizon theme asset generation (gpt-image-1)',
    estimatedCostUsd: cost,
    units: pending.length,
  });

  // зачем: OPENAI_TTS_API_KEY в .env.local выделен строго под озвучку
  // (см. requireCodexOpenAiTtsOnly) — картинками его тратить нельзя.
  // Для генерации ассетов нужен отдельный ключ OPENAI_IMAGE_API_KEY.
  const apiKey = process.env.OPENAI_IMAGE_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Нет ключа для генерации картинок. Добавь в .env.local строку\n' +
      '  OPENAI_IMAGE_API_KEY=sk-...\n' +
      'OPENAI_TTS_API_KEY использовать нельзя — он зарезервирован под озвучку.',
    );
  }

  const manifest = [];
  let done = 0;
  let failed = 0;
  for (const task of pending) {
    try {
      await generateOne({ apiKey, quality: args.quality, ...task });
      manifest.push({ file: task.relPath, status: 'generated', subject: task.subject });
      done += 1;
    } catch (error) {
      manifest.push({ file: task.relPath, status: 'failed', error: String(error).slice(0, 200) });
      failed += 1;
    }
    process.stdout.write(`[${done + failed}/${pending.length}] ${task.relPath}${failed ? ` (ошибок: ${failed})` : ''}\n`);
  }

  const manifestPath = path.join(ROOT, 'qa-artifacts', 'horizon-theme-assets', 'manifest.json');
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({ quality: args.quality, generated: done, failed, spentUsd: Number((done * price).toFixed(2)), items: manifest }, null, 2)}\n`,
  );

  console.log('');
  console.log(`готово: ${done}, ошибок: ${failed}, потрачено ≈ $${(done * price).toFixed(2)}`);
  console.log(`манифест: ${path.relative(ROOT, manifestPath).replace(/\\/g, '/')}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
});
