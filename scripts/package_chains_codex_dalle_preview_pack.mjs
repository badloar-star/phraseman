#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const REPO = 'C:\\appsprojects\\phraseman';
const REFERENCE_SOURCE_DIR = 'C:\\Users\\badlo\\OneDrive\\Desktop\\preview examples';
const PREVIEW_BANK_DIR = 'C:\\Users\\badlo\\OneDrive\\Desktop\\банк превью';
const RULES_DIR = path.join(PREVIEW_BANK_DIR, 'rules_and_contracts');
const LOCAL_SVG_PACK = 'C:\\Users\\badlo\\OneDrive\\Desktop\\CHAINS_PREVIEW_RULES_AND_HISTORY\\new_generation_fresh_styles_20260702_154811';

const DOWNLOAD_BLOCK = `Скачать Phraseman:
App Store: https://apps.apple.com/app/id6764800879
Google Play: https://play.google.com/store/apps/details?id=app.phraseman
Сайт: https://knowlyapps.com/`;

const TAGS = [
  'английский на слух',
  'английские фразы',
  'английский для начинающих',
  'английский с нуля',
  'английский A1',
  'английские фразы с переводом',
  'слушай и повторяй',
  'разговорный английский',
  'фразы на английском',
  'учить английский',
  'метод цепочек',
  'цепочки фраз',
  'Phraseman',
];

