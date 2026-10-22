// ЗАМОК ВЛАДЕЛЬЦА 22.10: «давай так, чтобы правки, что я сделаю, потом никто не перезаписал».
// зачем (координатор → 11 · РЕВИЗОР 22.10): мета-сторож реестра docs/work/OWNER_LOCKS.md. Каждая строка таблицы обязана
// указывать на живой тест-сторож; сторож несёт пометку «ЗАМОК ВЛАДЕЛЬЦА», его нельзя пропустить (.skip / xit / todo / only),
// убрать из прогона jest (testPathIgnorePatterns) или тихо вычеркнуть из реестра. Ослабить замок может только новое слово
// владельца — тогда правится и этот файл (KNOWN_GUARDS), и это видно в ревью.
// Запуск: node --test tests/owner_locks_registry.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'docs/work/OWNER_LOCKS.md');
const MARK = 'ЗАМОК ВЛАДЕЛЬЦА';
// «ставит …» и сторож без пометки допустимы только до конца 22.10 по Киеву (UTC+3) — потом красный.
const GRACE_UNTIL_MS = Date.parse('2026-10-23T00:00:00+03:00');
// зачем: сторожем бывает и гейт `tests/<имя>_gate.ts` (гоняется через tsx) — он тоже файл-сторож
const TEST_EXT = ['.test.ts', '.test.tsx', '.test.cjs', '.test.mjs', '.test.js', '.probe.ts', '_gate.ts'];
const SEARCH_DIRS = ['tests', 'functions/src'];

// Храповик: сторожа, уже попавшие в реестр. Удалить строку из реестра можно только вместе со строкой здесь — это видно в ревью.
// Новый замок → строка в реестре + путь сюда в том же коммите.
const KNOWN_GUARDS = [
  'tests/v2_tab_bar_liquid_glass_theme.test.cjs',
  'tests/owner_locks_spire_summit_2026_10_22.test.ts',
  'tests/owner_locks_spire_2026_10_22.test.ts',
  'tests/season_wire_contract.test.ts',
  'tests/screen_back_button_contract.test.ts',
  'tests/section_sheet_header_close_left.test.ts',
  'tests/screen_back_content_below_contract.test.ts', // 5 · ВХОД 22.10: контент ниже кнопки «назад/✕», не лежит под ней
  'tests/learning_v2_not_from_start_once_v1.test.ts',
  // Learning V2 22.10: правила входного теста №10 и «пропущенное — ПРОСТО ОТКРЫТО» (прогресс v2: открыто ≠ пройдено, ничего не теряется)
  'tests/learning_v2_placement_test_v1.test.ts',
  'tests/learning_v2_course_progress_v2.test.ts',
  'tests/v2_screens_color_literals_ratchet.test.mjs',
  'tests/theme_semantic_follows_current_theme.test.ts',
  // 8 · МОМЕНТЫ 22.10: искры без сдвига тона, палитры визиток, металл рангов, «по заходам»
  'tests/moment_firework_theme_shades.test.ts',
  'tests/owner_locks_profile_card_metal.test.mjs',
  'tests/home_away_by_visits_owner_lock.test.ts',
  'tests/theme_switch_clears_dev_override.test.tsx',
  // 2 · ДИЗАЙН 22.10: хаб урока (Сезон) — «Старый курс», замки справа, пустые звёзды, без кикера, закрытый эпизод без модала, компактный заголовок, без книжки словаря
  'tests/season_nav_tiles_fit_contract.test.ts',
  'tests/season_hero_title_fit_contract.test.ts',
  'tests/season_owner_locks_2026_10_22.test.ts',
  'tests/learning_v2_dictionary_visibility_contract.test.ts',
  'tests/learning_v2_map_dictionary_integration_v1_gate.ts',
  // 1 · ЯДРО 22.10: «сервер для сохранения, а не решений» и «История остаётся, имя скрыто»
  'functions/src/owner_lock_server_stores_friends.test.ts',
  'functions/src/account_delete_friend_duels.test.ts',
  // 2 · ДИЗАЙН 22.10: хаб Диалогов v4 и словарь курса внутри «Слова»
  'tests/owner_locks_dialogs_hub_2026_10_22.test.ts',
];

