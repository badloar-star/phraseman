/**
 * PM-111/112/113: правила и индекс избранного видео. Эмулятор правил здесь не
 * поднимается, поэтому сторожим текст правил: сломался тест — возвращать
 * ограничение, а не ослаблять проверку.
 */
import fs from 'fs';
import path from 'path';

const read = (...p: string[]): string => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

function block(source: string, header: string): string {
  const start = source.indexOf(header);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('\n    }', start);
  return source.slice(start, end);
}

describe('правила избранного видео', () => {
  const rules = read('firestore.rules');

  it('связь пишет и читает только владелец, форма документа зафиксирована', () => {
    const rel = block(rules, 'match /users/{userId}/video_favorites/{videoId} {');
    expect(rel).toContain('allow read, delete: if personalEconomyOwnerMatchesAuth(userId);');
    expect(rel).toContain("request.resource.data.keys().hasOnly(['videoId', 'savedAtMs'])");
    expect(rel).toContain('request.resource.data.videoId == videoId');
    expect(rel).toContain('personalEconomyAccountActive(userId)');
    expect(rel).not.toMatch(/allow (read|write)[^;]*if true/);
  });

  it('агрегат клиент только читает — назначить число нельзя', () => {
    const agg = block(rules, 'match /video_save_counts/{docId} {');
    expect(agg).toContain('allow read: if request.auth != null;');
    expect(agg).toContain('allow create, update, delete: if false;');
  });

  it('count() по collection group обеспечен индексом', () => {
    const indexes = JSON.parse(read('firestore.indexes.json')) as {
      fieldOverrides: Array<{ collectionGroup: string; fieldPath: string; indexes: Array<{ queryScope: string }> }>;
    };
    const entry = indexes.fieldOverrides.find((item) => item.collectionGroup === 'video_favorites' && item.fieldPath === 'videoId');
    expect(entry?.indexes.map((i) => i.queryScope)).toContain('COLLECTION_GROUP');
  });

  it('пересчёт агрегата экспортирован и считает состояние через count(), а не события', () => {
    expect(read('functions', 'src', 'index.ts')).toContain('export { refreshVideoSaveCounts } from "./video_save_counts";');
    const server = read('functions', 'src', 'video_save_counts.ts');
    expect(server).toContain(".where('videoId', '==', videoId).count().get()");
    expect(server).not.toContain('FieldValue.increment');
  });

  it('клиент не держит realtime-слушателей на счётчик и избранное', () => {
    for (const file of ['video_favorites.ts', 'video_save_counts.ts']) {
      expect(read('app', file)).not.toContain('onSnapshot');
    }
  });
});
