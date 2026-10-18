import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

// зачем (01.10, удаление Главной V1): сторож раньше резал V1-хедер по маркерам
// «{/* ХЕДЕР:» и «home-header-secondary-actions» — их больше нет в коде. Намерение
// прежнее: состав кнопок шапки не расползается, валюты в шапку не возвращаются.
// Теперь срез — открывающий тег <HomeV2Header … до первого stats={[ (слоты колокольчика и аватара).
describe('home header composition (Главная V2)', () => {
  it('keeps the header inbox retired and its button set intact', () => {
    expect(source).not.toContain("import AppMessagesInbox from '../../components/AppMessagesInbox'");
    expect(source).not.toContain('<AppMessagesInbox />');

    const headerStart = source.indexOf('<HomeV2Header');
    expect(headerStart).toBeGreaterThanOrEqual(0);
    const headerEnd = source.indexOf('stats={[', headerStart);
    expect(headerEnd).toBeGreaterThan(headerStart);
    const header = source.slice(headerStart, headerEnd);

    // колокольчик остаётся (PM-038 отменён) и получает обработчики ответа на жалобу.
    expect(header).not.toContain('CommunityChatHubButton');
    expect(header).toContain('<NotificationCenterButton');
    // перепин 18.10 ([HOME-CHILD-COST], координатор): активность вкладки и счётчик фокусов колокольчик получает через HomeBellStateContext (провайдер вокруг шапки), а не пропсами в bellSlot — иначе шапка перерисовывалась на каждом возврате. Смысл тот же: Главная отдаёт колокольчику homeRuntimeActive и focusTick.
    expect(source.slice(Math.max(0, headerStart - 120), headerStart)).toContain('HomeBellStateContext.Provider value={homeBellState}');
    expect(source).toContain('const homeBellState = useMemo(() => ({ active: homeRuntimeActive, focusTick }), [focusTick, homeRuntimeActive]);');
  });

  it('no longer carries the pearl balance in the header itself', () => {
    const headerStart = source.indexOf('<HomeV2Header');
    const headerEnd = source.indexOf('stats={[', headerStart);
    expect(headerStart).toBeGreaterThanOrEqual(0);
    expect(headerEnd).toBeGreaterThan(headerStart);
    const realHeader = source.slice(headerStart, headerEnd);

    expect(realHeader).not.toContain("nav.push('/shards_shop')");
    expect(realHeader).not.toContain('<HomeRuneBalance');
  });
});
