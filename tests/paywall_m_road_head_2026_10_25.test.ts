// зачем (координатор 25.10, пейвол «Вариант М»): «дорога на 30 дней» берёт настоящие фразы следующих уроков из Learning V2 (день 10 · 20 · 30), не выдумывает перевод;
// шапка места падает на общую, если нет числа, которое она должна показать.
import { paywallMRoadFromUpcoming } from '../components/paywall/m/paywall_m_road';
import { paywallMPickCurrentSession } from '../components/paywall/m/paywall_m_course_cursor';
import { paywallMChartKindFor, paywallMHeadFor, paywallMHeadKindForContext } from '../components/paywall/m/paywall_m_head';
import type { PaywallMPerson } from '../components/paywall/m/paywall_m_model';

const person: PaywallMPerson = { lessonsDone: 3, streakDays: 12, phrasesLearned: 140, activeDays: 7 };

describe('пейвол М: дорога на 30 дней', () => {
  const phrases = [
    { en: 'He is tall.', translation: 'Он высокий.', lessonOrdinal: 2 },
    { en: 'I have two brothers.', translation: 'У меня два брата.', lessonOrdinal: 3 },
    { en: 'I work from home.', translation: 'Я работаю из дома.', lessonOrdinal: 4 },
    { en: 'We are friends.', translation: 'Мы друзья.', lessonOrdinal: 5 },
  ];

  it('фразы по порядку → дни 10 / 20 / 30, лишняя четвёртая отбрасывается', () => {
    const road = paywallMRoadFromUpcoming(phrases);
    expect(road.map((r) => [r.day, r.lesson, r.english])).toEqual([[10, 2, 'He is tall.'], [20, 3, 'I have two brothers.'], [30, 4, 'I work from home.']]);
  });

  it('пустые и без перевода пропускаются, нет фраз — пусто (раздел скрыт)', () => {
    expect(paywallMRoadFromUpcoming([])).toEqual([]);
    expect(paywallMRoadFromUpcoming([{ en: ' ', translation: 'x', lessonOrdinal: 2 }, { en: 'Hi.', translation: '', lessonOrdinal: 2 }])).toEqual([]);
  });

  it('текущее занятие — первое выпущенное непройденное по порядку; всё пройдено — null', () => {
    const released = [
      { courseSessionId: 'lesson-01:session:02', lessonOrdinal: 1, sessionOrdinal: 2 },
      { courseSessionId: 'lesson-01:session:01', lessonOrdinal: 1, sessionOrdinal: 1 },
      { courseSessionId: 'lesson-02:session:01', lessonOrdinal: 2, sessionOrdinal: 1 },
    ];
    expect(paywallMPickCurrentSession(released, new Set())).toBe('lesson-01:session:01');
    expect(paywallMPickCurrentSession(released, new Set(['lesson-01:session:01']))).toBe('lesson-01:session:02');
    expect(paywallMPickCurrentSession(released, new Set(released.map((r) => r.courseSessionId)))).toBeNull();
  });
});

describe('пейвол М: шапка по месту', () => {
  it('общая шапка: урок из 32 и заголовок про месяц', () => {
    const h = paywallMHeadFor('general', 'ru', person);
    expect(h.kicker).toBe('Ты на 3-м уроке из 32');
    expect(h.pill).toBeNull();
  });

  it('энергия и серия берут числа из кода и прогресса', () => {
    expect(paywallMHeadFor('energy', 'ru', person).kicker).toBe('5 занятий подряд сегодня');
    expect(paywallMHeadFor('streak', 'ru', person).pill).toBe('Серия 12 дней');
  });

  it('нет числа места — общая шапка, а не «0» и не пусто', () => {
    const base = paywallMHeadFor('general', 'ru', person);
    expect(paywallMHeadFor('dialog', 'ru', person)).toEqual(base);
    expect(paywallMHeadFor('workshop', 'ru', person)).toEqual(base);
    expect(paywallMHeadFor('lock', 'ru', person)).toEqual(base);
    expect(paywallMHeadFor('streak', 'ru', { ...person, streakDays: 0 })).toEqual(base);
  });

  it('разговор показывает минуты и фразы; график разговора — про реплики, остальные — про голос', () => {
    const h = paywallMHeadFor('dialog', 'ru', person, { dialogMinutes: 6, dialogPhrases: 14 });
    expect(h.kicker).toBe('Первый разговор: 6 минут, 14 фраз');
    expect(paywallMChartKindFor('dialog')).toBe('dialog');
    expect(paywallMChartKindFor('energy')).toBe('voice');
  });

  it('контексты входа раскладываются по местам М без новых context', () => {
    expect(paywallMHeadKindForContext('no_energy')).toBe('energy');
    expect(paywallMHeadKindForContext('dialog_limit')).toBe('dialog');
    expect(paywallMHeadKindForContext('streak')).toBe('streak');
    expect(paywallMHeadKindForContext('phrase_workshop')).toBe('workshop');
    expect(paywallMHeadKindForContext('course_after_lesson3')).toBe('lock');
    expect(paywallMHeadKindForContext('flashcard_limit')).toBe('general');
    expect(paywallMHeadKindForContext('plus_server_refused')).toBe('general');
  });
});
