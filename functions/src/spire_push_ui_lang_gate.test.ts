// зачем (владелец 11.10): пуши Шпиля только при языке интерфейса ru/uk — остальным пропуск с причиной, не русский текст.
import { buildSpireWeekResultCandidates, spireWeekResultSkipReason } from './spire_week_result_push';
import { buildSpireZoneWarningCandidates, spireZoneWarningSkipReason } from './spire_zone_warning_push';

const TOKEN = 'ExponentPushToken[sim]';
const UI_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('пуши Шпиля только для интерфейса ru/uk', () => {
  it.each(UI_LANGS)('итог недели и зона — %s', (lang) => {
    const user = { expoPushToken: TOKEN, pushTokenLang: lang };
    const allowed = lang === 'ru' || lang === 'uk';
    expect(spireWeekResultSkipReason(user, 'W')).toBe(allowed ? null : 'ui_lang_not_supported');
    expect(spireZoneWarningSkipReason(user, 'W')).toBe(allowed ? null : 'ui_lang_not_supported');
    const users = new Map([['u1', user]]);
    expect(buildSpireWeekResultCandidates([{ uid: 'u1', studyLang: 'en', prevTier: 1, newTier: 2, promoted: true, demoted: false }], users, 'W'))
      .toHaveLength(allowed ? 1 : 0);
    expect(buildSpireZoneWarningCandidates([{ uid: 'u1', status: 'demotion_edge' }], users, 'W')).toHaveLength(allowed ? 1 : 0);
  });

  it('язык не записан — пропуск (раньше молча считался русским)', () => {
    expect(spireWeekResultSkipReason({ expoPushToken: TOKEN, pushTokenLang: null }, 'W')).toBe('ui_lang_not_supported');
  });
});
