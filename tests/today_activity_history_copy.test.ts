// зачем (22.10 владелец — восстановить работу 19.10; координатор): лента истории дней «Сегодня» — даты и подписи на 9 языках, цвета только из токенов темы.
import type { Lang } from '../constants/i18n';
import { todayHistoryCount, todayHistoryDateLabel, todayHistoryDayA11y, todayHistoryFullDays, todayHistoryRailA11y, todayHistoryTitle } from '../components/home/v2/today_activity_history_copy';
import { readSource } from './helpers/read_source';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('лента истории «Сегодня»: тексты', () => {
  it('даты на разных языках', () => {
    expect(todayHistoryDateLabel('ru', '2026-10-21')).toBe('21 окт.');
    expect(todayHistoryDateLabel('uk', '2026-10-21')).toBe('21 жовт.');
    expect(todayHistoryDateLabel('en', '2026-10-21')).toBe('21 Oct');
    expect(todayHistoryDateLabel('pl', '2026-10-21')).toBe('21 paź');
    expect(todayHistoryDateLabel('vi', '2026-10-21')).toBe('21 thg 10');
    expect(todayHistoryDateLabel('ru', '2026-05-03')).toBe('3 мая');
  });
  it('неразборчивый ключ дня возвращается как есть, не ломая ленту', () => {
    expect(todayHistoryDateLabel('ru', 'вчера')).toBe('вчера');
    expect(todayHistoryDateLabel('ru', '2026-13-01')).toBe('2026-13-01');
  });
  it('«N из 3»', () => {
    expect(todayHistoryCount('ru', 2)).toBe('2 из 3');
    expect(todayHistoryCount('en', 0)).toBe('0 of 3');
    expect(todayHistoryCount('pl', 3)).toBe('3 z 3');
  });
  it.each(LANGS)('%s: даты, счётчик и озвучка непустые и содержат числа', (lang) => {
    expect(todayHistoryDateLabel(lang, '2026-01-09')).toMatch(/^9 \S+/);
    expect(todayHistoryCount(lang, 1)).toMatch(/1.*3/);
    expect(todayHistoryDayA11y(lang, '2026-01-09', 2)).toMatch(/9.*2.*3/);
    expect(todayHistoryRailA11y(lang).length).toBeGreaterThan(5);
  });
});

describe('лента истории «Сегодня»: заголовок карточки', () => {
  it('«История» и «N полных дней» со склонением', () => {
    expect(todayHistoryTitle('ru')).toBe('История');
    expect(todayHistoryFullDays('ru', 1)).toBe('1 полный день');
    expect(todayHistoryFullDays('ru', 3)).toBe('3 полных дня');
    expect(todayHistoryFullDays('ru', 5)).toBe('5 полных дней');
    expect(todayHistoryFullDays('ru', 0)).toBe('0 полных дней');
    expect(todayHistoryFullDays('en', 1)).toBe('1 full day');
    expect(todayHistoryFullDays('en', 2)).toBe('2 full days');
    expect(todayHistoryFullDays('pl', 2)).toBe('2 pełne dni');
  });
  it.each(LANGS)('%s: заголовок непустой, счётчик содержит число', (lang) => {
    expect(todayHistoryTitle(lang).length).toBeGreaterThan(2);
    expect(todayHistoryFullDays(lang, 4)).toMatch(/4\s+\S+/);
  });
});

describe('лента истории «Сегодня»: цвета', () => {
  it('в компоненте нет жёстких цветов, кроме помеченного запасного набора колец', () => {
    const src = readSource('components/home/v2/TodayActivityHistory.tsx');
    const hex = src.split('\n').filter((l) => /#[0-9A-Fa-f]{6}\b/.test(l) && !l.includes('theme-exempt'));
    expect(hex).toEqual([]);
    expect(src).toContain('todayRingColors(streakColors)');
    expect(src).toContain("liquidGlassTokens(liquidGlassThemeId, { level: 'max'"); // карточка цвета темы уровня «Максимум», как панель сцены
  });
});
