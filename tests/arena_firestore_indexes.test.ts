import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Запрос без индекса не «работает медленнее» — он отвечает ошибкой.
 *
 * Firestore отказывает сразу и целиком, и увидеть это можно только на живом
 * проекте: эмулятор индексы не требует, типы про них не знают, сборка молчит.
 * Для Арены цена такой ошибки максимальная — очередь подбора и выдача заданий
 * матча идут ровно через такие запросы. Игрок при этом видит не «нет
 * индекса», а «Арена не работает».
 *
 * Список нужных индексов НЕ хранится руками: он вычитывается из самих
 * запросов. Требование ставится только там, где индекс обязателен точно —
 * когда рядом с фильтром стоит сортировка. Запросы на одних равенствах
 * Firestore умеет собирать из одиночных индексов, и требовать их значило бы
 * поднимать ложную тревогу, а она хуже молчания: по ней чинят то, что
 * работает.
 */
type Query = Readonly<{ file: string; collection: string; fields: readonly string[] }>;

function collectionNames(): ReadonlyMap<string, string> {
  const source = read('functions/src/arena_v2_core.ts');
  const block = /ARENA_V2_COLLECTIONS[^{]*\{([\s\S]*?)\n\}/.exec(source)?.[1] ?? '';
  const map = new Map<string, string>();
  for (const match of block.matchAll(/([A-Za-z0-9_]+):\s*'([^']+)'/g)) {
    map.set(match[1] as string, match[2] as string);
  }
  return map;
}

function queriesWithOrder(rel: string, names: ReadonlyMap<string, string>): readonly Query[] {
  const source = read(rel);
  const out: Query[] = [];
  for (const match of source.matchAll(/db\s*\n?\s*\.collection\(/g)) {
    const chunk = source.slice(match.index ?? 0, (match.index ?? 0) + 600);
    const stop = Math.min(...[chunk.indexOf('.get('), chunk.indexOf(';'), chunk.length].filter((n) => n >= 0));
    const chain = chunk.slice(0, stop);
    if (!chain.includes('.orderBy(')) continue;

    // Имя коллекции — из последнего .collection() в цепочке до фильтров.
    const collections = [...chain.matchAll(/\.collection\(\s*(?:ARENA_V2_COLLECTIONS\.([A-Za-z0-9_]+)|'([^']+)')\s*\)/g)];
    const last = collections[collections.length - 1];
    if (!last) continue;
    const collection = last[1] ? names.get(last[1]) : last[2];
    if (!collection) continue;

    const fields = new Set<string>();
    for (const where of chain.matchAll(/\.where\(\s*'([^']+)'/g)) fields.add(where[1] as string);
    for (const order of chain.matchAll(/\.orderBy\(\s*'([^']+)'/g)) fields.add(order[1] as string);
    if (/\.orderBy\(\s*admin\.firestore\.FieldPath\.documentId\(\)\s*\)/.test(chain)) fields.add('__name__');
    if (fields.size < 2) continue;
    out.push({ file: rel, collection, fields: [...fields] });
  }
  return out;
}

function declaredIndexes(): ReadonlyMap<string, readonly (readonly string[])[]> {
  const raw = JSON.parse(read('firestore.indexes.json')) as {
    indexes?: readonly { collectionGroup?: string; fields?: readonly { fieldPath?: string }[] }[];
  };
  const map = new Map<string, (readonly string[])[]>();
  for (const index of raw.indexes ?? []) {
    const group = index.collectionGroup;
    if (!group) continue;
    const fields = (index.fields ?? []).map((field) => String(field.fieldPath));
    map.set(group, [...(map.get(group) ?? []), fields]);
  }
  return map;
}

describe('Arena Firestore indexes', () => {
  const names = collectionNames();
  const queries = [
    ...queriesWithOrder('functions/src/arena_v2.ts', names),
    ...queriesWithOrder('functions/src/arena_expansion.ts', names),
  ];

  test('разбор исходников не пустой', () => {
    // Если разбор сломается, проверка ниже станет пустой и зелёной.
    expect(names.get('queue')).toBe('arena_v2_queue');
    expect(names.get('taskSource')).toBe('tournamentTasks');
    expect(queries.length).toBeGreaterThan(2);
  });

  test('у каждого запроса с сортировкой есть индекс', () => {
    const declared = declaredIndexes();
    const missing = queries.filter((query) => {
      const candidates = declared.get(query.collection) ?? [];
      return !candidates.some((fields) => query.fields.every((field) => fields.includes(field)));
    }).map((query) => `${query.collection} [${query.fields.join(', ')}] — ${query.file}`);
    expect(missing).toEqual([]);
  });

  test('очередь подбора и выдача заданий покрыты поимённо', () => {
    // Два запроса, без которых Арена не работает вообще: по первому игрок
    // находит соперника, по второму матч получает задания.
    const declared = declaredIndexes();
    const queue = declared.get('arena_v2_queue') ?? [];
    expect(queue.some((fields) => ['mode', 'status', 'joinedAtMs'].every((f) => fields.includes(f)))).toBe(true);
    const tasks = declared.get('tournamentTasks') ?? [];
    expect(tasks.some((fields) => ['poolVersion', 'mode', 'difficulty', '__name__'].every((f) => fields.includes(f)))).toBe(true);
  });
});
