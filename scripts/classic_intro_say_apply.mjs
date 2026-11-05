// зачем (владелец 05.11/06.11, «Читается» под каждым примером вступления; срочно для сборки 150): кладёт чтения (say ru/uk) в блоки вступления курса
// block.sayByLocale = { ru: { "<id фразы>": "…" }, uk: {…} } — как для en (6fa0470af), но для курса, чей intro.json нельзя пересобрать целиком (в дереве чужие
// незакоммиченные курсы, пересборка по общему сборщику затронула бы их). Источник: примеры теории (chapters[].examples[].say по phraseId) и
// docs/work/classic_intro_plain/say_extra_<lang>.json (для фраз вне теории). Обновляет intro.json и запись intro.json в manifest.json (bytes, sha256).
// Запуск: node scripts/classic_intro_say_apply.mjs <lang> [--head-out <каталог>]
//   без флага — правит рабочие файлы modules/classic-courses/<lang>/intro.json и manifest.json;
//   --head-out — берёт за основу версии из HEAD и пишет результат в каталог (для патча безопасного коммита поверх чужих правок в дереве).
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sayLib from './classic_intro_say_lib.cjs';
const { applyIntroSay } = sayLib;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lang = process.argv[2];
const headOutIdx = process.argv.indexOf('--head-out');
const headOut = headOutIdx > 0 ? process.argv[headOutIdx + 1] : null;
if (!lang || !/^[a-z]{2}$/.test(lang)) { console.error('[SAY-APPLY] укажите язык (es, fr, de, it, en)'); process.exit(2); }

const rel = (f) => `modules/classic-courses/${lang === 'manifest' ? '' : lang + '/'}${f}`;
const readSrc = (relPath) => (headOut
  ? execSync(`git show HEAD:${relPath}`, { cwd: ROOT, maxBuffer: 1 << 30 }).toString('utf8')
  : fs.readFileSync(path.join(ROOT, relPath), 'utf8'));

const intro = JSON.parse(readSrc(rel('intro.json')));
const theoryRaw = JSON.parse(readSrc(rel('theory.json')));
const theory = theoryRaw.data ?? theoryRaw;
const manifest = JSON.parse(readSrc('modules/classic-courses/manifest.json'));

const extraFile = path.join(ROOT, 'docs', 'work', 'classic_intro_plain', `say_extra_${lang}.json`);
const extra = fs.existsSync(extraFile) ? JSON.parse(fs.readFileSync(extraFile, 'utf8')) : {};
// зачем: правило одно на всех — scripts/classic_intro_say_lib.cjs (его же вызывает сборщик classic_course_pack.mjs)
const { blocks, missing } = applyIntroSay({ intro, theory, extra });
console.log(`[SAY-APPLY] ${lang}: блоков ${blocks}, нет чтения для ${missing.length}${missing.length ? ': ' + [...new Set(missing)].slice(0, 12).join(', ') : ''}`);
if (missing.length) { console.error('[SAY-APPLY] отказ: у части примеров нет чтения — файлы не записаны'); process.exit(1); }

const introText = JSON.stringify(intro) + '\n';
const entry = { bytes: Buffer.byteLength(introText), sha256: createHash('sha256').update(introText).digest('hex') };
manifest.languages[lang].files['intro.json'] = entry;
const manifestText = JSON.stringify(manifest) + '\n';

const outIntro = headOut ? path.join(headOut, 'intro.json') : path.join(ROOT, rel('intro.json'));
const outManifest = headOut ? path.join(headOut, 'manifest.json') : path.join(ROOT, 'modules/classic-courses/manifest.json');
if (headOut) fs.mkdirSync(headOut, { recursive: true });
fs.writeFileSync(outIntro, introText);
fs.writeFileSync(outManifest, manifestText);
console.log(`[SAY-APPLY] записано: ${outIntro} (${entry.bytes} байт, sha256 ${entry.sha256.slice(0, 12)}…), ${outManifest}`);
