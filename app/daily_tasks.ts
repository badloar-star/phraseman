// ════════════════════════════════════════════════════════════════════════════
// daily_tasks.ts — Ежедневные задания
// Хранение: AsyncStorage 'daily_tasks_YYYY-MM-DD' → TaskProgress[]
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from './premium_guard';
import { actionToastTri, emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { withStorageLock } from './storage_mutex';
import { spendShards } from './shards_system';
import { bumpDailyTaskClaimed } from './lifetime_profile_stats';

const DAILY_PROGRESS_WRITE_ERR_TOAST_COOLDOWN_MS = 45_000;
let _lastDailyProgressWriteErrorToastAt = 0;

export type TaskType =
  | 'correct_streak'      // N правильных подряд в уроке
  | 'lesson_no_mistakes'  // урок без ошибок (N подряд)
  | 'quiz_hard'           // N фраз на сложном квизе (Premium)
  | 'quiz_score'          // набрать N XP в квизах за день
  | 'words_learned'       // выучить N слов в разделе Слова
  | 'total_answers'       // собрать N фраз в уроках за день
  | 'open_theory'         // открыть теорию урока N раз
  | 'daily_active'        // открыть урок и собрать хотя бы одну фразу
  | 'verb_learned'        // выучить N неправильных глаголов
  | 'flashcard_view'      // просмотреть N карточек (сохранённые фразы)
  | 'flashcard_save'      // сохранить N фраз в карточки через Save в уроке
  | 'flashcard_flip'      // перевернуть N карточек (увидеть перевод)
  | 'recall_session'      // начать сессию повторения (правильный ответ хотя бы на одну карточку)
  | 'recall_answers'      // N фраз в Повторении (max 7/сессия)
  | 'recall_perfect'      // сессия Повторения без ошибок (минимум 5 карточек)
  | 'trainer_words'       // N правильных карточек слов в новом Тренере ошибок
  | 'trainer_phrases'     // N правильных карточек фраз в новом Тренере ошибок
  | 'trainer_arena'       // N правильных карточек арены в новом Тренере ошибок
  | 'daily_phrase_read'   // прочитать фразу дня на главном экране
  | 'daily_phrase_save'   // сохранить фразу дня в карточки
  | 'diagnostic_complete' // пройти диагностический тест целиком (20 вопросов)
  | 'quiz_easy'           // N фраз на лёгком квизе
  | 'quiz_medium'         // N фраз на среднем квизе (Premium)
  | 'quiz_perfect'        // раунд квиза без ошибок (Premium)
  | 'quiz_hard_perfect'   // раунд сложного квиза без ошибок (Premium)
  | 'different_lessons'   // заниматься в N разных уроках за день
  | 'lesson_complete'     // завершить урок полностью до экрана финиша
  | 'morning_session'     // N фраз в уроке до 12:00
  | 'evening_session'     // N фраз в уроке после 18:00
  | 'energy_spend'        // потратить N единиц энергии (только для Free-аккаунта)
  | 'arena_play'              // сыграть N рейтинг-матчей за день (только PvP, не бот)
  | 'arena_win'               // выиграть N рейтинг-матчей за день (только PvP)
  | 'arena_plays_wins_combo' // N рейтинг-матчей + ≥M побед (arenaCombo, comboPlays/comboWins)
  | 'arena_rank_promoted'   // повысить ранг (уровень/лигу вверх) в рейтинговой Арене за день
  | 'invite_friend';        // отправить приглашение другу (экран «Пригласить друга», Share без отмены)

/** Типы заданий, которые считаются «про Арену» (лимит 1 на день в DAILY_SETS_*). */
export function isArenaDailyTaskType(type: TaskType): boolean {
  return (
    type === 'arena_play'
    || type === 'arena_win'
    || type === 'arena_plays_wins_combo'
    || type === 'arena_rank_promoted'
  );
}

/** Пороги для type arena_plays_wins_combo (PvP, не бот). */
export type ArenaComboRequirement = { minPlays: number; minWins: number };

export interface DailyTask {
  id: string;
  type: TaskType;
  titleRU: string;
  titleUK: string;
  descRU: string;
  descUK: string;
  icon: string;
  target: number;
  xp: number;
  /** Минимальный игровой уровень (1–50) для этого задания. По умолчанию 1 (всем доступно). */
  minPlayerLevel?: number;
  /** Только для Free-аккаунта. Premium-пользователи не могут выполнить (напр. energy_spend при безлимитной энергии). */
  freeOnly?: boolean;
  /** Для arena_plays_wins_combo: сколько матчей сыграть и сколько выиграть за день. */
  arenaCombo?: ArenaComboRequirement;
}

export interface TaskProgress {
  taskId: string;
  current: number;
  completed: boolean;
  claimed: boolean;
  /** Только arena_plays_wins_combo: сыграно PvP-матчей за день по этому заданию */
  comboPlays?: number;
  /** Только arena_plays_wins_combo: число побед за день по этому заданию */
  comboWins?: number;
}

export const getArenaComboRequirement = (task: DailyTask): ArenaComboRequirement =>
  task.arenaCombo ?? { minPlays: 2, minWins: 1 };

// ── 90 заданий (30 дней × 3) ─────────────────────────────────────────────
const ALL_TASKS: DailyTask[] = [
  // daily_active — открыть урок и собрать хотя бы одну фразу
  { id:'da1', type:'daily_active', icon:'☀️', target:1, xp:18,
    titleRU:'Просто зайди', titleUK:'Просто зайди',
    descRU:'Открой любой урок и собери хотя бы одну фразу.',
    descUK:'Відкрий будь-який урок і збери хоча б одну фразу.' },
  { id:'da2', type:'daily_active', icon:'🌅', target:1, xp:18,
    titleRU:'Начни день', titleUK:'Почни день',
    descRU:'Открой урок и собери хотя бы одну фразу сегодня.',
    descUK:'Відкрий урок і збери хоча б одну фразу сьогодні.' },
  { id:'da3', type:'daily_active', icon:'💪', target:1, xp:18,
    titleRU:'Ни дня без урока', titleUK:'Жодного дня без уроку',
    descRU:'Открой урок и собери хотя бы одну фразу.',
    descUK:'Відкрий урок і збери хоча б одну фразу.' },

  // total_answers — правильные ответы в уроках (каждый правильный тап по слову = +1)
  { id:'ta1', type:'total_answers', icon:'⚡', target:10, xp:24,
    titleRU:'Разогрев', titleUK:'Розігрів',
    descRU:'Собери 10 фраз в уроке.',
    descUK:'Збери 10 фраз в уроці.' },
  { id:'ta2', type:'total_answers', icon:'🔥', target:20, xp:36,
    titleRU:'Двадцатка', titleUK:'Двадцятка',
    descRU:'Собери 20 фраз в уроках за день.',
    descUK:'Збери 20 фраз у уроках за день.' },
  { id:'ta3', type:'total_answers', icon:'💥', target:30, xp:48,
    titleRU:'Тридцатник', titleUK:'Тридцятник',
    descRU:'Собери 30 фраз в уроках за день.',
    descUK:'Збери 30 фраз у уроках за день.' },
  { id:'ta4', type:'total_answers', icon:'🚀', target:50, xp:66,
    titleRU:'Полтинник', titleUK:'П\'ятдесятка',
    descRU:'Собери 50 фраз в уроках за день.',
    descUK:'Збери 50 фраз у уроках за день.' },
  { id:'ta5', type:'total_answers', icon:'🌪️', target:75, xp:90,
    titleRU:'На всех парах', titleUK:'На повних парах',
    descRU:'Собери 75 фраз в уроках за день.',
    descUK:'Збери 75 фраз у уроках за день.' },
  { id:'ta6', type:'total_answers', icon:'💯', target:100, xp:120,
    titleRU:'Сотня', titleUK:'Сотня',
    descRU:'Собери 100 фраз в уроках за день.',
    descUK:'Збери 100 фраз у уроках за день.' },

  // correct_streak — N правильных тапов подряд без единой ошибки (сбрасывается при ошибке)
  { id:'cs1', type:'correct_streak', icon:'🎯', target:5, xp:30,
    titleRU:'Первая серия', titleUK:'Перша серія',
    descRU:'Собери 5 фраз подряд в уроке — ни одной ошибки.',
    descUK:'Збери 5 фраз поспіль в уроці — жодної помилки.' },
  { id:'cs2', type:'correct_streak', icon:'🎯', target:10, xp:48,
    titleRU:'Горячая десятка', titleUK:'Гаряча десятка',
    descRU:'Собери 10 фраз подряд в уроке без единой ошибки.',
    descUK:'Збери 10 фраз поспіль в уроці без жодної помилки.' },
  { id:'cs3', type:'correct_streak', icon:'⚡', target:15, xp:66,
    titleRU:'15 без промаха', titleUK:'15 без промаху',
    descRU:'Собери 15 фраз подряд без ошибок — не сбей серию.',
    descUK:'Збери 15 фраз поспіль без помилок — не збий серію.' },
  { id:'cs4', type:'correct_streak', icon:'🔥', target:20, xp:84,
    titleRU:'В зоне потока', titleUK:'В зоні потоку',
    descRU:'Собери 20 фраз подряд — войди в состояние потока.',
    descUK:'Збери 20 фраз поспіль — увійди в стан потоку.' },

  // lesson_no_mistakes — N правильных тапов без единой ошибки (тот же счётчик, сбрасывается при ошибке)
  { id:'lnm1', type:'lesson_no_mistakes', icon:'✨', target:10, xp:72,
    titleRU:'Чистая серия', titleUK:'Чиста серія',
    descRU:'Собери 10 фраз подряд в уроке — ноль ошибок.',
    descUK:'Збери 10 фраз поспіль в уроці — нуль помилок.' },
  { id:'lnm2', type:'lesson_no_mistakes', icon:'🎖️', target:15, xp:96,
    titleRU:'Снайпер', titleUK:'Снайпер',
    descRU:'Собери 15 фраз подряд в уроке — абсолютная точность.',
    descUK:'Збери 15 фраз поспіль в уроці — абсолютна точність.' },
  { id:'lnm3', type:'lesson_no_mistakes', icon:'💎', target:20, xp:120,
    titleRU:'Безупречность', titleUK:'Бездоганність',
    descRU:'Собери 20 фраз подряд без единой ошибки.',
    descUK:'Збери 20 фраз поспіль без жодної помилки.' },

  // quiz_hard — правильные ответы в квизе уровня «Сложно» (Premium)
  { id:'qh1', type:'quiz_hard', icon:'💪', target:3, xp:36, minPlayerLevel:15,
    titleRU:'Первый вызов', titleUK:'Перший виклик',
    descRU:'Открой Квизы → Сложно и собери 3 фразы.',
    descUK:'Відкрий Квізи → Складно й збери 3 фрази.' },
  { id:'qh2', type:'quiz_hard', icon:'🗡️', target:5, xp:54, minPlayerLevel:15,
    titleRU:'Принял вызов', titleUK:'Прийняв виклик',
    descRU:'Открой Квизы → Сложно и собери 5 фраз.',
    descUK:'Відкрий Квізи → Складно й збери 5 фраз.' },
  { id:'qh3', type:'quiz_hard', icon:'🏆', target:10, xp:78, minPlayerLevel:15,
    titleRU:'Хардкорщик', titleUK:'Хардкорщик',
    descRU:'Открой Квизы → Сложно и собери 10 фраз.',
    descUK:'Відкрий Квізи → Складно й збери 10 фраз.' },
  { id:'qh4', type:'quiz_hard', icon:'👑', target:15, xp:102, minPlayerLevel:15,
    titleRU:'Легенда', titleUK:'Легенда',
    descRU:'Открой Квизы → Сложно и собери 15 фраз.',
    descUK:'Відкрий Квізи → Складно й збери 15 фраз.' },

  // quiz_score — XP заработанный в квизах за день
  { id:'qs1', type:'quiz_score', icon:'⭐', target:10, xp:30,
    titleRU:'Первый опыт', titleUK:'Перший досвід',
    descRU:'Заработай 10 XP в Квизах за день.',
    descUK:'Зароби 10 XP у Квізах за день.' },
  { id:'qs2', type:'quiz_score', icon:'🌟', target:20, xp:48,
    titleRU:'Набираю обороты', titleUK:'Набираю оберти',
    descRU:'Заработай 20 XP в Квизах за день.',
    descUK:'Зароби 20 XP у Квізах за день.' },
  { id:'qs3', type:'quiz_score', icon:'💫', target:30, xp:66,
    titleRU:'Квиз-машина', titleUK:'Квіз-машина',
    descRU:'Заработай 30 XP в Квизах за день.',
    descUK:'Зароби 30 XP у Квізах за день.' },
  { id:'qs4', type:'quiz_score', icon:'💥', target:50, xp:90, minPlayerLevel:15,
    titleRU:'Неудержимый', titleUK:'Нестримний',
    descRU:'Заработай 50 XP в Квизах за день — играй на Сложно и держи серию.',
    descUK:'Зароби 50 XP у Квізах за день — грай на Складно і тримай серію.' },

  // words_learned — правильные ответы в разделе Слова (каждое выученное слово = +1)
  { id:'wl1', type:'words_learned', icon:'📖', target:3, xp:30,
    titleRU:'Три слова в копилку', titleUK:'Три слова в скарбничку',
    descRU:'Выучи 3 слова в разделе Слова любого урока — пройди их тренировку.',
    descUK:'Вивчи 3 слова в розділі Слова будь-якого уроку — пройди їх тренування.' },
  { id:'wl2', type:'words_learned', icon:'📚', target:5, xp:48,
    titleRU:'Пополняю словарь', titleUK:'Поповнюю словник',
    descRU:'Выучи 5 слов в разделе Слова — пройди тренировку слов в уроке.',
    descUK:'Вивчи 5 слів в розділі Слова — пройди тренування слів у уроці.' },
  { id:'wl3', type:'words_learned', icon:'🧠', target:10, xp:72,
    titleRU:'Словарный марафон', titleUK:'Словниковий марафон',
    descRU:'Выучи 10 слов в разделе Слова — можно в разных уроках.',
    descUK:'Вивчи 10 слів в розділі Слова — можна в різних уроках.' },

  // verb_learned — выучить N неправильных глаголов в разделе Глаголы
  { id:'vl1', type:'verb_learned', icon:'⚙️', target:2, xp:30,
    titleRU:'Первые глаголы', titleUK:'Перші дієслова',
    descRU:'Выучи 2 неправильных глагола в разделе Глаголы любого урока.',
    descUK:'Вивчи 2 неправильних дієслова в розділі Дієслова будь-якого уроку.' },
  { id:'vl2', type:'verb_learned', icon:'🔧', target:4, xp:54,
    titleRU:'Глагольный рывок', titleUK:'Дієслівний ривок',
    descRU:'Выучи 4 неправильных глагола в разделе Глаголы.',
    descUK:'Вивчи 4 неправильних дієслова в розділі Дієслова.' },
  { id:'vl3', type:'verb_learned', icon:'🔩', target:6, xp:78,
    titleRU:'Мастер форм', titleUK:'Майстер форм',
    descRU:'Выучи 6 неправильных глаголов в разделе Глаголы.',
    descUK:'Вивчи 6 неправильних дієслів в розділі Дієслова.' },

  // open_theory — открыть раздел Теория в уроке
  { id:'ot1', type:'open_theory', icon:'💡', target:1, xp:12,
    titleRU:'Загляни в Теорию', titleUK:'Зазирни в Теорію',
    descRU:'Открой вкладку Теория в любом уроке и прочитай правило.',
    descUK:'Відкрий вкладку Теорія в будь-якому уроці і прочитай правило.' },
  { id:'ot2', type:'open_theory', icon:'📖', target:2, xp:18,
    titleRU:'Теоретик', titleUK:'Теоретик',
    descRU:'Открой вкладку Теория в 2 разных уроках сегодня.',
    descUK:'Відкрий вкладку Теорія в 2 різних уроках сьогодні.' },

  // flashcard_view — просмотреть N карточек (листать в разделе Карточки)
  { id:'fv1', type:'flashcard_view', icon:'🃏', target:5, xp:24,
    titleRU:'Загляни в карточки', titleUK:'Зазирни в картки',
    descRU:'Открой раздел Карточки и пролистай 5 карточек.',
    descUK:'Відкрий розділ Картки і перегортай 5 карток.' },
  { id:'fv2', type:'flashcard_view', icon:'🃏', target:10, xp:42,
    titleRU:'Карточный час', titleUK:'Картковий час',
    descRU:'Открой раздел Карточки и пролистай 10 карточек.',
    descUK:'Відкрий розділ Картки і перегортай 10 карток.' },
  { id:'fv3', type:'flashcard_view', icon:'🃏', target:20, xp:66,
    titleRU:'Карточный марафон', titleUK:'Картковий марафон',
    descRU:'Открой раздел Карточки и пролистай 20 карточек.',
    descUK:'Відкрий розділ Картки і перегортай 20 карток.' },

  // flashcard_save — сохранить фразу в карточки через кнопку в уроке
  { id:'fs1', type:'flashcard_save', icon:'💾', target:1, xp:18,
    titleRU:'Первая карточка', titleUK:'Перша картка',
    descRU:'В уроке нажми Save на любой фразе — она попадёт в Карточки.',
    descUK:'В уроці натисни Save на будь-якій фразі — вона потрапить у Картки.' },
  { id:'fs2', type:'flashcard_save', icon:'💾', target:3, xp:36,
    titleRU:'Коллекционер', titleUK:'Колекціонер',
    descRU:'Сохрани 3 фразы в Карточки через кнопку Save в уроках.',
    descUK:'Збережи 3 фрази у Картки через кнопку Save на уроках.' },
  { id:'fs3', type:'flashcard_save', icon:'💾', target:5, xp:60,
    titleRU:'Пополняю коллекцию', titleUK:'Поповнюю колекцію',
    descRU:'Сохрани 5 фраз в Карточки через кнопку Save в уроках.',
    descUK:'Збережи 5 фраз у Картки через кнопку Save на уроках.' },

  // flashcard_flip — перевернуть карточку чтобы увидеть перевод
  { id:'ff1', type:'flashcard_flip', icon:'🔄', target:5, xp:24,
    titleRU:'Переворот', titleUK:'Переворот',
    descRU:'В разделе Карточки нажми на 5 карточек чтобы увидеть перевод.',
    descUK:'В розділі Картки натисни на 5 карток щоб побачити переклад.' },
  { id:'ff2', type:'flashcard_flip', icon:'🔄', target:10, xp:42,
    titleRU:'Двойной переворот', titleUK:'Подвійний переворот',
    descRU:'В разделе Карточки нажми на 10 карточек чтобы увидеть переводы.',
    descUK:'В розділі Картки натисни на 10 карток щоб побачити переклади.' },
  { id:'ff3', type:'flashcard_flip', icon:'🔄', target:15, xp:60,
    titleRU:'Мастер переворота', titleUK:'Майстер перевороту',
    descRU:'В разделе Карточки нажми на 15 карточек — проверь все переводы.',
    descUK:'В розділі Картки натисни на 15 карток — перевір усі переклади.' },

  // recall_session — начать сессию повторения (засчитывается 1 раз за день при первом ответе)
  { id:'rs1', type:'recall_session', icon:'🧠', target:1, xp:24,
    titleRU:'Время повторить', titleUK:'Час повторити',
    descRU:'Открой раздел Повторение и правильно ответь хотя бы на одну карточку — засчитается сессия.',
    descUK:'Відкрий розділ Повторення й відповідай правильно хоча б на одну картку — сесію зарахують.' },

  // recall_answers — правильные ответы в Повторении (SESSION_LIMIT=7, т.е. max 7 за сессию)
  { id:'ra1', type:'recall_answers', icon:'🧠', target:5, xp:36,
    titleRU:'Пятёрка на повторе', titleUK:'П\'ятірка на повторенні',
    descRU:'Правильно ответь на 5 карточек в разделе Повторение.',
    descUK:'Відповідай правильно на 5 карток у розділі Повторення.' },
  { id:'ra2', type:'recall_answers', icon:'🧠', target:7, xp:60,
    titleRU:'Мастер повторения', titleUK:'Майстер повторення',
    descRU:'Правильно ответь на 7 карточек в разделе Повторение — это полная сессия.',
    descUK:'Відповідай правильно на 7 карток у розділі Повторення — це повна сесія.' },

  // recall_perfect — сессия Повторения без единой ошибки (минимум 5 карточек)
  { id:'rp1', type:'recall_perfect', icon:'💎', target:1, xp:72,
    titleRU:'Безупречное повторение', titleUK:'Бездоганне повторення',
    descRU:'Пройди сессию Повторения без единой ошибки (нужно минимум 5 карточек).',
    descUK:'Пройди сесію Повторення без жодної помилки (потрібно мінімум 5 карток).' },

  // daily_phrase_read — прочитать фразу дня (1 в день на главном экране)
  { id:'dpr1', type:'daily_phrase_read', icon:'📰', target:1, xp:12,
    titleRU:'Фраза дня', titleUK:'Фраза дня',
    descRU:'На главном экране найди фразу дня и нажми на неё чтобы прочитать.',
    descUK:'На головному екрані знайди фразу дня і натисни на неї щоб прочитати.' },

  // daily_phrase_save — сохранить фразу дня в карточки
  { id:'dps1', type:'daily_phrase_save', icon:'⭐', target:1, xp:18,
    titleRU:'Сохрани фразу дня', titleUK:'Збережи фразу дня',
    descRU:'Открой фразу дня на главном экране и сохрани её в Карточки.',
    descUK:'Відкрий фразу дня на головному екрані і збережи її в Картки.' },

  // diagnostic_complete — пройти диагностический тест полностью (20 вопросов)
  { id:'dc1', type:'diagnostic_complete', icon:'🩺', target:1, xp:96,
    titleRU:'Диагностика', titleUK:'Діагностика',
    descRU:'Пройди диагностический тест целиком — все 20 вопросов до конца.',
    descUK:'Пройди діагностичний тест повністю — усі 20 питань до кінця.' },

  // quiz_easy — правильные ответы в квизе уровня «Легко» (бесплатно)
  { id:'qe1', type:'quiz_easy', icon:'🌱', target:5, xp:18,
    titleRU:'Лёгкий старт', titleUK:'Легкий старт',
    descRU:'Собери 5 фраз в Квизах на уровне Легко.',
    descUK:'Збери 5 фраз у Квізах на рівні Легко.' },
  { id:'qe2', type:'quiz_easy', icon:'🌱', target:10, xp:30,
    titleRU:'Разогрев в квизе', titleUK:'Розігрів у квізі',
    descRU:'Собери 10 фраз в Квизах на уровне Легко.',
    descUK:'Збери 10 фраз у Квізах на рівні Легко.' },
  { id:'qe3', type:'quiz_easy', icon:'🌱', target:20, xp:48,
    titleRU:'Уверенный игрок', titleUK:'Впевнений гравець',
    descRU:'Собери 20 фраз в Квизах на уровне Легко.',
    descUK:'Збери 20 фраз у Квізах на рівні Легко.' },

  // quiz_medium — правильные ответы в квизе уровня «Средне» (Premium)
  { id:'qm1', type:'quiz_medium', icon:'⚔️', target:5, xp:24, minPlayerLevel:8,
    titleRU:'Средний уровень', titleUK:'Середній рівень',
    descRU:'Собери 5 фраз в Квизах на уровне Средне.',
    descUK:'Збери 5 фраз у Квізах на рівні Середньо.' },
  { id:'qm2', type:'quiz_medium', icon:'⚔️', target:10, xp:42, minPlayerLevel:8,
    titleRU:'Средний мастер', titleUK:'Середній майстер',
    descRU:'Собери 10 фраз в Квизах на уровне Средне.',
    descUK:'Збери 10 фраз у Квізах на рівні Середньо.' },

  // quiz_perfect — раунд квиза без ошибок (Premium, любой уровень)
  { id:'qp1', type:'quiz_perfect', icon:'✨', target:1, xp:54, minPlayerLevel:8,
    titleRU:'Идеальный раунд', titleUK:'Ідеальний раунд',
    descRU:'Заверши раунд в Квизах без единой ошибки — любой уровень.',
    descUK:'Заверши раунд у Квізах без жодної помилки — будь-який рівень.' },

  // quiz_hard_perfect — раунд сложного квиза без ошибок (Premium)
  { id:'qhp1', type:'quiz_hard_perfect', icon:'👑', target:1, xp:84, minPlayerLevel:15,
    titleRU:'Хардкор без ошибок', titleUK:'Хардкор без помилок',
    descRU:'Заверши раунд Квизов на уровне Сложно без единой ошибки.',
    descUK:'Заверши раунд Квізів на рівні Складно без жодної помилки.' },

  // different_lessons — позаниматься в N разных уроках за день
  { id:'dl1', type:'different_lessons', icon:'📚', target:2, xp:48,
    titleRU:'Два урока за день', titleUK:'Два уроки за день',
    descRU:'Собери хотя бы по одной фразе в 2 разных уроках за день.',
    descUK:'Збери хоча б по одній фразі у 2 різних уроках за день.' },
  { id:'dl2', type:'different_lessons', icon:'📚', target:3, xp:78,
    titleRU:'Три урока за день', titleUK:'Три уроки за день',
    descRU:'Собери хотя бы по одной фразе в 3 разных уроках за день.',
    descUK:'Збери хоча б по одній фразі у 3 різних уроках за день.' },

  // lesson_complete — пройти урок полностью до конца
  { id:'lc1', type:'lesson_complete', icon:'🏁', target:1, xp:60,
    titleRU:'Завершить урок', titleUK:'Завершити урок',
    descRU:'Пройди любой урок полностью — дойди до экрана завершения.',
    descUK:'Пройди будь-який урок повністю — дійди до екрана завершення.' },

  // morning_session — правильные ответы в уроке до 12:00
  { id:'ms1', type:'morning_session', icon:'🌅', target:5, xp:36,
    titleRU:'Ранняя птица', titleUK:'Рання пташка',
    descRU:'Собери 5 фраз в уроке до 12:00 — утренний старт.',
    descUK:'Збери 5 фраз в уроці до 12:00 — ранній старт.' },

  // evening_session — правильные ответы в уроке после 18:00
  { id:'evs1', type:'evening_session', icon:'🌙', target:5, xp:36,
    titleRU:'Вечерний студент', titleUK:'Вечірній студент',
    descRU:'Собери 5 фраз в уроке после 18:00 — вечерняя сессия.',
    descUK:'Збери 5 фраз в уроці після 18:00 — вечірня сесія.' },

  // Дополнительные daily_active (разные мотивационные формулировки)
  { id:'da4', type:'daily_active', icon:'🌟', target:1, xp:18,
    titleRU:'Снова в бой', titleUK:'Знову в бій',
    descRU:'Открой любой урок и собери хотя бы одну фразу.',
    descUK:'Відкрий будь-який урок і збери хоча б одну фразу.' },
  { id:'da5', type:'daily_active', icon:'🎯', target:1, xp:18,
    titleRU:'Держу ритм', titleUK:'Тримаю ритм',
    descRU:'Открой урок и собери одну фразу.',
    descUK:'Відкрий урок і збери одну фразу.' },
  { id:'da6', type:'daily_active', icon:'💫', target:1, xp:18,
    titleRU:'Ещё один день', titleUK:'Ще один день',
    descRU:'Открой урок и собери хотя бы одну фразу — маленький шаг в верном направлении.',
    descUK:'Відкрий урок і збери хоча б одну фразу — маленький крок у правильному напрямку.' },
  { id:'da7', type:'daily_active', icon:'🌈', target:1, xp:18,
    titleRU:'Маленький шаг', titleUK:'Маленький крок',
    descRU:'Собери хотя бы одну фразу в любом уроке — главное начать.',
    descUK:'Збери хоча б одну фразу в будь-якому уроці — головне почати.' },
  { id:'da8', type:'daily_active', icon:'☕', target:1, xp:18,
    titleRU:'Пять минут языка', titleUK:'П\'ять хвилин мови',
    descRU:'Выдели сегодня 5 минут языку — открой урок и собери хотя бы одну фразу.',
    descUK:'Виділи сьогодні 5 хвилин мові — відкрий урок і збери хоча б одну фразу.' },

  // Дополнительные total_answers
  { id:'ta7', type:'total_answers', icon:'📈', target:40, xp:60,
    titleRU:'Набираю темп', titleUK:'Набираю темп',
    descRU:'Собери 40 фраз в уроках за день.',
    descUK:'Збери 40 фраз у уроках за день.' },
  { id:'ta8', type:'total_answers', icon:'✅', target:15, xp:30,
    titleRU:'Хороший старт', titleUK:'Хороший старт',
    descRU:'Собери 15 фраз в уроке.',
    descUK:'Збери 15 фраз в уроці.' },
  { id:'ta9', type:'total_answers', icon:'⚡', target:5, xp:14,
    titleRU:'Пять ответов', titleUK:'П\'ять відповідей',
    descRU:'Собери всего 5 фраз в уроке — разогрев на сегодня.',
    descUK:'Збери всього 5 фраз в уроці — розігрів на сьогодні.' },
  { id:'ta10', type:'total_answers', icon:'🔥', target:35, xp:54,
    titleRU:'Упорный', titleUK:'Завзятий',
    descRU:'Собери 35 фраз в уроках за день.',
    descUK:'Збери 35 фраз у уроках за день.' },
  { id:'ta11', type:'total_answers', icon:'🚀', target:60, xp:84,
    titleRU:'Шесть десятков', titleUK:'Шість десятків',
    descRU:'Собери 60 фраз в уроках за день.',
    descUK:'Збери 60 фраз у уроках за день.' },

  // Дополнительные correct_streak
  { id:'cs5', type:'correct_streak', icon:'⚡', target:25, xp:102,
    titleRU:'Мастер серий', titleUK:'Майстер серій',
    descRU:'Собери 25 фраз подряд в уроке — не прерви серию.',
    descUK:'Збери 25 фраз поспіль в уроці — не переривай серію.' },
  { id:'cs6', type:'correct_streak', icon:'🎯', target:7, xp:38,
    titleRU:'Семь в цель', titleUK:'Сім у ціль',
    descRU:'Собери 7 фраз подряд в уроке без единой ошибки.',
    descUK:'Збери 7 фраз поспіль в уроці без жодної помилки.' },
  { id:'cs7', type:'correct_streak', icon:'🔥', target:12, xp:58,
    titleRU:'Дюжина', titleUK:'Дюжина',
    descRU:'Собери 12 фраз подряд — держи серию.',
    descUK:'Збери 12 фраз поспіль — тримай серію.' },

  // Дополнительные lesson_no_mistakes
  { id:'lnm4', type:'lesson_no_mistakes', icon:'🌟', target:25, xp:144,
    titleRU:'Идеальная серия', titleUK:'Ідеальна серія',
    descRU:'Собери 25 фраз подряд — максимальная концентрация.',
    descUK:'Збери 25 фраз поспіль — максимальна концентрація.' },
  { id:'lnm5', type:'lesson_no_mistakes', icon:'💎', target:30, xp:180,
    titleRU:'Совершенство', titleUK:'Досконалість',
    descRU:'Собери 30 фраз подряд без единой ошибки — ты неудержим.',
    descUK:'Збери 30 фраз поспіль без жодної помилки — ти нестримний.' },
  { id:'lnm6', type:'lesson_no_mistakes', icon:'✨', target:8, xp:60,
    titleRU:'Восьмёрка без промаха', titleUK:'Вісімка без промаху',
    descRU:'Собери 8 фраз подряд в уроке — хорошая серия.',
    descUK:'Збери 8 фраз поспіль в уроці — гарна серія.' },

  // Дополнительные quiz_easy
  { id:'qe4', type:'quiz_easy', icon:'🌿', target:7, xp:22,
    titleRU:'Семёрка в квизе', titleUK:'Сімка в квізі',
    descRU:'Собери 7 фраз в Квизах на уровне Легко.',
    descUK:'Збери 7 фраз у Квізах на рівні Легко.' },
  { id:'qe5', type:'quiz_easy', icon:'🌱', target:15, xp:38,
    titleRU:'Полтора раунда', titleUK:'Півтора раунду',
    descRU:'Собери 15 фраз в Квизах на уровне Легко — примерно 1,5 раунда.',
    descUK:'Збери 15 фраз у Квізах на рівні Легко — приблизно 1,5 раунди.' },
  { id:'qe6', type:'quiz_easy', icon:'🌱', target:4, xp:14,
    titleRU:'Разгон', titleUK:'Розгін',
    descRU:'Собери 4 фразы в Квизах на уровне Легко — быстрый разгон.',
    descUK:'Збери 4 фрази у Квізах на рівні Легко — швидкий розгін.' },

  // Дополнительные quiz_medium (Premium)
  { id:'qm3', type:'quiz_medium', icon:'⚔️', target:3, xp:18, minPlayerLevel:8,
    titleRU:'Вход на средний', titleUK:'Вхід на середній',
    descRU:'Открой Квизы → Средне и собери 3 фразы.',
    descUK:'Відкрий Квізи → Середньо й збери 3 фрази.' },
  { id:'qm4', type:'quiz_medium', icon:'⚔️', target:15, xp:60, minPlayerLevel:8,
    titleRU:'Средний мастер плюс', titleUK:'Середній майстер плюс',
    descRU:'Собери 15 фраз в Квизах на уровне Средне.',
    descUK:'Збери 15 фраз у Квізах на рівні Середньо.' },

  // Дополнительные quiz_hard (Premium)
  { id:'qh5', type:'quiz_hard', icon:'💪', target:7, xp:66, minPlayerLevel:15,
    titleRU:'Семь на сложном', titleUK:'Сім на складному',
    descRU:'Открой Квизы → Сложно и собери 7 фраз.',
    descUK:'Відкрий Квізи → Складно й збери 7 фраз.' },
  { id:'qh6', type:'quiz_hard', icon:'👑', target:20, xp:108, minPlayerLevel:15,
    titleRU:'Двадцать на сложном', titleUK:'Двадцять на складному',
    descRU:'Собери 20 фраз в Квизах на уровне Сложно.',
    descUK:'Збери 20 фраз у Квізах на рівні Складно.' },

  // Дополнительные quiz_score
  { id:'qs5', type:'quiz_score', icon:'💥', target:70, xp:114, minPlayerLevel:15,
    titleRU:'Семь десятков', titleUK:'Сім десятків',
    descRU:'Заработай 70 XP в Квизах за день — играй на Сложно и держи серию.',
    descUK:'Зароби 70 XP у Квізах за день — грай на Складно і тримай серію.' },
  { id:'qs6', type:'quiz_score', icon:'⭐', target:5, xp:14,
    titleRU:'Первые очки', titleUK:'Перші очки',
    descRU:'Заработай 5 XP в Квизах за день — любой уровень.',
    descUK:'Зароби 5 XP у Квізах за день — будь-який рівень.' },
  { id:'qs7', type:'quiz_score', icon:'🌟', target:15, xp:36,
    titleRU:'Пятнашки', titleUK:'П\'ятнашки',
    descRU:'Заработай 15 XP в Квизах за день.',
    descUK:'Зароби 15 XP у Квізах за день.' },

  // Дополнительные quiz_perfect (Premium)
  { id:'qp2', type:'quiz_perfect', icon:'✨', target:2, xp:96, minPlayerLevel:8,
    titleRU:'Дважды идеально', titleUK:'Двічі ідеально',
    descRU:'Заверши 2 раунда в Квизах без единой ошибки сегодня.',
    descUK:'Заверши 2 раунди в Квізах без жодної помилки сьогодні.' },

  // Дополнительный quiz_hard_perfect (Premium)
  { id:'qhp2', type:'quiz_hard_perfect', icon:'💥', target:1, xp:108, minPlayerLevel:15,
    titleRU:'Сложно и чисто', titleUK:'Складно і чисто',
    descRU:'Пройди раунд Квизов на уровне Сложно без единой ошибки.',
    descUK:'Пройди раунд Квізів на рівні Складно без жодної помилки.' },

  // Дополнительные flashcard_view
  { id:'fv4', type:'flashcard_view', icon:'🃏', target:3, xp:14,
    titleRU:'Три карточки', titleUK:'Три картки',
    descRU:'Открой раздел Карточки и пролистай 3 карточки.',
    descUK:'Відкрий розділ Картки і перегортай 3 картки.' },
  { id:'fv5', type:'flashcard_view', icon:'🃏', target:15, xp:54,
    titleRU:'Пятнашки в картах', titleUK:'П\'ятнашки в картах',
    descRU:'Открой раздел Карточки и пролистай 15 карточек.',
    descUK:'Відкрий розділ Картки і перегортай 15 карток.' },
  { id:'fv6', type:'flashcard_view', icon:'🃏', target:7, xp:30,
    titleRU:'Семь карточек', titleUK:'Сім карток',
    descRU:'Открой раздел Карточки и пролистай 7 карточек.',
    descUK:'Відкрий розділ Картки і перегортай 7 карток.' },

  // Дополнительные flashcard_save
  { id:'fs4', type:'flashcard_save', icon:'💾', target:2, xp:30,
    titleRU:'Два в копилку', titleUK:'Два в скарбничку',
    descRU:'Сохрани 2 фразы в Карточки через кнопку Save в уроках.',
    descUK:'Збережи 2 фрази у Картки через кнопку Save на уроках.' },
  { id:'fs5', type:'flashcard_save', icon:'💾', target:4, xp:48,
    titleRU:'Четыре в коллекции', titleUK:'Чотири в колекції',
    descRU:'Сохрани 4 фразы в Карточки через кнопку Save в уроках.',
    descUK:'Збережи 4 фрази у Картки через кнопку Save на уроках.' },
  { id:'fs6', type:'flashcard_save', icon:'⭐', target:1, xp:18,
    titleRU:'Памятная фраза', titleUK:'Пам\'ятна фраза',
    descRU:'Нажми Save на 1 понравившейся фразе в уроке.',
    descUK:'Натисни Save біля однієї фрази, яка сподобалась, у уроці.' },

  // Дополнительные flashcard_flip
  { id:'ff4', type:'flashcard_flip', icon:'🔄', target:3, xp:14,
    titleRU:'Три поворота', titleUK:'Три поворота',
    descRU:'В разделе Карточки нажми на 3 карточки чтобы увидеть перевод.',
    descUK:'В розділі Картки натисни на 3 картки щоб побачити переклад.' },
  { id:'ff5', type:'flashcard_flip', icon:'🔄', target:20, xp:78,
    titleRU:'Весь набор', titleUK:'Весь набір',
    descRU:'В разделе Карточки нажми на 20 карточек — проверь переводы всех.',
    descUK:'В розділі Картки натисни на 20 карток — перевір переклади всіх.' },
  { id:'ff6', type:'flashcard_flip', icon:'🔄', target:7, xp:30,
    titleRU:'Семёрка переворотов', titleUK:'Сімка переворотів',
    descRU:'В разделе Карточки нажми на 7 карточек чтобы увидеть переводы.',
    descUK:'В розділі Картки натисни на 7 карток щоб побачити переклади.' },

  // Дополнительные recall_session
  { id:'rs2', type:'recall_session', icon:'🔁', target:1, xp:24,
    titleRU:'Освежаю память', titleUK:'Освіжаю пам\'ять',
    descRU:'Открой раздел Повторение и правильно ответь хотя бы на одну карточку — освежи то, что знаешь.',
    descUK:'Відкрий розділ Повторення й відповідай правильно хоча б на одну картку — освіж те, що знаєш.' },
  { id:'rs3', type:'recall_session', icon:'🧩', target:1, xp:24,
    titleRU:'Сессия повторения', titleUK:'Сесія повторення',
    descRU:'Открой Повторение и правильно ответь хотя бы на одну карточку — система запомнит твой прогресс.',
    descUK:'Відкрий Повторення й відповідай правильно хоча б на одну картку — застосунок збереже прогрес.' },

  // Дополнительные recall_answers
  { id:'ra3', type:'recall_answers', icon:'🧠', target:3, xp:24,
    titleRU:'Три в повторе', titleUK:'Три в повторенні',
    descRU:'Правильно ответь на 3 карточки в разделе Повторение.',
    descUK:'Відповідай правильно на 3 картки у розділі Повторення.' },
  { id:'ra4', type:'recall_answers', icon:'🧠', target:10, xp:84,
    titleRU:'Десятка в повторе', titleUK:'Десятка в повторенні',
    descRU:'Правильно ответь на 10 карточек в разделе Повторение — понадобятся 2 сессии.',
    descUK:'Відповідай правильно на 10 карток у розділі Повторення — знадобляться 2 сесії.' },
  { id:'ra5', type:'recall_answers', icon:'🔮', target:4, xp:30,
    titleRU:'Четыре на повторе', titleUK:'Чотири на повторенні',
    descRU:'Правильно ответь на 4 карточки в разделе Повторение сегодня.',
    descUK:'Відповідай правильно на 4 картки у розділі Повторення сьогодні.' },

  // Дополнительный recall_perfect
  { id:'rp2', type:'recall_perfect', icon:'🌟', target:1, xp:72,
    titleRU:'Идеальная память', titleUK:'Ідеальна пам\'ять',
    descRU:'Пройди сессию Повторения без единой ошибки — нужно минимум 5 карточек.',
    descUK:'Пройди сесію Повторення без жодної помилки — потрібно мінімум 5 карток.' },

  // Дополнительные verb_learned
  { id:'vl4', type:'verb_learned', icon:'🔤', target:1, xp:18,
    titleRU:'Первый глагол', titleUK:'Перше дієслово',
    descRU:'Выучи 1 неправильный глагол в разделе Глаголы любого урока.',
    descUK:'Вивчи 1 неправильне дієслово в розділі Дієслова будь-якого уроку.' },
  { id:'vl5', type:'verb_learned', icon:'⚙️', target:3, xp:42,
    titleRU:'Три глагола', titleUK:'Три дієслова',
    descRU:'Выучи 3 неправильных глагола в разделе Глаголы.',
    descUK:'Вивчи 3 неправильних дієслова в розділі Дієслова.' },
  { id:'vl6', type:'verb_learned', icon:'🔩', target:8, xp:96,
    titleRU:'Восемь форм', titleUK:'Вісім форм',
    descRU:'Выучи 8 неправильных глаголов в разделе Глаголы.',
    descUK:'Вивчи 8 неправильних дієслів в розділі Дієслова.' },

  // Дополнительные words_learned
  { id:'wl4', type:'words_learned', icon:'📗', target:15, xp:96,
    titleRU:'Словарный прорыв', titleUK:'Словниковий прорив',
    descRU:'Выучи 15 слов в разделе Слова — можно в разных уроках.',
    descUK:'Вивчи 15 слів в розділі Слова — можна в різних уроках.' },
  { id:'wl5', type:'words_learned', icon:'📝', target:7, xp:60,
    titleRU:'Семь слов', titleUK:'Сім слів',
    descRU:'Выучи 7 слов в разделе Слова любого урока.',
    descUK:'Вивчи 7 слів у розділі Слова будь-якого уроку.' },
  { id:'wl6', type:'words_learned', icon:'📖', target:2, xp:24,
    titleRU:'Два слова', titleUK:'Два слова',
    descRU:'Выучи 2 слова в разделе Слова любого урока — быстрое задание.',
    descUK:'Вивчи 2 слова в розділі Слова будь-якого уроку — швидке завдання.' },

  // Дополнительный open_theory
  { id:'ot3', type:'open_theory', icon:'📚', target:3, xp:30,
    titleRU:'Три правила', titleUK:'Три правила',
    descRU:'Открой вкладку Теория в 3 разных уроках — изучи грамматику.',
    descUK:'Відкрий вкладку Теорія в 3 різних уроках — вивчи граматику.' },
  { id:'ot4', type:'open_theory', icon:'💡', target:1, xp:12,
    titleRU:'Открой правило', titleUK:'Відкрий правило',
    descRU:'Загляни в Теорию любого урока — освежи знание правил.',
    descUK:'Зазирни в Теорію будь-якого уроку — освіжи знання правил.' },

  // Дополнительные different_lessons
  { id:'dl3', type:'different_lessons', icon:'🗂️', target:4, xp:102,
    titleRU:'Четыре урока за день', titleUK:'Чотири уроки за день',
    descRU:'Собери хотя бы по одной фразе в 4 разных уроках за день.',
    descUK:'Збери хоча б по одній фразі у 4 різних уроках за день.' },

  // Дополнительные lesson_complete
  { id:'lc2', type:'lesson_complete', icon:'🏆', target:2, xp:96,
    titleRU:'Два финиша', titleUK:'Два фінішу',
    descRU:'Пройди 2 урока полностью — дойди до экрана завершения в каждом.',
    descUK:'Пройди 2 уроки повністю — дійди до екрана завершення в кожному.' },
  { id:'lc3', type:'lesson_complete', icon:'🎓', target:3, xp:132,
    titleRU:'Тройной финиш', titleUK:'Потрійний фініш',
    descRU:'Пройди 3 урока полностью — академическая сессия за день.',
    descUK:'Пройди 3 уроки повністю — академічна сесія за день.' },
  { id:'lc4', type:'lesson_complete', icon:'🏁', target:1, xp:60,
    titleRU:'Финишная черта', titleUK:'Фінішна риска',
    descRU:'Пройди любой урок полностью до экрана победы.',
    descUK:'Пройди будь-який урок повністю до екрана перемоги.' },

  // Дополнительные morning_session
  { id:'ms2', type:'morning_session', icon:'🌤️', target:3, xp:24,
    titleRU:'Утренние три', titleUK:'Ранкові три',
    descRU:'Собери 3 фразы в уроке до 12:00 — доброе утро, учёба!',
    descUK:'Збери 3 фрази в уроці до 12:00 — доброго ранку, навчання!' },
  { id:'ms3', type:'morning_session', icon:'☀️', target:10, xp:66,
    titleRU:'Утренний марафон', titleUK:'Ранковий марафон',
    descRU:'Собери 10 фраз в уроке до 12:00 — серьёзная утренняя сессия.',
    descUK:'Збери 10 фраз в уроці до 12:00 — серйозна ранкова сесія.' },
  { id:'ms4', type:'morning_session', icon:'🌅', target:7, xp:48,
    titleRU:'Семь до полудня', titleUK:'Сім до полудня',
    descRU:'Собери 7 фраз в уроке до 12:00.',
    descUK:'Збери 7 фраз в уроці до 12:00.' },

  // Дополнительные evening_session
  { id:'evs2', type:'evening_session', icon:'🌆', target:3, xp:24,
    titleRU:'Вечерние три', titleUK:'Вечірні три',
    descRU:'Собери 3 фразы в уроке после 18:00 — вечерний ритуал.',
    descUK:'Збери 3 фрази в уроці після 18:00 — вечірній ритуал.' },
  { id:'evs3', type:'evening_session', icon:'🌠', target:10, xp:66,
    titleRU:'Вечерний марафон', titleUK:'Вечірній марафон',
    descRU:'Собери 10 фраз в уроке после 18:00 — мощная вечерняя сессия.',
    descUK:'Збери 10 фраз в уроці після 18:00 — потужна вечірня сесія.' },
  { id:'evs4', type:'evening_session', icon:'🌙', target:7, xp:48,
    titleRU:'Семь вечером', titleUK:'Сім ввечері',
    descRU:'Собери 7 фраз в уроке после 18:00.',
    descUK:'Збери 7 фраз в уроці після 18:00.' },

  // Дополнительные daily_phrase
  { id:'dpr2', type:'daily_phrase_read', icon:'📰', target:1, xp:12,
    titleRU:'Слово дня', titleUK:'Слово дня',
    descRU:'Нажми на фразу дня на главном экране и прочитай её.',
    descUK:'Натисни на фразу дня на головному екрані і прочитай її.' },
  { id:'dpr3', type:'daily_phrase_read', icon:'💬', target:1, xp:12,
    titleRU:'Свежая фраза', titleUK:'Свіжа фраза',
    descRU:'На главном экране найди и прочитай фразу дня.',
    descUK:'На головному екрані знайди і прочитай фразу дня.' },
  { id:'dps2', type:'daily_phrase_save', icon:'⭐', target:1, xp:18,
    titleRU:'Сохрани в память', titleUK:'Збережи в пам\'ять',
    descRU:'Открой фразу дня и нажми Save чтобы добавить в карточки.',
    descUK:'Відкрий фразу дня і натисни Save щоб додати в картки.' },
  { id:'dps3', type:'daily_phrase_save', icon:'📌', target:1, xp:18,
    titleRU:'Пометить фразу', titleUK:'Позначити фразу',
    descRU:'Сохрани фразу дня в Карточки — нажми Save на главном экране.',
    descUK:'Збережи фразу дня в Картки — натисни Save на головному екрані.' },

  // Дополнительный diagnostic_complete
  { id:'dc2', type:'diagnostic_complete', icon:'🩺', target:1, xp:96,
    titleRU:'Повторная диагностика', titleUK:'Повторна діагностика',
    descRU:'Снова пройди диагностический тест — проверь свой прогресс.',
    descUK:'Знову пройди діагностичний тест — перевір свій прогрес.' },

  // Дополнительные варианты для разнообразия
  { id:'ta12', type:'total_answers', icon:'💪', target:25, xp:42,
    titleRU:'Двадцать пять', titleUK:'Двадцять п\'ять',
    descRU:'Собери 25 фраз в уроках за день.',
    descUK:'Збери 25 фраз у уроках за день.' },
  { id:'cs8', type:'correct_streak', icon:'🌪️', target:30, xp:120,
    titleRU:'Тридцать в потоке', titleUK:'Тридцять у потоці',
    descRU:'Собери 30 фраз подряд — ты в абсолютном потоке.',
    descUK:'Збери 30 фраз поспіль — ти в абсолютному потоці.' },
  { id:'lc5', type:'lesson_complete', icon:'✅', target:1, xp:60,
    titleRU:'До конца', titleUK:'До кінця',
    descRU:'Пройди урок полностью — не останавливайся на полпути.',
    descUK:'Пройди урок повністю — не зупиняйся на півдорозі.' },
  { id:'fv7', type:'flashcard_view', icon:'🃏', target:25, xp:84,
    titleRU:'Коллекция карточек', titleUK:'Колекція карток',
    descRU:'Открой раздел Карточки и пролистай 25 карточек.',
    descUK:'Відкрий розділ Картки і перегортай 25 карток.' },
  { id:'ra6', type:'recall_answers', icon:'🧠', target:6, xp:48,
    titleRU:'Шесть на повторе', titleUK:'Шість на повторенні',
    descRU:'Правильно ответь на 6 карточек в разделе Повторение сегодня.',
    descUK:'Відповідай правильно на 6 карток у розділі Повторення сьогодні.' },
  { id:'ms5', type:'morning_session', icon:'🌞', target:5, xp:36,
    titleRU:'Пять утром', titleUK:'П\'ять вранці',
    descRU:'Собери 5 фраз в уроке до 12:00 — яркое начало дня.',
    descUK:'Збери 5 фраз в уроці до 12:00 — яскравий початок дня.' },
  { id:'evs5', type:'evening_session', icon:'🌃', target:5, xp:36,
    titleRU:'Пять вечером', titleUK:'П\'ять ввечері',
    descRU:'Собери 5 фраз в уроке после 18:00 — вечерний режим.',
    descUK:'Збери 5 фраз в уроці після 18:00 — вечірній режим.' },
  { id:'wl7', type:'words_learned', icon:'📕', target:4, xp:42,
    titleRU:'Четыре слова', titleUK:'Чотири слова',
    descRU:'Выучи 4 слова в разделе Слова любого урока.',
    descUK:'Вивчи 4 слова в розділі Слова будь-якого уроку.' },
  { id:'dl4', type:'different_lessons', icon:'📂', target:2, xp:48,
    titleRU:'Два урока сегодня', titleUK:'Два уроки сьогодні',
    descRU:'Открой 2 разных урока и собери хотя бы по одной фразе в каждом.',
    descUK:'Відкрий 2 різні уроки й збери хоча б по одній фразі в кожному.' },
  { id:'qe7', type:'quiz_easy', icon:'🍀', target:8, xp:24,
    titleRU:'Восемь лёгких', titleUK:'Вісім легких',
    descRU:'Собери 8 фраз в Квизах на уровне Легко.',
    descUK:'Збери 8 фраз у Квізах на рівні Легко.' },
  { id:'vl7', type:'verb_learned', icon:'📋', target:5, xp:66,
    titleRU:'Пять глаголов', titleUK:'П\'ять дієслів',
    descRU:'Выучи 5 неправильных глаголов в разделе Глаголы.',
    descUK:'Вивчи 5 неправильних дієслів в розділі Дієслова.' },
  { id:'rp3', type:'recall_perfect', icon:'🏅', target:1, xp:72,
    titleRU:'Чистое повторение', titleUK:'Чисте повторення',
    descRU:'Пройди сессию Повторения без единой ошибки (нужно минимум 5 карточек).',
    descUK:'Пройди сесію Повторення без жодної помилки (потрібно мінімум 5 карток).' },

  // Новый Тренер ошибок: отдельные задания для words / phrases / arena.
  { id:'tw1', type:'trainer_words', icon:'📚', target:3, xp:30,
    titleRU:'Разобрать слова', titleUK:'Розібрати слова',
    descRU:'В Моей практике правильно ответь на 3 карточки слов — закрой слабые места в словаре.',
    descUK:'У Моїй практиці правильно відповідай на 3 картки слів — закрий слабкі місця у словнику.' },
  { id:'tw2', type:'trainer_words', icon:'🧠', target:5, xp:48,
    titleRU:'Слова под контроль', titleUK:'Слова під контроль',
    descRU:'В Моей практике правильно ответь на 5 карточек слов.',
    descUK:'У Моїй практиці правильно відповідай на 5 карток слів.' },
  { id:'tp1', type:'trainer_phrases', icon:'💬', target:3, xp:36,
    titleRU:'Починить фразы', titleUK:'Полагодити фрази',
    descRU:'В Моей практике правильно собери 3 проблемные фразы.',
    descUK:'У Моїй практиці правильно склади 3 проблемні фрази.' },
  { id:'tp2', type:'trainer_phrases', icon:'🧩', target:5, xp:60,
    titleRU:'Фразы без провалов', titleUK:'Фрази без провалів',
    descRU:'В Моей практике правильно ответь на 5 карточек фраз.',
    descUK:'У Моїй практиці правильно відповідай на 5 карток фраз.' },
  { id:'tar1', type:'trainer_arena', icon:'🛡️', target:2, xp:42,
    titleRU:'Разбор ошибок', titleUK:'Розбір помилок',
    descRU:'В Моей практике правильно ответь на 2 вопроса, где раньше были ошибки.',
    descUK:'У Моїй практиці правильно відповідай на 2 питання, де раніше були помилки.' },
  { id:'tar2', type:'trainer_arena', icon:'⚔️', target:4, xp:72,
    titleRU:'Без старых ошибок', titleUK:'Без старих помилок',
    descRU:'В Моей практике правильно ответь на 4 вопроса из своих ошибок.',
    descUK:'У Моїй практиці правильно відповідай на 4 питання зі своїх помилок.' },

  // energy_spend — потратить N единиц энергии (только Free-аккаунт, Premium — безлимит)
  { id:'es1', type:'energy_spend', icon:'⚡', target:3, xp:30, freeOnly:true,
    titleRU:'Трата энергии', titleUK:'Витрата енергії',
    descRU:'Потрать 3 единицы энергии — делай ошибки в уроках или играй в арены.',
    descUK:'Витрать 3 одиниці енергії — роби помилки на уроках або грай у дуелі.' },
  { id:'es2', type:'energy_spend', icon:'⚡', target:5, xp:48, freeOnly:true,
    titleRU:'Полная отдача', titleUK:'Повна віддача',
    descRU:'Потрать 5 единиц энергии — делай ошибки в уроках или играй в арены.',
    descUK:'Витрать 5 одиниць енергії — роби помилки на уроках або грай у дуелі.' },
  { id:'es3', type:'energy_spend', icon:'⚡', target:2, xp:22, freeOnly:true,
    titleRU:'Первые потери', titleUK:'Перші втрати',
    descRU:'Потрать 2 единицы энергии — ошибайся в уроках и учись на ошибках.',
    descUK:'Витрать 2 одиниці енергії — помиляйся на уроках і вчись на помилках.' },
  { id:'es4', type:'energy_spend', icon:'⚡', target:7, xp:66, freeOnly:true,
    titleRU:'Тяжёлый день', titleUK:'Важкий день',
    descRU:'Потрать 7 единиц энергии за день — интенсивные тренировки в уроках.',
    descUK:'Витрать 7 одиниць енергії за день — інтенсивні тренування на уроках.' },

  // arena_play — N рейтинг-матчей в день против другого игрока (см. arena_results: не bot_)
  { id:'dp1', type:'arena_play', icon:'⚔️', target:1, xp:24,
    titleRU:'Первая арена', titleUK:'Перша арена',
    descRU:'Сыграй 1 рейтинговый матч в Арене против другого игрока.',
    descUK:'Зіграй 1 рейтинговий матч в Арені проти іншого гравця.' },
  { id:'dp2', type:'arena_play', icon:'⚔️', target:3, xp:54,
    titleRU:'Боец', titleUK:'Боєць',
    descRU:'Сыграй 3 рейтинговых матча в Арене за день против других игроков.',
    descUK:'Зіграй 3 рейтингові матчі в Арені за день проти інших гравців.' },
  { id:'dp3', type:'arena_play', icon:'⚔️', target:5, xp:84,
    titleRU:'Боец арены', titleUK:'Боєць арени',
    descRU:'Сыграй 5 рейтинговых матчей в Арене за день против других игроков.',
    descUK:'Зіграй 5 рейтингових матчів в Арені за день проти інших гравців.' },
  { id:'dp4', type:'arena_play', icon:'⚔️', target:2, xp:42,
    titleRU:'Два поединка', titleUK:'Два поєдинки',
    descRU:'Сыграй 2 матча в Арене за день против других игроков.',
    descUK:'Зіграй 2 матчі в Арені за день проти інших гравців.' },
  { id:'dp2w1', type:'arena_plays_wins_combo', icon:'🎯', target:2, xp:62,
    arenaCombo: { minPlays: 2, minWins: 1 },
    titleRU:'Два матча и победа', titleUK:'Два матчі й перемога',
    descRU:'Сыграй 2 матча в Арене против других игроков и выиграй хотя бы в одном.',
    descUK:'Зіграй 2 матчі в Арені проти інших гравців і виграй хоча б в одному.' },
  { id:'dp3w2', type:'arena_plays_wins_combo', icon:'🎖️', target:3, xp:82,
    arenaCombo: { minPlays: 3, minWins: 2 },
    titleRU:'Три матча, две победы', titleUK:'Три матчі, дві перемоги',
    descRU:'Сыграй 3 матча в Арене против других игроков и выиграй как минимум в двух.',
    descUK:'Зіграй 3 матчі в Арені проти інших гравців і виграй щонайменше в двох.' },
  { id:'dp5', type:'arena_play', icon:'⚔️', target:4, xp:70,
    titleRU:'Четыре боя', titleUK:'Чотири бої',
    descRU:'Сыграй 4 матча в Арене за день против других игроков.',
    descUK:'Зіграй 4 матчі в Арені за день проти інших гравців.' },

  // arena_win — N побед в рейтинге за день
  { id:'dw1', type:'arena_win', icon:'🏅', target:1, xp:36,
    titleRU:'Победитель', titleUK:'Переможець',
    descRU:'Выиграй 1 матч в Арене против другого игрока — набери больше очков, чем соперник.',
    descUK:'Виграй 1 матч в Арені проти іншого гравця — набери більше очок, ніж суперник.' },
  { id:'dw2', type:'arena_win', icon:'🥇', target:2, xp:66,
    titleRU:'Двойная победа', titleUK:'Подвійна перемога',
    descRU:'Выиграй 2 матча в Арене за день против других игроков.',
    descUK:'Виграй 2 матчі в Арені за день проти інших гравців.' },
  { id:'dw3', type:'arena_win', icon:'🏆', target:3, xp:96,
    titleRU:'Непобедимый', titleUK:'Непереможний',
    descRU:'Выиграй 3 матча в Арене за день против других игроков.',
    descUK:'Виграй 3 матчі в Арені за день проти інших гравців.' },
  { id:'dw4', type:'arena_win', icon:'⚡', target:4, xp:114,
    titleRU:'Четыре победы', titleUK:'Чотири перемоги',
    descRU:'Выиграй 4 матча в Арене за день против других игроков.',
    descUK:'Виграй 4 матчі в Арені за день проти інших гравців.' },
  { id:'dw5', type:'arena_win', icon:'🌟', target:5, xp:138,
    titleRU:'Пять побед', titleUK:'П\'ять перемог',
    descRU:'Выиграй 5 матчей в Арене за день против других игроков.',
    descUK:'Виграй 5 матчів в Арені за день проти інших гравців.' },

  { id:'arup1', type:'arena_rank_promoted', icon:'🚀', target:1, xp:66,
    titleRU:'Вверх по рангу', titleUK:'Вгору за рангом',
    descRU:'Повысь ранг в Арене за день: получи повышение уровня или лиги (тира) в рейтинговом матче против другого игрока.',
    descUK:'Підвищ ранг в Арені за день: отримай підвищення рівня чи ліги в рейтинговому матчі проти іншого гравця.' },

  { id:'inv1', type:'invite_friend', icon:'👥', target:1, xp:42,
    titleRU:'Пригласи друга', titleUK:'Запроси друга',
    descRU:'Открой приглашение друга и отправь ссылку.',
    descUK:'Відкрий запрошення друга й надішли посилання.' },
];

// ── Наборы заданий по тиру игрового уровня (30 дней × 3 задания) ──────────

// Тир 1: уровни 1–15 — базовые активности, лёгкие квизы, карточки, глаголы
const DAILY_SETS_TIER1: string[][] = [
  ['da1','ta9','dp1'],         // день 1
  ['da2','qe6','dp4'],         // день 2
  ['da3','ta1','dw1'],        // день 3
  ['da4','qs6','dp3'],         // день 4
  ['da5','cs1','dp5'],         // день 5
  ['da6','wl6','dw2'],         // день 6
  ['da7','lnm1','dw3'],        // день 7
  ['da8','ta8','dp2w1'],         // день 8
  ['da1','cs6','dw4'],         // день 9
  ['da2','tw1','dw5'],         // день 10
  ['da3','ta1','dp1'],        // день 11
  ['da4','qe4','dp4'],         // день 12
  ['da5','inv1','dw1'],       // день 13 — пригласить друга
  ['da6','cs1','dp3'],         // день 14
  ['da7','fs6','dp5'],         // день 15
  ['da8','ta9','dw2'],        // день 16
  ['da1','ot1','dp2w1'],         // день 17
  ['da2','fv4','arup1'],         // день 18
  ['da3','vl1','dp1'],         // день 19
  ['da4','dl4','dw1'],        // день 20
  ['da5','cs2','dp3'],         // день 21
  ['da6','qe1','dp5'],         // день 22
  ['da7','ta8','dw2'],         // день 23
  ['da8','es3','dw1'],         // день 24
  ['da1','lnm6','dp2w1'],       // день 25
  ['da2','ta9','arup1'],        // день 26
  ['da3','tp1','dp1'],         // день 27
  ['da4','dl1','dw1'],         // день 28
  ['da5','fs1','dp3'],        // день 29
  ['da6','qe4','dp4'],         // день 30
];

// Тир 2: уровни 16–30 — средние квизы, арены, серии, повторения
const DAILY_SETS_TIER2: string[][] = [
  ['da1','ta2','dp1'],         // день 1
  ['da2','qm3','dw1'],         // день 2
  ['da3','ta7','dp4'],        // день 3
  ['da4','qs2','dp3'],         // день 4
  ['da5','cs3','dp5'],         // день 5
  ['da6','arup1','qm1'],       // день 6 — повышение ранга в Арене
  ['da7','lnm2','dw2'],        // день 7
  ['da8','ta4','dw3'],         // день 8
  ['da1','cs7','dp2w1'],         // день 9
  ['da2','tw2','dw4'],         // день 10
  ['da3','inv1','dw5'],       // день 11 — пригласить друга
  ['da4','qe5','dp1'],         // день 12
  ['da5','vl5','dp4'],        // день 13
  ['da6','cs2','dw1'],         // день 14
  ['da7','fs4','dp3'],         // день 15
  ['da8','ta7','dp5'],        // день 16
  ['da1','ot2','dw2'],         // день 17
  ['da2','qm3','dp2w1'],         // день 18
  ['da3','vl2','arup1'],         // день 19
  ['da4','dl2','dp1'],        // день 20
  ['da5','cs3','dw1'],         // день 21
  ['da6','qp1','dp4'],         // день 22
  ['da7','ta5','dp3'],         // день 23
  ['da8','ot2','dp1'],         // день 24
  ['da1','lnm3','dp5'],       // день 25
  ['da2','ta3','dp1'],         // день 26
  ['da3','tp2','dp5'],         // день 27
  ['da4','dl1','dp2w1'],       // день 28 — 2 матча в Арене + ≥1 победа
  ['da5','fs2','dp2'],        // день 29
  ['da6','dp2','ta10'],         // день 30
];

// Тир 3: уровни 31–50 — сложные квизы, арены, перфекты, хардкор
const DAILY_SETS_TIER3: string[][] = [
  ['da1','ta11','dp1'],        // день 1
  ['da2','qh1','dw1'],         // день 2
  ['da3','ta6','dp4'],        // день 3
  ['da4','qs4','dp3'],         // день 4
  ['da5','cs4','dp5'],         // день 5
  ['da6','wl4','dw2'],         // день 6
  ['da7','lnm3','dw3'],        // день 7
  ['da8','ta5','dp2w1'],         // день 8
  ['da1','cs8','dw4'],         // день 9
  ['da2','tar1','dw5'],         // день 10
  ['da3','ta6','dp1'],        // день 11
  ['da4','qh5','dp4'],         // день 12
  ['da5','vl6','dw1'],        // день 13
  ['da6','arup1','qh4'],       // день 14 — повышение ранга в Арене
  ['da7','fs5','dp3'],         // день 15
  ['da8','ta11','dp5'],       // день 16
  ['da1','ot2','dw2'],         // день 17
  ['da2','qhp1','dp2w1'],        // день 18
  ['da3','vl3','arup1'],         // день 19
  ['da4','dl3','dp1'],        // день 20
  ['da5','dp3w2','ms3'],       // день 21 — 3 матча в Арене + ≥2 победы
  ['da6','qp2','dw1'],         // день 22
  ['da7','ta6','dp4'],         // день 23
  ['da8','ot2','dp1'],         // день 24
  ['da1','lnm5','dp5'],       // день 25
  ['da2','ta5','dp3'],         // день 26
  ['da3','tar2','dp5'],         // день 27
  ['da4','dl2','dp2w1'],       // день 28 — 2 матча в Арене + ≥1 победа
  ['da5','fs3','dw5'],         // день 29
  ['da6','dp2','ta10'],         // день 30
];

/** Выбирает набор наборов заданий по игровому уровню. */
const getSetsForPlayerLevel = (playerLevel: number): string[][] => {
  if (playerLevel <= 15) return DAILY_SETS_TIER1;
  if (playerLevel <= 30) return DAILY_SETS_TIER2;
  return DAILY_SETS_TIER3;
};

// ── Утилиты ───────────────────────────────────────────────────────────────
export const getTodayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Синхронная версия — без уровня, используется только внутри getTodayTasksSafe
const getTodayTasksByLevel = (playerLevel: number): DailyTask[] => {
  const sets = getSetsForPlayerLevel(playerLevel);
  const dayOfMonth = new Date().getDate();
  const setIdx = (dayOfMonth - 1) % sets.length;
  const ids = sets[setIdx];
  return ids.map(id => ALL_TASKS.find(t => t.id === id)!).filter(Boolean);
};

// Оставляем для обратной совместимости (используется в паре мест)
export const getTodayTasks = (): DailyTask[] => getTodayTasksByLevel(1);

// Резервные задания на случай если verb_learned недоступно (все глаголы выучены)
const VERB_FALLBACKS: Record<string, string> = {
  vl1: 'ta1',  vl2: 'ta2',  vl3: 'ta3',
  vl4: 'ta9',  vl5: 'ta8',  vl6: 'ta3',  vl7: 'ta3',
};

// Замены для заданий, недоступных по игровому уровню
const LEVEL_FALLBACKS: Record<string, string> = {
  // quiz_hard (уровень 15+) → quiz_easy
  qh1: 'qe1',  qh2: 'qe2',  qh3: 'qe3',  qh4: 'qe3',
  qh5: 'qe2',  qh6: 'qe3',
  // quiz_medium (уровень 8+) → quiz_easy
  qm1: 'qe1',  qm2: 'qe2',  qm3: 'qe6',  qm4: 'qe5',
  // quiz_perfect (уровень 8+) → total_answers
  qp1: 'ta1',  qp2: 'ta2',
  // quiz_hard_perfect (уровень 15+) → total_answers
  qhp1: 'ta2', qhp2: 'ta2',
  // quiz_score высокий (уровень 15+) → пониже
  qs4: 'qs2',  qs5: 'qs3',
};

// Замены freeOnly заданий для Premium-пользователей
const PREMIUM_FALLBACKS: Record<string, string> = {
  es1: 'dp1',  // energy_spend 3 → arena_play 1
  es2: 'dp2',  // energy_spend 5 → arena_play 3
  es3: 'rs1',  // energy_spend 2 → recall_session
  es4: 'dp3',  // energy_spend 7 → arena_play 5
};

/** Сколько слотов «про Арену» в тройке после подмены freeOnly для Premium (как в getTodayTasksSafe). */
const countResolvedArenaSlots = (rawIds: string[], usePremiumResolution: boolean): number => {
  const resolved = rawIds.map(id => {
    if (!usePremiumResolution) return id;
    const def = ALL_TASKS.find(t => t.id === id);
    if (def?.freeOnly) {
      const rep = PREMIUM_FALLBACKS[id];
      if (rep) return rep;
    }
    return id;
  });
  let n = 0;
  for (const id of resolved) {
    const def = ALL_TASKS.find(t => t.id === id);
    if (def && isArenaDailyTaskType(def.type)) n += 1;
  }
  return n;
};

/**
 * Проверка политики: ровно одно задание типа арены в каждой дневной тройке для Free и Premium
 * (Premium — с учётом PREMIUM_FALLBACKS для freeOnly).
 */
export function getDailySetsArenaPolicyErrors(): string[] {
  const tiers: { label: string; sets: string[][] }[] = [
    { label: 'DAILY_SETS_TIER1', sets: DAILY_SETS_TIER1 },
    { label: 'DAILY_SETS_TIER2', sets: DAILY_SETS_TIER2 },
    { label: 'DAILY_SETS_TIER3', sets: DAILY_SETS_TIER3 },
  ];
  const out: string[] = [];
  for (const { label, sets } of tiers) {
    sets.forEach((row, i) => {
      const day = i + 1;
      const freeN = countResolvedArenaSlots(row, false);
      if (freeN !== 1) {
        out.push(`${label} день ${day} (free): арена×${freeN}, ids=[${row.join(',')}]`);
      }
      const premN = countResolvedArenaSlots(row, true);
      if (premN !== 1) {
        out.push(`${label} день ${day} (premium): арена×${premN}, ids=[${row.join(',')}]`);
      }
    });
  }
  return out;
}

/** Читает игровой уровень (1–50) пользователя из AsyncStorage. */
export const getUserPlayerLevel = async (): Promise<number> => {
  try {
    const { getLevelFromXP } = await import('../constants/theme');
    const raw = await AsyncStorage.getItem('user_total_xp');
    return getLevelFromXP(parseInt(raw || '0', 10));
  } catch {}
  return 1;
};

/** Проверяет активен ли Premium у пользователя. */
const getUserIsPremium = async (): Promise<boolean> => {
  try {
    return await getVerifiedPremiumStatus();
  } catch {}
  return false;
};

// ═══════════════════════════════════════════════════════════════════════════
// DAILY TASK REROLL — замена надоевшего задания за осколки (1 раз/сутки)
// ═══════════════════════════════════════════════════════════════════════════

/** Цена одной замены задания. Сильно дешевле страховых трат — sink ради вовлечения, не монетизации. */
export const DAILY_TASK_REROLL_COST_SHARDS = 3;
/** Сколько замен в сутки разрешено. Изменение требует обновления UI-подсказки на экране задач. */
export const DAILY_TASK_REROLL_MAX_PER_DAY = 1;

const REROLL_STORAGE_KEY = 'daily_tasks_reroll_v1';
const ADMIN_TASK_OVERRIDE_STORAGE_KEY = 'daily_tasks_admin_override_v1';

interface RerollState {
  dayKey: string;
  /** origTaskId → newTaskId. Применяется в getTodayTasksSafe поверх дневного набора. */
  replacements: Record<string, string>;
}

type AdminTaskOverrideState = {
  dayKey: string;
  taskIds: string[];
};

export type DailyTaskSeedMode = 'empty' | 'ready' | 'claimed';

export type DailyTaskAdminPack = {
  id: string;
  label: string;
  taskIds: string[];
  types: TaskType[];
};

const loadAdminTaskOverride = async (): Promise<AdminTaskOverrideState | null> => {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_TASK_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminTaskOverrideState;
    if (!parsed || parsed.dayKey !== getTodayKey() || !Array.isArray(parsed.taskIds)) return null;
    const taskIds = parsed.taskIds.filter((id) => ALL_TASKS.some((t) => t.id === id));
    return taskIds.length > 0 ? { dayKey: parsed.dayKey, taskIds } : null;
  } catch {
    return null;
  }
};

