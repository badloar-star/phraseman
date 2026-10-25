// зачем (живой макет lesson-preparing-live.html, владелец утвердил 25.10): ветки вида «Готовим занятие…» — по времени от тапа.
import {
  PREP_BUSY_SHOW_MS, PREP_MAX_MS, PREP_STILL_AT_MS, prepFakeProgress, prepNextStageInMs, prepOutcomeOf, prepStageAt,
} from '../components/lesson_prep/prep_cta_model';
import { prepCtaText, prepHintToastFields } from '../components/lesson_prep/prep_cta_copy';

describe('подпись на кнопке по времени от тапа', () => {
  it('обычно занятие собрано: до 0,35 с кнопка не меняется (idle)', () => {
    expect(prepStageAt(0)).toBe('idle');
    expect(prepStageAt(PREP_BUSY_SHOW_MS - 1)).toBe('idle');
  });
  it('с 0,35 с — «Готовим занятие…», с 6 с — «Ещё готовится…»', () => {
    expect(prepStageAt(PREP_BUSY_SHOW_MS)).toBe('preparing');
    expect(prepStageAt(PREP_STILL_AT_MS - 1)).toBe('preparing');
    expect(prepStageAt(PREP_STILL_AT_MS)).toBe('still');
    expect(prepStageAt(PREP_MAX_MS)).toBe('still');
  });
  it('мусорное время не ломает: NaN и минус — idle', () => {
    expect(prepStageAt(Number.NaN)).toBe('idle');
    expect(prepStageAt(-5)).toBe('idle');
  });
  it('когда нужна следующая смена подписи', () => {
    expect(prepNextStageInMs(0)).toBe(PREP_BUSY_SHOW_MS);
    expect(prepNextStageInMs(100)).toBe(PREP_BUSY_SHOW_MS - 100);
    expect(prepNextStageInMs(PREP_BUSY_SHOW_MS)).toBe(PREP_STILL_AT_MS - PREP_BUSY_SHOW_MS);
    expect(prepNextStageInMs(PREP_STILL_AT_MS)).toBeNull();
  });
});

describe('ход подготовки', () => {
  it('растёт, быстро в начале, не доходит до конца сам (до 92 %)', () => {
    let prev = -1;
    for (const ms of [0, 500, 1000, 2000, 4000, 8000, 12_000, 60_000]) {
      const p = prepFakeProgress(ms);
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeLessThan(0.92 + 1e-9);
      prev = p;
    }
    expect(prepFakeProgress(0)).toBe(0);
    expect(prepFakeProgress(2000)).toBeGreaterThan(0.3);
    expect(prepFakeProgress(-100)).toBe(0);
  });
});

describe('что увидел человек (ветка итога для журнала)', () => {
  it('быстро → instant (кнопка не менялась); дольше 0,35 → prepared; дольше 6 с → prepared_after_still', () => {
    expect(prepOutcomeOf({ elapsedMs: 120, ok: true, timedOut: false })).toBe('instant');
    expect(prepOutcomeOf({ elapsedMs: 2000, ok: true, timedOut: false })).toBe('prepared');
    expect(prepOutcomeOf({ elapsedMs: 8000, ok: true, timedOut: false })).toBe('prepared_after_still');
  });
  it('отказ: по сроку — timeout, иначе failed', () => {
    expect(prepOutcomeOf({ elapsedMs: PREP_MAX_MS, ok: false, timedOut: true })).toBe('timeout');
    expect(prepOutcomeOf({ elapsedMs: 300, ok: false, timedOut: false })).toBe('failed');
  });
});

describe('тексты на 9 языках', () => {
  const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  it('все строки непустые, с многоточием у подписей хода', () => {
    for (const lang of langs) {
      expect(prepCtaText(lang, 'preparing').endsWith('…')).toBe(true);
      expect(prepCtaText(lang, 'still').endsWith('…')).toBe(true);
      expect(prepCtaText(lang, 'hintContinue').length).toBeGreaterThan(20);
    }
    expect(prepCtaText('ru', 'preparing')).toBe('Готовим занятие…');
    expect(prepCtaText('ru', 'still')).toBe('Ещё готовится…');
  });
  it('подсказка для тоста: все девять полей заполнены, английская без кириллицы', () => {
    for (const kind of ['timeout', 'unavailable'] as const) {
      const f = prepHintToastFields(kind);
      for (const v of Object.values(f)) expect(v.trim().length).toBeGreaterThan(10);
      expect(f.messageEn).not.toMatch(/[А-Яа-яЁё]/);
    }
    expect(prepHintToastFields('timeout').messageRu).toBe('Занятие ещё готовится. Нажми «Продолжить» через пару секунд');
  });
});
