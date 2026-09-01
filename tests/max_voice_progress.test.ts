// ═══════════════════════════════════════════════════════════════════════════
// «Было → Стало» для статистики раздела MAX (макет 04, выбор владельца).
//
// Опасное место — честность сравнения. Показать «рост» там, где раньше просто
// не было звонков, значит соврать человеку в лицо: с нуля растёт что угодно.
// ═══════════════════════════════════════════════════════════════════════════

import {
  PROGRESS_HALF_MS,
  computeVoiceProgress,
  type VoiceCallTrendSample,
} from '../app/max_voice_metrics';

const NOW = 1_800_000_000_000;

const sample = (daysAgo: number, over: Partial<VoiceCallTrendSample> = {}): VoiceCallTrendSample => ({
  atMs: NOW - daysAgo * 24 * 60 * 60 * 1000,
  speechSec: 60,
  uniqueWords: 10,
  cleanPhrases: 5,
  totalPhrases: 10,
  ...over,
});

describe('computeVoiceProgress', () => {
  it('делит окно пополам: старое в «было», свежее в «стало»', () => {
    const out = computeVoiceProgress([sample(20, { speechSec: 120 }), sample(3, { speechSec: 300 })], NOW);
    expect(out.spokeMinutes.before).toBe(2);
    expect(out.spokeMinutes.after).toBe(5);
    expect(out.comparable).toBe(true);
  });

  it('не выдаёт рост за прогресс, если раньше звонков не было', () => {
    // Первый месяц человека: сравнивать не с чем.
    const out = computeVoiceProgress([sample(2), sample(1)], NOW);
    expect(out.comparable).toBe(false);
    expect(out.spokeMinutes.before).toBe(0);
  });

  it('замер этой же миллисекунды попадает в «стало»', () => {
    // Иначе только что законченный урок исчезал бы из статистики.
    const out = computeVoiceProgress([sample(0)], NOW);
    expect(out.spokeMinutes.after).toBe(1);
  });

  it('замеры старше окна не учитываются вовсе', () => {
    const out = computeVoiceProgress([sample(40, { speechSec: 6000 })], NOW);
    expect(out.spokeMinutes.before).toBe(0);
    expect(out.spokeMinutes.after).toBe(0);
  });

  it('процент чистых фраз скрыт, пока хоть одна половина без выборки', () => {
    // Три звонка есть только в свежей половине — пары нет, сравнивать нечестно.
    const out = computeVoiceProgress([sample(3), sample(2), sample(1)], NOW);
    expect(out.cleanPhrasePct).toBeNull();
  });

  it('процент показывается парой, когда выборка есть с обеих сторон', () => {
    const out = computeVoiceProgress(
      [
        sample(20, { cleanPhrases: 2, totalPhrases: 10 }),
        sample(19, { cleanPhrases: 2, totalPhrases: 10 }),
        sample(18, { cleanPhrases: 2, totalPhrases: 10 }),
        sample(3, { cleanPhrases: 9, totalPhrases: 10 }),
        sample(2, { cleanPhrases: 9, totalPhrases: 10 }),
        sample(1, { cleanPhrases: 9, totalPhrases: 10 }),
      ],
      NOW,
    );
    expect(out.cleanPhrasePct).toEqual({ before: 20, after: 90 });
  });

  it('падение показывается честно, а не прячется', () => {
    const out = computeVoiceProgress([sample(20, { speechSec: 600 }), sample(2, { speechSec: 60 })], NOW);
    expect(out.spokeMinutes.before).toBe(10);
    expect(out.spokeMinutes.after).toBe(1);
  });

  it('половина окна — ровно 14 дней', () => {
    expect(PROGRESS_HALF_MS).toBe(14 * 24 * 60 * 60 * 1000);
  });
});
