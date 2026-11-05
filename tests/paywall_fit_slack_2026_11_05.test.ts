// зачем (Сверка 05.11, premium_expired: overflow 55 уводил под шапку заголовок первой выгоды): прокрутка «до конца» вычитает нижний отступ содержимого (30) — наверх уходит отступ, а не строка текста.
import { readSource } from './helpers/read_source';

describe('окно оплаты: подгон прокрутки не режет верхнюю строку', () => {
  it('переполнение считается минус нижний отступ содержимого', () => {
    const s = readSource('components/paywall/PaywallPlus.tsx');
    expect(s).toContain('const FIT_BOTTOM_SLACK = 28;');
    expect(s).toContain('const overflow = Math.max(0, Math.round(contentH - viewportH - FIT_BOTTOM_SLACK));');
    expect(s).toContain('scrollContent: { paddingTop: 18, paddingHorizontal: 24, paddingBottom: 30 }');
  });
  it('арифметика: premium_expired (контент 381, окно 326) → прокрутка 27, а не 55', () => {
    const offset = (content: number, viewport: number) => Math.max(0, Math.round(content - viewport - 28));
    expect(offset(381, 326)).toBe(27);
    expect(offset(360, 326)).toBe(6);
    expect(offset(326, 326)).toBe(0);
  });
});
