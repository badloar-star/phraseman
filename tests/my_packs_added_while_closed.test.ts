// зачем (Ревизор R44, координатор 15.10): подписка на добавление набора и кэш «набора нет» живут на уровне модуля. Сценарий: открыл «Мои» (набор помечен как «нет») → ушёл → добавил набор из видео →
// вернулся (< 30 мин): кэш уже сброшен, id нового набора ждёт экран.
import fs from 'node:fs';
import path from 'node:path';
import {
  clearPendingAddedPackId,
  handlePackAdded,
  missingPackCache,
  peekPendingAddedPackId,
  subscribeAddedPack,
} from '../app/flashcards/my_packs_missing_cache';

describe('добавили набор, пока «Мои наборы» закрыты', () => {
  beforeEach(() => { missingPackCache.clear(); clearPendingAddedPackId(); });

  it('кэш «набора нет» сброшен событием, хотя экран не подписан; id ждёт экран', () => {
    const key = 'en:video-pack-1';
    missingPackCache.markMissing(key, Date.now());
    expect(missingPackCache.isMissing(key, Date.now() + 1000)).toBe(true); // < 30 мин — набор считался бы отсутствующим
    handlePackAdded('video-pack-1'); // то, что вызывает событие community_pack_added; подписчиков-экранов нет
    expect(missingPackCache.isMissing(key, Date.now() + 1000)).toBe(false);
    expect(peekPendingAddedPackId()).toBe('video-pack-1');
  });

  it('открытый экран получает событие сразу; после отписки — нет, но кэш всё равно сбрасывается', () => {
    const seen: string[] = [];
    const off = subscribeAddedPack((id) => seen.push(id));
    handlePackAdded('a');
    off();
    missingPackCache.markMissing('en:b', Date.now());
    handlePackAdded('b');
    expect(seen).toEqual(['a']);
    expect(missingPackCache.isMissing('en:b', Date.now() + 1000)).toBe(false);
    expect(peekPendingAddedPackId()).toBe('b');
  });

  it('экран забрал id — ожидание очищено', () => {
    handlePackAdded('c');
    clearPendingAddedPackId();
    expect(peekPendingAddedPackId()).toBeNull();
  });
});

describe('подписка регистрируется при загрузке модуля', () => {
  it('onAppEvent(community_pack_added) стоит на верхнем уровне модуля, а не внутри компонента', () => {
    const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');
    const src = read('app/flashcards/my_packs_missing_cache.ts');
    expect(src).toContain("\nonAppEvent('community_pack_added', ({ packId }) => { handlePackAdded(packId); });");
    const screen = read('app/flashcards_my_packs.tsx');
    expect(screen).not.toContain("onAppEvent('community_pack_added'");
    expect(screen).toContain('peekPendingAddedPackId()');
  });
});
