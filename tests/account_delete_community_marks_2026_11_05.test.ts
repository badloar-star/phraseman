// Удаление аккаунта чистит отметки пользователя под ЧУЖИМИ наборами Сообщества (Privacy-аудит 05.11): лайки, добавления, комментарии, голоса конкурса.
// Свои наборы уходят целиком через recursiveDelete; здесь — подколлекции чужих наборов по collection group + индексы COLLECTION_GROUP (иначе FAILED_PRECONDITION).
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

const MARKS: ReadonlyArray<readonly [string, string]> = [
  ['pack_likes', 'userId'],
  ['pack_adds', 'userId'],
  ['pack_comments', 'authorId'],
  ['contest_votes', 'userId'],
];

describe('удаление аккаунта: отметки Сообщества под чужими наборами', () => {
  const source = read('functions/src/account_delete.ts');
  const start = source.indexOf('const COLLECTION_GROUP_QUERY_SPECS');
  const block = source.slice(start, source.indexOf('];', start));
  const indexes = JSON.parse(read('firestore.indexes.json')) as { fieldOverrides?: Array<{ collectionGroup?: string; fieldPath?: string; indexes?: Array<Record<string, string>> }> };

  it.each(MARKS)('%s.%s в списке collection group запросов по stable uid', (group, field) => {
    expect(block).toContain(`{ collectionGroup: '${group}', field: '${field}', values: 'stable' }`);
  });

  it.each(MARKS)('%s.%s: индекс COLLECTION_GROUP и сохранённые индексы коллекции', (group, field) => {
    const override = indexes.fieldOverrides?.find((o) => o.collectionGroup === group && o.fieldPath === field);
    expect(override).toBeDefined();
    expect(override?.indexes).toEqual(expect.arrayContaining([
      { order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' },
      { order: 'ASCENDING', queryScope: 'COLLECTION' },
      { order: 'DESCENDING', queryScope: 'COLLECTION' },
      { arrayConfig: 'CONTAINS', queryScope: 'COLLECTION' },
    ]));
  });

  it('свои наборы по-прежнему удаляются целиком с подколлекциями', () => {
    expect(source).toContain("{ collection: 'community_packs', field: 'authorStableId', values: 'stable' }");
    expect(source).toContain('await ctx.db.recursiveDelete(ref, ctx.writer);');
  });
});
