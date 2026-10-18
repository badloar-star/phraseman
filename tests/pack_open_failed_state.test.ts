// зачем (🟡 Макеты, координатор 15.10): набор без загрузившихся карточек не закрывается молча — честный экран с «Повторить» и «Назад», причина в [PACK-OPEN].
import { readFileSync } from 'fs';
import path from 'path';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');

describe('набор не загрузился', () => {
  it('экран набора показывает PackOpenFailedView и не уходит сам', () => {
    const screen = read('app/flashcards_collection.tsx');
    expect(screen).toContain("{deeplinkCardsState === 'failed' ? (");
    expect(screen).toContain('<PackOpenFailedView lang={lang} onRetry={retryDeeplinkCards} onBack={leaveCollection} />');
    expect(screen).toContain('[PACK-OPEN] collection:failed');
    expect(screen).not.toContain('collection:failed → назад');
  });
  it('«Повторить» заново запускает загрузку карточек', () => {
    const data = read('app/flashcards/useCollectionData.ts');
    expect(data).toContain('retryDeeplinkCards');
    expect(data).toContain("source: 'retry'");
  });
  // зачем (правило владельца 18.10 «экранов-ошибок нигде»): кнопки «Повторить» больше нет — загрузка карточек набора тихо повторяется сама (useLoadGate), остаётся «Назад»
  it('на экране нет кнопки повтора и слов об ошибке; повтор идёт сам, «Назад» остаётся', () => {
    const view = read('app/flashcards/PackOpenFailedView.tsx');
    expect(view).not.toContain('fc-pack-open-retry');
    expect(view).not.toContain('cloud-offline-outline');
    expect(view).toContain("useLoadGate({ id: 'pack-open-cards', status: 'error', retry: onRetry, persistAcrossMounts: true })");
    expect(view).toContain('QuietEmptyState');
    expect(view).toContain('fc-pack-open-back');
  });
});
