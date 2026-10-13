// зачем (решение владельца 13.10, сборка 16.10): «Шпиль» → «Пик» во всех видимых текстах. Сторож серверных пушей:
// ни на одном из 9 языков нет старого имени; ru/uk называют «Пик/Пік»; по-русски «на пике», а не «в пике»;
// не-ru/uk без кириллицы (а не русский текст запасным вариантом). Имена камней en — как у клиента.
import { buildSpireWeekResultCopy, type SpireWeekResultPushCandidate } from './spire_week_result_push';
import { buildSpireZoneWarningCopy, type SpireZoneWarningCandidate } from './spire_zone_warning_push';
import { SPIRE_PUSH_TIER_NAMES, spirePushTierName } from './spire_notifications';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const OLD_NAME = /шпил|шпіл|spire|aguja|agulha|iglica/i;
const CYRILLIC = /[А-Яа-яЁёІіЇїЄє]/;

function week(uiLang: string, over: Partial<SpireWeekResultPushCandidate> = {}): SpireWeekResultPushCandidate {
  return { uid: 'u', token: 'ExponentPushToken[a]', uiLang, prevTier: 3, newTier: 4, promoted: true, demoted: false, ...over };
}
function zone(uiLang: string, status: SpireZoneWarningCandidate['status']): SpireZoneWarningCandidate {
  return { uid: 'u', token: 'ExponentPushToken[a]', uiLang, status };
}

function allCopies(lang: string) {
  return [
    buildSpireWeekResultCopy(week(lang, { promoted: true, demoted: false })),
    buildSpireWeekResultCopy(week(lang, { promoted: false, demoted: true, prevTier: 4, newTier: 3 })),
    buildSpireWeekResultCopy(week(lang, { promoted: false, demoted: false, prevTier: 3, newTier: 3 })),
    buildSpireZoneWarningCopy(zone(lang, 'promotion_edge')),
    buildSpireZoneWarningCopy(zone(lang, 'demotion_edge')),
  ];
}

describe('пуши «Пик» (бывший «Шпиль») на 9 языках', () => {
  it.each(LANGS)('%s: нет старого имени, у каждого исхода свой непустой текст', (lang) => {
    const copies = allCopies(lang);
    for (const c of copies) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.body.length).toBeGreaterThan(0);
      expect(`${c.title} ${c.body}`).not.toMatch(OLD_NAME);
    }
    expect(new Set(copies.map((c) => c.body)).size).toBe(copies.length);
  });

  it.each(LANGS.filter((l) => l !== 'ru' && l !== 'uk'))('%s: свой язык, без кириллицы и без русского запасного текста', (lang) => {
    for (const c of allCopies(lang)) expect(`${c.title} ${c.body}`).not.toMatch(CYRILLIC);
  });

  it('ru: «Пик», «на пике», не «в пике»; uk: «Пік», «на піку»', () => {
    for (const c of allCopies('ru')) expect(c.title).toMatch(/пик/i);
    const ruDown = buildSpireWeekResultCopy(week('ru', { promoted: false, demoted: true, newTier: 0 }));
    expect(ruDown.body).toContain('на пике Гранит');
    for (const c of allCopies('ru')) expect(`${c.title} ${c.body}`).not.toMatch(/в пике/i);
    for (const c of allCopies('uk')) expect(c.title).toMatch(/пік/i);
    expect(buildSpireWeekResultCopy(week('uk', { promoted: false, demoted: true })).body).toContain('на піку');
  });

  it('имена камней есть на всех 9 языках, en — как у клиента', () => {
    for (const lang of LANGS) expect(SPIRE_PUSH_TIER_NAMES[lang]).toHaveLength(12);
    expect(spirePushTierName(0, 'en')).toBe('Granite');
    expect(buildSpireWeekResultCopy(week('en', { newTier: 11 })).body).toContain('Diamond');
  });
});
