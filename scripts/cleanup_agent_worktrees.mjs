#!/usr/bin/env node
/**
 * Чистка копий рабочего дерева в `.claude/worktrees`.
 *
 * Зачем (22.09.2026). Замер нашёл там 39 копий. 34 из них были ПУСТЫМИ
 * болванками: агент создал папку, работу не начал, за собой не убрал — внутри
 * остался только артефакт `nul` (след windows-скрипта, писавшего в `> nul`).
 * Остальные копии весили по 3,6 ГБ.
 *
 * Скрипт НАМЕРЕННО осторожен: копия может принадлежать живой сессии, а
 * незакоммиченная работа внутри неё нигде больше не существует. Поэтому
 * удаляется только то, потерять что невозможно:
 *
 *   1) ПУСТЫЕ болванки — нет ничего, кроме артефакта `nul`. Удаляются всегда,
 *      возраст не важен: терять там нечего по определению.
 *   2) СТАРЫЕ копии (по умолчанию 14+ дней без изменений) — и только если в них
 *      НЕТ незакоммиченных изменений. Есть хоть одно — копия остаётся, а её имя
 *      печатается владельцу.
 *
 * `git worktree remove` здесь бессилен: он отказывается трогать непустую папку
 * («Directory not empty») из-за untracked-файлов, которых в каждой копии полно.
 * Поэтому папка сносится напрямую, а реестр git приводится в порядок через
 * `git worktree prune` в конце.
 *
 * Запуск:
 *   node scripts/cleanup_agent_worktrees.mjs            # показать, что будет удалено
 *   node scripts/cleanup_agent_worktrees.mjs --apply    # удалить
 *   node scripts/cleanup_agent_worktrees.mjs --apply --max-age-days 30
 *
 * По умолчанию — сухой прогон: удаление копий необратимо, поэтому оно требует
 * явного --apply.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const WORKTREES_DIR = join(REPO_ROOT, '.claude', 'worktrees');
const DAY_MS = 24 * 60 * 60 * 1000;

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const maxAgeArg = argv.indexOf('--max-age-days');
const MAX_AGE_DAYS = maxAgeArg >= 0 ? Number(argv[maxAgeArg + 1]) : 14;

if (!Number.isFinite(MAX_AGE_DAYS) || MAX_AGE_DAYS < 1) {
  console.error('--max-age-days должен быть числом >= 1');
  process.exit(1);
}

/** Артефакт windows-редиректа `> nul`; сам по себе работой не является. */
const ARTEFACT_NAMES = new Set(['nul']);

function listCopies() {
  try {
    return readdirSync(WORKTREES_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch (error) {
    // Немой catch запрещён: без этого сообщения «скрипт ничего не нашёл»
    // читалось бы как «копий нет», хотя причина может быть в правах доступа.
    if (error && error.code === 'ENOENT') {
      console.log('Папки .claude/worktrees нет — чистить нечего.');
      process.exit(0);
    }
    console.error('Не смог прочитать .claude/worktrees —',
      error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    process.exit(1);
  }
}

/** Пустая болванка: внутри нет ничего, кроме известных артефактов. */
function isEmptyHusk(dir) {
  try {
    return readdirSync(dir).every((name) => ARTEFACT_NAMES.has(name));
  } catch (error) {
    console.warn(`  ! не смог заглянуть внутрь ${dir} —`,
      error instanceof Error ? error.message : String(error));
    return false; // не уверены — не трогаем
  }
}

/** Незакоммиченные изменения. null — git не ответил, считаем «работа есть». */
function dirtyFileCount(dir) {
  try {
    const out = execFileSync('git', ['-C', dir, 'status', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').filter((line) => line.trim().length > 0).length;
  } catch (error) {
    // Ранний выход обязан логировать причину: молчаливый отказ git здесь
    // означал бы удаление копии, состояние которой мы не смогли проверить.
    console.warn(`  ! git не ответил по ${dir} —`,
      error instanceof Error ? error.message : String(error),
      '— копию считаю занятой и не трогаю');
    return null;
  }
}

function ageDays(dir) {
  try {
    return (Date.now() - statSync(dir).mtimeMs) / DAY_MS;
  } catch {
    return 0; // не смогли узнать возраст — считаем свежей, то есть не трогаем
  }
}

const copies = listCopies();
if (copies.length === 0) {
  console.log('Копий нет.');
  process.exit(0);
}

const toDelete = [];
const kept = [];

for (const name of copies) {
  const dir = join(WORKTREES_DIR, name);
  const age = ageDays(dir);

  if (isEmptyHusk(dir)) {
    toDelete.push({ name, dir, reason: 'пустая болванка (только артефакт nul)' });
    continue;
  }

  if (age < MAX_AGE_DAYS) {
    kept.push({ name, reason: `свежая (${age.toFixed(1)} дн. < ${MAX_AGE_DAYS})` });
    continue;
  }

  const dirty = dirtyFileCount(dir);
  if (dirty === null) {
    kept.push({ name, reason: 'git не ответил — состояние неизвестно' });
    continue;
  }
  if (dirty > 0) {
    kept.push({ name, reason: `НЕЗАКОММИЧЕННАЯ работа: ${dirty} файл(ов)` });
    continue;
  }

  toDelete.push({ name, dir, reason: `старая (${age.toFixed(0)} дн.), изменений нет` });
}

console.log(`\nКопий всего: ${copies.length}`);
console.log(`Под удаление: ${toDelete.length}`);
console.log(`Остаются: ${kept.length}\n`);

for (const { name, reason } of kept) console.log(`  СОХРАНЯЮ  ${name} — ${reason}`);
if (kept.length > 0) console.log('');
for (const { name, reason } of toDelete) console.log(`  УДАЛЯЮ    ${name} — ${reason}`);

if (!APPLY) {
  console.log('\nЭто сухой прогон. Чтобы удалить: --apply\n');
  process.exit(0);
}

let removed = 0;
let busy = 0;
for (const { name, dir } of toDelete) {
  // зачем отдельный процесс: на Windows rmSync по занятой папке (EBUSY/EPERM)
  // не бросает исключение, а РОНЯЕТ процесс Node целиком — падение уносит и
  // остальные удаления, и `git worktree prune` в конце. Сносим каждую копию в
  // дочернем процессе: его смерть переживаема и читается как «папка занята».
  const child = spawnSync(
    process.execPath,
    ['-e', 'require("node:fs").rmSync(process.argv[1],{recursive:true,force:true})', dir],
    { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' },
  );
  if (child.status === 0) {
    removed += 1;
    continue;
  }
  // «Занята» — нормальный случай: в папке живёт процесс другой сессии.
  // Это не ошибка скрипта, но молчать о ней нельзя.
  busy += 1;
  const why = (child.stderr || '').split('\n').find((l) => /Error|EBUSY|EPERM|ENOTEMPTY/.test(l));
  console.warn(`  ! не удалил ${name} — папка занята другим процессом${why ? ` (${why.trim()})` : ''}`);
}

try {
  execFileSync('git', ['worktree', 'prune'], { cwd: REPO_ROOT, stdio: 'ignore' });
} catch (error) {
  console.warn('  ! git worktree prune не прошёл —',
    error instanceof Error ? error.message : String(error));
}

console.log(`\nУдалено копий: ${removed} из ${toDelete.length}.` +
  (busy > 0 ? ` Занято другим процессом: ${busy} — повтори, когда та сессия закроется.` : '') +
  ' Реестр git подчищен.\n');
