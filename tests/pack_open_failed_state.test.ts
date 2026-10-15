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
  it('на экране есть обе кнопки', () => {
    const view = read('app/flashcards/PackOpenFailedView.tsx');
    expect(view).toContain('fc-pack-open-retry');
    expect(view).toContain('fc-pack-open-back');
  });
});
