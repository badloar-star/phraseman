// зачем (аудит §AUTH-0110, координатор 15.10): смена изучаемого языка без перезапуска сбрасывает списки карточек и каталог старой цели; лог [CARDS-TARGET].
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '..', 'app', 'flashcards', 'useCollectionData.ts'), 'utf8').replace(/\r\n/g, '\n');

describe('useCollectionData: смена цели обучения', () => {
  const at = src.indexOf('const prevTargetRef');
  const body = src.slice(at, src.indexOf('}, [studyTarget]);', at));
  it('эффект по studyTarget пропускает первое монтирование и сбрасывает все списки цели', () => {
    expect(at).toBeGreaterThan(0);
    expect(body).toMatch(/if \(before === now\) return;/);
    for (const s of ['setSavedCards([])', 'setCustomCards([])', 'setMarketCards([])', 'setMarketPackCatalog(marketCatalogSeed)', 'setOwnedPackIdList([])', 'setCommunityOwnedIdList([])', 'setCollectionDataReady(false)']) {
      expect(body).toContain(s);
    }
  });
  it('лог [CARDS-TARGET] пишет было/стало и что сброшено; идентичность аккаунта не трогается', () => {
    expect(body).toContain('[CARDS-TARGET] useCollectionData: цель');
    expect(body).toMatch(/from: before, to: now/);
    expect(body).not.toContain('setAccessStableId');
  });
  it('эффект объявлен после состояний и до loadAll', () => {
    expect(at).toBeGreaterThan(src.indexOf('const [loadError, setLoadError]'));
    expect(at).toBeLessThan(src.indexOf('const loadAll = useCallback'));
  });
});
