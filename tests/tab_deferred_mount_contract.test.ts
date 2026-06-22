import fs from 'fs';
import path from 'path';

const layoutPath = path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx');

function readLayout(): string {
  return fs.readFileSync(layoutPath, 'utf8');
}

/**
 * Контракт «мгновенный таб»: тап по таб-бару должен сразу двигать слайд (плейсхолдер),
 * а тяжёлый экран целевого таба монтируется ПОСЛЕ кадра анимации (вне кадра тапа),
 * иначе синхронный первый рендер 3000-строчного экрана подвисает поверх слайда.
 */
describe('tab deferred-mount contract', () => {
  it('separates the visible active tab from the heavy mounted tab', () => {
    const source = readLayout();

    // Видимый активный таб обновляется мгновенно; отдельное множество «реально смонтированных».
    expect(source).toContain('mountedTabs');
    // Монтаж тяжёлого экрана откладывается за пределы кадра тапа.
    expect(source).toContain('InteractionManager');
    expect(source).toContain('runAfterInteractions');
  });

  it('mounts the destination tab off the tap frame, not synchronously inside the tap handler', () => {
    const source = readLayout();

    // tabScreens строит реальный экран только для уже-смонтированных табов (mountedTabs),
    // активный-но-ещё-не-смонтированный таб показывает лёгкий плейсхолдер.
    expect(source).toMatch(/mountedTabs\.has\(/);

    // Тап обновляет активный индекс синхронно (мгновенный слайд)...
    expect(source).toContain('setActiveIdx(idx)');
    // ...а планировщик монтажа целевого таба — отдельная функция, вызываемая после кадра.
    expect(source).toContain('scheduleMount');
  });

  it('still keeps the lazy startup contract (does not eagerly mount every tab at launch)', () => {
    const source = readLayout();
    // Стартовый прогрев тяжёлых табов по-прежнему отложен (контракт deferred_tab_prewarm).
    expect(source).toContain('const DEFERRED_TAB_PREWARM_FALLBACK_MS = 4000');
  });
});
