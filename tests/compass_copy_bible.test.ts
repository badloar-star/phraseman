import {
  COMPASS_BRIEFING_TITLE,
  COMPASS_START_DAY,
  COMPASS_LETS_GO,
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
  // Живой голос Компаса (приветствия — абзацы, не кнопки):
  COMPASS_HELLO_NAMED,
  COMPASS_HELLO,
  COMPASS_THANKS_PREMIUM,
  COMPASS_ROLE,
  COMPASS_GOAL_LINE,
  COMPASS_NO_PRESSURE,
  COMPASS_WHERE_START,
  COMPASS_BACK_NAMED,
  COMPASS_BACK,
  COMPASS_BACK_INVITE,
  COMPASS_INDUCTION_LABEL,
  COMPASS_INDUCTION_TEXT,
  COMPASS_INDUCTION_CTA,
  type CompassText,
} from '../app/compass/compass_copy';

/** Короткие строки (кнопки, подписи, статусы) — к ним применимо правило ≤10 слов. */
const SHORT_TEXTS: CompassText[] = [
  COMPASS_BRIEFING_TITLE,
  COMPASS_START_DAY,
  COMPASS_LETS_GO,
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
  COMPASS_WHERE_START,
  COMPASS_INDUCTION_LABEL,
  ...Object.values(COMPASS_INDUCTION_TEXT),
  ...Object.values(COMPASS_INDUCTION_CTA),
];

/**
 * Живые обращения Компаса — это АБЗАЦЫ-предложения от первого лица (знакомство,
 * благодарность, роль, цель, «не навязываю», «я тебя помню»). Канон юзера требует
 * человеческого голоса, а не телеграфных кнопок, поэтому лимит ≤10 слов к ним НЕ
 * применяется. Но запрещённые слова Библии и полнота 8 языков — обязательны.
 */
const PARAGRAPH_TEXTS: CompassText[] = [
  COMPASS_HELLO_NAMED,
  COMPASS_HELLO,
  COMPASS_THANKS_PREMIUM,
  COMPASS_ROLE,
  ...Object.values(COMPASS_GOAL_LINE),
  COMPASS_NO_PRESSURE,
  COMPASS_BACK_NAMED,
  COMPASS_BACK,
  COMPASS_BACK_INVITE,
];

const ALL_TEXTS: CompassText[] = [...SHORT_TEXTS, ...PARAGRAPH_TEXTS];

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
    const buttons = [
      COMPASS_START_DAY,
      COMPASS_LETS_GO,
      COMPASS_OPEN_SESSION,
      COMPASS_OPEN_ACCESS,
      ...Object.values(COMPASS_INDUCTION_CTA),
    ];
    const verbStart = /^(Начать|Открыть|Продолжить|Сказать|Повтори|Скажи|Разобрать|Пройти|Загляни|Погортай|Поехали)/;
    for (const b of buttons) {
      expect(b.ru).toMatch(verbStart);
    }
  });

  it('короткие строки лаконичны (≤10 слов, когнитивная лёгкость)', () => {
    for (const t of SHORT_TEXTS) {
      const words = t.ru.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(10);
    }
  });

  it('живые обращения — человеческий абзац, но не простыня (≤16 слов на строку)', () => {
    // Канон: голос живой и тёплый, НО каждая строка — одна мысль (билдер разбивает
    // обращение на отдельные предложения-строки). Держим читаемость.
    for (const t of PARAGRAPH_TEXTS) {
      const words = t.ru.replace('{name}', 'Имя').split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(16);
    }
  });
});