const FINAL_ITEMS = [
  {
    id: 'ig_047022b53c464af0016a4691cf5b5481918d80cc25d7f913af',
    slug: 'angliyskiy_tonet_bros_yakor',
    visible_text: 'АНГЛИЙСКИЙ ТОНЕТ? / БРОСЬ ЯКОРЬ',
    style_family: 'premium-navy-brass-anchor',
    metaphor_object: 'anchor',
    description_angle: 'якорь показывает, что английская фраза не должна тонуть в шуме перевода: ее нужно закрепить смыслом, повторением и звучанием',
    titles: [
      'Английский тонет в голове? Закрепите фразу якорем',
      'Почему английские слова всплывают, а фраза тонет?',
      'Английский на слух: как удержать смысл фразы',
      'Метод цепочек: якорь для английских фраз в памяти',
      'Как не потерять английскую фразу после первого прослушивания',
      'Английские фразы с переводом: закрепляем смысл, а не зубрим',
    ],
  },
  {
    id: 'ig_047022b53c464af0016a4692158664819194a68d69dcc1209d',
    slug: 'slova_v_tumane_navedi_linzu',
    visible_text: 'СЛОВА В ТУМАНЕ? / НАВЕДИ ЛИНЗУ',
    style_family: 'premium-graphite-silver-lens',
    metaphor_object: 'lens',
    description_angle: 'линза показывает, что туман появляется не из-за нехватки слов, а из-за отсутствия фокуса на целой английской фразе',
    titles: [
      'Слова в тумане? Наведите линзу на английскую фразу',
      'Почему английский на слух расплывается, хотя слова знакомы?',
      'Как сфокусироваться на смысле английской фразы',
      'Английские фразы на слух: убираем туман перевода',
      'Метод цепочек: как увидеть смысл в английской речи',
      'Не теряйте английский в тумане: слушайте фразу целиком',
    ],
  },
  {
    id: 'ig_047022b53c464af0016a469272671081919c33894618736a91',
    slug: 'fraza_zastryala_sdvin_rychag',
    visible_text: 'ФРАЗА ЗАСТРЯЛА? / СДВИНЬ РЫЧАГ',
    style_family: 'premium-charcoal-copper-lever',
    metaphor_object: 'lever',
    description_angle: 'рычаг показывает момент, когда знание есть, но английская фраза не двигается: нужен правильный механизм повторения, слуха и возврата к смыслу',
    titles: [
      'Фраза застряла? Сдвиньте английский с места',
      'Почему английская фраза не выходит, когда нужно говорить?',
      'Как запустить английскую речь без долгого перевода',
      'Английский для разговора: сдвигаем фразы с места',
      'Метод цепочек: рычаг для английской речи на слух',
      'Слушай и повторяй: как оживить застрявшие английские фразы',
    ],
  },
  {
    id: 'ig_047022b53c464af0016a4692dc70e081919e9d7dded628f424',
    slug: 'karta_angliyskogo_gde_tvoy_marshrut',
    visible_text: 'КАРТА АНГЛИЙСКОГО / ГДЕ ТВОЙ МАРШРУТ?',
    style_family: 'premium-forest-brass-map',
    metaphor_object: 'map',
    description_angle: 'карта показывает, что английский легче идти маршрутом: короткая фраза, расширение, смысл, повторение и возвращение к звучанию',
    titles: [
      'Карта английского: где ваш маршрут к живой речи?',
      'Английский без маршрута путает: начните с фраз',
      'Как построить путь от слов к английской речи',
      'Метод цепочек: карта для английских фраз на слух',
      'Английский для начинающих: идем по маршруту фразы',
      'Где ваш маршрут в английском? Слушайте цепочку смысла',
    ],
  },
  {
    id: 'ig_047022b53c464af0016a4693294e6c8191981f466719e93ff6',
    slug: 'perevod_shumit_uberi_pomehi',
    visible_text: 'ПЕРЕВОД ШУМИТ? / УБЕРИ ПОМЕХИ',
    style_family: 'premium-aubergine-brass-radio',
    metaphor_object: 'radio tuner',
    description_angle: 'радиопомехи показывают, как внутренний перевод забивает английское звучание: нужно настроить слух не на отдельные слова, а на фразу целиком',
    titles: [
      'Перевод шумит? Настройте слух на английскую фразу',
      'Почему английский звучит как помехи, когда вы переводите?',
      'Английский на слух: убираем шум перевода в голове',
      'Как настроиться на английскую речь без внутреннего переводчика',
      'Метод цепочек: чистый английский сигнал вместо шума слов',
      'Слушай английские фразы: как убрать помехи и поймать смысл',
    ],
  },
  {
    id: 'ig_047022b53c464af0016a469393f7308191b5423601808e398e',
    slug: 'rech_ne_gorit_day_iskru',
    visible_text: 'РЕЧЬ НЕ ГОРИТ? / ДАЙ ИСКРУ',
    style_family: 'premium-chocolate-copper-spark',
    metaphor_object: 'spark',
    description_angle: 'искра показывает момент запуска речи: английская фраза загорается, когда смысл, звук и повторение соединены в одну цепочку',
    titles: [
      'Речь не горит? Дайте искру английским фразам',
      'Почему английский не загорается, даже если вы учили слова?',
      'Как запустить английскую речь через короткие фразы',
      'Английский на слух: искра появляется в цепочке фраз',
      'Метод цепочек: как оживить английские фразы в разговоре',
      'Слушай и повторяй: зажигаем разговорный английский фразами',
    ],
  },
];

const REJECTED_ITEMS = [];

function pad(value) {
  return String(value).padStart(2, '0');
}

