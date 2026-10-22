#!/usr/bin/env node
/**
 * Сторож выпуска сессий Learning V2 — ВСЕ языковые контуры (владелец,
 * 2026-08-27: «должны покрывать все контуры и будущие возможные и английский»).
 *
 * ЗАЧЕМ ИМЕННО СТОРОЖ, А НЕ ДОКУМЕНТ. Документ — просьба, её можно не
 * прочитать. Этот скрипт блокирует коммит, поэтому работает с ЛЮБОЙ моделью,
 * даже если она не открывала docs/. Тот же приём, которым владелец защитил
 * лиги, вход в админку и App Check.
 *
 * ЧТО ЛОВИТ (каждый пункт — реальный инцидент 2026-08-27):
 *   1. Битая кодировка в модуле озвучки (fÃ¡cil вместо fácil) — поиск идёт по
 *      точному совпадению транскрипта, отсюда production_audio_missing при
 *      физически существующих mp3.
 *   2. Модуль озвучки есть, но не подключён в клиент курса или в предзагрузку
 *      — сессия молча уходит в сеть и показывает «Сессия недоступна».
 *   3. Сессия объявлена озвученной, но модуля озвучки нет.
 *   4. Ручная константа потолка вместо вычисляемой — забытый ручной шаг и был
 *      корнем инцидента (сессия написана, а приложение её не отдаёт).
 *
 * НОВЫЕ ЯЗЫКИ ПОДХВАТЫВАЮТСЯ САМИ. Контуры не перечислены руками: скрипт
 * находит все файлы *authored_sessions_v1.ts в content/source и проверяет
 * каждый. Появится французский контур — он попадёт под сторож без правки
 * этого файла.
 *
 * Сработал — чинить причину, а не удалять сторожа.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'modules/learning-v2/content/source');
const problems = [];

/**
 * зачем (координатор 04.10): в pre-commit сторож читал РАБОЧУЮ КОПИЮ — чужая незаконченная правка
 * (не входящая в коммит) валила коммиты ВСЕХ сессий. Теперь в pre-commit (git задаёт GIT_INDEX_FILE,
 * в т. ч. для временного индекса) или с флагом --staged проверяется то, что реально уходит в коммит:
 * файл в коммите → версия из индекса; файла в коммите нет → версия из HEAD. Ручной запуск без
 * флага — диск, как раньше. Коммиты, меняющие охраняемые файлы, проверяются полностью.
 */
const STAGED_MODE = process.argv.includes('--staged') || Boolean(process.env.GIT_INDEX_FILE);
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
let stagedPaths = null;
const stagedSet = () => {
  if (!stagedPaths) stagedPaths = new Set(git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean));
  return stagedPaths;
};
const toRel = (fileOrRel) => {
  const abs = path.isAbsolute(fileOrRel) ? fileOrRel : path.join(ROOT, fileOrRel);
  return path.relative(ROOT, abs).split(path.sep).join('/');
};

export function releaseGuardSourceFor(rel, staged) {
  return staged.has(rel) ? 'index' : 'head';
}

const read = (fileOrRel) => {
  const rel = toRel(fileOrRel);
  if (!STAGED_MODE) {
    const abs = path.join(ROOT, rel);
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  }
  const source = releaseGuardSourceFor(rel, stagedSet());
  try {
    const text = git(['show', `${source === 'index' ? '' : 'HEAD'}:${rel}`]);
    console.log(`[RELEASE-GUARD] source=${source} path=${rel} result=ok`);
    return text;
  } catch {
    console.log(`[RELEASE-GUARD] source=${source} path=${rel} result=missing`);
    return null;
  }
};

/** Имена файлов каталога: в pre-commit — из индекса (без чужих неотслеживаемых файлов), иначе с диска. */
const listDir = (dirRel) => {
  if (!STAGED_MODE) {
    const abs = path.join(ROOT, dirRel);
    return fs.existsSync(abs) ? fs.readdirSync(abs) : [];
  }
  const prefix = `${dirRel.replace(/\/+$/, '')}/`;
  return git(['ls-files', '--', prefix])
    .split('\n')
    .filter((f) => f.startsWith(prefix) && !f.slice(prefix.length).includes('/'))
    .map((f) => f.slice(prefix.length));
};