// Любой способ выключить тест по тексту файла: jest (skip/x*/todo/only) и node:test ({ skip }, { todo }, t.skip()).
const DISABLE_RE = /\b(?:it|test|describe)\.(?:skip|todo|only)\s*\(|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(|\{\s*(?:skip|todo|only)\s*:\s*(?!false\b)|\bt\.(?:skip|todo)\s*\(/;

function readRows() {
  const lines = fs.readFileSync(REGISTRY, 'utf8').split(/\r?\n/);
  const header = lines.findIndex((l) => /^\|\s*Дата\s*\|/.test(l));
  assert.ok(header >= 0, 'в OWNER_LOCKS.md нет таблицы «| Дата | … | Сторож | Кто |»');
  const cols = lines[header].split('|').slice(1, -1).map((c) => c.trim());
  const guardCol = cols.indexOf('Сторож');
  assert.ok(guardCol >= 0, 'в таблице замков нет колонки «Сторож»');
  const rows = [];
  for (let i = header + 2; i < lines.length && lines[i].startsWith('|'); i += 1) {
    const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    rows.push({ line: i + 1, what: cells[2] ?? '', guard: cells[guardCol] ?? '' });
  }
  return rows;
}

/** Имена тестов из ячейки «Сторож»: путь `tests/…` или голое имя `season_wire_contract`; пояснения в скобках, `кавычках` и после « — » не в счёт. */
function guardNames(cell) {
  const bare = cell.replace(/\([^)]*\)/g, ' ').replace(/`[^`]*`/g, ' ').split(/\s[—–]\s/)[0];
  return bare.split(/[,+]/)
    .map((piece) => (/[A-Za-z0-9_./-]*[_/][A-Za-z0-9_./-]*/.exec(piece.trim()) || [null])[0])
    .filter((name) => name && /[a-z]/.test(name));
}

function resolveGuard(name) {
  if (fs.existsSync(path.join(ROOT, name)) && TEST_EXT.some((ext) => name.endsWith(ext))) return name;
  const base = path.basename(name).replace(/\.(test|probe)\.[cm]?[jt]sx?$/, '').replace(/_gate(\.ts)?$/, '');
  for (const dir of SEARCH_DIRS) {
    for (const ext of TEST_EXT) {
      const rel = `${dir}/${base}${ext}`;
      if (fs.existsSync(path.join(ROOT, rel))) return rel;
    }
  }
  return null;
}

function jestIgnores() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return (pkg.jest?.testPathIgnorePatterns ?? []).map((p) => p.replace('<rootDir>/', ''));
}

const rows = readRows();
const graceOver = Date.now() >= GRACE_UNTIL_MS;
const resolved = new Map(); // rel path → строка реестра

test('owner locks: every registry row names an existing guard test', () => {
  assert.ok(rows.length >= KNOWN_GUARDS.length, `в реестре ${rows.length} строк — меньше, чем сторожей в храповике`);
  const problems = [];
  for (const row of rows) {
    // \b в JS не видит границу у кириллицы — граница пробелом/концом строки
    if (/^ставит(?:\s|$)/i.test(row.guard)) {
      if (graceOver) problems.push(`строка ${row.line} «${row.what}»: сторож так и не поставлен («${row.guard}»)`);
      else console.warn(`[OWNER-LOCKS] pending row=${row.line} guard="${row.guard}" until=2026-10-22 end`);
      continue;
    }
    const names = guardNames(row.guard);
    if (names.length === 0) problems.push(`строка ${row.line} «${row.what}»: в колонке «Сторож» нет имени теста («${row.guard}»)`);
    for (const name of names) {
      const rel = resolveGuard(name);
      if (rel) resolved.set(rel, row);
      else problems.push(`строка ${row.line}: сторож «${name}» не найден в ${SEARCH_DIRS.join(', ')}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('owner locks: a registered guard cannot be dropped from the registry', () => {
  const missing = KNOWN_GUARDS.filter((rel) => !resolved.has(rel));
  assert.deepEqual(missing, [], 'сторож исчез из OWNER_LOCKS.md — снять замок может только слово владельца (и правка KNOWN_GUARDS)');
});

test('owner locks: every guard carries the owner-lock mark', () => {
  const unmarked = [...resolved.keys()].filter((rel) => !fs.readFileSync(path.join(ROOT, rel), 'utf8').includes(MARK));
  if (!graceOver) {
    if (unmarked.length) console.warn(`[OWNER-LOCKS] unmarked=${JSON.stringify(unmarked)} — до конца 22.10 предупреждение, потом красный`);
    return;
  }
  assert.deepEqual(unmarked, [], `в стороже нет пометки «${MARK}»`);
});

test('owner locks: guards are not skipped, todo, only or ignored by jest', () => {
  const ignores = jestIgnores();
  const problems = [];
  for (const rel of resolved.keys()) {
    const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const hit = DISABLE_RE.exec(source);
    if (hit) problems.push(`${rel}: выключено «${hit[0].trim()}»`);
    const ignoredBy = ignores.find((pattern) => rel.startsWith(pattern) || rel === pattern);
    if (ignoredBy) problems.push(`${rel}: убран из jest через testPathIgnorePatterns («${ignoredBy}»)`);
  }
  assert.deepEqual(problems, []);
});
