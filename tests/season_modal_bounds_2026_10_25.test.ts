// зачем (жалоба владельца, iPhone 2.0.2, 25.10: окно эпизода «Сезона» съехало вправо — правый край и кнопка обрезаны, низ просвечивал): окно эпизода
// ВСЕГДА целиком в экране и после входа полностью видно. Таблица для чистых границ + контракт на карту (журнал [EPISODE-MODAL], страховка входа, сдвиг).
import * as fs from 'fs';
import * as path from 'path';
import { seasonModalInside, seasonModalMaxWidth, seasonModalShift } from '../components/learning-v2/season/season_modal_bounds';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const W = 393; // iPhone 15/16

describe('границы окна эпизода', () => {
  it('на месте (поля 24 по бокам) — сдвиг 0 и «внутри»', () => {
    expect(seasonModalInside({ x: 24, width: 345 }, W)).toBe(true);
    expect(seasonModalShift({ x: 24, width: 345 }, W)).toBe(0);
  });

  it('допуск полпикселя: округление измерения — не смещение', () => {
    expect(seasonModalInside({ x: -0.4, width: 393.8 }, W)).toBe(true);
    expect(seasonModalShift({ x: 24.3, width: 345.2 }, W)).toBe(0);
  });

  it('съехало вправо (жалоба): правый край за экраном — сдвиг влево до левого поля 24', () => {
    const rect = { x: 100, width: 345 }; // правый край 445 > 393
    expect(seasonModalInside(rect, W)).toBe(false);
    const dx = seasonModalShift(rect, W);
    expect(dx).toBe(-76);
    expect(seasonModalInside({ x: rect.x + dx, width: rect.width }, W)).toBe(true);
  });

  it('съехало влево — сдвиг вправо', () => {
    const dx = seasonModalShift({ x: -60, width: 345 }, W);
    expect(dx).toBe(84);
    expect(seasonModalInside({ x: -60 + dx, width: 345 }, W)).toBe(true);
  });

  it('не помещается с левым полем — прижимаем правым, но остаёмся в экране', () => {
    const rect = { x: 100, width: 360 };
    const dx = seasonModalShift(rect, W);
    const moved = { x: rect.x + dx, width: rect.width };
    expect(seasonModalInside(moved, W)).toBe(true);
    expect(moved.x + moved.width).toBeLessThanOrEqual(W - 24);
  });

  it('шире окна — сдвигать нечем (ширину режет maxWidth), сдвиг 0; мусорные числа не ломают', () => {
    expect(seasonModalShift({ x: 0, width: 500 }, W)).toBe(0);
    expect(seasonModalShift({ x: Number.NaN, width: 345 }, W)).toBe(0);
    expect(seasonModalShift({ x: 100, width: 345 }, 0)).toBe(0);
  });

  it('предельная ширина — окно минус два поля, не меньше нуля', () => {
    expect(seasonModalMaxWidth(393)).toBe(345);
    expect(seasonModalMaxWidth(393.9)).toBe(345);
    expect(seasonModalMaxWidth(30)).toBe(0);
  });
});

describe('shared compact course modal (owner 2026-10-26)', () => {
  const card = read('components/learning-v2/season/SeasonExpandedCard.tsx');
  const shared = read('components/LearningV2SessionOutcomeSheet.tsx');
  it('delegates presentation to the approved native modal instead of an absolute course overlay', () => {
    expect(card).toContain('<LearningV2SessionOutcomeSheet');
    expect(card).not.toContain('<Animated.View');
    expect(shared).toContain('<Modal visible={visible}');
    expect(shared).toContain('onRequestClose={dismiss}');
    expect(shared).toContain('accessibilityViewIsModal');
    expect(shared).toContain('<ThemeAccentFill');
  });
  it('preserves exam details and close-only fallback', () => {
    expect(card).toContain('p.exam?.facts');
    expect(card).toContain('p.exam?.plusLine');
    expect(card).toContain('p.exam?.energyBadge');
    expect(card).toContain('const primary = p.primary ?? p.secondary');
    expect(card).toContain('onClose={p.onClose}');
  });
});
