#!/usr/bin/env node
/**
 * guard_foreign_staged.mjs — защита от «перехвата» коммитов между параллельными
 * сессиями Claude/Codex, работающими в ОДНОМ рабочем дереве.
 *
 * зачем (2026-08-23, владелец): владелец держит несколько сессий на одном
 * репозитории. git-индекс у них общий, поэтому `git add -A` или `git add <папка>`
 * втягивает чужие незакоммиченные правки, и они уезжают под чужим сообщением
 * коммита. За одну сессию это случилось ТРИЖДЫ: правка админки уехала в
 * 36c587b54 «chore(deps)», переносы UI-слоя — в de7bbdf82 «feat: руны в бирже».
 * Работа не терялась, но история становится нечитаемой: по сообщению коммита
 * невозможно понять, что в нём на самом деле лежит.
 *
 * guard_mass_deletion ловит другой класс (снимок старого дерева поверх нового)
 * и срабатывает только на 150+ файлах — типичный перехват на 20–40 файлов
 * проходит под ним незамеченным.
 *
 * Правило: если в индексе больше FOREIGN_HINT_LIMIT файлов — печатаем список
 * и требуем осознанного подтверждения. НЕ блокируем молча: большие осознанные
 * коммиты (рефакторинг, перенос модуля) легитимны.
 *
 * Осознанный большой коммит разрешается явно, ровно для одной операции:
 *   PHRASEMAN_ALLOW_WIDE_COMMIT=1 git commit ...
 */

import { execSync } from 'node:child_process';

// зачем именно 60: сессия трогает 5–30 файлов; перенос модуля с тестами —
// до ~60. Всё, что шире, стоит осмотреть глазами: там обычно чужая работа.
const FOREIGN_HINT_LIMIT = 60;

if (process.env.PHRASEMAN_ALLOW_WIDE_COMMIT === '1') process.exit(0);

function staged() {
  try {
    return execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

const files = staged();
if (files.length <= FOREIGN_HINT_LIMIT) process.exit(0);

console.error('');
console.error(`⚠  В индексе ${files.length} файлов (порог ${FOREIGN_HINT_LIMIT}).`);
console.error('   В этом дереве работают параллельные сессии — проверь, что все они твои.');
console.error('');
for (const f of files.slice(0, 25)) console.error(`     ${f}`);
if (files.length > 25) console.error(`     … и ещё ${files.length - 25}`);
console.error('');
console.error('   Чужое попало в индекс → `git reset` и добавляй файлы ПОИМЁННО.');
console.error('   Коммит правда такой широкий → PHRASEMAN_ALLOW_WIDE_COMMIT=1 git commit ...');
console.error('');
process.exit(1);