export const clearDailyTasksAdminOverride = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ADMIN_TASK_OVERRIDE_STORAGE_KEY);
  } catch {}
};

export const getDailyTaskAdminPacks = (packSize = 3): DailyTaskAdminPack[] => {
  const safeSize = Math.max(1, Math.min(6, Math.floor(packSize) || 3));
  const packs: DailyTaskAdminPack[] = [];
  for (let i = 0; i < ALL_TASKS.length; i += safeSize) {
    const tasks = ALL_TASKS.slice(i, i + safeSize);
    packs.push({
      id: `daily_tasks_admin_pack_${Math.floor(i / safeSize) + 1}`,
      label: `${i + 1}-${i + tasks.length} / ${ALL_TASKS.length}`,
      taskIds: tasks.map((t) => t.id),
      types: tasks.map((t) => t.type),
    });
  }
  return packs;
};

const makeAdminProgressRow = (task: DailyTask, mode: DailyTaskSeedMode): TaskProgress => {
  const done = mode === 'ready' || mode === 'claimed';
  if (task.type === 'arena_plays_wins_combo') {
    const req = getArenaComboRequirement(task);
    return {
      taskId: task.id,
      current: done ? req.minPlays : 0,
      comboPlays: done ? req.minPlays : 0,
      comboWins: done ? req.minWins : 0,
      completed: done,
      claimed: mode === 'claimed',
    };
  }
  return {
    taskId: task.id,
    current: done ? task.target : 0,
    completed: done,
    claimed: mode === 'claimed',
  };
};

