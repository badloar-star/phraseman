// Бета-тест 15.10, Б19 (координатор): без сети удаление набора А не должно крутить кнопку и выключать «Отмена» у набора Б,
// а ошибка сети показывает «Нет интернета. Набор на месте», а не общее «не удалось».
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, '..', 'app', 'flashcards_my_packs.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Мои наборы: «идёт удаление» у каждого набора своё (Б19)', () => {
  it('занятость — множество id, окно занято только для набора, который удаляется сейчас', () => {
    expect(source).toMatch(/useState<ReadonlySet<string>>\(\(\) => new Set\(\)\)/);
    expect(source).toMatch(/const deletePackBusy = !!deletePackTarget && deletingPackIds\.has\(deletePackTarget\.id\);/);
    expect(source).not.toMatch(/useState\(false\);\s*\n[^\n]*deletePackBusy/);
    expect(source).not.toMatch(/setDeletePackBusy\((?:true|false)\)/);
  });

  it('флаг ставится и снимается по id набора — в finally, то есть и при ошибке сети', () => {
    expect(source).toMatch(/setDeletePackBusy\(pack\.id, true\)/);
    const finallyBlock = source.slice(source.indexOf('} finally {', source.indexOf('setDeletePackBusy(pack.id, true)')));
    expect(finallyBlock.slice(0, 200)).toMatch(/setDeletePackBusy\(pack\.id, false\)/);
  });

  it('модель занятости: удаление набора А не занимает окно набора Б', () => {
    // та же формула, что в экране: занято, только если открытый набор сейчас удаляется
    const busyFor = (target: { id: string } | null, deleting: ReadonlySet<string>) => !!target && deleting.has(target.id);
    const deleting = new Set(['pack-A']);
    expect(busyFor({ id: 'pack-A' }, deleting)).toBe(true);
    expect(busyFor({ id: 'pack-B' }, deleting)).toBe(false);
    expect(busyFor(null, deleting)).toBe(false);
  });

  it('ошибка сети — «Нет интернета. Набор на месте.», откат набора на место сохранён', () => {
    expect(source).toMatch(/Нет интернета\. Набор на месте\./);
    expect(source).toMatch(/unavailable\|deadline-exceeded\|network/);
    expect(source).toMatch(/list\.splice\(Math\.min\(at\.index, list\.length\), 0, pack\)/);
  });
});
