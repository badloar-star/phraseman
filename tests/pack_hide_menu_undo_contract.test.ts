// зачем (решение владельца 13.10, Apple 1.2): «⋮» на экране набора — меню «Пожаловаться на набор» / «Скрыть набор»; «Скрыть» работает мгновенно
// (набор пропадает сразу), тост «Набор скрыт» несёт «Отменить», журнал [PACK-HIDE]; каталог узнаёт о скрытии событием.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const collection = read('app/flashcards_collection.tsx');
const menu = read('components/PackMoreMenu.tsx');
const hide = read('app/community_packs/packHideWithUndo.ts');
const storage = read('app/community_packs/communityPackHiddenStorage.ts');
const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
const events = read('app/events.ts');

describe('«Скрыть набор»: меню ⋮ и отмена', () => {
  it('«⋮» набора открывает меню, а не жалобу сразу; два пункта', () => {
    expect(collection).not.toContain('onMore={() => setPackReportOpen(true)}');
    expect(collection).not.toContain('? () => setPackReportOpen(true) : null');
    expect(collection).toContain('setPackMoreOpen(true)');
    expect(collection).toContain('onReport={() => { setPackMoreOpen(false); setPackReportOpen(true); }}');
    expect(menu).toContain('testID="pack-more-menu"');
    expect(menu).toContain("'pack-more-report'");
    expect(menu).toContain("'pack-more-hide'");
    expect(menu).toContain("ru: 'Скрыть набор'");
    expect(menu).not.toMatch(/borderWidth|borderColor/);
  });

  it('скрытие мгновенное: событие и уход с экрана ДО записи, запись фоном, повтор события после записи', () => {
    const optimistic = hide.indexOf("emitAppEvent('community_pack_hidden_changed', { packId, hidden: true });");
    const instant = hide.indexOf('onHiddenOptimistic();');
    const write = hide.indexOf('await hideCommunityPackOnDevice(packId, studyTarget);');
    expect(optimistic).toBeGreaterThan(-1);
    expect(instant).toBeGreaterThan(optimistic);
    expect(write).toBeGreaterThan(instant);
    expect(hide.match(/community_pack_hidden_changed', \{ packId, hidden: true \}/g)!.length).toBeGreaterThanOrEqual(2);
    expect(hide).toContain('if (inFlight.has(packId))'); // защита от двойного тапа
  });

  it('тост «Набор скрыт» с «Отменить»; отмена возвращает набор; сбой записи — возврат и тост ошибки', () => {
    expect(hide).toContain("ru: 'Набор скрыт'");
    expect(hide).toContain("labelRu: 'Отменить'");
    expect(hide).toContain('unhideCommunityPackOnDevice(packId, studyTarget)');
    expect(hide).toContain("emitAppEvent('community_pack_hidden_changed', { packId, hidden: false });");
    expect(hide).toContain("emitAppEvent('action_toast', packHideFailureToast());");
    expect(hide).toContain("const LOG = '[PACK-HIDE]'");
    expect(hide).not.toMatch(/catch\s*\{\s*\}/);
  });

  it('хранилище умеет снять скрытие, каталог слушает событие и снимает слушателя', () => {
    expect(storage).toContain('export async function unhideCommunityPackOnDevice(');
    expect(events).toContain('community_pack_hidden_changed: { packId: string; hidden: boolean };');
    expect(hub).toContain("onAppEvent('community_pack_hidden_changed'");
    expect(hub).toContain('return () => sub.remove();');
  });
});
