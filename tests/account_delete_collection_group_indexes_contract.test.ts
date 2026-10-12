import fs from 'fs';
import path from 'path';

// зачем (координатор 12.10, реальное удаление гостя на эмуляторе по слову владельца):
// сервер удаления упал на stage=collection_group_matches — FAILED_PRECONDITION, нет
// индекса группы коллекций idea_likes_sent.targetAuthorUid. Запросы
// COLLECTION_GROUP_QUERY_SPECS добавили 14.09, а ручной список в
// account_delete_flow_contract про них не знал — облачное удаление молча обрывалось
// у всех после 42 документов. Этот тест берёт список прямо из functions/src/account_delete.ts,
// поэтому новый запрос без индекса больше не пройдёт незамеченным.

const root = path.resolve(__dirname, '..');
const normalizeEol = (text: string) => text.replace(/\r\n/g, '\n');

type IndexEntry = { order?: string; arrayConfig?: string; queryScope?: string };
type FieldOverride = { collectionGroup?: string; fieldPath?: string; indexes?: IndexEntry[] };

const functionSource = normalizeEol(
  fs.readFileSync(path.join(root, 'functions', 'src', 'account_delete.ts'), 'utf8'),
);
const firestoreIndexes = JSON.parse(
  normalizeEol(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')),
) as { fieldOverrides?: FieldOverride[] };

function collectionGroupQuerySpecs(): Array<[string, string]> {
  const start = functionSource.indexOf('const COLLECTION_GROUP_QUERY_SPECS');
  const end = functionSource.indexOf('];', start);
  expect(start).toBeGreaterThan(-1);
  const block = functionSource.slice(start, end);
  return [...block.matchAll(/\{ collectionGroup: '([^']+)', field: '([^']+)'/g)].map(
    (match) => [match[1], match[2]] as [string, string],
  );
}

describe('account delete: every collection-group query has a deployed-config index', () => {
  const specs = collectionGroupQuerySpecs();

  it('reads the spec list from the server source', () => {
    expect(specs.length).toBeGreaterThanOrEqual(20);
    expect(specs).toContainEqual(['idea_likes_sent', 'targetAuthorUid']);
  });

  it.each(specs)('%s.%s has a COLLECTION_GROUP ascending override', (collectionGroup, fieldPath) => {
    const override = firestoreIndexes.fieldOverrides?.find(
      (candidate) => candidate.collectionGroup === collectionGroup && candidate.fieldPath === fieldPath,
    );
    expect(override).toBeDefined();
    expect(override?.indexes).toContainEqual({ order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' });
  });

  // Override заменяет автоматические индексы поля целиком: для новых записей сохраняем
  // индексы уровня коллекции, чтобы прямые запросы where(field) не упали (урок notifications.createdAt).
  it.each([
    ['idea_likes_sent', 'targetAuthorUid'],
    ['user_ideas', 'uid'],
    ['idea_reports', 'reporterUid'],
    ['idea_reports', 'authorUid'],
    ['user_idea_report_rate_limits', 'stableUid'],
  ])('%s.%s keeps collection-scope indexes', (collectionGroup, fieldPath) => {
    const override = firestoreIndexes.fieldOverrides?.find(
      (candidate) => candidate.collectionGroup === collectionGroup && candidate.fieldPath === fieldPath,
    );
    expect(override?.indexes).toEqual(
      expect.arrayContaining([
        { order: 'ASCENDING', queryScope: 'COLLECTION' },
        { order: 'DESCENDING', queryScope: 'COLLECTION' },
        { arrayConfig: 'CONTAINS', queryScope: 'COLLECTION' },
      ]),
    );
  });
});