function makeStamp() {
  const now = new Date();
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${text.trimEnd()}\n`, 'utf8');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function latestExportReport() {
  const reportsDir = path.join(REPO, '.codex-tmp', 'collectibles-dalli', 'reports');
  return fs.readdirSync(reportsDir)
    .filter((name) => name.endsWith('.export.json'))
    .map((name) => path.join(reportsDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDescription(item) {
  const leadTitle = item.titles[0];
  return `${leadTitle}

99% людей просто пролистывают уроки английского, потому что им снова обещают "выучить слова". Но если вы досмотрели до этого видео, значит вам нужен не список слов, а понятный способ услышать и собрать фразу.

В этом уроке мы разбираем проблему так: ${item.description_angle}. Вы будете слышать английскую фразу, видеть русский смысл, повторять связку и возвращаться к английскому звучанию, чтобы мозг привыкал не переводить каждое слово отдельно.

Это не магия и не обещание мгновенного результата. Метод цепочек работает спокойнее: сначала вы ловите короткий смысл, потом добавляете следующий кусок, затем повторяете фразу целиком. Так английский на слух становится не шумом, а маршрутом.

Если у вас есть возражение "я уже учил слова, но не говорю", оно как раз по делу. Отдельные слова редко спасают речь. Вам нужны готовые фразы, порядок слов и повторение в контексте. Поэтому этот формат подходит для начинающих и для тех, кто хочет быстрее вспоминать английские фразы в обычном разговоре.

После видео продолжайте практику в Phraseman: там удобно тренировать английские фразы, повторять их и превращать пассивное знание в живой навык.

${DOWNLOAD_BLOCK}

Напишите в комментариях одну английскую фразу, которую вы хотите перестать переводить в голове.

#английский #английскийнаслух #английскиефразы #английскийдляначинающих #phraseman`;
}

