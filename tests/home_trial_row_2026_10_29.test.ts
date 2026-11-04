// зачем (владелец 29.10): триал доступен и Plus нет → в «Сегодня» вместо анкеты/опроса строка «Попробуй Plus бесплатно»; опрос возвращается, когда триала нет, он использован или Plus куплен.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../constants/i18n', () => ({ triLang: (lang: string, map: Record<string, string>) => map[lang] ?? map.ru }));

import { homeTrialRowCopy, homeTrialRowDays, homeTrialRowDecision } from '../app/home_trial_row';

const base = { hasPlus: false, trialEligible: true, accessResolved: true, startedLocally: false } as const;

describe('решение о строке триала', () => {
  it('триал доступен и Plus нет — показываем', () => {
    expect(homeTrialRowDecision(base)).toEqual({ show: true, reason: 'first_offer_day3' });
  });

  it('Plus куплен, триал недоступен/использован, доступ не определён, старт отмечен локально — не показываем, опрос возвращается', () => {
    expect(homeTrialRowDecision({ ...base, hasPlus: true })).toEqual({ show: false, reason: 'hidden_has_plus' });
    expect(homeTrialRowDecision({ ...base, trialEligible: false })).toEqual({ show: false, reason: 'hidden_not_eligible' });
    expect(homeTrialRowDecision({ ...base, accessResolved: false })).toEqual({ show: false, reason: 'hidden_access_unresolved' });
    expect(homeTrialRowDecision({ ...base, startedLocally: true })).toEqual({ show: false, reason: 'hidden_started_locally' });
  });

  it('мгновенно исчезает после старта: локальная отметка сильнее позднего ответа сервера «триал доступен»', () => {
    expect(homeTrialRowDecision({ ...base, startedLocally: true, trialEligible: true }).show).toBe(false);
  });
});

describe('тексты строки', () => {
  it('число дней — только целое из магазина; иначе подпись без числа', () => {
    expect(homeTrialRowDays(7)).toBe(7);
    for (const bad of [0, -3, 2.5, NaN, '7', null, undefined, 1000]) expect(homeTrialRowDays(bad)).toBeNull();
    expect(homeTrialRowCopy('ru', 7)).toEqual({ title: 'Попробуй Plus бесплатно', subtitle: 'Сейчас ничего не спишем' });
    expect(homeTrialRowCopy('uk', undefined).subtitle).toBe('Зараз нічого не спишемо');
    expect(homeTrialRowCopy('en', 3).subtitle).toBe('Nothing charged today');
  });

  it('все 9 языков заполнены, короткие, без «undefined»', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      for (const days of [undefined, 7]) {
        const { title, subtitle } = homeTrialRowCopy(lang, days);
        for (const text of [title, subtitle]) { expect(text.trim().length).toBeGreaterThan(0); expect(text.length).toBeLessThanOrEqual(48); expect(text).not.toMatch(/undefined|NaN/); }
      }
    }
  });
});

describe('Главная: приоритет и охрана', () => {
  const home = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/home.tsx'), 'utf8').replace(/\r\n/g, '\n');

  it('строка триала первая, анкета и Poll V2 после; [SURVEY-ROW] и [TRIAL-ROW] на месте', () => {
    expect(home).toContain("const homeTodayRowSource: 'trial' | 'survey' | 'poll_v2' | 'none' = homeTrial.show ? 'trial' : homeSurvey.row ? 'survey' : homePollV2.phase !== 'hidden' ? 'poll_v2' : 'none';");
    expect(home).toContain('const homeTrial = useHomeTrialRow(lang, homeRuntimeActive);');
    expect(home).toContain("console.log('[SURVEY-ROW]'");
    const hook = fs.readFileSync(path.join(__dirname, '..', 'hooks/use_home_trial_row.ts'), 'utf8');
    expect(hook).toContain("console.log('[TRIAL-ROW]', JSON.stringify({ shown: decision.show");
  });

  it('тап открывает то же окно подписки', () => {
    const hook = fs.readFileSync(path.join(__dirname, '..', 'hooks/use_home_trial_row.ts'), 'utf8');
    expect(hook).toContain("openPremiumPaywall(router, { context: 'generic', source: 'home_trial_row' });");
    expect(home).toContain("homeTodayRowSource === 'trial' && homeTrial.row ? homeTrial.row");
    // экран «Сегодня» решает так же: строка триала вместо опроса, тот же хук
    const today = fs.readFileSync(path.join(__dirname, '..', 'app/today_tasks.tsx'), 'utf8');
    expect(today).toContain('const trial = useHomeTrialRow(lang, true);');
    expect(today).toContain('const todayRow = trial.row ?? pollRow;');
  });
});

// зачем (уточнения владельца 29.10): не раньше 3-го календарного дня, повтор при новом допуске, отклонение ✕ на 14 дней
import { HOME_TRIAL_ROW_DISMISS_MS, homeTrialRowDayNumber } from '../app/home_trial_row';

