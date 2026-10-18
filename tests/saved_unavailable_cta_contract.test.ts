import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// 18.10 (Макеты cards-039, эталон t16): «Сейчас недоступно» на «Сохранённых» — светлая нейтральная кнопка с тёмной надписью
// (не мятная KitCta), значок ↺, без счётчика «0» у заголовка. Общая KitCta не меняется.
describe('saved «Сейчас недоступно» matches the cards-039 reference', () => {
  const states = read('app/flashcards/SavedCollectionStates.tsx');
  const unavailable = states.slice(states.indexOf('function SavedCollectionUnavailable('), states.indexOf('const retryStyles'));

  it('uses its own neutral button: theme text as fill, theme background as ink — contrast in every theme', () => {
    expect(unavailable).toContain('actionNode={retryButton}');
    expect(unavailable).toContain('{ backgroundColor: g.text }');
    expect(unavailable).toContain('color={g.bg}');
    expect(unavailable).toContain('{ color: g.bg }');
    expect(unavailable).toContain('testID="fc-saved-try-again"');
    expect(unavailable).not.toContain('actionIcon="refresh"');
  });

  it('mirrors the refresh glyph to the counter-clockwise ↺ of the reference', () => {
    expect(states).toContain('retryIconCcw: { transform: [{ scaleX: -1 }] }');
    expect(unavailable).toContain('style={retryStyles.retryIconCcw}');
  });

  it('shared KitCta keeps its accent fill; KitEmpty only gains an opt-in override', () => {
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
