// зачем (координатор 25.10, окна по месту пейвола М): панель выбирается из существующего контекста; нет числа для панели — сразу общий экран, без выдуманных цифр.
import { PAYWALL_M_COPY_ROWS } from '../components/paywall/m/paywall_m_copy.generated';
import { paywallMText } from '../components/paywall/m/paywall_m_copy';
import { paywallMCorrectionParts, paywallMIsMissedDay, paywallMLessonProgress, paywallMPanelKindFor, paywallMWeekDays } from '../components/paywall/m/paywall_m_panels';

const person = (over: Partial<{ streakDays: number; lessonsDone: number }> = {}) => ({ streakDays: 12, lessonsDone: 3, ...over });

describe('пейвол М: выбор панели по месту', () => {
  it('энергия — всегда; серия — только при серии > 0; замок — пока курс не пройден', () => {
    expect(paywallMPanelKindFor('energy', person({ streakDays: 0 }))).toBe('energy');
    expect(paywallMPanelKindFor('streak', person())).toBe('streak');
    expect(paywallMPanelKindFor('streak', person({ streakDays: 0 }))).toBeNull();
    expect(paywallMPanelKindFor('lock', person())).toBe('lock');
    expect(paywallMPanelKindFor('lock', person({ lessonsDone: 32 }))).toBeNull();
  });

  it('«Не видим твой Plus» — всегда своя панель М', () => {
    expect(paywallMPanelKindFor('refused', person({ streakDays: 0, lessonsDone: 0 }))).toBe('refused');
  });

  it('места без панели (общий, разговор) ведут сразу на общий экран; Мастерская — только когда известны урок и число фраз', () => {
    for (const place of ['general', 'dialog'] as const) expect(paywallMPanelKindFor(place, person())).toBeNull();
    expect(paywallMPanelKindFor('workshop', person())).toBeNull();
    expect(paywallMPanelKindFor('workshop', person(), { lockedLesson: 1 })).toBeNull();
    expect(paywallMPanelKindFor('workshop', person(), { lockedLesson: 1, workshopPhrases: 50 })).toBe('workshop');
    expect(paywallMPanelKindFor('workshop', person(), { lockedLesson: 1, workshopPhrases: 0 })).toBeNull();
  });
});

describe('пейвол М: неделя серии', () => {
  const now = new Date(2026, 9, 25, 15, 0, 0); // 25.10.2026, воскресенье

  it('семь дней, последний — сегодня; были ли занятия — по датам активности', () => {
    const days = paywallMWeekDays(['2026-10-19', '2026-10-20', '2026-10-22', '2026-10-23T10:00:00Z', '2026-10-25'], now);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.key)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
    expect(days.map((d) => d.done)).toEqual([true, true, false, true, true, false, true]);
    expect(days[6].today).toBe(true);
  });

  it('пропуск — только прошлый день без занятия; сегодня без занятия — «ещё нет», не пропуск', () => {
    const days = paywallMWeekDays(['2026-10-24'], now);
    expect(paywallMIsMissedDay(days[5])).toBe(false); // 24.10 был
    expect(paywallMIsMissedDay(days[4])).toBe(true); // 23.10 не было
    expect(days[6].done).toBe(false);
    expect(paywallMIsMissedDay(days[6])).toBe(false); // сегодня
  });

  it('полоса «3 из 32» не выходит за края', () => {
    expect(paywallMLessonProgress(3)).toBeCloseTo(3 / 32, 5);
    expect(paywallMLessonProgress(-1)).toBe(0);
    expect(paywallMLessonProgress(99)).toBe(1);
  });
});

// зачем (Макеты 25.10, 🔴): в заголовок панели серии попало «30 дней» числом — человек с серией 12 увидел бы чужую цифру. Число — только подстановкой {n}.
describe('пейвол М: заголовок панели серии', () => {
  it('число берётся из серии человека и склоняется', () => {
    expect(paywallMText('ru', 'mc.streak.title', { n: 12 })).toBe('12 дней подряд! Пропуск Plus прикроет');
    expect(paywallMText('ru', 'mc.streak.title', { n: 1 })).toBe('1 день подряд! Пропуск Plus прикроет');
    expect(paywallMText('ru', 'mc.streak.title', { n: 2 })).toBe('2 дня подряд! Пропуск Plus прикроет');
  });

  it('ни в одном языке в заголовках серии нет зашитой цифры', () => {
    for (const key of ['mc.streak.title', 'm.head.streak.title'] as const) {
      for (const text of Object.values(PAYWALL_M_COPY_ROWS[key])) expect(text).not.toMatch(/[0-9]/);
    }
  });
});

// зачем (5 · ВХОД faf515267 + макет 6dkmYjjEX3kCv2s1nuFT9B, раздел 2): панель «Разговор с ИИ» — только когда итог первого бесплатного разговора записан на телефоне.
describe('пейвол М: панель «Разговор с ИИ»', () => {
  it('нужны и минуты, и реплики; нет любого — сразу общий экран', () => {
    expect(paywallMPanelKindFor('dialog', person(), { dialogMinutes: 6, dialogPhrases: 14 })).toBe('dialog');
    expect(paywallMPanelKindFor('dialog', person(), { dialogMinutes: 6 })).toBeNull();
    expect(paywallMPanelKindFor('dialog', person(), { dialogMinutes: 0, dialogPhrases: 14 })).toBeNull();
    expect(paywallMPanelKindFor('dialog', person(), { dialogMinutes: null, dialogPhrases: null })).toBeNull();
  });

  it('заголовок подставляет минуты и фразы человека и склоняет слова', () => {
    expect(paywallMText('ru', 'mc.dialog.title', { min: 6, n: 14 })).toBe('6 минут разговора и 14 твоих фраз');
    expect(paywallMText('ru', 'mc.dialog.title', { min: 1, n: 1 })).toBe('1 минута разговора и 1 твоя фраза');
  });

  it('исправленные слова выделяются; порядок и пробелы сохраняются; без «как было» выделения нет', () => {
    const parts = paywallMCorrectionParts('I goed to school', 'I went to school');
    expect(parts.map((p) => p.text).join('')).toBe('I went to school');
    expect(parts.filter((p) => p.changed).map((p) => p.text.trim())).toEqual(['went']);
    expect(paywallMCorrectionParts(null, 'I went to school').some((p) => p.changed)).toBe(false);
    expect(paywallMCorrectionParts('I went to school.', 'I went to school.').some((p) => p.changed)).toBe(false);
  });
});
