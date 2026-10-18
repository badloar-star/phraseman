import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// 18.10 (Макеты cards-039, эталон t16; Сайт fe82ecd30) → переписан после правила владельца «экранов-ошибок нигде» (координатор 08:00, разрешение Сайта):
// экрана «Сейчас недоступно» на «Сохранённых» больше нет — спокойное пустое состояние, кнопки повтора нет. Общие части (KitEmpty.actionNode, «0» у заголовка) остаются.
describe('saved list failure is a quiet empty state (no «Сейчас недоступно» screen)', () => {
  const states = read('app/flashcards/SavedCollectionStates.tsx');

  it('has no unavailable view, no retry button and no tap-retry state', () => {
    expect(states).not.toContain('SavedCollectionUnavailable');
    expect(states).not.toContain('fc-saved-try-again');
    expect(states).not.toContain('fc-saved-unavailable');
    expect(states).not.toContain('cloud-offline-outline');
    expect(states).not.toContain('retryIconCcw');
  });

  it('draws the ordinary empty state once the gate is exhausted or the device is offline, and logs why', () => {
    expect(states).toContain('const quietEmpty = loadError && (gate.exhausted || !!props.deviceOffline);');
    expect(states).toContain("logNoErrorScreen('flashcards_saved'");
  });

  it('shared KitCta keeps its accent fill; KitEmpty keeps its opt-in override', () => {
    const kit = read('components/cards-grid/CardsKit.tsx');
    expect(kit).toContain('{ backgroundColor: g.ctaFill, boxShadow: actionBoxShadow(g) }');
    expect(kit.match(/\{actionNode \?\? <KitCta g=\{g\} label=\{action\} icon=\{actionIcon\} onPress=\{onAction\} testID=\{actionTestID\} \/>\}/g)?.length).toBe(2);
  });

  it('hides the «0» next to the title whenever the saved list is empty, error included', () => {
    const screen = read('app/flashcards_collection.tsx');
    expect(screen).toContain('titleOnly={isEmpty && searchQuery.trim().length === 0 && searchInput.length === 0}');
    expect(screen).not.toContain('titleOnly={isEmpty && !loadError');
  });
});
