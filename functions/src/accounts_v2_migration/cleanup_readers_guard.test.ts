import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { MIGRATION_INVENTORY, type InventoryRule } from './inventory';

/*
 * Account V2, Пакет 5 — сторож «чистка не удаляет то, что читает живой код»
 * (ремонт №2 после повторного ревью, P2).
 *
 * зачем: «отброшено по решению» (drop) значит «не переносить», а не «можно
 * стереть». Поле, которое ещё читает действующий код (вход, слияние, друзья,
 * лидерборд, главная, экономика…), удалять нельзя — сломается живая функция.
 * Поэтому: каждое правило, чьи ключи legacyCleanupPaths МОЖЕТ вернуть (нет
 * пометки retention), проверяется поиском по живому коду. Нашёлся читатель —
 * тест красный, пока правилу не поставлена пометка удержания.
 * Файлы читаются один раз; индекс — множество идентификаторов и строковых литералов.
 */

const REPO = join(__dirname, '..', '..', '..');
const LIVE_ROOTS = ['app', 'components', 'hooks', 'modules', join('functions', 'src')];
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_FILE = /\.(test|spec|probe)\.[a-z]+$/;
const SKIP_DIR = new Set(['node_modules', 'accounts_v2_migration', '__tests__', 'lib', '.expo']);

type ReaderIndex = Readonly<{ tokens: ReadonlyMap<string, string>; literals: ReadonlyMap<string, string> }>;

function listCode(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIR.has(entry.name)) listCode(join(dir, entry.name), out);
    } else if (CODE_FILE.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
}

function buildIndex(): ReaderIndex {
  const files: string[] = [];
  for (const root of LIVE_ROOTS) listCode(join(REPO, root), files);
  const tokens = new Map<string, string>();
  const literals = new Map<string, string>();
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const where = relative(REPO, file);
    for (const match of text.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) if (!tokens.has(match[0])) tokens.set(match[0], where);
    // Шаблонные ключи (`lesson${n}_words_shards_granted`) нормализуются: `${…}` → 1.
    for (const match of text.matchAll(/[`'"]([^`'"\n]{1,160})[`'"]/g)) {
      const literal = match[1].replace(/\$\{[^}]*\}/g, '1');
      if (!literals.has(literal)) literals.set(literal, where);
    }
  }
  return { tokens, literals };
}

/** Где живой код упоминает ключ правила; пустой список — читателей нет. */
function readersOf(rule: InventoryRule, index: ReaderIndex): string[] {
  const hits: string[] = [];
  for (const key of rule.match.exact ?? []) {
    const file = index.tokens.get(key) ?? index.literals.get(key);
    if (file !== undefined) hits.push(`${key} ← ${file}`);
  }
  const pattern = rule.match.pattern;
  if (pattern !== undefined) {
    for (const source of [index.tokens, index.literals]) {
      for (const [text, file] of source) {
        if (pattern.test(text)) {
          hits.push(`${pattern.source} ~ ${text} ← ${file}`);
          break;
        }
      }
    }
  }
  return hits;
}

describe('accounts_v2_migration — сторож живых читателей перед чисткой легаси', () => {
  let index: ReaderIndex;
  beforeAll(() => {
    index = buildIndex();
  });

  it('индекс живого кода непустой (сторож не проверяет пустоту)', () => {
    expect(index.tokens.size).toBeGreaterThan(10_000);
    expect(index.tokens.has('firebaseAuthUid')).toBe(true);
  });

  const cleanable = MIGRATION_INVENTORY.filter((rule) => ['carry', 'derive', 'drop'].includes(rule.disposition)
    && rule.retention === undefined);

  it('ни одно правило, которое может попасть в чистку, не читается живым кодом', () => {
    const readers = Object.fromEntries(cleanable.map((rule) => [rule.id, readersOf(rule, index)])
      .filter(([, hits]) => hits.length > 0));
    expect(readers).toEqual({});
  });

  it('все drop-правила сейчас удерживаются: чистить нечего, пока их читает 2.0', () => {
    expect(cleanable.map((rule) => rule.id)).toEqual([]);
  });

  it('служебные поля входа (OD11 = «не переносить», не «удалить») помечены удержанием', () => {
    const login = MIGRATION_INVENTORY.find((rule) => rule.id === 'r.login_service');
    expect(login?.disposition).toBe('drop');
    expect(login?.retention).toBe('dropped_but_read');
  });

  it('каждая пометка dropped_but_read обоснована: у правила действительно есть читатель', () => {
    for (const rule of MIGRATION_INVENTORY.filter((item) => item.retention === 'dropped_but_read')) {
      expect([rule.id, readersOf(rule, index).length > 0]).toEqual([rule.id, true]);
    }
  });
});