/** Есть ли упоминание в тестах: в pre-commit — git grep по индексу, иначе чтение с диска. */
const testsMention = (needle) => {
  if (!needle) return false;
  if (!STAGED_MODE) {
    const testsDir = path.join(ROOT, 'tests');
    return fs.existsSync(testsDir)
      && fs.readdirSync(testsDir).filter((f) => f.endsWith('.ts')).some((f) => (read(path.join('tests', f)) ?? '').includes(needle));
  }
  try {
    return git(['grep', '--cached', '-l', '-F', needle, '--', 'tests/*.ts']).trim().length > 0;
  } catch {
    return false;
  }
};

console.log(`[RELEASE-GUARD] mode=${STAGED_MODE ? 'staged' : 'disk'}`);

// зачем считаем ВЫЗОВ, а не упоминание: файл может импортировать функцию и при
// этом её не вызывать (именно так выглядит отключённая предзагрузка) —
// проверка на includes() такую поломку пропускала.
const callCount = (text, fn) =>
  (text.match(new RegExp(`${fn}\\s*\\(`, 'g')) ?? []).length;

// ── 1. Кодировка во ВСЕХ модулях озвучки (любой контур) ──────────────────────
const appDir = path.join(ROOT, 'app');
void appDir;
const audioModules = listDir('app').filter((f) => /production_audio_v1\.ts$/.test(f));

for (const file of audioModules) {
  const text = read(path.join('app', file));
  if (!text) continue;
  const transcripts = [...text.matchAll(/transcript: "([^"]*)"/g)].map((m) => m[1]);
  const broken = transcripts.filter((t) => /[ÃÂ]/.test(t));
  if (broken.length > 0) {
    problems.push(
      `app/${file}: испорчена кодировка транскрипта — ${JSON.stringify(broken.slice(0, 3))}.\n` +
        `   Это даёт production_audio_missing при существующих mp3: поиск озвучки\n` +
        `   идёт по ТОЧНОМУ совпадению текста. Перезапиши файл в UTF-8.`,
    );
  }
}

// ── Обнаружение контуров: без ручного списка языков ──────────────────────────
// Английский исторически называется authored_sessions_v1.ts (без префикса),
// остальные — <lang>_authored_sessions_v1.ts. Новый язык подхватится сам.
const trackFiles = listDir('modules/learning-v2/content/source').filter((f) => /authored_sessions_v1\.ts$/.test(f));

if (trackFiles.length === 0) {
  problems.push(
    'Не найдено ни одного контура (*authored_sessions_v1.ts). Либо путь\n' +
      '   modules/learning-v2/content/source изменился, либо сторож смотрит не туда —\n' +
      '   проверь, иначе защита молча перестала работать.',
  );
}

const client = read('app/learning_v2_course_released_session_client_v3.ts') ?? '';