describe('день с регистрации, повтор и отклонение', () => {
  const now = new Date(2026, 10, 15, 9, 0, 0).getTime();
  const day = (offset: number) => (offset === 0 ? new Date(2026, 10, 15, 8, 0, 0).getTime() : new Date(2026, 10, 15 - offset, 23, 30, 0).getTime());

  it('календарный день по местному времени: день регистрации = 1, вечер регистрации и утро следующего — разные дни', () => {
    expect(homeTrialRowDayNumber(day(0), now)).toBe(1);
    expect(homeTrialRowDayNumber(day(1), now)).toBe(2);
    expect(homeTrialRowDayNumber(day(2), now)).toBe(3);
    expect(homeTrialRowDayNumber(null, now)).toBeNull();
    expect(homeTrialRowDayNumber(now + 3 * 86400000, now)).toBeNull();
  });

  it('новый пользователь: первые два дня не давим, с третьего показываем; даты нет (старый пользователь) — показываем', () => {
    expect(homeTrialRowDecision({ ...base, dayNumber: 1, nowMs: now })).toEqual({ show: false, reason: 'hidden_before_day3' });
    expect(homeTrialRowDecision({ ...base, dayNumber: 2, nowMs: now })).toEqual({ show: false, reason: 'hidden_before_day3' });
    expect(homeTrialRowDecision({ ...base, dayNumber: 3, nowMs: now })).toEqual({ show: true, reason: 'first_offer_day3' });
    expect(homeTrialRowDecision({ ...base, dayNumber: null, nowMs: now })).toEqual({ show: true, reason: 'first_offer_day3' });
  });

  it('повтор: условия снова допускают триал — сразу, без ожидания 3-го дня; без постоянного флага «уже показывали»', () => {
    expect(homeTrialRowDecision({ ...base, hadTrialBefore: true, dayNumber: 1, nowMs: now })).toEqual({ show: true, reason: 'reoffer_eligible_again' });
    expect(homeTrialRowDecision({ ...base, hadTrialBefore: true, startedLocally: true, nowMs: now }).show).toBe(false);
    expect(homeTrialRowDecision({ ...base, hadTrialBefore: true, hasPlus: true, nowMs: now }).show).toBe(false);
  });

  it('✕: прячем на срок, потом возвращается, если триал всё ещё доступен; пока есть Plus — не возвращается', () => {
    const dismissedAt = now - 1000;
    expect(homeTrialRowDecision({ ...base, dismissedAtMs: dismissedAt, nowMs: now })).toEqual({ show: false, reason: 'hidden_dismissed' });
    expect(homeTrialRowDecision({ ...base, dismissedAtMs: now - HOME_TRIAL_ROW_DISMISS_MS + 1, nowMs: now }).show).toBe(false);
    expect(homeTrialRowDecision({ ...base, dismissedAtMs: now - HOME_TRIAL_ROW_DISMISS_MS, nowMs: now }).show).toBe(true);
    expect(homeTrialRowDecision({ ...base, dismissedAtMs: now - HOME_TRIAL_ROW_DISMISS_MS, nowMs: now, hasPlus: true }).show).toBe(false);
    expect(HOME_TRIAL_ROW_DISMISS_MS).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('Главная и карточка: ✕ мгновенный, окно подписки не зовёт, отметка локальная', () => {
    const homeSrc = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/home.tsx'), 'utf8').replace(/\r\n/g, '\n');
    const card = fs.readFileSync(path.join(__dirname, '..', 'components/home/v2/HomeV2TodayCard.tsx'), 'utf8').replace(/\r\n/g, '\n');
    const hook = fs.readFileSync(path.join(__dirname, '..', 'hooks/use_home_trial_row.ts'), 'utf8');
    expect(hook).toContain('const onDismiss = useCallback(() => {');
    expect(hook).toMatch(/setFacts\(\(prev\) => \(\{ \.\.\.prev, dismissedAtMs: at \}\)\);\s*void saveHomeTrialRowDismissedAt/);
    expect(hook).toContain('row: decision.show ? { ...homeTrialRowCopy(lang), onPress, onDismiss, dismissLabel: homeTrialRowDismissLabel(lang), plus: true } : null');
    expect(homeSrc).toContain('const homeTrial = useHomeTrialRow(lang, homeRuntimeActive);');
    expect(card).toContain('testID="home-v2-today-survey-dismiss"');
    expect(card).toMatch(/home-v2-today-survey-dismiss[\s\S]{0,200}latestRef\.current\.surveyRow\?\.onDismiss\?\.\(\)/);
  });
});

import { homeTrialRowDismissLabel } from '../app/home_trial_row';

describe('подпись крестика', () => {
  it('на всех 9 языках непустая и короткая', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const label = homeTrialRowDismissLabel(lang);
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label.length).toBeLessThanOrEqual(12);
    }
  });
});