export const seedDailyTasksAdminPack = async (
  taskIds: string[],
  mode: DailyTaskSeedMode = 'empty',
): Promise<DailyTask[]> => {
  const tasks = taskIds
    .map((id) => ALL_TASKS.find((t) => t.id === id))
    .filter((t): t is DailyTask => Boolean(t));
  if (tasks.length === 0) return [];

  await AsyncStorage.setItem(ADMIN_TASK_OVERRIDE_STORAGE_KEY, JSON.stringify({
    dayKey: getTodayKey(),
    taskIds: tasks.map((t) => t.id),
  }));
  await saveTodayProgress(tasks.map((task) => makeAdminProgressRow(task, mode)));
  return tasks;
};

const emptyRerollState = (): RerollState => ({ dayKey: getTodayKey(), replacements: {} });

const loadRerollStateRaw = async (): Promise<RerollState> => {
  try {
    const raw = await AsyncStorage.getItem(REROLL_STORAGE_KEY);
    if (!raw) return emptyRerollState();
    const parsed = JSON.parse(raw) as RerollState;
    // Сутки кончились — стираем замены, иначе вчерашние ID попадут в сегодняшнюю тройку.
    if (!parsed || parsed.dayKey !== getTodayKey()) return emptyRerollState();
    if (!parsed.replacements || typeof parsed.replacements !== 'object') return emptyRerollState();
    return parsed;
  } catch {
    return emptyRerollState();
  }
};

