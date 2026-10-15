// зачем (владелец ~11:20 15.10, вопрос 9А overlays-campaigns-007/008): экран «Промокод применён» называет срок по-человечески — «Plus на 30 дней» / «Plus навсегда» по данным промокода;
// фразы про «действующую запись аккаунта» больше нет; без данных о сроке строку не рисуем (ничего не выдумываем).
import fs from 'node:fs';
import path from 'node:path';

import { promoDurationText } from '../components/premium_celebration/celebrationLiquidCopy';
import type { Lang } from '../constants/i18n';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Промокод применён»: срок по-человечески', () => {
  it('ru: «Plus на 30 дней», «на 1 день», «на 2 дня», «навсегда»', () => {
    expect(promoDurationText('ru', 'Plus', { kind: 'days', days: 30 })).toBe('Plus на 30 дней');
    expect(promoDurationText('ru', 'Plus', { kind: 'days', days: 1 })).toBe('Plus на 1 день');
    expect(promoDurationText('ru', 'Plus', { kind: 'days', days: 2 })).toBe('Plus на 2 дня');
    expect(promoDurationText('ru', 'Plus', { kind: 'lifetime' })).toBe('Plus навсегда');
  });

  it('en/pl: форма слова «день» по числу', () => {
    expect(promoDurationText('en', 'Plus', { kind: 'days', days: 7 })).toBe('Plus for 7 days');
    expect(promoDurationText('en', 'Plus', { kind: 'lifetime' })).toBe('Plus forever');
    expect(promoDurationText('pl', 'Plus', { kind: 'days', days: 1 })).toBe('Plus na 1 dzień');
    expect(promoDurationText('pl', 'Plus', { kind: 'days', days: 21 })).toBe('Plus na 21 dni');
  });

  it('все девять языков дают непустую строку для дней и для «навсегда»', () => {
    for (const lang of LANGS) {
      expect((promoDurationText(lang, 'Plus', { kind: 'days', days: 30 }) ?? '').length).toBeGreaterThan(4);
      expect((promoDurationText(lang, 'Plus', { kind: 'lifetime' }) ?? '').length).toBeGreaterThan(4);
    }
  });

  it('нет данных о сроке — строки нет (ничего не выдумываем): null, 0 дней, мусор', () => {
    expect(promoDurationText('ru', 'Plus', null)).toBeNull();
    expect(promoDurationText('ru', 'Plus', undefined)).toBeNull();
    expect(promoDurationText('ru', 'Plus', { kind: 'days', days: 0 })).toBeNull();
    expect(promoDurationText('ru', 'Plus', { kind: 'days' })).toBeNull();
    expect(promoDurationText('ru', 'Plus', { kind: 'days', days: Number.NaN })).toBeNull();
  });

  it('проводка: экран промокода передаёт срок из ответа сервера; фразы про «запись аккаунта» в текстах нет', () => {
    const entry = read('app/promo_code_entry.tsx');
    expect(entry).toContain('promoReward={celebrationReward}');
    expect(entry).toContain("res.rewardKind === 'lifetime' ? { kind: 'lifetime' }");
    const modal = read('components/PremiumCelebrationModal.tsx');
    expect(modal).toContain('promoDurationText(lang as Lang, tier, promoReward)');
    expect(modal).not.toContain('copy.promoCardBody');
    expect(read('components/premium_celebration/celebrationLiquidCopy.ts')).not.toMatch(/действующ(ей|ую) запис|current account record/);
  });
});
