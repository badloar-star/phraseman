import fs from 'fs';
import path from 'path';

const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

/**
 * зачем (владелец, 2026-08-26 — скриншот экрана «Напомним, когда пора»):
 * макет телефона снова уехал в самый низ, между заголовком и корпусом зияла
 * пустота, хотя телефон обязан стоять в СЕРЕДИНЕ свободного места.
 *
 * Корень оказался не в размере, а в ПОЗИЦИИ. Три прошлых захода (23-25.08)
 * чинили только высоту корпуса (availableHeight, жёсткий потолок Math.min) —
 * и каждый раз делали дыру ХУЖЕ: слой всё это время был прижат `bottom: 0` +
 * `justifyContent: 'flex-end'` к нижнему краю ЭКРАНА, поэтому чем сильнее
 * ужимали телефон, тем ниже он уезжал.
 *
 * Сторож фиксирует механизм позиционирования, а не пиксели: слой обязан знать
 * ВЕРХНЮЮ границу свободной полосы и центрировать корпус внутри неё.
 */
describe('onboarding phone mock vertical position contract', () => {
  const src = read('components', 'CleanOnboarding.tsx');

  it('computes where the free band starts, not only how tall it is', () => {
    // Недостаточно знать остаток высоты — слой обязан знать и точку старта,
    // иначе он может встать только от края экрана.
    expect(src).toContain('phoneBand');
    expect(src).toMatch(/const phoneBand = useMemo/);
    // Полоса отдаёт обе величины: где начинается и какой высоты.
    expect(src).toMatch(/return \{ top, height:/);
    // Высота по-прежнему уезжает в PhoneMock — связь с прошлым сторожем цела.
    expect(src).toContain('const phoneAvailableHeight = phoneBand?.height');
  });

  it('places the backdrop layer at the top of the free band', () => {
    // Динамический top — то, что физически поднимает слой из-под нижнего края.
    expect(src).toMatch(/phoneBand \? \{ top: phoneBand\.top \} : null/);
  });

  it('centres the phone inside the band instead of pinning it to the bottom', () => {
    // Ровно та строка, из-за которой телефон трижды оказывался внизу.
    const layer = src.slice(src.indexOf('phoneBackdropLayer: {'));
    const block = layer.slice(0, layer.indexOf('},'));
    expect(block).toContain("justifyContent: 'center'");
    expect(block).not.toContain("justifyContent: 'flex-end'");
  });

  it('keeps the fade mask attached to the phone body, not to the layer edge', () => {
    // Когда корпус встал по центру, низ слоя — пустой фон: маска на нём
    // растворяла бы воздух, а не телефон.
    expect(src).toContain('phoneFadeAnchor');
    const anchorUse = src.indexOf('styles.phoneFadeAnchor');
    const maskUse = src.indexOf('styles.phoneFadeMask');
    expect(anchorUse).toBeGreaterThan(-1);
    // Маска обязана лежать ВНУТРИ обёртки с корпусом.
    expect(maskUse).toBeGreaterThan(anchorUse);
  });

  it('applies to both screens that show a phone mock', () => {
    // notifications (кадр 7) и trialReminder (кадр 10) — оба через ScreenFrame.
    expect(src).toContain('onboarding-notifications-phone');
    expect(src).toContain('onboarding-trial-reminder-phone');
    // Оба получают телефон именно как phoneBackdrop, значит оба идут через
    // общий расчёт полосы — отдельной раскладки ни у кого нет.
    expect(src.match(/phoneBackdrop=\{/g)?.length).toBe(2);
  });
});
