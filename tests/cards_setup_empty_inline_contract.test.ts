// зачем (R1 cards-v2-029, Дизайн 12.10): «Настройка тренировки — пусто» по макету (`.empty.sm`) — блок в потоке под заголовком режима, а не по центру окна; остальные пустые состояния Карточек остаются по центру экрана.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('настройка тренировки — пусто: блок в потоке', () => {
  const kit = read('components/cards-grid/CardsKit.tsx');
  const setup = read('app/flashcards/TrainingSetupV2.tsx');

  it('KitEmpty умеет inline: без absolute и замеров окна, поля как `.empty.sm` + margin-top 40', () => {
    expect(kit).toContain('inline?: boolean;');
    expect(kit).toContain('if (inline) {');
    expect(kit).toContain('emptyInline: { alignItems: \'center\', paddingHorizontal: 40, paddingTop: 70, paddingBottom: 10 },');
    // центрированный режим (по умолчанию) остался
    expect(kit).toContain('style={StyleSheet.absoluteFill}>');
    expect(kit).toContain("emptyBlock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 40 },");
  });

  it('экран настройки рисует пустое состояние внутри ScrollView после заголовка режима, а не отдельным слоем', () => {
    expect(setup).toContain('<KitEmpty inline g={g} testID="fc-training-setup-empty"');
    const scrollEnd = setup.indexOf('</ScrollView>');
    expect(setup.indexOf('<KitEmpty inline g={g} testID="fc-training-setup-empty"')).toBeLessThan(scrollEnd);
    // зачем (правило владельца 18.10 «экранов-ошибок нигде»): «недоступно» — спокойное пустое состояние без слов об ошибке, «режим недоступен» — тихий уход назад
    expect(setup).toContain('testID="fc-training-setup-quiet"');
    expect(setup).toContain('<QuietLeave screen="training_setup"');
    expect(setup).not.toContain('fc-training-setup-unavailable');
    expect(setup).not.toContain('fc-training-setup-error');
  });
});