for (const trackFile of trackFiles) {
  const text = read(path.join(SOURCE_DIR, trackFile));
  if (!text) continue;

  const match = /^([a-z]{2})_authored_sessions_v1\.ts$/.exec(trackFile);
  const lang = match ? match[1] : 'en';
  // Английские функции исторически без языкового префикса: Session1..., а
  // испанские и будущие — EsSession1.../FrSession1...
  const prefix = lang === 'en' ? '' : lang.charAt(0).toUpperCase() + lang.slice(1);

  // ── 4. Потолок: либо вычисляется, либо ручной, но под сторожем ────────────
  // зачем не «всегда вычислять» (важная поправка): у английского контура
  // константа НАМЕРЕННАЯ — честный обход сессий стоил 3147 мс на телефоне при
  // открытии 14-й сессии. Там потолок запечён осознанно, и его сверяет тест
  // learning_v2_authored_sessions_reach_the_player.test.ts. Опасна не сама
  // константа, а константа БЕЗ сторожа: тогда её забывают поднять, и
  // написанная сессия молча не отдаётся. Требуем одно из двух.
  const manualCeiling = /export const [A-Z0-9_]*CONTIGUOUS_CEILING[A-Z0-9_]*\s*=\s*\d+/.exec(text);
  const hasComputed = /ContiguousCeilingV1\s*\(/.test(text);
  if (manualCeiling && !hasComputed) {
    const ceilingName = /export const ([A-Z0-9_]*CONTIGUOUS_CEILING[A-Z0-9_]*)/.exec(text)?.[1];
    const guarded = testsMention(ceilingName ?? '');
    if (!guarded) {
      problems.push(
        `${trackFile}: потолок задан ВРУЧНУЮ (${manualCeiling[0].trim()}) и его никто не сверяет.\n` +
          `   Именно забытая ручная константа была корнем инцидента 2026-08-27:\n` +
          `   сессия написана и все гейты зелёные, но приложение её не отдаёт и\n` +
          `   уходит в сеть → чёрный экран и stable_identity_unavailable.\n` +
          `   Допустимо одно из двух: вычислять потолок (образец —\n` +
          `   esAuthoredEpisode01ContiguousCeilingV1) ИЛИ оставить константу, но\n` +
          `   завести тест, который сверяет её с реальностью (образец —\n` +
          `   tests/learning_v2_authored_sessions_reach_the_player.test.ts).`,
      );
    }
  }

  // ── 2 и 3. Озвучка обязана существовать и быть подключена ─────────────────
  // зачем два источника номеров: испанский контур объявляет озвученные сессии
  // списком BUNDLED_AUDIO_SESSIONS, английский — нет (там озвучка просто есть
  // отдельными модулями). Берём объединение: объявленные + реально лежащие в
  // app/, иначе английские модули остались бы без проверки подключения.
  const declared = /BUNDLED_AUDIO_SESSIONS[^=]*=\s*new Set\(\[([^\]]*)\]\)/.exec(text);
  const declaredOrdinals = declared
    ? declared[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isFinite(n))
    : [];

  const modulePattern =
    lang === 'en'
      ? /^learning_v2_session(\d+)_production_audio_v1\.ts$/
      : new RegExp(`^learning_v2_${lang}_session(\\\\d+)_production_audio_v1\\\\.ts$`);
  const existingOrdinals = audioModules
    .map((f) => modulePattern.exec(f)?.[1])
    .filter(Boolean)
    .map(Number);

  const ordinals = [...new Set([...declaredOrdinals, ...existingOrdinals])].sort(
    (a, b) => a - b,
  );
  if (ordinals.length === 0) continue;

  for (const ordinal of ordinals) {
    const moduleRel = `app/learning_v2_${lang === 'en' ? '' : `${lang}_`}session${ordinal}_production_audio_v1.ts`;
    if (!read(moduleRel)) {
      problems.push(
        `[${lang}] BUNDLED_AUDIO_SESSIONS содержит сессию ${ordinal}, но ${moduleRel}\n` +
          `   не существует. Сессия объявлена озвученной, а модуля нет — материал\n` +
          `   не соберётся и человек упрётся в недоступное занятие.`,
      );
      continue;
    }
    const buildFn = `buildLearningV2${prefix}Session${ordinal}BundledAudioChildV1`;
    if (callCount(client, buildFn) === 0) {
      problems.push(
        `[${lang}] Озвучка сессии ${ordinal} не подключена в\n` +
          `   learning_v2_course_released_session_client_v3.ts (нет вызова ${buildFn}).\n` +
          `   Без этого сессия уйдёт в СЕТЬ и покажет «Сессия недоступна /\n` +
          `   stable_identity_unavailable».`,
      );
    }
    // зачем (владелец 22.10, «только TTS»): в занятиях звучит только голос телефона — модуль прогрева записей и
    // bootstrap-реестр удалены вместе с записями, проверка «общего пути поиска записей» снята. Модули сессий
    // (*_production_audio_v1.ts) остаются: клиент считает по ним отпечатки урока 1 (награда), это сторожит пункт выше.
  }
}

