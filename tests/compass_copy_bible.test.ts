import {
  COMPASS_BRIEFING_TITLE,
  COMPASS_START_DAY,
  COMPASS_LATER,
  COMPASS_DAY_COMMENT,
  COMPASS_TASK_TITLE,
  COMPASS_LESSON_INVITE,
  COMPASS_OPEN_SESSION,
  COMPASS_LOCKED_TITLE,
  COMPASS_LOCKED_BODY,
  COMPASS_OPEN_ACCESS,
  COMPASS_PUSH_COMEBACK,
  COMPASS_PUSH_NEW_PHRASES,
  COMPASS_PUSH_STREAK_GAIN,
  COMPASS_STATS_TITLE,
  COMPASS_STATS_STREAK,
  COMPASS_STATS_DAYS,
  COMPASS_STATS_TOPICS,
  COMPASS_TOPIC_STATUS,
  COMPASS_TOPIC_LABEL,
  type CompassText,
} from '../app/compass/compass_copy';

const ALL_TEXTS: CompassText[] = [
  COMPASS_BRIEFING_TITLE,
  COMPASS_START_DAY,
  COMPASS_LATER,
  ...Object.values(COMPASS_DAY_COMMENT),
  ...Object.values(COMPASS_TASK_TITLE),
  COMPASS_LESSON_INVITE,
  COMPASS_OPEN_SESSION,
  COMPASS_LOCKED_TITLE,
  COMPASS_LOCKED_BODY,
  COMPASS_OPEN_ACCESS,
  COMPASS_PUSH_COMEBACK,
  COMPASS_PUSH_NEW_PHRASES,
  COMPASS_PUSH_STREAK_GAIN,
  COMPASS_STATS_TITLE,
  COMPASS_STATS_STREAK,
  COMPASS_STATS_DAYS,
  COMPASS_STATS_TOPICS,
  ...Object.values(COMPASS_TOPIC_STATUS),
  ...Object.values(COMPASS_TOPIC_LABEL),
];

const LANGS: (keyof CompassText)[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('compass_copy — соответствие Библии Phraseman', () => {
  it('все строки заданы на всех 8 языках (непустые)', () => {
    for (const t of ALL_TEXTS) {
      for (const lang of LANGS) {
        expect(typeof t[lang]).toBe('string');
        expect(t[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('русские тексты НЕ содержат запрещённых слов Библии', () => {
    // урок→сессия, ошибка→почти/разбор, статистика→твой путь, цена/купить→открыть/инвестиция
    const forbidden = [/\bурок/i, /\bошибк/i, /\bстатистик/i, /\bцена\b/i, /\bстоимост/i, /\bкупить\b/i, /\bподписк/i];
    for (const t of ALL_TEXTS) {
      for (const pat of forbidden) {
        expect(t.ru).not.toMatch(pat);
      }
    }
  });

  it('кнопки начинаются с глагола (по-русски, Apple HIG)', () => {
    const buttons = [COMPASS_START_DAY, COMPASS_OPEN_SESSION, COMPASS_OPEN_ACCESS];
    const verbStart = /^(Начать|Открыть|Продолжить|Сказать|Повтори|Скажи|Разобрать)/;
    for (const b of buttons) {
      expect(b.ru).toMatch(verbStart);
    }
  });

  it('строки короткие (≤10 слов, когнитивная лёгкость)', () => {
    for (const t of ALL_TEXTS) {
      const words = t.ru.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(10);
    }
  });
});
