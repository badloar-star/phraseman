// ═══════════════════════════════════════════════════════════════════════════
// home_scene_preview_fixtures.ts — моки фактов телефона для dev-входа /dev_home_scene_preview («Сцена» Главной, десять героев).
//
// зачем (координатор 22.10, «Сверка»: без подмены воспроизводятся только «Новичок» и «Продолжить»): у каждого героя — факты, какими
// их видит HomeScene (часы, серия, засчитан ли день, энергия, последний засчитанный день, прогресс урока, сеть). Состояние НЕ задаётся:
// факты проходят через те же home_scene_inputs и pickHomeSceneState, что на Главной, — так проверяется и приоритет. Plus честный:
// у Plus «нет энергии» и «серия прервалась» не бывает, вход покажет, что решила функция.
// Числа — из эталона docs/design/v2-app/home-scene-states.html: серия 5, энергия 4, монеты 2340, урок 1, эпизод 12, «задание 6 из 20»,
// 21:40 → «До полуночи 2 ч 20 мин», «Было 5 дней», «Тебя не было 4 дня», выпущены уроки 1–2. Чистые данные: без React, хранилища и сети.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../../constants/i18n';
import { homeSceneAllReleasedDone, homeSceneDaysSince, homeSceneStreakLost } from './home_scene_inputs';
import { HOME_SCENE_STATES, minutesUntilMidnight, type HomeSceneInput, type HomeSceneState } from './home_scene_state';

export type HomeScenePreviewState = HomeSceneState;
export const HOME_SCENE_PREVIEW_STATES: readonly HomeScenePreviewState[] = HOME_SCENE_STATES;
export const isHomeScenePreviewState = (value: unknown): value is HomeScenePreviewState =>
  typeof value === 'string' && (HOME_SCENE_STATES as readonly string[]).includes(value);

/** Выпущены уроки 1–2 (эталон: «Уроки 1 и 2 пройдены»): после второго эпизодов нет. */
export const HOME_SCENE_PREVIEW_RELEASED_LESSONS = 2;
/** Эпизодов в уроке: 3 главы по 8. */
export const HOME_SCENE_PREVIEW_EPISODES_PER_LESSON = 24;
const isReleasedPreview = (lessonOrdinal: number): boolean => lessonOrdinal <= HOME_SCENE_PREVIEW_RELEASED_LESSONS;
/** День кадра эталона; часы — у каждого героя свои. */
const DAY = Object.freeze({ y: 2026, m: 9, d: 22 });

type Facts = Readonly<{
  clock: readonly [number, number];
  hasProgress: boolean;
  /** Серия в шапке. */
  streakDays: number;
  dayCounted: boolean;
  energy: number;
  coins: number;
  /** Последний засчитанный день — столько дней назад; null — занятий не было. */
  lastDayAgo: number | null;
  /** Серия в личном прогрессе до сброса — для «серия прервалась». */
  streakCount: number;
  offline: boolean;
  chapterExamReady: boolean;
  lesson: number;
  episode: number | null;
  /** Задания эпизода: пройдено, всего; null — полоски нет. */
  tasks: readonly [number, number] | null;
  /** Пройдено эпизодов урока. */
  lessonDone: number;
  /** Минуты до энергии («Энергия вернётся через 42 мин»). */
  energyMinutes: number;
}>;

const MID: Facts = {
  clock: [18, 10], hasProgress: true, streakDays: 5, dayCounted: false, energy: 4, coins: 2340, lastDayAgo: 1, streakCount: 5,
  offline: false, chapterExamReady: false, lesson: 1, episode: 12, tasks: [6, 20], lessonDone: 11, energyMinutes: 42,
};

const FACTS: Readonly<Record<HomeScenePreviewState, Facts>> = {
  newbie: { ...MID, clock: [9, 41], hasProgress: false, streakDays: 0, energy: 5, coins: 0, lastDayAgo: null, streakCount: 0, episode: 1, tasks: null, lessonDone: 0 },
  continue: MID,
  streak_risk: { ...MID, clock: [21, 40], energy: 3 },
  day_done: { ...MID, clock: [19, 20], streakDays: 6, dayCounted: true, lastDayAgo: 0, streakCount: 6, episode: 13, tasks: null, lessonDone: 12 },
  no_energy: { ...MID, clock: [16, 20], energy: 0 },
  offline: { ...MID, clock: [13, 5], offline: true },
  // экзамен главы 2 ждёт: эпизоды 9–16 пройдены, следующий — 17
  exam_ready: { ...MID, clock: [12, 30], chapterExamReady: true, episode: 17, tasks: null, lessonDone: 16 },
  // пропущен один день (последний засчитанный — позавчера), серия была 5: в шапке уже 0
  streak_lost: { ...MID, clock: [10, 5], streakDays: 0, lastDayAgo: 2 },
  welcome_back: { ...MID, clock: [11, 40], streakDays: 0, lastDayAgo: 4 },
  all_done: { ...MID, clock: [17, 15], lesson: 2, episode: null, tasks: null, lessonDone: HOME_SCENE_PREVIEW_EPISODES_PER_LESSON },
};

const dayKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type HomeScenePreviewSetup = Readonly<{
  /** Часы кадра — вместо часов телефона. */
  now: Date;
  /** Вход pickHomeSceneState — тот же, что собирает HomeScene. */
  input: HomeSceneInput;
  streakToday: 'counted' | 'pending';
  streakDays: number;
  energy: number;
  coins: number;
  daysAway: number | null;
  lostStreakDays: number | null;
  minutesToMidnight: number;
  energyMinutes: number;
  lesson: number;
  episode: number | null;
  tasks: readonly [number, number] | null;
}>;

/** Факты героя state → вход pickHomeSceneState теми же функциями, что у Главной (дни без занятий, «прервалась», «всё пройдено»). */
export function homeScenePreviewSetup(state: HomeScenePreviewState, plus: boolean): HomeScenePreviewSetup {
  const f = FACTS[state];
  const now = new Date(DAY.y, DAY.m, DAY.d, f.clock[0], f.clock[1], 0, 0);
  const lastDay = f.lastDayAgo === null ? null : dayKey(new Date(DAY.y, DAY.m, DAY.d - f.lastDayAgo));
  const daysAway = homeSceneDaysSince(lastDay, now);
  // первый вход за день: превью всегда открывается «впервые сегодня»
  const streakLostToday = homeSceneStreakLost({ daysAway, streakCount: f.streakCount, plus });
  const allReleasedDone = homeSceneAllReleasedDone({ lessonOrdinal: f.lesson, done: f.lessonDone, total: HOME_SCENE_PREVIEW_EPISODES_PER_LESSON }, isReleasedPreview);
  const input: HomeSceneInput = Object.freeze({
    hasProgress: f.hasProgress, hour: now.getHours(), streakDays: f.streakDays, dayCounted: f.dayCounted, plus, energy: f.energy, daysAway,
    streakLostToday, chapterExamReady: f.chapterExamReady, allReleasedDone, offline: f.offline,
  });
  return Object.freeze({
    now, input, streakToday: f.dayCounted ? 'counted' : 'pending', streakDays: f.streakDays, energy: f.energy, coins: f.coins, daysAway,
    lostStreakDays: streakLostToday ? f.streakCount : null, minutesToMidnight: minutesUntilMidnight(now), energyMinutes: f.energyMinutes,
    lesson: f.lesson, episode: f.episode, tasks: f.tasks,
  });
}

/** Место продолжения, как его собирает Главная: «Урок N», эпизод, название эпизода (titleOf — то же, что у карточки «Продолжить»). */
export function homeScenePreviewPlace(
  lang: Lang,
  setup: HomeScenePreviewSetup,
  titleOf: (lang: Lang, lesson: number, episode: number) => string,
): Readonly<{ badge: string; episode: number | null; title: string; done: number | null; total: number | null; theoryLessonId: number | null }> {
  const n = setup.lesson;
  return Object.freeze({
    badge: triLang(lang, { ru: `Урок ${n}`, uk: `Урок ${n}`, en: `Lesson ${n}`, es: `Lección ${n}`, 'pt-BR': `Lição ${n}`, vi: `Bài ${n}`, id: `Pelajaran ${n}`, tr: `Ders ${n}`, pl: `Lekcja ${n}` }),
    episode: setup.episode,
    title: setup.episode !== null ? titleOf(lang, n, setup.episode) : '',
    done: setup.tasks ? setup.tasks[0] : null,
    total: setup.tasks ? setup.tasks[1] : null,
    theoryLessonId: setup.episode !== null ? n : null,
  });
}

/** Слова шапки Главной (серия, монеты) — те же, что у HomeV2Header на Главной. Подписи «Сегодня ещё нет» нет: состояние дня показывает только огонёк (владелец 22.10). */
export function homeScenePreviewHeaderWords(lang: Lang, days: number): Readonly<{ days: string; streak: string; coins: string }> {
  const ruForm = days % 10 === 1 && days % 100 !== 11 ? 0 : days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 12 || days % 100 > 14) ? 1 : 2;
  return Object.freeze({
    days: triLang(lang, {
      ru: `${days} ${['день', 'дня', 'дней'][ruForm]}`, uk: `${days} ${['день', 'дні', 'днів'][ruForm]}`,
      en: `${days} ${days === 1 ? 'day' : 'days'}`, es: `${days} ${days === 1 ? 'día' : 'días'}`, 'pt-BR': `${days} ${days === 1 ? 'dia' : 'dias'}`,
      vi: `${days} ngày`, id: `${days} hari`, tr: `${days} gün`, pl: `${days} ${days === 1 ? 'dzień' : 'dni'}`,
    }),
    streak: triLang(lang, { ru: 'Серия', uk: 'Серія', en: 'Streak', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Runtunan', tr: 'Seri', pl: 'Seria' }),
    coins: triLang(lang, { ru: 'Монеты', uk: 'Монети', en: 'Coins', es: 'Monedas', 'pt-BR': 'Moedas', vi: 'Xu', id: 'Koin', tr: 'Jeton', pl: 'Monety' }),
  });
}
