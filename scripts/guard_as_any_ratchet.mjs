// зачем (2026-08-23): в app/components/modules накопилось ~390 приведений `as any`.
// Каждое — место, где компилятор перестаёт проверять типы; часть из них лежала
// на денежном пути RevenueCat (снято коммитом d6a3390a6: readCurrentRevenueCat-
// CustomerInfo отдавала `unknown`, и премиум/план/expiry не проверялись вообще).
//
// Разбирать все 390 разом смысла нет — большинство безобидны. Но без храповика
// число растёт молча, и следующий `as any` снова окажется там, где деньги.
// Этот сторож НЕ требует чинить долг: он требует, чтобы долг не рос.
//
// Правило: total может только УМЕНЬШАТЬСЯ. Стало меньше — обнови baseline
// через `node scripts/guard_as_any_ratchet.mjs --update` и закоммить вместе
// с правкой. Стало больше — убери `as any` из своей правки (используй `unknown`
// с сужением или настоящий тип), а не поднимай планку.
//
// Считаем АГРЕГАТ, а не пофайловый список: владелец держит несколько сессий в
// одном дереве (CLAUDE.md), и пофайловый baseline давал бы конфликты на каждом
// параллельном коммите.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(root, 'config', 'as-any-baseline.json');
const SCANNED = ['app', 'components', 'modules'];

// Тесты исключены намеренно: там `as any` — легитимный инструмент мока, и сейчас
// их ровно 0. Мешать их с продовыми означало бы прятать рост прод-кода за моками.
const isProductionSource = (file) =>
  /\.(?:ts|tsx)$/.test(file) && !/\.(?:test|spec)\.tsx?$/.test(file) && !/__(?:tests|mocks)__/.test(file);

const walk = (relativeDirectory) => {
  const absolute = path.join(root, relativeDirectory);
  if (!fs.existsSync(absolute)) return [];
  const result = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      result.push(...walk(relative));
    } else if (isProductionSource(entry.name)) {
      result.push(relative);
    }
  }
  return result;
};

// `as any` в строковом литерале или комментарии — не приведение типа. Гасим их,
// иначе сторож ловил бы собственные пояснительные комментарии (они есть в
// revenuecat_init.ts) и врал бы о росте долга.
const stripNoise = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/[^\n]*/g, ' ')
  .replace(/'(?:\\.|[^'\\])*'/g, "''")
  .replace(/"(?:\\.|[^"\\])*"/g, '""')
  .replace(/`(?:\\.|[^`\\])*`/g, '``');

const AS_ANY = /\bas\s+any\b/g;

const scan = () => {
  const perFile = [];
  let total = 0;
  for (const relative of SCANNED.flatMap(walk)) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const count = (stripNoise(source).match(AS_ANY) ?? []).length;
    if (count > 0) {
      perFile.push({ file: relative, count });
      total += count;
    }
  }
  perFile.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
  return { total, files: perFile.length, perFile };
};

const { total, files, perFile } = scan();
const today = new Date().toISOString().slice(0, 10);

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASELINE, `${JSON.stringify({
    total,
    files,
    updatedAt: today,
    note: 'Храповик: число может только уменьшаться. Обновлять через --update.',
  }, null, 2)}\n`);
  console.log(`guard_as_any_ratchet: baseline обновлён — ${total} приведений в ${files} файлах.`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('guard_as_any_ratchet: нет config/as-any-baseline.json — создай его через --update.');
  process.exit(2);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

if (total > baseline.total) {
  const top = perFile.slice(0, 10).map(({ file, count }) => `  ${String(count).padStart(3)}  ${file}`).join('\n');
  console.error(
    `\n❌ guard_as_any_ratchet: приведений \`as any\` стало БОЛЬШЕ — ${total} против ${baseline.total} в baseline.\n\n` +
    'Каждое `as any` выключает проверку типов. Один такой в RevenueCat уже стоил\n' +
    'непроверенного денежного пути (премиум/план/expiry) — см. коммит d6a3390a6.\n\n' +
    'Что делать: убери `as any` из своей правки.\n' +
    '  • внешние данные → `unknown` + явное сужение (typeof / Array.isArray / ?.)\n' +
    '  • свой же объект → опиши настоящий тип\n' +
    '  • тип «стёрли» выше по цепочке → почини ИСТОЧНИК, а не место использования\n\n' +
    `Больше всего долга сейчас:\n${top}\n\n` +
    'Поднимать baseline нельзя — храповик крутится только вниз.\n',
  );
  process.exit(1);
}

if (total < baseline.total) {
  console.log(
    `guard_as_any_ratchet: 👍 стало меньше — ${total} против ${baseline.total}. ` +
    'Зафиксируй: node scripts/guard_as_any_ratchet.mjs --update',
  );
}

process.exit(0);