// ── 5. Фабрика требует auxiliary, а манифест его не даёт ─────────────────────
// зачем (Ядро/координатор 11.10, release:precheck): незакоммиченная правка фабрики стала бросать
// learning_v2_factory_native_auxiliary_missing без loadAuxiliary у строки манифеста, а в манифесте их 0 —
// 186 из 187 занятий не собирались. Курс входит в стор-сборку: такой коммит = «Сессия недоступна» у всех.
// Проверяем пару «фабрика + манифест» из того, что уходит в коммит (индекс/HEAD), — не рабочую копию.
const FACTORY_REL = 'modules/learning-v2/content/factory_native/factory_native_course_v1.ts';
const MANIFEST_REL = 'modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts';
const factoryText = read(FACTORY_REL);
const manifestText = read(MANIFEST_REL);
if (factoryText && manifestText) {
  const factoryRequiresAuxiliary = /if\s*\(\s*!\s*row\.loadAuxiliary\s*\)/.test(factoryText)
    && factoryText.includes('learning_v2_factory_native_auxiliary_missing');
  // Строки данных — `loadIntro: () => <загрузчик>`; объявление типа `loadIntro: () => unknown` не считаем.
  // зачем (Ядро 17.10, manifestRows=442 при 441 занятии): у `=>\s*(?!unknown)` пробел перед unknown съедался откатом, и строка
  // типа `loadIntro: () => unknown` считалась данными (+1). Тогда при требовании auxiliary сторож ложно стоял бы на 441 < 442.
  const rowCount = (manifestText.match(/\bloadIntro:\s*\(\)\s*=>(?!\s*unknown\b)/g) ?? []).length;
  const auxiliaryRowCount = (manifestText.match(/\bloadAuxiliary\??:\s*\(\)\s*=>(?!\s*unknown\b)/g) ?? []).length;
  console.log(`[RELEASE-GUARD] factory requiresAuxiliary=${factoryRequiresAuxiliary} manifestRows=${rowCount} auxiliaryRows=${auxiliaryRowCount}`);
  if (rowCount === 0) {
    problems.push(
      `${MANIFEST_REL}: не найдено ни одной строки занятия (loadIntro: () => …).\n` +
        '   Либо формат манифеста изменился, либо сторож смотрит не туда — проверь, иначе защита молча выключилась.',
    );
  } else if (factoryRequiresAuxiliary && auxiliaryRowCount < rowCount) {
    problems.push(
      `Фабрика (${FACTORY_REL}) требует loadAuxiliary у каждой строки манифеста,\n` +
        `   а в манифесте он есть у ${auxiliaryRowCount} из ${rowCount}. Каждое занятие без него падает с\n` +
        '   learning_v2_factory_native_auxiliary_missing → «Сессия недоступна» в стор-сборке.\n' +
        '   Коммить фабрику ОДНИМ коммитом с перегенерированным манифестом и копиями auxiliary.json,\n' +
        '   затем прогони tests/learning_v2_bundle_availability.test.ts.\n' +
        '   Подробно: docs/phraseman-2.0/handoff/CODEX_URGENT_FACTORY_2026-10-11.md',
    );
  }
} else {
  console.log(`[RELEASE-GUARD] factory/manifest pair skipped: factory=${Boolean(factoryText)} manifest=${Boolean(manifestText)}`);
}

if (problems.length > 0) {
  console.error('\n⛔ СТОРОЖ ВЫПУСКА СЕССИЙ LEARNING V2: коммит остановлен\n');
  problems.forEach((p, i) => console.error(`${i + 1}. ${p}\n`));
  console.error(
    'Полный порядок выпуска сессии: docs/v2/КАК_ВЫПУСКАТЬ_СЕССИЮ_ЧЕКЛИСТ.ru.md\n' +
      'Чинить причину, а не удалять сторожа.\n',
  );
  process.exit(1);
}