const saveRerollState = async (state: RerollState): Promise<void> => {
  try {
    await AsyncStorage.setItem(REROLL_STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

/** Сколько замен ещё доступно сегодня. */
export const getDailyRerollsLeftToday = async (): Promise<number> => {
  const s = await loadRerollStateRaw();
  return Math.max(0, DAILY_TASK_REROLL_MAX_PER_DAY - Object.keys(s.replacements).length);
};

/** Категории заданий — реролл подбирает кандидата из той же категории, чтобы сохранить баланс. */
type DailyTaskCategory = 'engage' | 'perfect' | 'quiz' | 'words' | 'flashcard' | 'recall' | 'trainer' | 'arena' | 'social';

const TASK_TYPE_CATEGORY: Record<TaskType, DailyTaskCategory> = {
  daily_active: 'engage',
  total_answers: 'engage',
  energy_spend: 'engage',
  lesson_complete: 'engage',
  different_lessons: 'engage',
  morning_session: 'engage',
  evening_session: 'engage',
  daily_phrase_read: 'engage',
  daily_phrase_save: 'engage',
  open_theory: 'engage',
  correct_streak: 'perfect',
  lesson_no_mistakes: 'perfect',
  quiz_easy: 'quiz',
  quiz_medium: 'quiz',
  quiz_hard: 'quiz',
  quiz_score: 'quiz',
  quiz_perfect: 'quiz',
  quiz_hard_perfect: 'quiz',
  words_learned: 'words',
  verb_learned: 'words',
  flashcard_view: 'flashcard',
  flashcard_save: 'flashcard',
  flashcard_flip: 'flashcard',
  recall_session: 'recall',
  recall_answers: 'recall',
  recall_perfect: 'recall',
  trainer_words: 'trainer',
  trainer_phrases: 'trainer',
  trainer_arena: 'trainer',
  arena_play: 'arena',
  arena_win: 'arena',
  arena_plays_wins_combo: 'arena',
  arena_rank_promoted: 'arena',
  invite_friend: 'social',
  diagnostic_complete: 'social',
};

/**
 * Применить override замен поверх массива id (используется в getTodayTasksSafe).
 * Если replacement-id неизвестен в ALL_TASKS — игнорируем (storage corruption / старая версия).
 */
const applyRerollReplacements = (ids: string[], replacements: Record<string, string>): string[] =>
  ids.map((id) => {
    const r = replacements[id];
    if (!r) return id;
    return ALL_TASKS.find((t) => t.id === r) ? r : id;
  });

export type RerollFailReason =
  | 'limit_reached'
  | 'task_already_completed'
  | 'task_not_found'
  | 'no_candidates'
  | 'insufficient_shards'
  | 'spend_failed'
  | 'unknown';

export type RerollResult =
  | { ok: true; newTaskId: string; cost: number }
  | { ok: false; reason: RerollFailReason };

/**
 * Подобрать кандидата на замену для taskId среди ALL_TASKS:
 * - в той же категории (engage/quiz/...),
 * - не уже в текущей тройке (учитывает уже применённые reroll-замены),
 * - проходит уровневую/премиумную проверки,
 * - для verb_learned — есть ещё не выученные глаголы.
 */
const pickRerollCandidate = async (
  taskId: string,
  currentIds: string[],
  playerLevel: number,
  isPremium: boolean,
): Promise<DailyTask | null> => {
  const orig = ALL_TASKS.find((t) => t.id === taskId);
  if (!orig) return null;
  const cat = TASK_TYPE_CATEGORY[orig.type];
  const usedIds = new Set(currentIds);

  // Доступны ли ещё неправильные глаголы (для возможной замены на verb_learned).
  let verbsAvailable = Number.POSITIVE_INFINITY;
  if (cat === 'words') {
    try {
      const raw = await AsyncStorage.getItem('irregular_verbs_global');
      const learned: Record<string, number> = raw ? JSON.parse(raw) : {};
      const learnedCount = Object.values(learned).filter((v) => v >= 3).length;
      const { IRREGULAR_VERBS_BY_LESSON } = await import('./irregular_verbs_data');
      const totalVerbs = Object.values(IRREGULAR_VERBS_BY_LESSON).reduce((s, arr) => s + arr.length, 0);
      verbsAvailable = totalVerbs - learnedCount;
    } catch {
      verbsAvailable = 0;
    }
  }

  const candidates = ALL_TASKS.filter((t) => {
    if (usedIds.has(t.id)) return false;
    if (TASK_TYPE_CATEGORY[t.type] !== cat) return false;
    if ((t.minPlayerLevel ?? 1) > playerLevel) return false;
    if (isPremium && t.freeOnly) return false;
    if (t.type === 'verb_learned' && t.target > verbsAvailable) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  // Случайный кандидат — лёгкая «лотерея» добавляет ощущение свежести каждой замене.
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] ?? null;
};

/**
 * Заменить задание taskId на случайное другое из той же категории.
 * Списывает осколки. Прогресс старого задания НЕ копируется на новое (новое стартует с нуля).
 *
 * Запрещено реролить уже выполненное (completed) или забранное (claimed) задание —
 * это бы давало бесплатное «получил награду → меняю».
 */
export const rerollDailyTask = async (taskId: string): Promise<RerollResult> => {
  try {
    const left = await getDailyRerollsLeftToday();
    if (left <= 0) return { ok: false, reason: 'limit_reached' };

    const [playerLevel, isPremium] = await Promise.all([getUserPlayerLevel(), getUserIsPremium()]);
    const tasks = await getTodayTasksSafe();
    const orig = tasks.find((t) => t.id === taskId);
    if (!orig) return { ok: false, reason: 'task_not_found' };

    const progress = await loadTodayProgress(tasks);
    const pRow = progress.find((p) => p.taskId === taskId);
    if (pRow && (pRow.completed || pRow.claimed)) {
      return { ok: false, reason: 'task_already_completed' };
    }

    const candidate = await pickRerollCandidate(taskId, tasks.map((t) => t.id), playerLevel, isPremium);
    if (!candidate) return { ok: false, reason: 'no_candidates' };

    const spent = await spendShards(DAILY_TASK_REROLL_COST_SHARDS, 'daily_task_reroll');
    if (!spent) return { ok: false, reason: 'insufficient_shards' };

    // Обновляем reroll-state и обнуляем прогресс старого id (чтобы не «висел»).
    await withStorageLock(async () => {
      const state = await loadRerollStateRaw();
      // Если уже сохранена замена для этого id — обновляем (на случай гонки).
      const replacements = { ...state.replacements, [taskId]: candidate.id };
      await saveRerollState({ dayKey: getTodayKey(), replacements });

      // Прогресс: добавим строку для нового id с нулём, удалим строку для старого.
      const key = STORAGE_PREFIX + getTodayKey();
      const raw = await AsyncStorage.getItem(key);
      const arr: TaskProgress[] = raw ? (JSON.parse(raw) as TaskProgress[]) : [];
      const filtered = Array.isArray(arr) ? arr.filter((p) => p.taskId !== taskId) : [];
      const seed: TaskProgress =
        candidate.type === 'arena_plays_wins_combo'
          ? reconcileArenaComboRow(candidate, undefined)
          : { taskId: candidate.id, current: 0, completed: false, claimed: false };
      filtered.push(seed);
      await AsyncStorage.setItem(key, JSON.stringify(filtered));
    });

    emitAppEvent('daily_task_rerolled', { oldTaskId: taskId, newTaskId: candidate.id });
    return { ok: true, newTaskId: candidate.id, cost: DAILY_TASK_REROLL_COST_SHARDS };
  } catch {
    return { ok: false, reason: 'unknown' };
  }
};

/**
 * Async версия getTodayTasks с тремя проверками:
 * 1. Если уровень пользователя ниже minLevel задания — заменяет на более лёгкое.
 * 2. Если пользователь Premium — freeOnly задания (energy_spend) заменяются.
 * 3. Если все глаголы уже выучены — заменяет verb_learned на total_answers.
 */
export const getTodayTasksSafe = async (): Promise<DailyTask[]> => {
  const [playerLevel, isPremium] = await Promise.all([getUserPlayerLevel(), getUserIsPremium()]);
  const adminOverride = await loadAdminTaskOverride();
  if (adminOverride) {
    return adminOverride.taskIds
      .map((id) => ALL_TASKS.find((t) => t.id === id))
      .filter((t): t is DailyTask => Boolean(t));
  }
  // Выбираем набор заданий по тиру уровня игрока
  const baseTasks = getTodayTasksByLevel(playerLevel);

  // 0. User reroll: подменяем id выбранных юзером заданий ДО уровневых/premium фолбэков,
  //    потому что замена — это уже осознанный выбор и фолбэки не должны её ломать.
  const rerollState = await loadRerollStateRaw();
  const rerolledIds = applyRerollReplacements(baseTasks.map((t) => t.id), rerollState.replacements);
  let result: DailyTask[] = rerolledIds
    .map((id) => ALL_TASKS.find((t) => t.id === id))
    .filter((t): t is DailyTask => Boolean(t));

  // 1. Страховка: если задание требует более высокий уровень — подменяем
  result = result.map(task => {
    const required = task.minPlayerLevel ?? 1;
    if (playerLevel >= required) return task;
    const fallbackId = LEVEL_FALLBACKS[task.id];
    return (fallbackId ? ALL_TASKS.find(t => t.id === fallbackId) : undefined) ?? task;
  });

  // 2. Для Premium-пользователей: заменяем freeOnly задания (energy_spend → duel/recall)
  if (isPremium) {
    result = result.map(task => {
      if (!task.freeOnly) return task;
      const fallbackId = PREMIUM_FALLBACKS[task.id];
      return (fallbackId ? ALL_TASKS.find(t => t.id === fallbackId) : undefined) ?? task;
    });
  }

  // 2. Замена verb_learned если глаголов недостаточно
  const hasVerbTask = result.some(t => t.type === 'verb_learned');
  if (!hasVerbTask) return result;

  const raw = await AsyncStorage.getItem('irregular_verbs_global');
  const learned: Record<string, number> = raw ? JSON.parse(raw) : {};
  const learnedCount = Object.values(learned).filter(v => v >= 3).length;

  const { IRREGULAR_VERBS_BY_LESSON } = await import('./irregular_verbs_data');
  const totalVerbs = Object.values(IRREGULAR_VERBS_BY_LESSON).reduce((s, arr) => s + arr.length, 0);
  const remaining = totalVerbs - learnedCount;

  result = result.map(task => {
    if (task.type !== 'verb_learned') return task;
    if (remaining >= task.target) return task;
    const fallbackId = VERB_FALLBACKS[task.id];
    return (fallbackId ? ALL_TASKS.find(t => t.id === fallbackId) : undefined) ?? task;
  });

  return result;
};

const STORAGE_PREFIX = 'daily_tasks_';

/**
 * Merges AsyncStorage progress with the current task list from getTodayTasksSafe().
 * If the set of task ids changes (level tier, premium, verb fallbacks, etc.), raw storage
 * can keep stale ids: the UI would show 0/… on every card while the header still counts
 * orphan rows. This keeps one row per current task and drops rows for ids no longer in the set.
 */
/** Сколько наград уже забрано — только по task id из текущего списка (игнор «лишних» строк в progress). */
export const countClaimedForTaskList = (tasks: DailyTask[], progress: TaskProgress[]): number => {
  if (tasks.length === 0) return 0;
  const ids = new Set(tasks.map(x => x.id));
  return progress.filter(p => p.claimed && ids.has(p.taskId)).length;
};

/**
 * «Фраза/слово дня» (read/save) публикуется под разными id (dpr1, dpr2, …) в сетах заданий.
 * Можно забрать награду в тосте по одному id, а в тройнике сейчас — другой id: без этой
 * синхронизации карточка остаётся с «Забрать», хотя награда за этот день уже получена.
 */
const TYPES_CLAIM_SYNC_ACROSS_ALT_IDS: ReadonlySet<TaskType> = new Set(['daily_phrase_read', 'daily_phrase_save']);

const rowTaskType = (currentTasks: DailyTask[], taskId: string): TaskType | undefined =>
  currentTasks.find(t => t.id === taskId)?.type ?? ALL_TASKS.find(t => t.id === taskId)?.type;

/**
 * Пометить claim по taskId; для daily_phrase_read/save — и все завершённые строки того же типа
 * (dpr1/dpr2/… в storage могут вести себя как дубликаты, иначе на экране остаётся «Забрать»).
 */
const applyClaimForTaskToProgress = (
  progress: TaskProgress[],
  currentTasks: DailyTask[],
  taskId: string,
  task: DailyTask,
): TaskProgress[] => {
  const syncType = TYPES_CLAIM_SYNC_ACROSS_ALT_IDS.has(task.type) ? task.type : null;
  return progress.map(p => {
    if (p.taskId === taskId) {
      return { ...p, claimed: true };
    }
    if (syncType && p.completed) {
      const t = rowTaskType(currentTasks, p.taskId);
      if (t === syncType) {
        return { ...p, claimed: true };
      }
    }
    return p;
  });
};

/** Составное задание arena_plays_wins_combo: выполнено при plays≥minPlays и wins≥minWins. */
const reconcileArenaComboRow = (task: DailyTask, p?: TaskProgress): TaskProgress => {
  const req = getArenaComboRequirement(task);
  const claimed = p?.claimed ?? false;
  const playsRaw = p?.comboPlays ?? p?.current ?? 0;
  const cap = req.minPlays + 15;
  const plays = Math.min(cap, Math.max(0, Math.round(playsRaw)));
  const wins = Math.min(cap, Math.max(0, Math.round(p?.comboWins ?? 0)));
  const currentDisplay = Math.min(plays, req.minPlays);
  const completed = claimed || (plays >= req.minPlays && wins >= req.minWins);
  return { taskId: task.id, current: currentDisplay, comboPlays: plays, comboWins: wins, completed, claimed };
};

const reconcileProgressToTasks = (stored: TaskProgress[], tasks: DailyTask[]): TaskProgress[] => {
  const mainRaw = tasks.map(t => {
    const p = stored.find(s => s.taskId === t.id);
    if (!p) {
      return t.type === 'arena_plays_wins_combo'
        ? reconcileArenaComboRow(t, undefined)
        : { taskId: t.id, current: 0, completed: false, claimed: false };
    }
    if (t.type === 'arena_plays_wins_combo') {
      return reconcileArenaComboRow(t, p);
    }
    const current = Math.min(Math.max(0, p.current), t.target);
    const claimed = p.claimed;
    const completed = claimed || current >= t.target;
    return { taskId: t.id, current, completed, claimed };
  });
  const main = mainRaw.map((row, i) => {
    const def = tasks[i];
    if (!def || !TYPES_CLAIM_SYNC_ACROSS_ALT_IDS.has(def.type) || !row.completed || row.claimed) {
      return row;
    }
    const hasSiblingClaimedElsewhere = stored.some(s => {
      if (s.taskId === row.taskId || !s.claimed) return false;
      const od = ALL_TASKS.find(t => t.id === s.taskId);
      return !!od && od.type === def.type;
    });
    if (!hasSiblingClaimedElsewhere) return row;
    return { ...row, claimed: true, completed: true };
  });
  const inCurrent = new Set(main.map(m => m.taskId));
  // Сохраняем строки для id, которые выпали из «сегодняшнего тройника» (другой уровень, Premium, фоллбэк глаголов
  // и т.д.). Иначе loadTodayProgress пересохранял бы только текущий список, а «Забрать» в глобальном тосте
  // смотрел бы пустоту: eligible = false, тост завис.
  const extras: TaskProgress[] = [];
  for (const s of stored) {
    if (inCurrent.has(s.taskId)) continue;
    const def = ALL_TASKS.find(t => t.id === s.taskId);
    if (!def) continue;
    if (def.type === 'arena_plays_wins_combo') {
      extras.push(reconcileArenaComboRow(def, s));
      continue;
    }
    const current = Math.min(Math.max(0, s.current), def.target);
    const claimed = s.claimed;
    const completed = claimed || current >= def.target;
    extras.push({ taskId: s.taskId, current, completed, claimed });
  }
  return extras.length > 0 ? [...main, ...extras] : main;
};

/**
 * @param tasksForReconcile — if provided, must be the same list the UI used from getTodayTasksSafe()
 *   so progress rows align with visible cards (avoids two async getToday calls diverging).
 */
export const loadTodayProgress = async (tasksForReconcile?: DailyTask[]): Promise<TaskProgress[]> => {
  try {
    const tasks = tasksForReconcile ?? (await getTodayTasksSafe());
    if (tasks.length === 0) {
      return [];
    }

    const key = STORAGE_PREFIX + getTodayKey();
    const raw = await AsyncStorage.getItem(key);
    let stored: TaskProgress[] = [];
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) stored = parsed as TaskProgress[];
      } catch { stored = []; }
    }

    const reconciled = reconcileProgressToTasks(stored, tasks);
    const newJson = JSON.stringify(reconciled);
    if (newJson !== raw) {
      await AsyncStorage.setItem(key, newJson);
    }
    return reconciled;
  } catch {
    return [];
  }
};

export const saveTodayProgress = async (progress: TaskProgress[]): Promise<void> => {
  try {
    const key = STORAGE_PREFIX + getTodayKey();
    await AsyncStorage.setItem(key, JSON.stringify(progress));
  } catch {}
};

// ── Главная функция — обновить прогресс задания ───────────────────────────
export const updateTaskProgress = async (
  type: TaskType,
  increment: number = 1,
): Promise<{ completed: TaskProgress | null; allProgress: TaskProgress[] }> => {
  const tasks = await getTodayTasksSafe();
  const progress = await loadTodayProgress(tasks);
  let newlyCompleted: TaskProgress | null = null;

  const updated = progress.map(p => {
    const task = tasks.find(t => t.id === p.taskId);
    if (!task || task.type !== type || p.completed) return p;
    const newCurrent = Math.round(Math.min(p.current + increment, task.target) * 10) / 10;
    const nowCompleted = newCurrent >= task.target;
    if (nowCompleted && !p.completed) {
        newlyCompleted = { ...p, current: newCurrent, completed: true };
        // Уведомляем глобальный тост о том, что задание выполнено и готово к получению
        emitAppEvent('daily_task_completed', { taskId: task.id });
      }
    return { ...p, current: newCurrent, completed: nowCompleted };
  });

  await saveTodayProgress(updated);
  return { completed: newlyCompleted, allProgress: updated };
};

// ── Сброс прогресса задания (например при ошибке в серии) ─────────────────
export const resetTaskProgress = async (type: TaskType): Promise<void> => {
  const tasks = await getTodayTasksSafe();
  const progress = await loadTodayProgress(tasks);

  const updated = progress.map(p => {
    const task = tasks.find(t => t.id === p.taskId);
    if (!task || task.type !== type || p.completed || p.claimed) return p;
    if (task.type === 'arena_plays_wins_combo') {
      return { ...p, current: 0, comboPlays: 0, comboWins: 0, completed: false };
    }
    return { ...p, current: 0 };
  });

  await saveTodayProgress(updated);
};

// ── Атомарный сброс нескольких типов + опциональные инкременты (без race condition) ──
export const resetAndUpdateTaskProgress = async (
  resets: TaskType[],
  updates: { type: TaskType; increment?: number }[] = [],
): Promise<void> => {
  const tasks = await getTodayTasksSafe();
  let progress = await loadTodayProgress(tasks);
  const wasCompleted = new Set(progress.filter(p => p.completed).map(p => p.taskId));

  // Сначала сбрасываем
  for (const type of resets) {
    progress = progress.map(p => {
      const task = tasks.find(t => t.id === p.taskId);
      if (!task || task.type !== type || p.completed || p.claimed) return p;
      if (task.type === 'arena_plays_wins_combo') {
        return { ...p, current: 0, comboPlays: 0, comboWins: 0, completed: false };
      }
      return { ...p, current: 0 };
    });
  }

  // Затем применяем инкременты
  for (const { type, increment = 1 } of updates) {
    progress = progress.map(p => {
      const task = tasks.find(t => t.id === p.taskId);
      if (!task || task.type !== type || p.completed) return p;
      const newCurrent = Math.round(Math.min(p.current + increment, task.target) * 10) / 10;
      return { ...p, current: newCurrent, completed: newCurrent >= task.target };
    });
  }

  await saveTodayProgress(progress);

  for (const p of progress) {
    if (p.completed && !wasCompleted.has(p.taskId)) {
      emitAppEvent('daily_task_completed', { taskId: p.taskId });
    }
  }
};

// ── Отметить задание как полученное (claimed) ─────────────────────────────
export const claimTask = async (taskId: string): Promise<boolean> => {
  return withStorageLock(async () => {
    const tasks = await getTodayTasksSafe();
    const progress = await loadTodayProgress(tasks);
    const pRow = progress.find(p => p.taskId === taskId);
    const task = tasks.find(t => t.id === taskId) ?? ALL_TASKS.find(t => t.id === taskId);
    if (!pRow || !task || pRow.claimed || !pRow.completed) {
      return false;
    }
    const updated = applyClaimForTaskToProgress(progress, tasks, taskId, task);
    await saveTodayProgress(updated);
    return true;
  });
};

export type ClaimTaskWithRewardOptions = {
  /**
   * Fallback, если getTodayTasksSafe() вернул [] или упал (редко). Обычно клейм всегда идёт
   * по свежему safe — иначе после смены тира/премиума старый снимок экрана ломал проверку.
   */
  tasksForClaim?: DailyTask[];
};

export const claimTaskWithReward = async (
  taskId: string,
  grantReward: () => Promise<number>,
  options?: ClaimTaskWithRewardOptions,
): Promise<{ claimed: boolean; awardedXp: number }> => {
  /**
   * Источник правды — свежий getTodayTasksSafe() (тир уровня / Premium / реролл / фолбэки).
   * Снапшот с экрана (tasksForClaim) только если safe вернул пусто — иначе после смены тира в проде
   * «Забрать» молча не проходило: UI ещё с старыми id, а storage уже согласован с новым набором.
   */
  const resolveTasks = async (): Promise<DailyTask[]> => {
    let fresh: DailyTask[] = [];
    try {
      fresh = await getTodayTasksSafe();
    } catch {
      fresh = [];
    }
    if (fresh.length > 0) return fresh;
    if (options?.tasksForClaim && options.tasksForClaim.length > 0) {
      return options.tasksForClaim;
    }
    return [];
  };
  // Нельзя держать storage lock на время registerXP (сеть/AsyncStorage) — иначе
  // updateMultipleTaskProgress из урока перезаписывает прогресс и «Забрать» молча не срабатывает.
  const eligible = await withStorageLock(async () => {
    const tasks = await resolveTasks();
    const progress = await loadTodayProgress(tasks);
    const current = progress.find(p => p.taskId === taskId);
    const task = tasks.find(t => t.id === taskId) ?? ALL_TASKS.find(t => t.id === taskId);
    return Boolean(current && task && !current.claimed && current.completed);
  });
  if (!eligible) {
    return { claimed: false, awardedXp: 0 };
  }

  let awardedXp = 0;
  try {
    awardedXp = await grantReward();
  } catch {
    return { claimed: false, awardedXp: 0 };
  }

  type LockOut =
    | { kind: 'fresh'; xp: number }
    | { kind: 'already' }
    | { kind: 'abort' };

  const lockResult: LockOut = await withStorageLock(async (): Promise<LockOut> => {
    const tasks = await resolveTasks();
    const progress = await loadTodayProgress(tasks);
    const current = progress.find(p => p.taskId === taskId);
    const task = tasks.find(t => t.id === taskId) ?? ALL_TASKS.find(t => t.id === taskId);
    if (!current || !task) {
      return { kind: 'abort' };
    }
    if (current.claimed) {
      return { kind: 'already' };
    }
    if (!current.completed) {
      return { kind: 'abort' };
    }
    const updated = applyClaimForTaskToProgress(progress, tasks, taskId, task);
    await saveTodayProgress(updated);
    void bumpDailyTaskClaimed();
    return { kind: 'fresh', xp: Math.max(0, Math.round(awardedXp)) };
  });

  // Вне storage lock: слушатели могут дергать loadTodayProgress/updateMultipleTaskProgress —
  // emit внутри lock теоретически давал бы взаимную блокировку на общем mutex.
  if (lockResult.kind === 'fresh') {
    emitAppEvent('daily_task_reward_claimed', { taskId });
    return { claimed: true, awardedXp: lockResult.xp };
  }
  if (lockResult.kind === 'already') {
    return { claimed: true, awardedXp: 0 };
  }
  return { claimed: false, awardedXp: 0 };
};

// ── Батч-обновление нескольких типов за одну операцию чтения/записи ──────────
// Используй вместо нескольких updateTaskProgress подряд — иначе race condition
export const updateMultipleTaskProgress = async (
  updates: { type: TaskType; increment?: number }[],
  opts?: { pvpArenaMatchFinished?: { won: boolean } },
): Promise<void> => {
  try {
    await withStorageLock(async () => {
      const tasks = await getTodayTasksSafe();
      let progress = await loadTodayProgress(tasks);

      // Safety: if progress is empty but tasks exist, reinitialize rather than overwrite with empty
      if (progress.length === 0 && tasks.length > 0) {
        progress = tasks.map(t =>
          t.type === 'arena_plays_wins_combo'
            ? reconcileArenaComboRow(t, undefined)
            : { taskId: t.id, current: 0, completed: false, claimed: false },
        );
      }

      for (const { type, increment = 1 } of updates) {
        progress = progress.map(p => {
          const task = tasks.find(t => t.id === p.taskId);
          if (!task || task.type !== type || p.completed) return p;
          const newCurrent = Math.round(Math.min(p.current + increment, task.target) * 10) / 10;
          const nowCompleted = newCurrent >= task.target;
          if (nowCompleted) {
            emitAppEvent('daily_task_completed', { taskId: task.id });
          }
          return { ...p, current: newCurrent, completed: nowCompleted };
        });
      }

      if (opts?.pvpArenaMatchFinished) {
        const { won } = opts.pvpArenaMatchFinished;
        progress = progress.map(p => {
          const task = tasks.find(t => t.id === p.taskId);
          if (!task || task.type !== 'arena_plays_wins_combo' || p.completed) return p;
          const req = getArenaComboRequirement(task);
          const plays = Math.min(30, (p.comboPlays ?? p.current ?? 0) + 1);
          const wins = (p.comboWins ?? 0) + (won ? 1 : 0);
          const completed = plays >= req.minPlays && wins >= req.minWins;
          if (completed && !p.completed) {
            emitAppEvent('daily_task_completed', { taskId: task.id });
          }
          return { ...p, comboPlays: plays, comboWins: wins, current: Math.min(plays, req.minPlays), completed };
        });
      }

      // Only save if progress has entries (prevent overwriting with empty array)
      if (progress.length > 0) {
        await saveTodayProgress(progress);
      }
    });
  } catch (error) {
    DebugLogger.error('daily_tasks:updateMultipleTaskProgress', error, 'warning');
    const now = Date.now();
    if (now - _lastDailyProgressWriteErrorToastAt >= DAILY_PROGRESS_WRITE_ERR_TOAST_COOLDOWN_MS) {
      _lastDailyProgressWriteErrorToastAt = now;
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось сохранить прогресс заданий. Попробуй ещё раз.',
          uk: 'Не вдалося зберегти прогрес завдань. Спробуй ще раз.',
          es: 'No se pudo guardar el progreso. Inténtalo de nuevo.',
        }),
      );
    }
  }
};

export const getTaskById = (id: string): DailyTask | undefined =>
  ALL_TASKS.find(t => t.id === id);

export { ALL_TASKS };


/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
