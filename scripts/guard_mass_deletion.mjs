#!/usr/bin/env node
/**
 * guard_mass_deletion.mjs — защита от коммитов-снимков, которые записывают
 * СТАРУЮ версию дерева поверх свежей.
 *
 * зачем (2026-08-02, владелец): коммит 95eec1717 «SAFETY: preserve worktree
 * before unified integration» не собирался ничего менять — он хотел сделать
 * страховочный снимок перед объединением веток. Но вместо снимка закоммитил
 * старое дерево поверх нового: 897 файлов, 102 875 удалённых строк. Так был
 * потерян осознанный фикс главного экрана (полоска дневных заданий перестала
 * быть зафиксированной и начала прыгать под рукой у пользователя), а заодно в
 * репозиторий заехали строки из посторонней ветки.
 *
 * Правило: если один коммит удаляет больше DELETION_LIMIT строк ИЛИ трогает
 * больше FILE_LIMIT файлов — он останавливается. Это почти всегда либо
 * «снимок» поверх свежего кода, либо случайный откат чужой работы.
 *
 * Осознанные большие удаления (снос модуля, чистка мёртвого кода) разрешаются
 * явно, ровно для одной операции:
 *   PHRASEMAN_ALLOW_MASS_DELETION=1 git commit ...
 *
 * Zero dependencies. Читает только staged-изменения, ничего не меняет.
 */

import { execFileSync } from 'node:child_process';

/** Больше этого числа удалённых строк за один коммит — почти всегда откат. */
const DELETION_LIMIT = 2000;
/** Больше этого числа файлов за один коммит — почти всегда «снимок дерева». */
const FILE_LIMIT = 150;

/** Шум, который не считаем: сборка, карты, локи, ассеты. */
const IGNORED = /(^|\/)(node_modules|dist|build|lib|lib_preview_tmp)\/|\.(map|lock)$|package-lock\.json$/;

function staged() {
  try {
    return execFileSync('git', ['diff', '--cached', '--numstat'], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch {
    return '';
  }
}

function main() {
  if (process.env.PHRASEMAN_ALLOW_MASS_DELETION) return;

  let deletions = 0;
  let files = 0;
  const worst = [];

  for (const line of staged().split('\n')) {
    if (!line.trim()) continue;
    const [added, removed, file] = line.split('\t');
    if (!file || IGNORED.test(file)) continue;
    // Бинарные файлы приходят как «-\t-\tfile» — их не считаем.
    if (removed === '-' || added === '-') continue;
    const gone = Number(removed) || 0;
    deletions += gone;
    files += 1;
    if (gone > 0) worst.push({ file, gone });
  }

  const tooManyDeletions = deletions > DELETION_LIMIT;
  const tooManyFiles = files > FILE_LIMIT;
  if (!tooManyDeletions && !tooManyFiles) return;

  worst.sort((a, b) => b.gone - a.gone);

  process.stderr.write('\nSTOP: похоже на коммит-снимок поверх свежего кода.\n\n');
  if (tooManyDeletions) {
    process.stderr.write(`  удалено строк: ${deletions} (порог ${DELETION_LIMIT})\n`);
  }
  if (tooManyFiles) {
    process.stderr.write(`  затронуто файлов: ${files} (порог ${FILE_LIMIT})\n`);
  }
  process.stderr.write('\n  Больше всего удалено:\n');
  for (const { file, gone } of worst.slice(0, 10)) {
    process.stderr.write(`    -${String(gone).padStart(6)}  ${file}\n`);
  }
  process.stderr.write(
    '\n  Так был потерян фикс главного экрана (коммит 95eec1717, 897 файлов).\n'
    + '  Проверьте: вы точно УДАЛЯЕТЕ код, а не записываете старую версию\n'
    + '  поверх чужой свежей работы?\n\n'
    + '  Если удаление осознанное — повторите ровно эту команду с флагом:\n'
    + '    PHRASEMAN_ALLOW_MASS_DELETION=1 git commit ...\n\n',
  );
  process.exit(1);
}

main();
