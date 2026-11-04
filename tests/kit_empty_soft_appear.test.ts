// зачем (Волна 2, пункт 8): пустые состояния появляются мягко (opacity + сдвиг на нативном драйвере), а не вспыхивают;
// сторож держит это в хуке, в KitEmpty (оба режима), в пустом каталоге и в пустой памяти диалогов — и без запретных анимаций.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('мягкое появление пустых состояний', () => {
  const hook = read('hooks/use_soft_appear.ts');
  it('хук: только opacity/translateY, нативный драйвер, reduce-motion без движения', () => {
    expect(hook).toContain('useNativeDriver: true');
    expect(hook).toContain('useSystemReduceMotion');
    expect(hook).toMatch(/if \(reduceMotion\) \{\s*progress\.setValue\(1\)/);
    expect(hook).not.toMatch(/useNativeDriver:\s*false/);
    expect(hook).not.toMatch(/\b(width|height|margin|padding|top|left)\b\s*:/);
  });
  it('KitEmpty: оба режима (в потоке и по центру) идут через useSoftAppear', () => {
    const kit = read('components/cards-grid/CardsKit.tsx');
    expect(kit).toContain('useSoftAppear(inline ? true : pageTop !== null && ready)');
    expect((kit.match(/opacity: appear\.opacity, transform: appear\.transform/g) ?? []).length).toBe(2);
  });
  it('пустой каталог наборов и память диалогов обёрнуты в SoftAppear, действие «Сбросить поиск» на месте', () => {
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    expect(hub).toContain('<SoftAppear testID="flashcards-community-empty"');
    expect(hub).toContain('</SoftAppear>');
    expect(hub).toContain('flashcards-community-reset-filters');
    expect(read('app/dialogue_v2_memory.tsx')).toContain('<SoftAppear>');
  });
});
