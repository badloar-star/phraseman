import {
  MAX_REMINDERS_PER_RUN,
  REMINDER_COOLDOWN_MS,
  REMINDER_MAX_AGE_MS,
  REMINDER_MIN_AGE_MS,
  buildLessonReminderMessage,
  sanitizeTopicForPush,
  shouldRemindNow,
  type LessonReminderCandidate,
  type LessonReminderProfile,
} from './max_lesson_reminder_push';

const HOUR = 60 * 60 * 1000;
// Урок был в 19:00 UTC; «свой час» = 19:00 следующего дня.
const LESSON_AT = Date.UTC(2026, 7, 20, 19, 0, 0);
const NEXT_DAY_SAME_HOUR = Date.UTC(2026, 7, 21, 19, 30, 0);

function candidate(over: Partial<LessonReminderCandidate> = {}): LessonReminderCandidate {
  return {
    stableUid: 'stable-1',
    authUid: 'auth-1',
    nextTopic: 'Ordering food in a restaurant',
    lastCallAtMs: LESSON_AT,
    preferredName: 'Sasha',
    ...over,
  };
}

function profile(over: Partial<LessonReminderProfile> = {}): LessonReminderProfile {
  return {
    expoPushToken: 'ExponentPushToken[abcdefghijklmnopqrstuv]',
    pushTokenLang: 'ru',
    pushTokenTimezone: 'UTC',
    lastLessonReminderAt: 0,
    ...over,
  };
}

describe('MAX lesson reminder — политика отбора', () => {
  test('напоминает в тот же час, что и прошлый урок', () => {
    expect(shouldRemindNow(candidate(), profile(), NEXT_DAY_SAME_HOUR)).toBe(true);
  });

  test('молчит в другой час дня', () => {
    const wrongHour = Date.UTC(2026, 7, 21, 14, 0, 0);
    expect(shouldRemindNow(candidate(), profile(), wrongHour)).toBe(false);
  });

  test('уважает выключенную категорию «Уроки с MAX»', () => {
    expect(shouldRemindNow(candidate(), profile({ pushPrefs: { lessons: false } }), NEXT_DAY_SAME_HOUR)).toBe(false);
    // Явное включение и отсутствие настройки — оба означают «можно».
    expect(shouldRemindNow(candidate(), profile({ pushPrefs: { lessons: true } }), NEXT_DAY_SAME_HOUR)).toBe(true);
    expect(shouldRemindNow(candidate(), profile({ pushPrefs: null }), NEXT_DAY_SAME_HOUR)).toBe(true);
  });

  test('не напоминает раньше 20 часов после урока и позже 6 суток', () => {
    expect(shouldRemindNow(candidate(), profile(), LESSON_AT + REMINDER_MIN_AGE_MS - HOUR)).toBe(false);
    expect(shouldRemindNow(candidate(), profile(), LESSON_AT + REMINDER_MAX_AGE_MS + HOUR)).toBe(false);
  });

  test('держит суточный кулдаун: второе напоминание подряд не уходит', () => {
    const justReminded = profile({ lastLessonReminderAt: NEXT_DAY_SAME_HOUR - REMINDER_COOLDOWN_MS + HOUR });
    expect(shouldRemindNow(candidate(), justReminded, NEXT_DAY_SAME_HOUR)).toBe(false);
  });

  test('без обещанной темы и без валидного токена не шлём ничего', () => {
    expect(shouldRemindNow(candidate({ nextTopic: '   ' }), profile(), NEXT_DAY_SAME_HOUR)).toBe(false);
    expect(shouldRemindNow(candidate(), profile({ expoPushToken: 'garbage' }), NEXT_DAY_SAME_HOUR)).toBe(false);
    expect(shouldRemindNow(candidate(), profile({ expoPushToken: null }), NEXT_DAY_SAME_HOUR)).toBe(false);
  });

  test('ночью молчит, даже если это «час прошлого урока»', () => {
    const nightLesson = candidate({ lastCallAtMs: Date.UTC(2026, 7, 20, 3, 0, 0) });
    const nightNow = Date.UTC(2026, 7, 21, 3, 0, 0);
    expect(shouldRemindNow(nightLesson, profile(), nightNow)).toBe(false);
  });

  test('час считается в поясе человека, а не сервера', () => {
    // Урок в 19:00 по Варшаве = 17:00 UTC. Через сутки в 17:00 UTC — «свой час».
    const warsaw = profile({ pushTokenTimezone: 'Europe/Warsaw' });
    const lessonUtc = Date.UTC(2026, 7, 20, 17, 0, 0);
    expect(shouldRemindNow(candidate({ lastCallAtMs: lessonUtc }), warsaw, Date.UTC(2026, 7, 21, 17, 0, 0))).toBe(true);
    expect(shouldRemindNow(candidate({ lastCallAtMs: lessonUtc }), warsaw, Date.UTC(2026, 7, 21, 19, 0, 0))).toBe(false);
  });
});

describe('MAX lesson reminder — текст', () => {
  test('в теле стоит обещанная учителем тема, в заголовке — имя', () => {
    const message = buildLessonReminderMessage(candidate(), profile());
    expect(message).toEqual(expect.objectContaining({
      to: 'ExponentPushToken[abcdefghijklmnopqrstuv]',
      title: 'Sasha, MAX ждёт на урок',
      body: 'Сегодня по плану: Ordering food in a restaurant',
    }));
    expect(message?.data).toEqual({ type: 'max_lesson_reminder' });
  });

  test('без имени заголовок остаётся человеческим', () => {
    const message = buildLessonReminderMessage(candidate({ preferredName: '' }), profile());
    expect(message?.title).toBe('MAX ждёт на урок');
  });

  test('каждая локаль имеет свой текст, неизвестная падает на ru', () => {
    for (const lang of ['uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      const message = buildLessonReminderMessage(candidate(), profile({ pushTokenLang: lang }));
      expect(message?.body).toContain('Ordering food in a restaurant');
      expect(message?.title).toBeTruthy();
    }
    const unknown = buildLessonReminderMessage(candidate(), profile({ pushTokenLang: 'xx' }));
    expect(unknown?.title).toBe('Sasha, MAX ждёт на урок');
  });

  test('тема из модели — недоверенный текст: режется по длине и очищается', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeTopicForPush(long)).toHaveLength(58);
    expect(sanitizeTopicForPush('  много   пробелов  ')).toBe('много пробелов');
    expect(sanitizeTopicForPush('строка\nс\tпереносом')).toBe('строка с переносом');
  });

  test('пустая тема не превращается в пуш', () => {
    expect(buildLessonReminderMessage(candidate({ nextTopic: '   ' }), profile())).toBeNull();
  });

  test('потолок отправок за прогон ограничен', () => {
    expect(MAX_REMINDERS_PER_RUN).toBeLessThanOrEqual(500);
  });
});
