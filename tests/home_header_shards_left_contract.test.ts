import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

// зачем: 2026-08-24 владелец убрал жемчужины из хедера — они уехали в правый
// край строки заголовка «Быстрый старт». Прежняя версия этого сторожа требовала
// обратного («жемчужины слева, до кнопки профиля»), то есть охраняла отменённое
// правило, и падала. Размещение валют теперь сторожит
// home_rune_asset_header_contract; здесь остаётся то, что к валютам не
// относится и по-прежнему верно: состав кнопок хедера.
//
// Срез хедера обрезан по home-header-secondary-actions, а НЕ по {bannersJSX}:
// bannersJSX рендерится сильно ниже, поэтому старый срез захватывал ещё и
// «Быстрый старт» — из-за этого тест мерил порядок в чужом блоке.
describe('home header composition', () => {
  it('keeps the header inbox retired and its button set intact', () => {
    expect(source).not.toContain("import AppMessagesInbox from '../../components/AppMessagesInbox'");
    expect(source).not.toContain('<AppMessagesInbox />');

    const headerStart = source.indexOf('{/* ХЕДЕР:');
    expect(headerStart).toBeGreaterThanOrEqual(0);
    const headerEnd = source.indexOf('{bannersJSX}', headerStart);
    expect(headerEnd).toBeGreaterThan(headerStart);
    const header = source.slice(headerStart, headerEnd);

    expect(header).toContain('<LingmanVideosButton ownerActive={homeRuntimeActive} />');
    expect(header).not.toContain('CommunityChatHubButton');
    expect(header).toContain('<NotificationCenterButton isHomeTabActive={homeRuntimeActive} homeFocusTick={focusTick} />');
  });

  it('no longer carries the pearl balance in the header itself', () => {
    // Хедер = от маркера до начала вторичного ряда кнопок. Дальше идёт уже
    // не хедер, поэтому именно этот срез и надо проверять на отсутствие валют.
    const headerStart = source.indexOf('{/* ХЕДЕР:');
    const headerEnd = source.indexOf('testID="home-header-secondary-actions"', headerStart);
    expect(headerStart).toBeGreaterThanOrEqual(0);
    expect(headerEnd).toBeGreaterThan(headerStart);
    const realHeader = source.slice(headerStart, headerEnd);

    expect(realHeader).not.toContain("nav.push('/shards_shop')");
    expect(realHeader).not.toContain('<HomeRuneBalance');
  });
});
