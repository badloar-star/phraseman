// зачем (координатор 25.10, пейвол «Вариант М»): числа окна считаются честно — темп человека из его прогресса, линия «бесплатно» из лимитов кода,
// подпись кнопки зависит ТОЛЬКО от пробного, который дал магазин; нет цены — «0» и «≈ в месяц» не выдумываем.
import fs from 'node:fs';
import path from 'node:path';
import {
  PAYWALL_M_LIMITS, PAYWALL_M_MAX_PACE, PAYWALL_M_MIN_PACE, PAYWALL_M_PLUS_FREEZES_PER_MONTH, paywallMChartModel, paywallMCompareRows, paywallMFooter, paywallMPace,
} from '../components/paywall/m/paywall_m_model';

describe('пейвол М: темп и график', () => {
  it('темп = выучено / дней занятий, в пределах минимума и максимума; нет данных — минимум', () => {
    expect(paywallMPace({ phrasesLearned: 140, activeDays: 7 })).toBe(20);
    expect(paywallMPace({ phrasesLearned: null, activeDays: 7 })).toBe(PAYWALL_M_MIN_PACE);
    expect(paywallMPace({ phrasesLearned: 140, activeDays: 0 })).toBe(PAYWALL_M_MIN_PACE);
    expect(paywallMPace({ phrasesLearned: 3, activeDays: 3 })).toBe(PAYWALL_M_MIN_PACE);
    expect(paywallMPace({ phrasesLearned: 9000, activeDays: 3 })).toBe(PAYWALL_M_MAX_PACE);
  });

  it('голос: Plus = темп × 30, бесплатно = лимит голоса × 30 (как на макете: 600 и 90)', () => {
    const m = paywallMChartModel('voice', 20);
    expect(m.plusEnd).toBe(600);
    expect(m.freeEnd).toBe(PAYWALL_M_LIMITS.voicePerDay * 30);
    expect(m.freeEnd).toBe(90);
    expect(m.plus[2]).toEqual([1, 1]);
    expect(m.free[1][0]).toBe(1);
    expect(m.free[1][1]).toBeCloseTo(90 / 600, 5);
    expect(m.noteVars).toEqual({ pace: 20 });
  });

  it('разговор: бесплатная линия упирается в месячный потолок и дальше плоская', () => {
    const m = paywallMChartModel('dialog', 20, 14);
    expect(m.freeEnd).toBe(PAYWALL_M_LIMITS.dialogPerMonth);
    const [, ceiling, end] = m.free;
    expect(ceiling[1]).toBe(end[1]);
    expect(ceiling[0]).toBeLessThan(0.2); // потолок за пару дней: 30 / 14 ≈ 2 дня из 30
    expect(m.plusEnd).toBe(14 * 30);
  });

  it('все точки линий лежат внутри графика 0…1', () => {
    for (const kind of ['voice', 'dialog'] as const) {
      const m = paywallMChartModel(kind, PAYWALL_M_MIN_PACE);
      for (const [x, y] of [...m.plus, ...m.free]) {
        expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('пейвол М: таблица и подпись кнопки', () => {
  // зачем (Ревизор 25.10): «3 в месяц» в таблице — копия PREMIUM_FREE_FREEZES_PER_MONTH; модуль с ней тянет хранилище, поэтому сверяем по тексту исходника, а не импортом
  it('число защит серии в таблице равно настоящему лимиту подписки', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/premium_freeze_allowance.ts'), 'utf8');
    const m = /export const PREMIUM_FREE_FREEZES_PER_MONTH = (\d+);/.exec(src);
    expect(m).not.toBeNull();
    expect(PAYWALL_M_PLUS_FREEZES_PER_MONTH).toBe(Number(m![1]));
  });

  it('шесть строк, числа из кода, порядок как на макете', () => {
    const rows = paywallMCompareRows();
    expect(rows.map((r) => r.id)).toEqual(['speak', 'dialog', 'explain', 'energy', 'phrases', 'streak']);
    expect(rows[0].free).toEqual({ key: 'm.cmp.perDay', n: PAYWALL_M_LIMITS.voicePerDay });
    expect(rows[1].free).toEqual({ key: 'm.cmp.perMonth', n: PAYWALL_M_LIMITS.dialogPerMonth });
    expect(rows[5].plusN).toBe(3);
  });

  it('есть пробный из магазина → «Начать N дней бесплатно» и «Сегодня 0»', () => {
    const f = paywallMFooter({ yearlyTrialDays: 7, yearlyPrice: '39,99 €', yearlyPerMonth: '3,33 €', zero: '0 €' });
    expect(f.ctaKey).toBe('m.cta.trial');
    expect(f.ctaVars).toEqual({ days: 7 });
    expect(f.fineKey).toBe('m.fine.trial');
    expect(f.fineVars).toEqual({ zero: '0 €', price: '39,99 €' });
  });

  it('пробного нет → «Оформить за …» и «≈ в месяц», без нуля и без дней', () => {
    const f = paywallMFooter({ yearlyTrialDays: null, yearlyPrice: '39,99 €', yearlyPerMonth: '3,33 €', zero: '0 €' });
    expect(f.ctaKey).toBe('m.cta.noTrial');
    expect(f.ctaVars).toEqual({ price: '39,99 €' });
    expect(f.fineKey).toBe('m.fine.noTrial');
    expect(JSON.stringify(f)).not.toContain('0 €');
  });

  it('нет цены → строку под кнопкой не выдумываем', () => {
    expect(paywallMFooter({ yearlyTrialDays: 7, yearlyPrice: null, yearlyPerMonth: null, zero: null }).fineKey).toBeNull();
    expect(paywallMFooter({ yearlyTrialDays: null, yearlyPrice: null, yearlyPerMonth: null, zero: null }).fineKey).toBeNull();
  });
});