async function makeContactSheet(images, out) {
  const thumbW = 384;
  const thumbH = 216;
  const labelH = 46;
  const cols = 3;
  const rows = Math.ceil(images.length / cols);
  const composites = [];
  for (let i = 0; i < images.length; i += 1) {
    const image = images[i];
    const left = (i % cols) * thumbW;
    const top = Math.floor(i / cols) * (thumbH + labelH);
    const thumb = await sharp(image.file).resize(thumbW, thumbH, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
    composites.push({ input: thumb, left, top });
    const label = `${pad(i + 1)} ${image.metaphor_object}`;
    const svg = Buffer.from(`<svg width="${thumbW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><text x="10" y="29" font-family="Arial" font-size="18" fill="#fff">${escapeXml(label.slice(0, 38))}</text></svg>`);
    composites.push({ input: svg, left, top: top + thumbH });
  }
  await sharp({
    create: {
      width: cols * thumbW,
      height: rows * (thumbH + labelH),
      channels: 3,
      background: '#111111',
    },
  }).composite(composites).jpeg({ quality: 92 }).toFile(out);
}

function copyRulesAndReports(latestPreviewReport) {
  ensureDir(RULES_DIR);
  const files = [
    ['chains_preview_pack_rules.md', path.join(REPO, 'docs', 'chains_preview_pack_rules.md')],
    ['chains_preview_pack_contract_check.mjs', path.join(REPO, 'scripts', 'chains_preview_pack_contract_check.mjs')],
    ['package_chains_codex_dalle_preview_pack.mjs', path.join(REPO, 'scripts', 'package_chains_codex_dalle_preview_pack.mjs')],
    ['chains_preview_pack_contract_gate.test.ts', path.join(REPO, 'tests', 'chains_preview_pack_contract_gate.test.ts')],
    ['latest_preview_contract_report.json', latestPreviewReport],
  ];
  for (const [name, src] of files) {
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(RULES_DIR, name));
  }
  writeText(path.join(RULES_DIR, 'README.md'), `# Chains Preview Bank Rules And Contracts

Source inspiration folder:
\`C:\\Users\\badlo\\OneDrive\\Desktop\\preview examples\`

Final preview bank:
\`C:\\Users\\badlo\\OneDrive\\Desktop\\банк превью\`

- Required formula: \`premium_metaphor_v1\`.
- New styled preview generations must use Codex/DALL-E output as final source images.
- Each thumbnail requires title variants and a full YouTube description.
- Descriptions must include the Phraseman links, explain the method, address objections, and speak directly to the viewer.
- Local scripts may package, resize, crop, archive, and run contracts only.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const exportReport = path.resolve(String(args['export-report'] || latestExportReport()));
  const stamp = String(args.stamp || makeStamp());
  const packRoot = path.join(PREVIEW_BANK_DIR, `chains_codex_dalle_premium_ideas_${stamp}`);
  const readyDir = path.join(packRoot, 'READY_YOUTUBE_PACK');
  const youtubeDir = path.join(readyDir, 'youtube_ready_1280x720');
  const originalsDir = path.join(readyDir, 'dalle_originals');
  const rejectedDir = path.join(readyDir, 'rejected_candidates');

  ensureDir(youtubeDir);
  ensureDir(originalsDir);
  ensureDir(rejectedDir);

  if (fs.existsSync(LOCAL_SVG_PACK)) {
    writeText(path.join(LOCAL_SVG_PACK, 'REJECTED_LOCAL_SVG_PACK_DO_NOT_USE.txt'), 'Rejected: this pack was locally rendered with SVG/raster code and is not a Codex/DALL-E preview generation.');
  }

  const report = readJson(exportReport);
  const recordsById = new Map(report.records.map((record) => [record.id, record]));
  const manifestItems = [];
  const finalImages = [];
  const allTitles = [];
  const allDescriptions = [];

  for (let i = 0; i < FINAL_ITEMS.length; i += 1) {
    const item = FINAL_ITEMS[i];
    const record = recordsById.get(item.id);
    if (!record) throw new Error(`Missing exported DALL-E record: ${item.id}`);
    const source = path.resolve(REPO, record.sourcePath);
    const prompt = path.resolve(REPO, record.promptPath);
    const original = path.join(originalsDir, `${pad(i + 1)}_${item.slug}_${item.id}.png`);
    const promptDest = path.join(originalsDir, `${pad(i + 1)}_${item.slug}_${item.id}.prompt.txt`);
    const finalFile = path.join(youtubeDir, `${pad(i + 1)}_${item.slug}.jpg`);
    const titlesFile = finalFile.replace(/\.jpg$/i, '.titles.txt');
    const descriptionFile = finalFile.replace(/\.jpg$/i, '.description.txt');
    const description = buildDescription(item);

    fs.copyFileSync(source, original);
    if (fs.existsSync(prompt)) fs.copyFileSync(prompt, promptDest);
    await sharp(source).resize(1280, 720, { fit: 'cover' }).jpeg({ quality: 92, mozjpeg: true }).toFile(finalFile);
    writeText(titlesFile, item.titles.join('\n'));
    writeText(descriptionFile, description);

    finalImages.push({ file: finalFile, metaphor_object: item.metaphor_object });
    manifestItems.push({
      index: i + 1,
      id: item.id,
      slug: item.slug,
      visible_text: item.visible_text,
      style_family: item.style_family,
      metaphor_object: item.metaphor_object,
      codex_dalle_source: original,
      codex_dalle_prompt: promptDest,
      final_file: finalFile,
      titles_file: titlesFile,
      description_file: descriptionFile,
      source_width: record.sourceWidth,
      source_height: record.sourceHeight,
    });
    allTitles.push(`# ${pad(i + 1)} ${item.slug}`);
    allTitles.push(...item.titles.map((title, idx) => `${idx + 1}. ${title}`));
    allTitles.push('');
    allDescriptions.push(`# ${pad(i + 1)} ${item.slug}`);
    allDescriptions.push(description);
    allDescriptions.push('');
  }

  const rejected = [];
  for (const item of REJECTED_ITEMS) {
    const record = recordsById.get(item.id);
    if (!record) continue;
    const source = path.resolve(REPO, record.sourcePath);
    const dest = path.join(rejectedDir, `${item.id}.png`);
    fs.copyFileSync(source, dest);
    rejected.push({ id: item.id, reason: item.reason, file: dest });
  }

  const description = buildDescription(FINAL_ITEMS[0]);
  writeText(path.join(readyDir, 'ALL_THUMBNAIL_TITLES.txt'), allTitles.join('\n'));
  writeText(path.join(readyDir, 'ALL_VIDEO_DESCRIPTIONS.txt'), allDescriptions.join('\n'));
  writeText(path.join(readyDir, 'description.txt'), description);
  writeText(path.join(readyDir, 'pinned_comment.txt'), `Какая английская фраза у вас постоянно застревает в голове по-русски? Напишите ее в комментариях, и попробуйте собрать ее цепочкой.\n\n${DOWNLOAD_BLOCK}`);
  writeText(path.join(readyDir, 'tags.txt'), TAGS.join(', '));
  writeText(path.join(readyDir, 'dalle_prompts.txt'), manifestItems.map((item) => `${pad(item.index)} ${item.slug}\n${fs.existsSync(item.codex_dalle_prompt) ? fs.readFileSync(item.codex_dalle_prompt, 'utf8').trim() : ''}`).join('\n\n'));
  await makeContactSheet(finalImages, path.join(readyDir, 'contact_sheet.jpg'));

  const freshManifest = {
    fresh_generation: true,
    generator: 'codex_dalle',
    design_formula: 'premium_metaphor_v1',
    generation_mode: 'codex_dalle_premium_idea_generation_exported_from_rollout_then_resized_only',
    reference_source_dir: REFERENCE_SOURCE_DIR,
    preview_bank_dir: PREVIEW_BANK_DIR,
    generated_at: new Date().toISOString(),
    export_report: exportReport,
    generation_folder: packRoot,
    ready_folder: readyDir,
    source_image_reuse_count: 0,
    local_rendered_final_count: 0,
    rejected_candidates: rejected,
    style_families: FINAL_ITEMS.map((item) => item.style_family),
    metaphor_objects: FINAL_ITEMS.map((item) => item.metaphor_object),
    items: manifestItems,
  };
  writeText(path.join(readyDir, 'fresh_generation_manifest.json'), JSON.stringify(freshManifest, null, 2));

  writeText(path.join(readyDir, 'READY_PACKAGE_MANIFEST.json'), JSON.stringify({
    package: 'Chains Codex/DALL-E premium idea preview pack',
    generated_at: new Date().toISOString(),
    ready_folder: readyDir,
    reference_source_dir: REFERENCE_SOURCE_DIR,
    preview_bank_dir: PREVIEW_BANK_DIR,
    final_thumbnail_count: finalImages.length,
    title_variants_per_thumbnail: 6,
    full_description_per_thumbnail: true,
    generator: 'codex_dalle',
    design_formula: 'premium_metaphor_v1',
    rules_and_contracts: RULES_DIR,
  }, null, 2));
  writeText(path.join(readyDir, 'thumbnail_manifest.json'), JSON.stringify({ items: manifestItems }, null, 2));
  writeText(path.join(readyDir, 'thumbnail_gate_report.md'), `# Chains Premium Codex/DALL-E Preview Bank Gate

- Status before contract: generated
- Reference source: ${REFERENCE_SOURCE_DIR}
- Preview bank: ${PREVIEW_BANK_DIR}
- Final thumbnails: ${finalImages.length}
- Generator: Codex/DALL-E image generation
- Design formula: premium_metaphor_v1
- Full description per thumbnail: yes
- Title variants per thumbnail: 6
- Size target: 1280x720
- Rejected candidates: ${rejected.length}
- CapCut project touched: no
`);

  const contractReport = path.join(readyDir, 'preview_contract_report.json');
  const contract = spawnSync(process.execPath, [
    path.join(REPO, 'scripts', 'chains_preview_pack_contract_check.mjs'),
    '--ready-dir',
    readyDir,
    '--report',
    contractReport,
  ], {
    cwd: REPO,
    encoding: 'utf8',
  });
  if (contract.stdout.trim()) process.stdout.write(contract.stdout);
  if (contract.stderr.trim()) process.stderr.write(contract.stderr);
  if (contract.status !== 0) {
    throw new Error(`Preview contract failed with exit code ${contract.status}`);
  }

  copyRulesAndReports(contractReport);

  console.log(JSON.stringify({
    status: 'ready',
    packRoot,
    readyDir,
    finalThumbnailCount: finalImages.length,
    contactSheet: path.join(readyDir, 'contact_sheet.jpg'),
    rulesAndContracts: RULES_DIR,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
