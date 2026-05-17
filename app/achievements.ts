import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { getLevelFromXP } from '../constants/theme';
import { ACHIEVEMENT_ES } from './achievements_es_locale';
import { addShardsRaw, getShardsBalance } from './shards_system';
import { registerXP } from './xp_manager';
import { emitAppEvent } from './events';
import { withStorageLock } from './storage_mutex';
import { writeFriendEvent } from './firestore_friend_activity';
import { DEV_MODE, IS_STORE_RELEASE } from './config';

/**
 * Достижения: ru/uk здесь; es — achievements_es_locale.ts.
 *
 * Качество текстов проверяем по 10 правилам:
 * 1. Соответствие коду — условие разблокировки = checkAchievements + источники событий.
 * 2. Без ложных деталей — не обещаем то, чего триггер не проверяет.
 * 3. Ясные числа — пороги дней, XP, уроков, % как в коде.
 * 4. Различие метрик — «цепочка активности (опыт)» ≠ «вход в приложение подряд».
 * 5. Единый стиль — короткое имя + одно предложение «что сделать».
 * 6. Пары RU/UK — тот же смысл, естественная грамматика.
 * 7. Секреты — не раскрывать условие лишнего до получения (где задумано).
 * 8. Без технического жаргона в UI — никаких id вроде gem_* в описании.
 * 9. Согласованность с ES — тот же смысл, что ACHIEVEMENT_ES.
 * 10. Краткость — описание до ~120 символов RU, без воды.
 */

export interface Achievement {
  id:       string;
  icon:     string;           // emoji (резерв / шаринг)
  category: 'streak' | 'lessons' | 'xp' | 'quiz' | 'combo' | 'special' | 'medal';
  nameRu:   string;
  nameUk:   string;
  nameEs?:  string;
  descRu:   string;
  descUk:   string;
  descEs?:  string;
  xp:       number;           // XP при первой разблокировке
  secret?:  boolean;          // скрыто, пока не получено
}

export interface AchievementState {
  id:          string;
  unlockedAt:  string | null; // ISO datetime
  notified:    boolean;       // показан тост
  /**
   * +1 осколок за достижение: после разблокировки = false, пока не забрано в магазине.
   * Для обратной совместимости: незаклеймленным в старых версиях считаем как true (до миграции shardClaimed).
   */
  shardClaimed?: boolean;
}

export function achievementNameForLang(a: Achievement, lang: Lang): string {
  if (lang === 'uk') return a.nameUk;
  if (lang === 'es') return a.nameEs ?? ACHIEVEMENT_ES[a.id]?.nameEs ?? a.nameRu;
  return a.nameRu;
}

export function achievementDescForLang(a: Achievement, lang: Lang): string {
  if (lang === 'uk') return a.descUk;
  if (lang === 'es') return a.descEs ?? ACHIEVEMENT_ES[a.id]?.descEs ?? a.descRu;
  return a.descRu;
}

// Список достижений пополняется без миграции: новые id подхватываются loadAchievementStates().

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Серии (streak) — streak_count: дни подряд с начислением XP (см. updateStreakOnActivity)
  {
    id:'streak_3', icon:'🔥', category:'streak', xp:30,
    nameRu:'Первые три',        nameUk:'Перші три',
    descRu:'Три дня подряд получай опыт в приложении (цепочка активности).',     descUk:'Три дні поспіль отримуй досвід у додатку (серія активності).',
  },
  {
    id:'streak_7', icon:'🥇', category:'streak', xp:75,
    nameRu:'Неделя подряд',       nameUk:'Тиждень поспіль',
    descRu:'7 дней подряд с начислением опыта; заморозка, починка или щит могут сохранить серию.',    descUk:'7 днів поспіль з нарахуванням досвіду; заморозка, відновлення або щит можуть зберегти серію.',
  },
  {
    id:'streak_14', icon:'🥈', category:'streak', xp:120,
    nameRu:'Две недели',        nameUk:'Два тижні',
    descRu:'14 дней подряд с опытом; это не то же самое, что ежедневный вход.',   descUk:'14 днів поспіль з досвідом; це не те саме, що щоденний вхід.',
  },
  {
    id:'streak_30', icon:'📅', category:'streak', xp:200,
    nameRu:'Месяц в строю',     nameUk:'Місяць у строю',
    descRu:'30 дней подряд получай хотя бы раз опыт за день.',   descUk:'30 днів поспіль отримуй хоча б раз досвід за день.',
  },
  {
    id:'streak_60', icon:'📆', category:'streak', xp:350,
    nameRu:'Два месяца',        nameUk:'Два місяці',
    descRu:'60 дней подряд поддерживай цепочку активности.',   descUk:'60 днів поспіль тримай серію активності.',
  },
  {
    id:'streak_100', icon:'💯', category:'streak', xp:500,
    nameRu:'Сто дней',          nameUk:'Сто днів',
    descRu:'100 дней подряд без «пустых» дней для цепочки.',  descUk:'100 днів поспіль без «пустих» днів для серії.',
  },
  {
    id:'streak_200', icon:'⭐', category:'streak', xp:750,
    nameRu:'Двести дней',       nameUk:'Двісті днів',
    descRu:'200 дней подряд с ежедневным опытом.',  descUk:'200 днів поспіль із щоденним досвідом.',
  },
  {
    id:'streak_365', icon:'🎉', category:'streak', xp:1200,
    nameRu:'Целый год',         nameUk:'Цілий рік',
    descRu:'365 дней подряд поддерживай серию как в счётчике цепочки.',  descUk:'365 днів поспіль тримай серію як у лічильнику стріка.',
  },
  {
    id:'streak_500', icon:'👑', category:'streak', xp:2000,
    nameRu:'500 дней',          nameUk:'500 днів',
    descRu:'500 дней подряд с опытом — редкое упорство.',  descUk:'500 днів поспіль з досвідом — рідкісна наполегливість.',
    secret: true,
  },
  {
    id:'streak_repair', icon:'🔁', category:'streak', xp:100,
    nameRu:'Феникс',            nameUk:'Фенікс',
    descRu:'Успей воспользоваться починкой после ровно одного пропущенного дня и завершить урок в тот же день.', descUk:'Встигни скористатися відновленням після рівно одного пропущеного дня й завершити урок того ж дня.',
  },
  {
    id:'perfect_week', icon:'✨', category:'streak', xp:150,
    nameRu:'Идеальная неделя',  nameUk:'Ідеальний тиждень',
    descRu:'Получай опыт каждый день с понедельника по воскресенье одной календарной недели.', descUk:'Отримуй досвід кожен день із понеділка по неділю одного календарного тижня.',
  },

  // Уроки — «завершён» = ≥45 верных в прогрессе урока
  {
    id:'lesson_1', icon:'📘', category:'lessons', xp:25,
    nameRu:'Первый шаг',        nameUk:'Перший крок',
    descRu:'Заверши один урок: зачёт при ≥45 верных ответов.',       descUk:'Заверши один урок: зарахунок при ≥45 правильних відповідей.',
  },
  {
    id:'lesson_3', icon:'📗', category:'lessons', xp:50,
    nameRu:'Три урока',         nameUk:'Три уроки',
    descRu:'Итого три разных урока с полным зачётом.',  descUk:'Усього три різні уроки з повним зарахунком.',
  },
  {
    id:'lesson_5', icon:'📙', category:'lessons', xp:75,
    nameRu:'Пять уроков',       nameUk:'П\'ять уроків',
    descRu:'Пять уроков доведено до зачёта.',          descUk:'П\'ять уроків доведено до зарахунку.',
  },
  {
    id:'lesson_10', icon:'🎓', category:'lessons', xp:150,
    nameRu:'Десять уроков',     nameUk:'Десять уроків',
    descRu:'Десять уроков с зачётом в активе.',         descUk:'Десять уроків із зарахунком у активі.',
  },
  {
    id:'lesson_15', icon:'📚', category:'lessons', xp:225,
    nameRu:'Пятнадцать',        nameUk:'П\'ятнадцять',
    descRu:'15 уроков завершено по правилам зачёта.',         descUk:'15 уроків завершено за правилами зарахунку.',
  },
  {
    id:'lesson_20', icon:'🏫', category:'lessons', xp:300,
    nameRu:'Двадцать уроков',   nameUk:'Двадцять уроків',
    descRu:'20 уроков с полным зачётом.',         descUk:'20 уроків із повним зарахунком.',
  },
  {
    id:'lesson_all', icon:'🏆', category:'lessons', xp:600,
    nameRu:'Полный курс',       nameUk:'Повний курс',
    descRu:'Все 32 урока хотя бы раз с зачётом.',      descUk:'Усі 32 уроки хоча б раз із зарахунком.',
  },
  {
    id:'lesson_perfect', icon:'✅', category:'lessons', xp:100,
    nameRu:'Ни одной ошибки',   nameUk:'Жодної помилки',
    descRu:'Пройди урок без ответов «ошибка» и с зачётом (≥45 верных).',   descUk:'Пройди урок без відповідей «помилка» й із зарахунком (≥45 правильних).',
  },
  {
    id:'lesson_perfect3', icon:'💯', category:'lessons', xp:200,
    nameRu:'Три идеальных',    nameUk:'Три ідеальних',
    descRu:'Три разных урока без ни одной ошибки в прогрессе.', descUk:'Три різні уроки без жодної помилки в прогресі.',
  },
  {
    id:'lesson_all_perfect', icon:'🌟', category:'lessons', xp:1500,
    nameRu:'Абсолют',           nameUk:'Абсолют',
    descRu:'Все 32 урока идеально: без «ошибка» в каждом.', descUk:'Усі 32 уроки ідеально: без «помилка» в кожному.',
    secret: true,
  },

  // XP — user_total_xp
  {
    id:'xp_100', icon:'⚡', category:'xp', xp:20,
    nameRu:'Первая сотня',      nameUk:'Перша сотня',
    descRu:'Накопи 100 XP в счётчике «всего опыта».',            descUk:'Накопич 100 XP у лічильнику «всього досвіду».',
  },
  {
    id:'xp_250', icon:'✨', category:'xp', xp:30,
    nameRu:'250 опыта',         nameUk:'250 досвіду',
    descRu:'250 XP суммарно (без учёта того, как ты их заработал).',            descUk:'250 XP загалом (незалежно від джерела).',
  },
  {
    id:'xp_500', icon:'💫', category:'xp', xp:50,
    nameRu:'Пятьсот',           nameUk:'П\'ятсот',
    descRu:'500 XP на общем счётчике.',            descUk:'500 XP на загальному лічильнику.',
  },
  {
    id:'xp_1000', icon:'⭐', category:'xp', xp:75,
    nameRu:'Тысячник',          nameUk:'Тисячник',
    descRu:'1 000 XP всего.',          descUk:'1 000 XP загалом.',
  },
  {
    id:'xp_2500', icon:'🌟', category:'xp', xp:100,
    nameRu:'2 500 опыта',       nameUk:'2 500 досвіду',
    descRu:'2 500 XP всего.',          descUk:'2 500 XP загалом.',
  },
  {
    id:'xp_5000', icon:'💎', category:'xp', xp:150,
    nameRu:'Пять тысяч',        nameUk:'П\'ять тисяч',
    descRu:'5 000 XP всего.',          descUk:'5 000 XP загалом.',
  },
  {
    id:'xp_10000', icon:'🏅', category:'xp', xp:200,
    nameRu:'Десять тысяч',      nameUk:'Десять тисяч',
    descRu:'10 000 XP всего.',         descUk:'10 000 XP загалом.',
  },
  {
    id:'xp_20000', icon:'🎖️', category:'xp', xp:300,
    nameRu:'Двадцать тысяч',    nameUk:'Двадцять тисяч',
    descRu:'20 000 XP всего.',         descUk:'20 000 XP загалом.',
  },
  {
    id:'xp_50000', icon:'🏆', category:'xp', xp:500,
    nameRu:'Пятьдесят тысяч',    nameUk:'П\'ятдесят тисяч',
    descRu:'50 000 XP всего.',         descUk:'50 000 XP загалом.',
    secret: true,
  },
  {
    id:'xp_100000', icon:'👑', category:'xp', xp:1000,
    nameRu:'Легенда',           nameUk:'Легенда',
    descRu:'100 000 XP всего.',        descUk:'100 000 XP загалом.',
    secret: true,
  },
  {
    id:'wager_win', icon:'🎲', category:'xp', xp:150,
    nameRu:'Рискнул — победил', nameUk:'Ризикнув — переміг',
    descRu:'Выиграй пари на цепочку: удерживай серию до конца срока, не опускаясь ниже уровня на момент ставки.', descUk:'Виграй парі на стрік: тримай серію до кінця терміну, не падаючи нижче рівня на момент ставки.',
  },
  {
    id:'personal_best', icon:'📈', category:'xp', xp:100,
    nameRu:'Лучшая неделя',     nameUk:'Найкращий тиждень',
    descRu:'Побей свой рекорд недельных очков опыта за календарную неделю.', descUk:'Побий свій рекорд тижневих очок досвіду за календарний тиждень.',
  },

  // Квизы
  {
    id:'quiz_first', icon:'📝', category:'quiz', xp:30,
    nameRu:'Первый квиз',       nameUk:'Перший квіз',
    descRu:'Заверши любой квиз один раз (любая сложность).', descUk:'Заверши будь-який квіз один раз (будь-яка складність).',
  },
  {
    id:'quiz_medium', icon:'📊', category:'quiz', xp:60,
    nameRu:'Средний уровень',   nameUk:'Середній рівень',
    descRu:'Доведи до конца квиз с уровнем Medium.', descUk:'Доведи до кінця квіз із рівнем Medium.',
  },
  {
    id:'quiz_hard', icon:'⚔️', category:'quiz', xp:100,
    nameRu:'Принял вызов',      nameUk:'Прийняв виклик',
    descRu:'Полностью пройди квиз уровня Hard.',  descUk:'Повністю пройди квіз рівня Hard.',
  },
  {
    id:'quiz_all_levels', icon:'🎯', category:'quiz', xp:150,
    nameRu:'Полный набор',      nameUk:'Повний набір',
    descRu:'Хотя бы раз пройди Easy, Medium и Hard (три отдельные сессии).', descUk:'Хоча б раз пройди Easy, Medium і Hard (три окремі сесії).',
  },
  {
    id:'quiz_perfect_easy', icon:'🌿', category:'quiz', xp:75,
    nameRu:'Лёгкий идеал',      nameUk:'Легкий ідеал',
    descRu:'Квиз Easy: все ответы за этот заход верны.', descUk:'Квіз Easy: усі відповіді за цей захід вірні.',
  },
  {
    id:'quiz_perfect', icon:'🛡️', category:'quiz', xp:250,
    nameRu:'Железные нервы',    nameUk:'Залізні нерви',
    descRu:'Квиз Hard без единой ошибки за прохождение.', descUk:'Квіз Hard без жодної помилки за проходження.',
  },
  {
    id:'quiz_perfect_medium', icon:'🎪', category:'quiz', xp:150,
    nameRu:'Меткий стрелок',    nameUk:'Влучний стрілець',
    descRu:'Квиз Medium без ошибок: все ответы за заход верны.', descUk:'Квіз Medium без помилок: усі відповіді за захід вірні.',
  },
  {
    id:'quiz_triple_perfect', icon:'🌈', category:'quiz', secret: true, xp:500,
    nameRu:'Трижды идеал',      nameUk:'Тричі ідеал',
    descRu:'Идеальный Easy, Medium и Hard: по отдельному квизу на каждый уровень.', descUk:'Ідеальні Easy, Medium і Hard: окремі квізи на кожен рівень.',
  },
  {
    id:'quiz_speed_demon', icon:'💨', category:'quiz', secret: true, xp:300,
    nameRu:'На скорости',       nameUk:'На швидкості',
    descRu:'Пять раз полностью заверши квиз Hard (счётчик хранится в приложении).', descUk:'П\'ять раз повністю заверш квіз Hard (лічильник зберігається в додатку).',
  },

  // Комбо и ежедневки (combo — подряд верных в уроке lesson1.tsx)
  {
    id:'combo_3', icon:'🎯', category:'combo', xp:20,
    nameRu:'В потоке',          nameUk:'У потоці',
    descRu:'3 верных ответа подряд во время урока.',   descUk:'3 вірні відповіді поспіль під час уроку.',
  },
  {
    id:'combo_10', icon:'🎯', category:'combo', xp:60,
    nameRu:'Снайпер',           nameUk:'Снайпер',
    descRu:'10 верных подряд на шагах урока.',         descUk:'10 вірних поспіль на кроках уроку.',
  },
  {
    id:'combo_20', icon:'🧱', category:'combo', xp:120,
    nameRu:'Несокрушимый',      nameUk:'Незламний',
    descRu:'20 верных ответов подряд без промаха.',         descUk:'20 вірних відповідей поспіль без промаху.',
  },
  {
    id:'combo_50', icon:'🤖', category:'combo', xp:300,
    nameRu:'Машина',            nameUk:'Машина',
    descRu:'50 верных ответов подряд в одной «серии».', descUk:'50 вірних відповідей поспіль в одній «серії».',
  },
  {
    id:'combo_100', icon:'🦾', category:'combo', xp:600,
    nameRu:'Непобедимый',       nameUk:'Непереможний',
    descRu:'100 верных ответов подряд в одной серии.', descUk:'100 вірних відповідей поспіль в одній серії.',
    secret: true,
  },
  {
    id:'daily_task_first', icon:'📋', category:'combo', xp:30,
    nameRu:'Первое задание',    nameUk:'Перше завдання',
    descRu:'Выполни одно из ежедневных заданий на экране задач.', descUk:'Виконай одне з щоденних завдань на екрані завдань.',
  },
  {
    id:'all_daily', icon:'✅', category:'combo', xp:100,
    nameRu:'Всё за день',       nameUk:'Усе за день',
    descRu:'За один календарный день закрой все три ежедневных задания.', descUk:'За один календарний день закрий усі три щоденні завдання.',
  },
  {
    id:'daily_all_3', icon:'📌', category:'combo', xp:140,
    nameRu:'Три дня порядка', nameUk:'Три дні порядку',
    descRu:'Три дня подряд закрывай все ежедневные задания.', descUk:'Три дні поспіль закривай усі щоденні завдання.',
  },
  {
    id:'daily_all_7', icon:'🗓️', category:'combo', xp:350,
    nameRu:'Неделя без хвостов', nameUk:'Тиждень без хвостів',
    descRu:'Семь дней подряд закрывай все ежедневные задания.', descUk:'Сім днів поспіль закривай усі щоденні завдання.',
    secret: true,
  },
  {
    id:'daily_no_reroll', icon:'🎯', category:'combo', xp:120,
    nameRu:'Без замен', nameUk:'Без замін',
    descRu:'Закрой все задания дня, не заменив ни одно из них.', descUk:'Закрий усі завдання дня, не замінивши жодного з них.',
  },
  {
    id:'daily_phrase_first', icon:'💬', category:'combo', xp:35,
    nameRu:'Фраза дня', nameUk:'Фраза дня',
    descRu:'Открой карточку фразы дня и прочитай объяснение.', descUk:'Відкрий картку фрази дня й прочитай пояснення.',
  },
  {
    id:'daily_phrase_save', icon:'🗂️', category:'combo', xp:60,
    nameRu:'В копилку', nameUk:'До скарбнички',
    descRu:'Сохрани фразу дня в карточки.', descUk:'Збережи фразу дня в картки.',
  },

  // Входы — счётчик цепочки ежедневного входа (login_bonus_v1), отдельно от цепочки дней по XP
  {
    id:'login_7', icon:'🎒', category:'special', xp:75,
    nameRu:'Верный ученик',     nameUk:'Вірний учень',
    descRu:'7 дней подряд заходи в приложение (цепочка входа).',     descUk:'7 днів поспіль заходь у додаток (ланцюжок входу).',
  },
  {
    id:'login_14', icon:'📆', category:'special', xp:120,
    nameRu:'Две недели',        nameUk:'Два тижні',
    descRu:'14 дней подряд открывай приложение.',    descUk:'14 днів поспіль відкривай додаток.',
  },
  {
    id:'login_30', icon:'🗓️', category:'special', xp:200,
    nameRu:'Месяц в приложении', nameUk:'Місяць у додатку',
    descRu:'30 дней подряд с хотя бы одним входом в день.',    descUk:'30 днів поспіль хоча б з одним входом на день.',
  },
  {
    id:'login_60', icon:'📌', category:'special', xp:350,
    nameRu:'Два месяца',        nameUk:'Два місяці',
    descRu:'60 дней подряд заходи в приложение каждый день.',    descUk:'60 днів поспіль заходь у додаток кожен день.',
  },
  {
    id:'login_365', icon:'🎊', category:'special', xp:1200,
    nameRu:'Целый год в приложении',  nameUk:'Цілий рік у додатку',
    descRu:'365 дней подряд с ежедневным входом.',   descUk:'365 днів поспіль із щоденним входом.',
    secret: true,
  },
  {
    id:'comeback', icon:'👋', category:'special', secret: true, xp:100,
    nameRu:'Возвращение', nameUk:'Повернення',
    descRu:'Вернись после ~7 и более дней без активности: сработает приветственный бонус возвращения.', descUk:'Повернись після ~7 і більше днів без активності: спрацює вітальний бонус повернення.',
  },
  {
    id:'diagnosis', icon:'🔬', category:'special', xp:50,
    nameRu:'Диагноз поставлен', nameUk:'Діагноз поставлено',
    descRu:'Пройди диагностический тест уровня до конца.', descUk:'Пройди діагностичний тест рівня до кінця.',
  },
  {
    id:'night_owl', icon:'🦉', category:'special', secret: true, xp:75,
    nameRu:'Ночная сова',      nameUk:'Нічна сова',
    descRu:'Получи опыт в приложении с 23:00 до 5:00 по местному времени.', descUk:'Отримай досвід у додатку з 23:00 до 5:00 за місцевим часом.',
  },
  {
    id:'early_bird', icon:'🐦', category:'special', secret: true, xp:75,
    nameRu:'Жаворонок',        nameUk:'Рання пташка',
    descRu:'Получи опыт между 5:00 и 7:00 по местному времени.',    descUk:'Отримай досвід між 5:00 і 7:00 за місцевим часом.',
  },

  // Медали CEFR: ruby/emerald/diamond по минимальному числу проходов среди уроков блока (pass_count)
  { id:'gem_a1_ruby',    icon:'💎', category:'medal', xp:150, nameRu:'A1 рубин',      nameUk:'A1 рубін',      descRu:'Уроки 1–8: каждый завершён минимум 2 раза (зачёт урока).',    descUk:'Уроки 1–8: кожен завершено мінімум 2 рази (зарахування уроку).' },
  { id:'gem_a1_emerald', icon:'💎', category:'medal', xp:250, nameRu:'A1 изумруд',    nameUk:'A1 смарагд',    descRu:'Уроки 1–8: минимум 3 прохода у каждого.',    descUk:'Уроки 1–8: мінімум 3 проходи в кожного.' },
  { id:'gem_a1_diamond', icon:'💎', category:'medal', xp:400, nameRu:'A1 бриллиант',  nameUk:'A1 діамант',    descRu:'Уроки 1–8: минимум 4 прохода у каждого.',    descUk:'Уроки 1–8: мінімум 4 проходи в кожного.', secret:true },
  { id:'gem_a2_ruby',    icon:'💎', category:'medal', xp:150, nameRu:'A2 рубин',      nameUk:'A2 рубін',      descRu:'Уроки 9–18: каждый минимум 2 полных прохода.',    descUk:'Уроки 9–18: кожен мінімум 2 повних проходи.' },
  { id:'gem_a2_emerald', icon:'💎', category:'medal', xp:250, nameRu:'A2 изумруд',    nameUk:'A2 смарагд',    descRu:'Уроки 9–18: минимум 3 прохода на каждый.',    descUk:'Уроки 9–18: мінімум 3 проходи на кожен.' },
  { id:'gem_a2_diamond', icon:'💎', category:'medal', xp:400, nameRu:'A2 бриллиант',  nameUk:'A2 діамант',    descRu:'Уроки 9–18: минимум 4 прохода на каждый.',    descUk:'Уроки 9–18: мінімум 4 проходи на кожен.', secret:true },
  { id:'gem_b1_ruby',    icon:'💎', category:'medal', xp:150, nameRu:'B1 рубин',      nameUk:'B1 рубін',      descRu:'Уроки 19–28: каждый урок блока ≥2 проходов.',    descUk:'Уроки 19–28: кожен урок блоку ≥2 проходів.' },
  { id:'gem_b1_emerald', icon:'💎', category:'medal', xp:250, nameRu:'B1 изумруд',    nameUk:'B1 смарагд',    descRu:'Уроки 19–28: по ≥3 прохода на урок.',    descUk:'Уроки 19–28: по ≥3 проходи на урок.' },
  { id:'gem_b1_diamond', icon:'💎', category:'medal', xp:400, nameRu:'B1 бриллиант',  nameUk:'B1 діамант',    descRu:'Уроки 19–28: по ≥4 прохода на урок.',    descUk:'Уроки 19–28: по ≥4 проходи на урок.', secret:true },
  { id:'gem_b2_ruby',    icon:'💎', category:'medal', xp:150, nameRu:'B2 рубин',      nameUk:'B2 рубін',      descRu:'Уроки 29–32: каждый урок ≥2 полных зачётов.',    descUk:'Уроки 29–32: кожен урок ≥2 повних зарахунків.' },
  { id:'gem_b2_emerald', icon:'💎', category:'medal', xp:250, nameRu:'B2 изумруд',    nameUk:'B2 смарагд',    descRu:'Уроки 29–32: по ≥3 прохода каждый.',    descUk:'Уроки 29–32: по ≥3 проходи кожен.' },
  { id:'gem_b2_diamond', icon:'💎', category:'medal', xp:400, nameRu:'B2 бриллиант',  nameUk:'B2 діамант',    descRu:'Уроки 29–32: по ≥4 прохода на каждый урок.',    descUk:'Уроки 29–32: по ≥4 проходи на кожен урок.', secret:true },

  // Экзамены урока
  {
    id:'exam_first', icon:'📜', category:'special', xp:75,
    nameRu:'Экзамен сдан',       nameUk:'Іспит складено',
    descRu:'Сдай экзамен после урока (финальный тест урока) хотя бы один раз.', descUk:'Здай іспит після уроку (фінальний тест) хоча б один раз.',
  },
  {
    id:'exam_ace', icon:'🎓', category:'special', secret: true, xp:250,
    nameRu:'Отличник',          nameUk:'Відмінник',
    descRu:'Набери не менее 90% на экзамене урока.',  descUk:'Набери не менш як 90% на іспиті уроку.',
  },

  // Карточки — все сохранённые в flashcards_v1 за один визит экрана коллекции
  {
    id:'flashcards_session', icon:'🃏', category:'special', xp:50,
    nameRu:'Все карточки за раз',         nameUk:'Усі картки за раз',
    descRu:'За один заход на экран коллекции просмотри каждую сохранённую карточку.', descUk:'За один захід на екран колекції переглянь кожну збережену картку.',
  },
  {
    id:'flashcards_save_25', icon:'🗂️', category:'special', xp:120,
    nameRu:'Свой словарь', nameUk:'Свій словник',
    descRu:'Сохрани 25 карточек в коллекцию.', descUk:'Збережи 25 карток у колекцію.',
  },
  {
    id:'flashcards_save_50', icon:'🗃️', category:'special', xp:250,
    nameRu:'Архивариус', nameUk:'Архіваріус',
    descRu:'Сохрани 50 карточек в коллекцию.', descUk:'Збережи 50 карток у колекцію.',
    secret: true,
  },
  {
    id:'flashcards_flip_100', icon:'🔄', category:'special', xp:220,
    nameRu:'Сто переворотов', nameUk:'Сто переворотів',
    descRu:'Переверни карточки 100 раз при повторении.', descUk:'Переверни картки 100 разів під час повторення.',
  },
  {
    id:'flashcards_view_7_days', icon:'📆', category:'special', xp:260,
    nameRu:'Карточная неделя', nameUk:'Карткова неділя',
    descRu:'Семь дней подряд просматривай карточки в коллекции.', descUk:'Сім днів поспіль переглядай картки в колекції.',
    secret: true,
  },
  {
    id:'flashcards_sources_4', icon:'🧩', category:'special', xp:180,
    nameRu:'Четыре источника', nameUk:'Чотири джерела',
    descRu:'Сохрани карточки из урока или квиза, слов, глаголов и фразы дня.', descUk:'Збережи картки з уроку або квізу, слів, дієслів і фрази дня.',
  },
  {
    id:'recall_first', icon:'🧠', category:'special', xp:40,
    nameRu:'Вспомнил сам', nameUk:'Згадав сам',
    descRu:'Дай первый верный ответ в Моей практике.', descUk:'Дай першу правильну відповідь у Моїй практиці.',
  },
  {
    id:'recall_50', icon:'🧩', category:'special', xp:180,
    nameRu:'Память крепнет', nameUk:'Пам\'ять міцнішає',
    descRu:'Набери 50 верных ответов в Моей практике.', descUk:'Набери 50 правильних відповідей у Моїй практиці.',
  },
  {
    id:'arena_first_win', icon:'🏆', category:'special', xp:120,
    nameRu:'Первая дуэль', nameUk:'Перша дуель',
    descRu:'Выиграй первый матч Арены.', descUk:'Виграй перший матч Арени.',
  },
  {
    id:'arena_10_wins', icon:'⚔️', category:'special', xp:350,
    nameRu:'Десять побед', nameUk:'Десять перемог',
    descRu:'Выиграй 10 матчей Арены.', descUk:'Виграй 10 матчів Арени.',
  },
  {
    id:'shards_100', icon:'💎', category:'special', secret: true, xp:250,
    nameRu:'Собиратель осколков', nameUk:'Збирач осколків',
    descRu:'Доведи баланс до 100 осколков знаний.', descUk:'Доведи баланс до 100 осколків знань.',
  },
  {
    id:'shards_spent_100', icon:'💠', category:'special', secret: true, xp:220,
    nameRu:'Осколки в дело', nameUk:'Осколки в діло',
    descRu:'Потрать суммарно 100 осколков в магазине, лиге или на энергию.', descUk:'Витрать загалом 100 осколків у магазині, лізі або на енергію.',
  },
  {
    id:'energy_refill_first', icon:'⚡', category:'special', xp:70,
    nameRu:'Второе дыхание', nameUk:'Друге дихання',
    descRu:'Восстанови энергию за осколки первый раз.', descUk:'Віднови енергію за осколки вперше.',
  },
  {
    id:'energy_refill_5', icon:'🔋', category:'special', xp:180,
    nameRu:'На полном заряде', nameUk:'На повному заряді',
    descRu:'Пять раз восстанови энергию за осколки.', descUk:'П\'ять разів віднови енергію за осколки.',
    secret: true,
  },
  {
    id:'league_result_first', icon:'🏁', category:'special', xp:70,
    nameRu:'Итоги недели', nameUk:'Підсумки тижня',
    descRu:'Получи первый недельный результат в лиге.', descUk:'Отримай перший тижневий результат у лізі.',
  },
  {
    id:'league_top3', icon:'🥉', category:'special', xp:180,
    nameRu:'В тройке', nameUk:'У трійці',
    descRu:'Заверши неделю в топ-3 своей лиги.', descUk:'Заверши тиждень у топ-3 своєї ліги.',
  },
  {
    id:'league_champion', icon:'👑', category:'special', xp:320,
    nameRu:'Первый в группе', nameUk:'Перший у групі',
    descRu:'Заверши неделю на первом месте в группе лиги.', descUk:'Заверши тиждень на першому місці в групі ліги.',
    secret: true,
  },
  {
    id:'league_promoted', icon:'⬆️', category:'special', xp:160,
    nameRu:'Повышение', nameUk:'Підвищення',
    descRu:'Перейди в более высокую лигу по итогам недели.', descUk:'Перейди до вищої ліги за підсумками тижня.',
  },
  {
    id:'league_diamond', icon:'💎', category:'special', xp:500,
    nameRu:'Алмазная планка', nameUk:'Діамантова планка',
    descRu:'Доберись до Алмазной лиги или выше.', descUk:'Дістанься Діамантової ліги або вище.',
    secret: true,
  },
  {
    id:'league_boost_first', icon:'🚀', category:'special', xp:60,
    nameRu:'Разгон недели', nameUk:'Розгін тижня',
    descRu:'Активируй первый личный буст очков лиги.', descUk:'Активуй перший особистий буст очок ліги.',
  },
  {
    id:'league_boost_5', icon:'📈', category:'special', xp:180,
    nameRu:'Турбо-привычка', nameUk:'Турбо-звичка',
    descRu:'Активируй 5 личных бустов очков лиги.', descUk:'Активуй 5 особистих бустів очок ліги.',
  },
  {
    id:'league_boost_x3', icon:'✖️', category:'special', xp:140,
    nameRu:'Тройной ход', nameUk:'Потрійний хід',
    descRu:'Активируй личный буст лиги с множителем x3.', descUk:'Активуй особистий буст ліги з множником x3.',
    secret: true,
  },

  // Секрет: все алмазные гемы по A1–B2
  {
    id:'gem_all_complete', icon:'🏆', category:'medal', secret: true, xp:1000,
    nameRu:'Коллекционер медалей', nameUk:'Колекціонер медалей',
    descRu:'Собери высшую (алмазную) медаль по всем четырём блокам: A1, A2, B1 и B2.', descUk:'Збери найвищу (діамантову) медаль з усіх чотирьох блоків: A1, A2, B1 і B2.',
  },

  // ── Социал / Друзья ───────────────────────────────────────────────────────
  {
    id:'social_friend_first', icon:'🤝', category:'special', xp:50,
    nameRu:'Не один в поле',  nameUk:'Не один у полі',
    descRu:'Добавь первого друга через код приглашения.', descUk:'Додай першого друга через код запрошення.',
  },
  {
    id:'social_friends_3', icon:'👯', category:'special', xp:75,
    nameRu:'Своя тусовка',  nameUk:'Своя компанія',
    descRu:'Собери в друзьях сразу трёх человек.', descUk:'Збери в друзях одразу трьох людей.',
  },
  {
    id:'social_friends_10', icon:'🌐', category:'special', xp:200,
    nameRu:'Магнит для людей',  nameUk:'Магніт для людей',
    descRu:'10 друзей в списке. Ты явно умеешь находить общий язык.', descUk:'10 друзів у списку. Ти явно вмієш знаходити спільну мову.',
    secret: true,
  },
  {
    id:'social_gift_send', icon:'🎁', category:'special', xp:40,
    nameRu:'Дед Мороз',  nameUk:'Дід Мороз',
    descRu:'Отправь подарок другу — щит, ускорение опыта или жетон арены.', descUk:'Відправ подарунок другу — щит, прискорення досвіду або жетон арени.',
  },
  {
    id:'social_gift_5', icon:'🎀', category:'special', xp:150,
    nameRu:'Санта на постоянке',  nameUk:'Санта на постійці',
    descRu:'Отправил 5 подарков друзьям. Щедрость — твоё второе имя.', descUk:'Надіслав 5 подарунків друзям. Щедрість — твоє друге ім\'я.',
  },
  {
    id:'social_gift_10', icon:'💝', category:'special', xp:260,
    nameRu:'Большая щедрость', nameUk:'Велика щедрість',
    descRu:'Отправь 10 подарков друзьям.', descUk:'Надішли 10 подарунків друзям.',
    secret: true,
  },
  {
    id:'social_like_received', icon:'❤️', category:'special', xp:30,
    nameRu:'Тебя заметили',  nameUk:'Тебе помітили',
    descRu:'Друг отметил лайком одно из твоих достижений. Слава пришла.', descUk:'Друг відзначив лайком одне з твоїх досягнень. Слава прийшла.',
  },
  {
    id:'social_likes_5', icon:'💗', category:'special', xp:120,
    nameRu:'Пять отметок', nameUk:'П\'ять відміток',
    descRu:'Получи 5 лайков от друзей на свои достижения.', descUk:'Отримай 5 лайків від друзів на свої досягнення.',
  },
  {
    id:'league_chat_first', icon:'💬', category:'special', xp:50,
    nameRu:'Голос в лиге', nameUk:'Голос у лізі',
    descRu:'Отправь первое сообщение в чате своей лиги.', descUk:'Надішли перше повідомлення в чаті своєї ліги.',
  },
  {
    id:'league_chat_10', icon:'🗨️', category:'special', xp:160,
    nameRu:'Командный эфир', nameUk:'Командний ефір',
    descRu:'Отправь 10 сообщений в чате лиги.', descUk:'Надішли 10 повідомлень у чаті ліги.',
  },

  // ── Арена (расширение) ────────────────────────────────────────────────────
  {
    id:'arena_streak_5', icon:'🔥', category:'special', xp:200,
    nameRu:'Машина победы',  nameUk:'Машина перемоги',
    descRu:'5 побед подряд в Арене без поражений.', descUk:'5 перемог поспіль в Арені без поразок.',
  },
  {
    id:'arena_streak_10', icon:'💥', category:'special', xp:450,
    nameRu:'Феномен',  nameUk:'Феномен',
    descRu:'10 побед подряд в Арене. Соперники уже в панике.', descUk:'10 перемог поспіль в Арені. Суперники вже в паніці.',
    secret: true,
  },
  {
    id:'arena_duel_friend', icon:'🤺', category:'special', xp:75,
    nameRu:'Разборки по-дружески',  nameUk:'Розборки по-дружньому',
    descRu:'Победи в дуэли с другом по приглашению (через код комнаты).', descUk:'Перемoжи в дуелі з другом за запрошенням (через код кімнати).',
  },
  {
    id:'arena_wager_win', icon:'🎲', category:'special', xp:120,
    nameRu:'Риск — дело благородное',  nameUk:'Ризик — справа благородна',
    descRu:'Поставь осколки на матч Арены и выиграй — хотя бы раз.', descUk:'Постав осколки на матч Арени та виграй — хоча б раз.',
  },
  {
    id:'arena_wager_5', icon:'💰', category:'special', xp:300,
    nameRu:'Профессиональный авантюрист',  nameUk:'Професійний авантюрист',
    descRu:'Выиграл 5 ставок в Арене. Удача явно на твоей стороне.', descUk:'Виграв 5 ставок в Арені. Удача явно на твоєму боці.',
    secret: true,
  },

  // ── Тренер / Active Recall ────────────────────────────────────────────────
  {
    id:'trainer_session', icon:'🧘', category:'special', xp:50,
    nameRu:'Первая тренировка',  nameUk:'Перше тренування',
    descRu:'Пройди первую сессию в режиме «Моя практика».', descUk:'Пройди першу сесію в режимі «Моя практика».',
  },
  {
    id:'trainer_100_correct', icon:'🧠', category:'special', xp:200,
    nameRu:'Стальная память',  nameUk:'Сталева пам\'ять',
    descRu:'100 правильных ответов суммарно в «Моей практике». Эти слова уже часть тебя.', descUk:'100 правильних відповідей загалом у «Моїй практиці». Ці слова вже частина тебе.',
    secret: true,
  },
  {
    id:'trainer_7_days', icon:'📅', category:'special', xp:260,
    nameRu:'Неделя практики', nameUk:'Тиждень практики',
    descRu:'Семь дней подряд дай хотя бы один верный ответ в тренировке.', descUk:'Сім днів поспіль дай хоча б одну правильну відповідь у тренуванні.',
  },
  {
    id:'trainer_500_correct', icon:'🏋️', category:'special', xp:600,
    nameRu:'Пятьсот точных', nameUk:'П\'ятсот точних',
    descRu:'500 правильных ответов суммарно в тренировках.', descUk:'500 правильних відповідей загалом у тренуваннях.',
    secret: true,
  },
  {
    id:'trainer_perfect_session', icon:'💯', category:'special', xp:180,
    nameRu:'Чистая сессия', nameUk:'Чиста сесія',
    descRu:'Заверши тренировку из 5+ вопросов без ошибки.', descUk:'Заверши тренування з 5+ питань без помилки.',
  },

  // ── Кастомизация ──────────────────────────────────────────────────────────
  {
    id:'avatar_custom', icon:'🎨', category:'special', xp:50,
    nameRu:'Своё лицо',  nameUk:'Своє обличчя',
    descRu:'Выбери уникальный аватар в настройках профиля.', descUk:'Вибери унікальний аватар у налаштуваннях профілю.',
  },
  {
    id:'profile_themed', icon:'🖼️', category:'special', xp:35,
    nameRu:'Интерьер готов',  nameUk:'Інтер\'єр готовий',
    descRu:'Установи стиль оформления для профиль-карточки.', descUk:'Встанови стиль оформлення для картки профілю.',
  },

  // ── Карточки / Паки ───────────────────────────────────────────────────────
  {
    id:'pack_purchased', icon:'📦', category:'special', xp:60,
    nameRu:'Коллекционер',  nameUk:'Колекціонер',
    descRu:'Получи первый набор карточек: покупка, community-пак или ваучер.', descUk:'Отримай перший набір карток: покупка, community-пак або ваучер.',
  },
  {
    id:'pack_5_purchased', icon:'📚', category:'special', xp:180,
    nameRu:'Библиотекарь',  nameUk:'Бібліотекар',
    descRu:'5 наборов карточек в коллекции. Слов становится всё больше.', descUk:'5 наборів карток у колекції. Слів стає дедалі більше.',
    secret: true,
  },

  // ── Шаринг ────────────────────────────────────────────────────────────────
  {
    id:'share_achievement', icon:'📣', category:'special', xp:35,
    nameRu:'Громкое достижение',  nameUk:'Гучне досягнення',
    descRu:'Поделись разблокированным достижением — пусть все знают.', descUk:'Поділись розблокованим досягненням — нехай усі знають.',
  },

  // ── Вехи / Milestones ─────────────────────────────────────────────────────
  {
    id:'level_50', icon:'👑', category:'xp', xp:400,
    nameRu:'Полтинник',  nameUk:'П\'ятдесятник',
    descRu:'Достигни 50-го уровня. Ты уже не новичок — ты легенда.', descUk:'Досягни 50-го рівня. Ти вже не новачок — ти легенда.',
    secret: true,
  },
  {
    id:'xp_75000', icon:'🚀', category:'xp', xp:300,
    nameRu:'75К — и не останавливаться',  nameUk:'75К — і не зупинятись',
    descRu:'75 000 опыта суммарно. Путь к шестизначному числу открыт.', descUk:'75 000 досвіду загалом. Шлях до шестизначного числа відкрито.',
    secret: true,
  },
  {
    id:'quiz_10_completed', icon:'🎯', category:'quiz', xp:100,
    nameRu:'Первые десять',  nameUk:'Перші десять',
    descRu:'10 квизовых сессий завершено. Только вперёд.', descUk:'10 квізових сесій завершено. Тільки вперед.',
  },
  {
    id:'arena_streak_freeze', icon:'🛡️', category:'special', xp:50,
    nameRu:'Хитрый план',  nameUk:'Хитрий план',
    descRu:'Использовал заморозку цепочки и сохранил серию.', descUk:'Використав заморозку ланцюжка та зберіг серію.',
  },
  {
    id:'wager_win_3', icon:'🍀', category:'xp', xp:200,
    nameRu:'Три удачные ставки',  nameUk:'Три вдалі ставки',
    descRu:'Выиграй 3 ставки в Арене суммарно.', descUk:'Виграй 3 ставки в Арені загалом.',
    secret: true,
  },

  // ── Medium / Hardcore layer ───────────────────────────────────────────────
  { id:'streak_150', icon:'🔥', category:'streak', xp:650, nameRu:'Полторы сотни', nameUk:'Півтори сотні', descRu:'150 дней подряд получай опыт без пустого дня.', descUk:'150 днів поспіль отримуй досвід без порожнього дня.' },
  { id:'streak_250', icon:'🏔️', category:'streak', xp:900, nameRu:'Четверть тысячи', nameUk:'Чверть тисячі', descRu:'250 дней подряд держи цепочку активности.', descUk:'250 днів поспіль тримай серію активності.', secret:true },
  { id:'streak_750', icon:'🗿', category:'streak', xp:3000, nameRu:'750 дней', nameUk:'750 днів', descRu:'750 дней подряд с ежедневным опытом.', descUk:'750 днів поспіль із щоденним досвідом.', secret:true },
  { id:'streak_1000', icon:'👑', category:'streak', xp:5000, nameRu:'Тысяча дней', nameUk:'Тисяча днів', descRu:'1000 дней подряд поддерживай цепочку активности.', descUk:'1000 днів поспіль тримай серію активності.', secret:true },
  { id:'streak_clean_365', icon:'🛡️', category:'streak', xp:1800, nameRu:'Чистый год', nameUk:'Чистий рік', descRu:'365 дней цепочки без починки или заморозки за этот отрезок.', descUk:'365 днів серії без відновлення чи заморозки за цей відрізок.', secret:true },
  { id:'perfect_month', icon:'📅', category:'streak', xp:800, nameRu:'Месяц без пустоты', nameUk:'Місяць без порожнечі', descRu:'Получай опыт каждый день одного календарного месяца.', descUk:'Отримуй досвід щодня одного календарного місяця.', secret:true },
  { id:'night_week', icon:'🌙', category:'streak', xp:350, nameRu:'Ночная смена', nameUk:'Нічна зміна', descRu:'7 дней подряд получай опыт ночью: с 23:00 до 5:00.', descUk:'7 днів поспіль отримуй досвід уночі: з 23:00 до 5:00.', secret:true },
  { id:'early_week', icon:'🌅', category:'streak', xp:300, nameRu:'Ранний режим', nameUk:'Ранній режим', descRu:'7 дней подряд получай опыт утром: с 5:00 до 7:00.', descUk:'7 днів поспіль отримуй досвід уранці: з 5:00 до 7:00.', secret:true },

  { id:'lesson_all_2x', icon:'🔁', category:'lessons', xp:700, nameRu:'Второй круг', nameUk:'Друге коло', descRu:'Все 32 урока завершены минимум по 2 раза.', descUk:'Усі 32 уроки завершено мінімум по 2 рази.' },
  { id:'lesson_all_3x', icon:'🔂', category:'lessons', xp:1000, nameRu:'Тройной курс', nameUk:'Потрійний курс', descRu:'Все 32 урока завершены минимум по 3 раза.', descUk:'Усі 32 уроки завершено мінімум по 3 рази.', secret:true },
  { id:'lesson_all_5x', icon:'♾️', category:'lessons', xp:1800, nameRu:'Пятый круг', nameUk:'П’яте коло', descRu:'Все 32 урока завершены минимум по 5 раз.', descUk:'Усі 32 уроки завершено мінімум по 5 разів.', secret:true },
  { id:'lesson_perfect10', icon:'💯', category:'lessons', xp:400, nameRu:'Десять идеальных', nameUk:'Десять ідеальних', descRu:'10 разных уроков без единой ошибки в прогрессе.', descUk:'10 різних уроків без жодної помилки в прогресі.' },
  { id:'lesson_b2_perfect', icon:'🎓', category:'lessons', xp:500, nameRu:'B2 без ошибок', nameUk:'B2 без помилок', descRu:'Уроки 29–32 идеально: без «ошибка» в каждом.', descUk:'Уроки 29–32 ідеально: без «помилка» в кожному.', secret:true },
  { id:'lesson_marathon_day', icon:'🏁', category:'lessons', xp:700, nameRu:'Учебный марафон', nameUk:'Навчальний марафон', descRu:'За один день заверши 10 разных уроков с зачётом.', descUk:'За один день заверши 10 різних уроків із зарахунком.', secret:true },
  { id:'lesson_all_perfect_2x', icon:'🌟', category:'lessons', xp:2500, nameRu:'Абсолют II', nameUk:'Абсолют II', descRu:'Все 32 урока пройдены идеально минимум по 2 раза.', descUk:'Усі 32 уроки пройдено ідеально мінімум по 2 рази.', secret:true },

  { id:'xp_150000', icon:'⚡', category:'xp', xp:1200, nameRu:'150К опыта', nameUk:'150К досвіду', descRu:'Накопи 150 000 XP суммарно.', descUk:'Накопич 150 000 XP загалом.', secret:true },
  { id:'xp_250000', icon:'🚀', category:'xp', xp:1800, nameRu:'Четверть миллиона', nameUk:'Чверть мільйона', descRu:'Накопи 250 000 XP суммарно.', descUk:'Накопич 250 000 XP загалом.', secret:true },
  { id:'xp_500000', icon:'💎', category:'xp', xp:3000, nameRu:'Полмиллиона', nameUk:'Пів мільйона', descRu:'Накопи 500 000 XP суммарно.', descUk:'Накопич 500 000 XP загалом.', secret:true },
  { id:'xp_750000', icon:'🏆', category:'xp', xp:4200, nameRu:'Три четверти', nameUk:'Три чверті', descRu:'Накопи 750 000 XP суммарно.', descUk:'Накопич 750 000 XP загалом.', secret:true },
  { id:'xp_1000000', icon:'👑', category:'xp', xp:6000, nameRu:'Миллионер опыта', nameUk:'Мільйонер досвіду', descRu:'Накопи 1 000 000 XP суммарно.', descUk:'Накопич 1 000 000 XP загалом.', secret:true },
  { id:'xp_2000000', icon:'♾️', category:'xp', xp:9000, nameRu:'Два миллиона', nameUk:'Два мільйони', descRu:'Накопи 2 000 000 XP суммарно.', descUk:'Накопич 2 000 000 XP загалом.', secret:true },
  { id:'weekly_xp_5000', icon:'📈', category:'xp', xp:400, nameRu:'Неделя на 5К', nameUk:'Тиждень на 5К', descRu:'Набери 5 000 XP за одну календарную неделю.', descUk:'Набери 5 000 XP за один календарний тиждень.', secret:true },
  { id:'weekly_xp_10000', icon:'🔥', category:'xp', xp:900, nameRu:'Неделя мясорубки', nameUk:'Тиждень м’ясорубки', descRu:'Набери 10 000 XP за одну календарную неделю.', descUk:'Набери 10 000 XP за один календарний тиждень.', secret:true },
  { id:'wager_win_10', icon:'🎲', category:'xp', xp:600, nameRu:'Холодная рука', nameUk:'Холодна рука', descRu:'Выиграй 10 ставок в Арене суммарно.', descUk:'Виграй 10 ставок в Арені загалом.', secret:true },

  { id:'quiz_25_completed', icon:'🎯', category:'quiz', xp:220, nameRu:'25 квизов', nameUk:'25 квізів', descRu:'25 квизовых сессий завершено.', descUk:'25 квізових сесій завершено.' },
  { id:'quiz_50_completed', icon:'🏅', category:'quiz', xp:400, nameRu:'50 квизов', nameUk:'50 квізів', descRu:'50 квизовых сессий завершено.', descUk:'50 квізових сесій завершено.', secret:true },
  { id:'quiz_100_completed', icon:'🏆', category:'quiz', xp:800, nameRu:'Сто квизов', nameUk:'Сто квізів', descRu:'100 квизовых сессий завершено.', descUk:'100 квізових сесій завершено.', secret:true },
  { id:'quiz_hard_10', icon:'⚔️', category:'quiz', xp:350, nameRu:'Hard-десятка', nameUk:'Hard-десятка', descRu:'10 раз заверши квиз уровня Hard.', descUk:'10 разів заверши квіз рівня Hard.', secret:true },
  { id:'quiz_hard_25', icon:'🛡️', category:'quiz', xp:700, nameRu:'Hard-житель', nameUk:'Hard-житель', descRu:'25 раз заверши квиз уровня Hard.', descUk:'25 разів заверши квіз рівня Hard.', secret:true },
  { id:'quiz_hard_perfect_3', icon:'💯', category:'quiz', xp:400, nameRu:'Три Hard без ошибки', nameUk:'Три Hard без помилки', descRu:'3 раза пройди Hard-квиз без единой ошибки.', descUk:'3 рази пройди Hard-квіз без жодної помилки.', secret:true },
  { id:'quiz_hard_perfect_10', icon:'👑', category:'quiz', xp:1000, nameRu:'Десять без промаха', nameUk:'Десять без промаху', descRu:'10 раз пройди Hard-квиз без единой ошибки.', descUk:'10 разів пройди Hard-квіз без жодної помилки.', secret:true },
  { id:'quiz_perfect_7_days', icon:'📆', category:'quiz', xp:550, nameRu:'Идеальная неделя квизов', nameUk:'Ідеальний тиждень квізів', descRu:'7 дней подряд заверши хотя бы один квиз без ошибки.', descUk:'7 днів поспіль заверши хоча б один квіз без помилки.', secret:true },
  { id:'quiz_all_levels_perfect_same_day', icon:'🌈', category:'quiz', xp:900, nameRu:'Три короны за день', nameUk:'Три корони за день', descRu:'За один день пройди Easy, Medium и Hard без ошибок.', descUk:'За один день пройди Easy, Medium і Hard без помилок.', secret:true },

  { id:'combo_150', icon:'⚡', category:'combo', xp:800, nameRu:'150 подряд', nameUk:'150 поспіль', descRu:'150 верных ответов подряд в одной серии.', descUk:'150 правильних відповідей поспіль в одній серії.', secret:true },
  { id:'combo_250', icon:'🧠', category:'combo', xp:1200, nameRu:'Нечеловеческий ритм', nameUk:'Нелюдський ритм', descRu:'250 верных ответов подряд в одной серии.', descUk:'250 правильних відповідей поспіль в одній серії.', secret:true },
  { id:'combo_500', icon:'☢️', category:'combo', xp:2500, nameRu:'Ошибка запрещена', nameUk:'Помилка заборонена', descRu:'500 верных ответов подряд в одной серии.', descUk:'500 правильних відповідей поспіль в одній серії.', secret:true },
  { id:'daily_all_14', icon:'📌', category:'combo', xp:600, nameRu:'Две недели порядка', nameUk:'Два тижні порядку', descRu:'14 дней подряд закрывай все ежедневные задания.', descUk:'14 днів поспіль закривай усі щоденні завдання.', secret:true },
  { id:'daily_all_30', icon:'🗓️', category:'combo', xp:1200, nameRu:'30 дней без хвостов', nameUk:'30 днів без хвостів', descRu:'30 дней подряд закрывай все ежедневные задания.', descUk:'30 днів поспіль закривай усі щоденні завдання.', secret:true },
  { id:'daily_no_reroll_7', icon:'🎯', category:'combo', xp:450, nameRu:'Неделя без замен', nameUk:'Тиждень без замін', descRu:'7 дней подряд закрой все задания без замен.', descUk:'7 днів поспіль закрий усі завдання без замін.', secret:true },
  { id:'daily_no_reroll_30', icon:'🏆', category:'combo', xp:1400, nameRu:'Без торга', nameUk:'Без торгу', descRu:'30 дней подряд закрой все задания без замен.', descUk:'30 днів поспіль закрий усі завдання без замін.', secret:true },
  { id:'daily_phrase_read_30', icon:'💬', category:'combo', xp:250, nameRu:'30 фраз дня', nameUk:'30 фраз дня', descRu:'Открой и прочитай 30 фраз дня.', descUk:'Відкрий і прочитай 30 фраз дня.' },
  { id:'daily_phrase_save_30', icon:'🗂️', category:'combo', xp:350, nameRu:'Фразы в запасе', nameUk:'Фрази в запасі', descRu:'Сохрани 30 фраз дня в карточки.', descUk:'Збережи 30 фраз дня в картки.', secret:true },
  { id:'daily_phrase_save_100', icon:'🗃️', category:'combo', xp:900, nameRu:'Сто фраз в копилке', nameUk:'Сто фраз у скарбничці', descRu:'Сохрани 100 фраз дня в карточки.', descUk:'Збережи 100 фраз дня в картки.', secret:true },

  { id:'login_100', icon:'📆', category:'special', xp:500, nameRu:'100 входов подряд', nameUk:'100 входів поспіль', descRu:'100 дней подряд открывай приложение.', descUk:'100 днів поспіль відкривай додаток.', secret:true },
  { id:'login_200', icon:'🗓️', category:'special', xp:850, nameRu:'200 входов подряд', nameUk:'200 входів поспіль', descRu:'200 дней подряд открывай приложение.', descUk:'200 днів поспіль відкривай додаток.', secret:true },
  { id:'exam_ace_5', icon:'🎓', category:'special', xp:400, nameRu:'Пять отличных экзаменов', nameUk:'П’ять відмінних іспитів', descRu:'5 раз набери не менее 90% на экзамене.', descUk:'5 разів набери не менш як 90% на іспиті.', secret:true },
  { id:'exam_ace_10', icon:'🏆', category:'special', xp:800, nameRu:'Десять отличных', nameUk:'Десять відмінних', descRu:'10 раз набери не менее 90% на экзамене.', descUk:'10 разів набери не менш як 90% на іспиті.', secret:true },
  { id:'flashcards_save_100', icon:'🗃️', category:'special', xp:500, nameRu:'100 карточек', nameUk:'100 карток', descRu:'Сохрани 100 карточек в коллекцию.', descUk:'Збережи 100 карток у колекцію.', secret:true },
  { id:'flashcards_save_250', icon:'📚', category:'special', xp:1000, nameRu:'Большой архив', nameUk:'Великий архів', descRu:'Сохрани 250 карточек в коллекцию.', descUk:'Збережи 250 карток у колекцію.', secret:true },
  { id:'flashcards_flip_500', icon:'🔄', category:'special', xp:650, nameRu:'500 переворотов', nameUk:'500 переворотів', descRu:'Переверни карточки 500 раз при повторении.', descUk:'Переверни картки 500 разів під час повторення.', secret:true },
  { id:'flashcards_flip_1000', icon:'♾️', category:'special', xp:1200, nameRu:'Тысяча переворотов', nameUk:'Тисяча переворотів', descRu:'Переверни карточки 1000 раз при повторении.', descUk:'Переверни картки 1000 разів під час повторення.', secret:true },
  { id:'flashcards_view_14_days', icon:'📆', category:'special', xp:500, nameRu:'Две карточные недели', nameUk:'Два карткові тижні', descRu:'14 дней подряд просматривай карточки в коллекции.', descUk:'14 днів поспіль переглядай картки в колекції.', secret:true },
  { id:'flashcards_view_30_days', icon:'🗓️', category:'special', xp:1000, nameRu:'Карточный месяц', nameUk:'Картковий місяць', descRu:'30 дней подряд просматривай карточки в коллекции.', descUk:'30 днів поспіль переглядай картки в колекції.', secret:true },
  { id:'arena_25_wins', icon:'⚔️', category:'special', xp:650, nameRu:'25 побед Арены', nameUk:'25 перемог Арени', descRu:'Выиграй 25 матчей Арены.', descUk:'Виграй 25 матчів Арени.', secret:true },
  { id:'arena_50_wins', icon:'🏆', category:'special', xp:1100, nameRu:'50 побед Арены', nameUk:'50 перемог Арени', descRu:'Выиграй 50 матчей Арены.', descUk:'Виграй 50 матчів Арени.', secret:true },
  { id:'arena_100_wins', icon:'👑', category:'special', xp:2200, nameRu:'100 побед Арены', nameUk:'100 перемог Арени', descRu:'Выиграй 100 матчей Арены.', descUk:'Виграй 100 матчів Арени.', secret:true },
  { id:'arena_streak_15', icon:'🔥', category:'special', xp:750, nameRu:'15 побед подряд', nameUk:'15 перемог поспіль', descRu:'15 побед подряд в Арене без поражений.', descUk:'15 перемог поспіль в Арені без поразок.', secret:true },
  { id:'arena_streak_25', icon:'💥', category:'special', xp:1500, nameRu:'25 побед подряд', nameUk:'25 перемог поспіль', descRu:'25 побед подряд в Арене без поражений.', descUk:'25 перемог поспіль в Арені без поразок.', secret:true },
  { id:'arena_wager_10', icon:'💰', category:'special', xp:650, nameRu:'10 ставок Арены', nameUk:'10 ставок Арени', descRu:'Выиграй 10 ставок в Арене.', descUk:'Виграй 10 ставок в Арені.', secret:true },
  { id:'arena_wager_25', icon:'💎', category:'special', xp:1300, nameRu:'25 ставок Арены', nameUk:'25 ставок Арени', descRu:'Выиграй 25 ставок в Арене.', descUk:'Виграй 25 ставок в Арені.', secret:true },
  { id:'shards_250', icon:'💎', category:'special', xp:500, nameRu:'250 осколков', nameUk:'250 осколків', descRu:'Доведи баланс до 250 осколков знаний.', descUk:'Доведи баланс до 250 осколків знань.', secret:true },
  { id:'shards_500', icon:'💎', category:'special', xp:900, nameRu:'500 осколков', nameUk:'500 осколків', descRu:'Доведи баланс до 500 осколков знаний.', descUk:'Доведи баланс до 500 осколків знань.', secret:true },
  { id:'shards_1000', icon:'💎', category:'special', xp:1800, nameRu:'Тысяча осколков', nameUk:'Тисяча осколків', descRu:'Доведи баланс до 1000 осколков знаний.', descUk:'Доведи баланс до 1000 осколків знань.', secret:true },
  { id:'shards_spent_500', icon:'💠', category:'special', xp:800, nameRu:'500 осколков в дело', nameUk:'500 осколків у діло', descRu:'Потрать суммарно 500 осколков.', descUk:'Витрать загалом 500 осколків.', secret:true },
  { id:'shards_spent_1000', icon:'💠', category:'special', xp:1500, nameRu:'Большой оборот', nameUk:'Великий обіг', descRu:'Потрать суммарно 1000 осколков.', descUk:'Витрать загалом 1000 осколків.', secret:true },
  { id:'energy_refill_10', icon:'🔋', category:'special', xp:400, nameRu:'10 зарядок', nameUk:'10 зарядок', descRu:'10 раз восстанови энергию за осколки.', descUk:'10 разів віднови енергію за осколки.', secret:true },
  { id:'energy_refill_25', icon:'⚡', category:'special', xp:900, nameRu:'25 зарядок', nameUk:'25 зарядок', descRu:'25 раз восстанови энергию за осколки.', descUk:'25 разів віднови енергію за осколки.', secret:true },
  { id:'league_top3_5', icon:'🥉', category:'special', xp:500, nameRu:'Пять недель в топ-3', nameUk:'П’ять тижнів у топ-3', descRu:'5 раз заверши неделю в топ-3 своей лиги.', descUk:'5 разів заверши тиждень у топ-3 своєї ліги.', secret:true },
  { id:'league_champion_5', icon:'👑', category:'special', xp:850, nameRu:'Пять чемпионств', nameUk:'П’ять чемпіонств', descRu:'5 раз заверши неделю первым в группе лиги.', descUk:'5 разів заверши тиждень першим у групі ліги.', secret:true },
  { id:'league_champion_10', icon:'🏆', category:'special', xp:1600, nameRu:'Десять чемпионств', nameUk:'Десять чемпіонств', descRu:'10 раз заверши неделю первым в группе лиги.', descUk:'10 разів заверши тиждень першим у групі ліги.', secret:true },
  { id:'league_diamond_4_weeks', icon:'💎', category:'special', xp:1000, nameRu:'Месяц в Алмазе', nameUk:'Місяць у Діаманті', descRu:'4 недельных результата подряд получи в Алмазной лиге или выше.', descUk:'4 тижневі результати поспіль отримай у Діамантовій лізі або вище.', secret:true },
  { id:'social_friends_25', icon:'🌐', category:'special', xp:450, nameRu:'25 друзей', nameUk:'25 друзів', descRu:'25 друзей в списке.', descUk:'25 друзів у списку.', secret:true },
  { id:'social_friends_50', icon:'🌍', category:'special', xp:900, nameRu:'50 друзей', nameUk:'50 друзів', descRu:'50 друзей в списке.', descUk:'50 друзів у списку.', secret:true },
  { id:'social_gift_25', icon:'🎁', category:'special', xp:550, nameRu:'25 подарков', nameUk:'25 подарунків', descRu:'Отправь 25 подарков друзьям.', descUk:'Надішли 25 подарунків друзям.', secret:true },
  { id:'social_gift_100', icon:'💝', category:'special', xp:1500, nameRu:'100 подарков', nameUk:'100 подарунків', descRu:'Отправь 100 подарков друзьям.', descUk:'Надішли 100 подарунків друзям.', secret:true },
  { id:'social_likes_25', icon:'❤️', category:'special', xp:450, nameRu:'25 лайков', nameUk:'25 лайків', descRu:'Получи 25 лайков от друзей на свои достижения.', descUk:'Отримай 25 лайків від друзів на свої досягнення.', secret:true },
  { id:'social_likes_100', icon:'💗', category:'special', xp:1200, nameRu:'100 лайков', nameUk:'100 лайків', descRu:'Получи 100 лайков от друзей на свои достижения.', descUk:'Отримай 100 лайків від друзів на свої досягнення.', secret:true },
  { id:'league_chat_50', icon:'💬', category:'special', xp:450, nameRu:'50 сообщений в лиге', nameUk:'50 повідомлень у лізі', descRu:'Отправь 50 сообщений в чате лиги.', descUk:'Надішли 50 повідомлень у чаті ліги.', secret:true },
  { id:'league_chat_100', icon:'🗨️', category:'special', xp:850, nameRu:'100 сообщений в лиге', nameUk:'100 повідомлень у лізі', descRu:'Отправь 100 сообщений в чате лиги.', descUk:'Надішли 100 повідомлень у чаті ліги.', secret:true },
  { id:'trainer_1000_correct', icon:'🧠', category:'special', xp:1000, nameRu:'1000 точных', nameUk:'1000 точних', descRu:'1000 правильных ответов суммарно в тренировках.', descUk:'1000 правильних відповідей загалом у тренуваннях.', secret:true },
  { id:'trainer_2500_correct', icon:'🏋️', category:'special', xp:1800, nameRu:'2500 точных', nameUk:'2500 точних', descRu:'2500 правильных ответов суммарно в тренировках.', descUk:'2500 правильних відповідей загалом у тренуваннях.', secret:true },
  { id:'trainer_10000_correct', icon:'👑', category:'special', xp:4500, nameRu:'10000 точных', nameUk:'10000 точних', descRu:'10000 правильных ответов суммарно в тренировках.', descUk:'10000 правильних відповідей загалом у тренуваннях.', secret:true },
  { id:'trainer_perfect_10_sessions', icon:'💯', category:'special', xp:600, nameRu:'10 чистых тренировок', nameUk:'10 чистих тренувань', descRu:'10 раз заверши тренировку из 5+ вопросов без ошибки.', descUk:'10 разів заверши тренування з 5+ питань без помилки.', secret:true },
  { id:'trainer_perfect_50_sessions', icon:'🏆', category:'special', xp:1600, nameRu:'50 чистых тренировок', nameUk:'50 чистих тренувань', descRu:'50 раз заверши тренировку из 5+ вопросов без ошибки.', descUk:'50 разів заверши тренування з 5+ питань без помилки.', secret:true },
  { id:'pack_10_purchased', icon:'📚', category:'special', xp:450, nameRu:'10 наборов', nameUk:'10 наборів', descRu:'10 наборов карточек в коллекции.', descUk:'10 наборів карток у колекції.', secret:true },
  { id:'pack_25_purchased', icon:'📦', category:'special', xp:1000, nameRu:'25 наборов', nameUk:'25 наборів', descRu:'25 наборов карточек в коллекции.', descUk:'25 наборів карток у колекції.', secret:true },
  { id:'share_achievement_10', icon:'📣', category:'special', xp:250, nameRu:'10 громких побед', nameUk:'10 гучних перемог', descRu:'Поделись 10 разблокированными достижениями.', descUk:'Поділись 10 розблокованими досягненнями.', secret:true },

  { id:'gem_a1_obsidian', icon:'💎', category:'medal', xp:700, nameRu:'A1 обсидиан', nameUk:'A1 обсидіан', descRu:'Уроки 1–8: каждый завершён минимум 7 раз.', descUk:'Уроки 1–8: кожен завершено мінімум 7 разів.', secret:true },
  { id:'gem_a1_mythic', icon:'💎', category:'medal', xp:1200, nameRu:'A1 мифик', nameUk:'A1 міфік', descRu:'Уроки 1–8: каждый завершён минимум 10 раз.', descUk:'Уроки 1–8: кожен завершено мінімум 10 разів.', secret:true },
  { id:'gem_a2_obsidian', icon:'💎', category:'medal', xp:700, nameRu:'A2 обсидиан', nameUk:'A2 обсидіан', descRu:'Уроки 9–18: каждый завершён минимум 7 раз.', descUk:'Уроки 9–18: кожен завершено мінімум 7 разів.', secret:true },
  { id:'gem_a2_mythic', icon:'💎', category:'medal', xp:1200, nameRu:'A2 мифик', nameUk:'A2 міфік', descRu:'Уроки 9–18: каждый завершён минимум 10 раз.', descUk:'Уроки 9–18: кожен завершено мінімум 10 разів.', secret:true },
  { id:'gem_b1_obsidian', icon:'💎', category:'medal', xp:700, nameRu:'B1 обсидиан', nameUk:'B1 обсидіан', descRu:'Уроки 19–28: каждый завершён минимум 7 раз.', descUk:'Уроки 19–28: кожен завершено мінімум 7 разів.', secret:true },
  { id:'gem_b1_mythic', icon:'💎', category:'medal', xp:1200, nameRu:'B1 мифик', nameUk:'B1 міфік', descRu:'Уроки 19–28: каждый завершён минимум 10 раз.', descUk:'Уроки 19–28: кожен завершено мінімум 10 разів.', secret:true },
  { id:'gem_b2_obsidian', icon:'💎', category:'medal', xp:700, nameRu:'B2 обсидиан', nameUk:'B2 обсидіан', descRu:'Уроки 29–32: каждый завершён минимум 7 раз.', descUk:'Уроки 29–32: кожен завершено мінімум 7 разів.', secret:true },
  { id:'gem_b2_mythic', icon:'💎', category:'medal', xp:1200, nameRu:'B2 мифик', nameUk:'B2 міфік', descRu:'Уроки 29–32: каждый завершён минимум 10 раз.', descUk:'Уроки 29–32: кожен завершено мінімум 10 разів.', secret:true },
  { id:'gem_all_obsidian', icon:'🏆', category:'medal', xp:2200, nameRu:'Все обсидианы', nameUk:'Усі обсидіани', descRu:'Собери обсидиановую медаль по A1, A2, B1 и B2.', descUk:'Збери обсидіанову медаль за A1, A2, B1 і B2.', secret:true },
  { id:'gem_all_mythic', icon:'👑', category:'medal', xp:4000, nameRu:'Все мифики', nameUk:'Усі міфіки', descRu:'Собери мифическую медаль по A1, A2, B1 и B2.', descUk:'Збери міфічну медаль за A1, A2, B1 і B2.', secret:true },
];

// AsyncStorage

const STORAGE_KEY = 'achievements_v1';
/** Одноразовая миграция: сброс shardClaimed у уже открытых (старые версии могли оставить true по ошибке). */
const SHARD_REOPEN_INTEGRITY_KEY = 'achievements_shard_reopen_mis_migrated_v1';

const normalizeAchievementState = (s: AchievementState): AchievementState => ({
  ...s,
  notified: s.notified ?? false,
  shardClaimed: s.unlockedAt === null ? true : (s.shardClaimed === undefined ? false : s.shardClaimed),
});

export const loadAchievementStates = async (): Promise<AchievementState[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: AchievementState[] = JSON.parse(raw);
      const validIds = new Set(ALL_ACHIEVEMENTS.map(a => a.id));
      const normalized = parsed.map(normalizeAchievementState);
      let next = normalized.filter(s => validIds.has(s.id));
      const hadObsolete = next.length !== normalized.length;
      const knownIds = new Set(next.map(s => s.id));
      let addedNew = false;
      for (const a of ALL_ACHIEVEMENTS) {
        if (!knownIds.has(a.id)) {
          next.push({ id: a.id, unlockedAt: null, notified: false, shardClaimed: true });
          knownIds.add(a.id);
          addedNew = true;
        }
      }
      let shouldWrite = hadObsolete || addedNew || JSON.stringify(next) !== raw;
      const integrity = await AsyncStorage.getItem(SHARD_REOPEN_INTEGRITY_KEY);
      if (integrity !== '1') {
        for (const s of next) {
          if (s.unlockedAt !== null) {
            s.shardClaimed = false;
          }
        }
        shouldWrite = true;
        await AsyncStorage.setItem(SHARD_REOPEN_INTEGRITY_KEY, '1');
      }
      if (shouldWrite) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    }
    const initial: AchievementState[] = ALL_ACHIEVEMENTS.map(a => ({
      id: a.id, unlockedAt: null, notified: false, shardClaimed: true,
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch { return []; }
};

const saveStates = async (states: AchievementState[]) => {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(states)); } catch {}
};

const unlockOne = (states: AchievementState[], id: string): boolean => {
  const existing = states.find(s => s.id === id);
  if (existing) {
    if (existing.unlockedAt !== null) return false;
    existing.unlockedAt = new Date().toISOString();
    existing.shardClaimed = false;
    return true;
  }
  states.push({ id, unlockedAt: new Date().toISOString(), notified: false, shardClaimed: false });
  return true;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const localDayKey = (date = new Date()): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const localMonthKey = (date = new Date()): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

const daysInLocalMonth = (date = new Date()): number =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const localWeekKey = (date = new Date()): string => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  return localDayKey(start);
};

const shiftLocalDayKey = (key: string, days: number): string => {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDayKey(date);
};

const bumpStoredCounter = async (key: string, amount = 1): Promise<number> => {
  const add = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  if (add <= 0) return parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
  const cur = parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
  const next = cur + add;
  await AsyncStorage.setItem(key, String(next));
  return next;
};

const bumpConsecutiveDayStreak = async (key: string): Promise<number> => {
  const today = localDayKey();
  let prev: { lastDay?: string; streak?: number } = {};
  try {
    const raw = await AsyncStorage.getItem(key);
    prev = raw ? JSON.parse(raw) : {};
  } catch {
    prev = {};
  }
  if (prev.lastDay === today) return Math.max(1, Math.floor(prev.streak ?? 1));
  const yesterday = shiftLocalDayKey(today, -1);
  const nextStreak = prev.lastDay === yesterday
    ? Math.max(0, Math.floor(prev.streak ?? 0)) + 1
    : 1;
  await AsyncStorage.setItem(key, JSON.stringify({ lastDay: today, streak: nextStreak }));
  return nextStreak;
};

const bumpConsecutiveWeekStreak = async (key: string): Promise<number> => {
  const week = localWeekKey();
  let prev: { lastWeek?: string; streak?: number } = {};
  try {
    const raw = await AsyncStorage.getItem(key);
    prev = raw ? JSON.parse(raw) : {};
  } catch {
    prev = {};
  }
  if (prev.lastWeek === week) return Math.max(1, Math.floor(prev.streak ?? 1));
  const previousWeek = localWeekKey(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 7));
  const nextStreak = prev.lastWeek === previousWeek
    ? Math.max(0, Math.floor(prev.streak ?? 0)) + 1
    : 1;
  await AsyncStorage.setItem(key, JSON.stringify({ lastWeek: week, streak: nextStreak }));
  return nextStreak;
};

const readConsecutiveDayStreakValue = async (key: string): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return Math.max(0, Math.floor(parsed?.streak ?? 0));
  } catch { return 0; }
};

const bumpMonthlyActivityDays = async (key: string): Promise<{ monthKey: string; count: number; daysInMonth: number; isLastDay: boolean }> => {
  const now = new Date();
  const monthKey = localMonthKey(now);
  const today = localDayKey(now);
  const daysInMonth = daysInLocalMonth(now);
  let prev: { monthKey?: string; days?: string[] } = {};
  try {
    const raw = await AsyncStorage.getItem(key);
    prev = raw ? JSON.parse(raw) : {};
  } catch {
    prev = {};
  }
  const days = prev.monthKey === monthKey && Array.isArray(prev.days)
    ? prev.days.filter((x): x is string => typeof x === 'string')
    : [];
  if (!days.includes(today)) days.push(today);
  await AsyncStorage.setItem(key, JSON.stringify({ monthKey, days }));
  return { monthKey, count: days.length, daysInMonth, isLastDay: now.getDate() === daysInMonth };
};

const addStoredSetValue = async (key: string, value: string): Promise<number> => {
  const normalized = value.trim();
  if (!normalized) {
    try {
      const raw = await AsyncStorage.getItem(key);
      const parsed = JSON.parse(raw ?? '[]');
      return Array.isArray(parsed) ? parsed.length : 0;
    }
    catch { return 0; }
  }
  let values: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    values = Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
  } catch {
    values = [];
  }
  if (!values.includes(normalized)) {
    values.push(normalized);
    await AsyncStorage.setItem(key, JSON.stringify(values));
  }
  return values.length;
};

const ACHIEVEMENT_BACKFILL_KEY = 'achievements_progress_backfill_v3';

const readStoredCounter = async (key: string): Promise<number> =>
  parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;

const setStoredCounterAtLeast = async (key: string, value: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const cur = await readStoredCounter(key);
  if (safe > cur) {
    await AsyncStorage.setItem(key, String(safe));
    return safe;
  }
  return cur;
};

const readStoredNumberSet = async (key: string): Promise<number[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(x => Math.floor(Number(x))).filter(x => Number.isFinite(x) && x > 0)
      : [];
  } catch { return []; }
};

const addStoredNumberSetValue = async (key: string, value: number): Promise<number> => {
  const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const values = await readStoredNumberSet(key);
  if (safe > 0 && !values.includes(safe)) {
    values.push(safe);
    await AsyncStorage.setItem(key, JSON.stringify(values));
  }
  return values.length;
};

const readStoredStringList = async (key: string): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const readStoredObjectList = async (key: string): Promise<Array<Record<string, unknown>>> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      : [];
  } catch {
    return [];
  }
};

const COURSE_ACHIEVEMENT_RANGES: Record<string, [number, number]> = {
  a1: [1, 8],
  a2: [9, 18],
  b1: [19, 28],
  b2: [29, 32],
};

const readLessonPassCounts = async (): Promise<number[]> => {
  const keys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_pass_count`);
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.map(([, raw]) => Math.max(0, parseInt(raw ?? '0', 10) || 0));
  } catch {
    return Array.from({ length: 32 }, () => 0);
  }
};

const countPerfectLessonsInRange = async (from: number, to: number): Promise<number> => {
  const keys = Array.from({ length: to - from + 1 }, (_, i) => `lesson${from + i}_progress`);
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    let count = 0;
    for (const [, raw] of pairs) {
      if (!raw) continue;
      const p: string[] = JSON.parse(raw);
      const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
      const wrong = p.filter(x => x === 'wrong').length;
      if (correct >= 45 && wrong === 0) count++;
    }
    return count;
  } catch { return 0; }
};

const readPerfectLessonPassCounts = async (): Promise<number[]> => {
  const keys = Array.from({ length: 32 }, (_, i) => `achievement_lesson_${i + 1}_perfect_passes_v1`);
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.map(([, raw]) => {
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch { return 0; }
    });
  } catch {
    return Array.from({ length: 32 }, () => 0);
  }
};

const unlockLessonPassAchievements = async (unlock: (id: string) => void): Promise<void> => {
  const passCounts = await readLessonPassCounts();
  const countAtLeast = (n: number) => passCounts.filter(c => c >= n).length;
  if (countAtLeast(2) >= 32) unlock('lesson_all_2x');
  if (countAtLeast(3) >= 32) unlock('lesson_all_3x');
  if (countAtLeast(5) >= 32) unlock('lesson_all_5x');

  const obsidianLevels: string[] = [];
  const mythicLevels: string[] = [];
  for (const [level, [from, to]] of Object.entries(COURSE_ACHIEVEMENT_RANGES)) {
    const slice = passCounts.slice(from - 1, to);
    const minPasses = slice.length > 0 ? Math.min(...slice) : 0;
    if (minPasses >= 7) {
      unlock(`gem_${level}_obsidian`);
      obsidianLevels.push(level);
    }
    if (minPasses >= 10) {
      unlock(`gem_${level}_mythic`);
      mythicLevels.push(level);
    }
  }
  if (obsidianLevels.length >= 4) unlock('gem_all_obsidian');
  if (mythicLevels.length >= 4) unlock('gem_all_mythic');
};

const unlockWeeklyXpAchievements = async (unlock: (id: string) => void): Promise<void> => {
  const currentWeek = await readStoredCounter('week_points');
  const peak = await readStoredCounter('week_xp_peak_best_v1');
  const best = Math.max(currentWeek, peak);
  if (best >= 5000) unlock('weekly_xp_5000');
  if (best >= 10000) unlock('weekly_xp_10000');
};

const markStreakSafetyUsed = async (): Promise<void> => {
  const streak = await readStoredCounter('streak_count');
  await AsyncStorage.setItem('achievement_streak_safety_used_v1', JSON.stringify({
    streak,
    day: localDayKey(),
  }));
};

const backfillAchievementsFromLocalState = async (
  unlock: (id: string) => void,
  force = false,
): Promise<void> => {
  if (!force && (await AsyncStorage.getItem(ACHIEVEMENT_BACKFILL_KEY)) === '1') return;

  const [trainerCorrect, legacyRecallCorrect] = await Promise.all([
    readStoredCounter('achievement_trainer_correct_count'),
    readStoredCounter('achievement_active_recall_correct_count'),
  ]);
  const practiceCorrect = Math.max(trainerCorrect, legacyRecallCorrect);
  if (practiceCorrect > 0) {
    await Promise.all([
      setStoredCounterAtLeast('achievement_trainer_correct_count', practiceCorrect),
      setStoredCounterAtLeast('achievement_active_recall_correct_count', practiceCorrect),
    ]);
    if (practiceCorrect >= 1) unlock('recall_first');
    if (practiceCorrect >= 50) unlock('recall_50');
    if (practiceCorrect >= 100) unlock('trainer_100_correct');
    if (practiceCorrect >= 500) unlock('trainer_500_correct');
    if (practiceCorrect >= 1000) unlock('trainer_1000_correct');
    if (practiceCorrect >= 2500) unlock('trainer_2500_correct');
    if (practiceCorrect >= 10000) unlock('trainer_10000_correct');
  }

  const savedCards = await readStoredObjectList('flashcards_v1');
  if (savedCards.length > 0) {
    await setStoredCounterAtLeast('achievement_flashcards_saved_count', savedCards.length);
    if (savedCards.length >= 25) unlock('flashcards_save_25');
    if (savedCards.length >= 50) unlock('flashcards_save_50');
    if (savedCards.length >= 100) unlock('flashcards_save_100');
    if (savedCards.length >= 250) unlock('flashcards_save_250');

    const sources = new Set<string>();
    for (const card of savedCards) {
      const source = typeof card.source === 'string' ? card.source : '';
      if (source) sources.add(source);
    }
    const storedSources = await readStoredStringList('achievement_flashcards_source_set_v1');
    storedSources.forEach(source => sources.add(source));
    if (sources.size > storedSources.length) {
      await AsyncStorage.setItem('achievement_flashcards_source_set_v1', JSON.stringify([...sources]));
    }
    if (sources.size >= 4) unlock('flashcards_sources_4');
  }

  const [officialPacks, legacyPacks, communityPacks] = await Promise.all([
    readStoredStringList('flashcards_owned_packs_v1'),
    readStoredStringList('flashcards_market_dev_owned_v1'),
    readStoredStringList('community_owned_pack_ids_v1'),
  ]);
  const packCount = new Set([...officialPacks, ...legacyPacks, ...communityPacks]).size;
  if (packCount >= 1) unlock('pack_purchased');
  if (packCount >= 5) unlock('pack_5_purchased');
  if (packCount >= 10) unlock('pack_10_purchased');
  if (packCount >= 25) unlock('pack_25_purchased');

  const lifetimeSpent = await readStoredCounter('shards_lifetime_spent_v1');
  const achievementSpent = await setStoredCounterAtLeast('achievement_shards_spent_total', lifetimeSpent);
  if (achievementSpent >= 100) unlock('shards_spent_100');
  if (achievementSpent >= 500) unlock('shards_spent_500');
  if (achievementSpent >= 1000) unlock('shards_spent_1000');

  const arenaWins = await readStoredCounter('achievement_arena_win_count');
  if (arenaWins >= 1) unlock('arena_first_win');
  if (arenaWins >= 10) unlock('arena_10_wins');
  if (arenaWins >= 25) unlock('arena_25_wins');
  if (arenaWins >= 50) unlock('arena_50_wins');
  if (arenaWins >= 100) unlock('arena_100_wins');

  const totalXP = await readStoredCounter('user_total_xp');
  if (totalXP >= 100) unlock('xp_100');
  if (totalXP >= 250) unlock('xp_250');
  if (totalXP >= 500) unlock('xp_500');
  if (totalXP >= 1000) unlock('xp_1000');
  if (totalXP >= 2500) unlock('xp_2500');
  if (totalXP >= 5000) unlock('xp_5000');
  if (totalXP >= 10000) unlock('xp_10000');
  if (totalXP >= 20000) unlock('xp_20000');
  if (totalXP >= 50000) unlock('xp_50000');
  if (totalXP >= 75000) unlock('xp_75000');
  if (totalXP >= 100000) unlock('xp_100000');
  if (totalXP >= 150000) unlock('xp_150000');
  if (totalXP >= 250000) unlock('xp_250000');
  if (totalXP >= 500000) unlock('xp_500000');
  if (totalXP >= 750000) unlock('xp_750000');
  if (totalXP >= 1000000) unlock('xp_1000000');
  if (totalXP >= 2000000) unlock('xp_2000000');
  const level = getLevelFromXP(totalXP);
  if (level >= 50) unlock('level_50');

  await unlockWeeklyXpAchievements(unlock);
  await unlockLessonPassAchievements(unlock);
  if (await countPerfectLessonsInRange(29, 32) >= 4) unlock('lesson_b2_perfect');
  const perfectPasses = await readPerfectLessonPassCounts();
  if (perfectPasses.filter(count => count >= 2).length >= 32) unlock('lesson_all_perfect_2x');

  const quizSessions = await readStoredCounter('achievement_quiz_total_count');
  if (quizSessions >= 10) unlock('quiz_10_completed');
  if (quizSessions >= 25) unlock('quiz_25_completed');
  if (quizSessions >= 50) unlock('quiz_50_completed');
  if (quizSessions >= 100) unlock('quiz_100_completed');

  const hardQuizzes = await readStoredCounter('quiz_hard_count');
  if (hardQuizzes >= 5) unlock('quiz_speed_demon');
  if (hardQuizzes >= 10) unlock('quiz_hard_10');
  if (hardQuizzes >= 25) unlock('quiz_hard_25');

  const hardPerfect = await readStoredCounter('achievement_quiz_hard_perfect_count');
  if (hardPerfect >= 3) unlock('quiz_hard_perfect_3');
  if (hardPerfect >= 10) unlock('quiz_hard_perfect_10');

  const comboBest = await readStoredCounter('achievement_combo_best_count');
  if (comboBest >= 150) unlock('combo_150');
  if (comboBest >= 250) unlock('combo_250');
  if (comboBest >= 500) unlock('combo_500');

  const dailyAllStreak = await readConsecutiveDayStreakValue('achievement_all_daily_streak_v1');
  if (dailyAllStreak >= 3) unlock('daily_all_3');
  if (dailyAllStreak >= 7) unlock('daily_all_7');
  if (dailyAllStreak >= 14) unlock('daily_all_14');
  if (dailyAllStreak >= 30) unlock('daily_all_30');

  const noRerollStreak = await readConsecutiveDayStreakValue('achievement_daily_no_reroll_streak_v1');
  if (noRerollStreak >= 7) unlock('daily_no_reroll_7');
  if (noRerollStreak >= 30) unlock('daily_no_reroll_30');

  const phraseReads = await readStoredCounter('achievement_daily_phrase_read_count');
  if (phraseReads >= 30) unlock('daily_phrase_read_30');
  const phraseSaves = await readStoredCounter('achievement_daily_phrase_save_count');
  if (phraseSaves >= 30) unlock('daily_phrase_save_30');
  if (phraseSaves >= 100) unlock('daily_phrase_save_100');

  const shards = await readStoredCounter('shards_balance');
  if (shards >= 100) unlock('shards_100');
  if (shards >= 250) unlock('shards_250');
  if (shards >= 500) unlock('shards_500');
  if (shards >= 1000) unlock('shards_1000');

  const flips = await readStoredCounter('achievement_flashcards_flip_count');
  if (flips >= 100) unlock('flashcards_flip_100');
  if (flips >= 500) unlock('flashcards_flip_500');
  if (flips >= 1000) unlock('flashcards_flip_1000');

  const flashViewStreak = await readConsecutiveDayStreakValue('achievement_flashcards_view_streak_v1');
  if (flashViewStreak >= 7) unlock('flashcards_view_7_days');
  if (flashViewStreak >= 14) unlock('flashcards_view_14_days');
  if (flashViewStreak >= 30) unlock('flashcards_view_30_days');

  const refills = await readStoredCounter('achievement_energy_refill_count');
  if (refills >= 1) unlock('energy_refill_first');
  if (refills >= 5) unlock('energy_refill_5');
  if (refills >= 10) unlock('energy_refill_10');
  if (refills >= 25) unlock('energy_refill_25');

  const top3 = await readStoredCounter('achievement_league_top3_count');
  if (top3 >= 5) unlock('league_top3_5');
  const champion = await readStoredCounter('achievement_league_champion_count');
  if (champion >= 5) unlock('league_champion_5');
  if (champion >= 10) unlock('league_champion_10');
  if (await readConsecutiveDayStreakValue('achievement_league_diamond_week_streak_v1') >= 4) unlock('league_diamond_4_weeks');

  const gifts = await readStoredCounter('achievement_gift_sent_count');
  if (gifts >= 5) unlock('social_gift_5');
  if (gifts >= 10) unlock('social_gift_10');
  if (gifts >= 25) unlock('social_gift_25');
  if (gifts >= 100) unlock('social_gift_100');

  const chat = await readStoredCounter('achievement_league_chat_message_count');
  if (chat >= 10) unlock('league_chat_10');
  if (chat >= 50) unlock('league_chat_50');
  if (chat >= 100) unlock('league_chat_100');

  const perfectSessions = await readStoredCounter('achievement_trainer_perfect_session_count');
  if (perfectSessions >= 10) unlock('trainer_perfect_10_sessions');
  if (perfectSessions >= 50) unlock('trainer_perfect_50_sessions');

  const shares = await readStoredCounter('achievement_share_count');
  if (shares >= 10) unlock('share_achievement_10');

  await AsyncStorage.setItem(ACHIEVEMENT_BACKFILL_KEY, '1');
};

export type AchievementEvent =
  | { type: 'streak';         streak:    number }
  | { type: 'xp';             totalXP:   number }
  | { type: 'lesson_complete'; lessonCount: number; wasPerfect?: boolean; perfectCount?: number; lessonId?: number }
  | { type: 'lesson_perfect_pass'; lessonId: number; passCount: number }
  | { type: 'quiz';           level: string; perfect?: boolean }
  | { type: 'combo';          count: number }
  | { type: 'daily_task';     allDone?: boolean; noReroll?: boolean }
  | { type: 'login';          consecutiveDays: number }
  | { type: 'comeback' }
  | { type: 'wager_win' }
  | { type: 'personal_best' }
  | { type: 'streak_repair' }
  | { type: 'perfect_week' }
  | { type: 'diagnosis' }
  | { type: 'time_of_day' }
  | { type: 'backfill' }
  | { type: 'exam';            pct: number }
  | { type: 'flashcards_session' }
  | { type: 'flashcard_saved'; source?: string; count?: number }
  | { type: 'flashcard_flipped'; count?: number }
  | { type: 'flashcard_viewed'; count?: number }
  | { type: 'daily_phrase'; action: 'read' | 'save' }
  | { type: 'active_recall'; correct?: number }
  | { type: 'arena_win' }
  | { type: 'shards'; balance: number }
  | { type: 'shards_spent'; amount: number }
  | { type: 'energy_refill' }
  | { type: 'league_result'; myRank: number; totalInGroup: number; promoted?: boolean; newLeagueId?: number }
  | { type: 'league_boost'; multiplier: number }
  | { type: 'gem'; level: string; gem: 'ruby' | 'emerald' | 'diamond' }
  // ── Новые события ────────────────────────────────────────────────────────
  | { type: 'friend_added';   totalFriends: number }
  | { type: 'gift_sent' }
  | { type: 'achievement_liked'; likeTotal?: number }
  | { type: 'league_chat_message' }
  | { type: 'arena_win_streak'; streak: number }
  | { type: 'arena_duel_friend_win' }
  | { type: 'arena_wager_win'; count?: number }
  | { type: 'trainer_correct'; correct: number }
  | { type: 'trainer_session_result'; correct: number; wrong: number; total: number }
  | { type: 'avatar_custom_set' }
  | { type: 'profile_theme_set' }
  | { type: 'pack_purchased';  totalPacks: number }
  | { type: 'achievement_shared' }
  | { type: 'level_reached';  level: number }
  | { type: 'quiz_session_count'; count: number }
  | { type: 'streak_freeze_used' }
  | { type: 'wager_win_streak'; count: number };

let _achievementLock: Promise<unknown> = Promise.resolve();

export const checkAchievements = async (event: AchievementEvent): Promise<Achievement[]> => {
  const result = _achievementLock.then(async () => {
  try {
    const states = await loadAchievementStates();
    const justUnlocked: Achievement[] = [];

    const u = (id: string) => {
      if (unlockOne(states, id)) {
        const def = ALL_ACHIEVEMENTS.find(a => a.id === id);
        if (def) justUnlocked.push(def);
      }
    };

    await backfillAchievementsFromLocalState(u, event.type === 'backfill');

    switch (event.type) {
      case 'streak': {
        const s = event.streak;
        if (s >= 3)   u('streak_3');
        if (s >= 7)   u('streak_7');
        if (s >= 14)  u('streak_14');
        if (s >= 30)  u('streak_30');
        if (s >= 60)  u('streak_60');
        if (s >= 100) u('streak_100');
        if (s >= 150) u('streak_150');
        if (s >= 200) u('streak_200');
        if (s >= 250) u('streak_250');
        if (s >= 365) u('streak_365');
        if (s >= 500) u('streak_500');
        if (s >= 750) u('streak_750');
        if (s >= 1000) u('streak_1000');
        if (s >= 365) {
          let lastSafetyStreak: number | null = null;
          try {
            const raw = await AsyncStorage.getItem('achievement_streak_safety_used_v1');
            const parsed = raw ? JSON.parse(raw) : null;
            const n = Math.floor(Number(parsed?.streak));
            if (Number.isFinite(n) && n > 0) lastSafetyStreak = n;
          } catch {}
          if (lastSafetyStreak === null || s - lastSafetyStreak >= 365) u('streak_clean_365');
        }
        {
          const month = await bumpMonthlyActivityDays('achievement_perfect_month_days_v1');
          if (month.isLastDay && month.count >= month.daysInMonth) u('perfect_month');
        }
        break;
      }
      case 'xp': {
        const xp = event.totalXP;
        if (xp >= 100)   u('xp_100');
        if (xp >= 250)   u('xp_250');
        if (xp >= 500)   u('xp_500');
        if (xp >= 1000)  u('xp_1000');
        if (xp >= 2500)  u('xp_2500');
        if (xp >= 5000)  u('xp_5000');
        if (xp >= 10000)  u('xp_10000');
        if (xp >= 20000)  u('xp_20000');
        if (xp >= 50000)  u('xp_50000');
        if (xp >= 75000)  u('xp_75000');
        if (xp >= 100000) u('xp_100000');
        if (xp >= 150000) u('xp_150000');
        if (xp >= 250000) u('xp_250000');
        if (xp >= 500000) u('xp_500000');
        if (xp >= 750000) u('xp_750000');
        if (xp >= 1000000) u('xp_1000000');
        if (xp >= 2000000) u('xp_2000000');
        await unlockWeeklyXpAchievements(u);
        break;
      }
      case 'lesson_complete': {
        const c = event.lessonCount;
        if (c >= 1)  u('lesson_1');
        if (c >= 3)  u('lesson_3');
        if (c >= 5)  u('lesson_5');
        if (c >= 10) u('lesson_10');
        if (c >= 15) u('lesson_15');
        if (c >= 20) u('lesson_20');
        if (c >= 32) u('lesson_all');
        if (event.wasPerfect) {
          u('lesson_perfect');
          if ((event.perfectCount ?? 0) >= 3)  u('lesson_perfect3');
          if ((event.perfectCount ?? 0) >= 10) u('lesson_perfect10');
          if ((event.perfectCount ?? 0) >= 32) u('lesson_all_perfect');
        }
        if ((event.perfectCount ?? 0) >= 10) u('lesson_perfect10');
        if (await countPerfectLessonsInRange(29, 32) >= 4) u('lesson_b2_perfect');
        if (event.lessonId && event.lessonId >= 1 && event.lessonId <= 32) {
          const dayKey = `achievement_lesson_marathon_day_${localDayKey()}`;
          const completedToday = await addStoredSetValue(dayKey, String(Math.floor(event.lessonId)));
          if (completedToday >= 10) u('lesson_marathon_day');
        }
        await unlockLessonPassAchievements(u);
        break;
      }
      case 'lesson_perfect_pass': {
        const lessonId = Math.floor(event.lessonId);
        if (lessonId >= 1 && lessonId <= 32) {
          await addStoredNumberSetValue(`achievement_lesson_${lessonId}_perfect_passes_v1`, event.passCount);
          const perfectPasses = await readPerfectLessonPassCounts();
          if (perfectPasses.filter(count => count >= 2).length >= 32) u('lesson_all_perfect_2x');
        }
        break;
      }
      case 'quiz': {
        u('quiz_first');
        if (event.level === 'medium') u('quiz_medium');
        if (event.level === 'hard')   u('quiz_hard');
        if (event.perfect) {
          if (event.level === 'easy')   u('quiz_perfect_easy');
          if (event.level === 'medium') u('quiz_perfect_medium');
          if (event.level === 'hard')   u('quiz_perfect');
        }
        {
          const allLevels = ['quiz_first','quiz_medium','quiz_hard'].every(
            id => states.find(s => s.id === id)?.unlockedAt !== null
          );
          if (allLevels) u('quiz_all_levels');
        }
        {
          const allPerfect = ['quiz_perfect_easy','quiz_perfect_medium','quiz_perfect'].every(
            id => states.find(s => s.id === id)?.unlockedAt !== null
          );
          if (allPerfect) u('quiz_triple_perfect');
        }
        if (event.perfect) {
          const dayKey = 'achievement_quiz_perfect_levels_today_v1';
          let daily: { day?: string; levels?: string[] } = {};
          try {
            const raw = await AsyncStorage.getItem(dayKey);
            daily = raw ? JSON.parse(raw) : {};
          } catch {
            daily = {};
          }
          const today = localDayKey();
          const levels = daily.day === today && Array.isArray(daily.levels)
            ? daily.levels.filter((x): x is string => typeof x === 'string')
            : [];
          if (!levels.includes(event.level)) levels.push(event.level);
          await AsyncStorage.setItem(dayKey, JSON.stringify({ day: today, levels }));
          if (['easy', 'medium', 'hard'].every(level => levels.includes(level))) {
            u('quiz_all_levels_perfect_same_day');
          }
          const perfectStreak = await bumpConsecutiveDayStreak('achievement_quiz_perfect_streak_v1');
          if (perfectStreak >= 7) u('quiz_perfect_7_days');
        }
        if (event.level === 'hard') {
          const hardCount = parseInt((await AsyncStorage.getItem('quiz_hard_count') ?? '0')) + 1;
          await AsyncStorage.setItem('quiz_hard_count', String(hardCount));
          if (hardCount >= 5) u('quiz_speed_demon');
          if (hardCount >= 10) u('quiz_hard_10');
          if (hardCount >= 25) u('quiz_hard_25');
          if (event.perfect) {
            const hardPerfect = await bumpStoredCounter('achievement_quiz_hard_perfect_count');
            if (hardPerfect >= 3) u('quiz_hard_perfect_3');
            if (hardPerfect >= 10) u('quiz_hard_perfect_10');
          }
        }
        break;
      }
      case 'combo': {
        await setStoredCounterAtLeast('achievement_combo_best_count', event.count);
        if (event.count >= 3)  u('combo_3');
        if (event.count >= 10) u('combo_10');
        if (event.count >= 20) u('combo_20');
        if (event.count >= 50)  u('combo_50');
        if (event.count >= 100) u('combo_100');
        if (event.count >= 150) u('combo_150');
        if (event.count >= 250) u('combo_250');
        if (event.count >= 500) u('combo_500');
        break;
      }
      case 'daily_task': {
        u('daily_task_first');
        if (event.allDone) {
          u('all_daily');
          const streak = await bumpConsecutiveDayStreak('achievement_all_daily_streak_v1');
          if (streak >= 3) u('daily_all_3');
          if (streak >= 7) u('daily_all_7');
          if (streak >= 14) u('daily_all_14');
          if (streak >= 30) u('daily_all_30');
          if (event.noReroll) {
            u('daily_no_reroll');
            const noRerollStreak = await bumpConsecutiveDayStreak('achievement_daily_no_reroll_streak_v1');
            if (noRerollStreak >= 7) u('daily_no_reroll_7');
            if (noRerollStreak >= 30) u('daily_no_reroll_30');
          }
        }
        break;
      }
      case 'login': {
        const d = event.consecutiveDays;
        if (d >= 7)  u('login_7');
        if (d >= 14) u('login_14');
        if (d >= 30) u('login_30');
        if (d >= 60)  u('login_60');
        if (d >= 100) u('login_100');
        if (d >= 200) u('login_200');
        if (d >= 365) u('login_365');
        break;
      }
      case 'comeback':      u('comeback');      break;
      case 'wager_win':     u('wager_win');     break;
      case 'personal_best': u('personal_best'); break;
      case 'streak_repair':
        await markStreakSafetyUsed();
        u('streak_repair');
        break;
      case 'perfect_week':  u('perfect_week');  break;
      case 'diagnosis':     u('diagnosis');     break;
      case 'time_of_day': {
        const h = new Date().getHours();
        if (h >= 23 || h < 5) {
          u('night_owl');
          const streak = await bumpConsecutiveDayStreak('achievement_night_xp_streak_v1');
          if (streak >= 7) u('night_week');
        }
        if (h >= 5 && h < 7) {
          u('early_bird');
          const streak = await bumpConsecutiveDayStreak('achievement_early_xp_streak_v1');
          if (streak >= 7) u('early_week');
        }
        break;
      }
      case 'backfill': {
        break;
      }
      case 'exam': {
        u('exam_first');
        if (event.pct >= 90) {
          u('exam_ace');
          const aces = await bumpStoredCounter('achievement_exam_ace_count');
          if (aces >= 5) u('exam_ace_5');
          if (aces >= 10) u('exam_ace_10');
        }
        break;
      }
      case 'flashcards_session': u('flashcards_session'); break;
      case 'flashcard_saved': {
        const saved = await bumpStoredCounter('achievement_flashcards_saved_count', event.count ?? 1);
        if (saved >= 25) u('flashcards_save_25');
        if (saved >= 50) u('flashcards_save_50');
        if (saved >= 100) u('flashcards_save_100');
        if (saved >= 250) u('flashcards_save_250');
        if (event.source) {
          const sources = await addStoredSetValue('achievement_flashcards_source_set_v1', event.source);
          if (sources >= 4) u('flashcards_sources_4');
        }
        break;
      }
      case 'flashcard_flipped': {
        const flips = await bumpStoredCounter('achievement_flashcards_flip_count', event.count ?? 1);
        if (flips >= 100) u('flashcards_flip_100');
        if (flips >= 500) u('flashcards_flip_500');
        if (flips >= 1000) u('flashcards_flip_1000');
        break;
      }
      case 'flashcard_viewed': {
        const count = Math.max(0, Math.floor(event.count ?? 1));
        if (count > 0) {
          const streak = await bumpConsecutiveDayStreak('achievement_flashcards_view_streak_v1');
          if (streak >= 7) u('flashcards_view_7_days');
          if (streak >= 14) u('flashcards_view_14_days');
          if (streak >= 30) u('flashcards_view_30_days');
        }
        break;
      }
      case 'daily_phrase': {
        if (event.action === 'read') {
          u('daily_phrase_first');
          const reads = await bumpStoredCounter('achievement_daily_phrase_read_count');
          if (reads >= 30) u('daily_phrase_read_30');
        }
        if (event.action === 'save') {
          u('daily_phrase_save');
          const saves = await bumpStoredCounter('achievement_daily_phrase_save_count');
          if (saves >= 30) u('daily_phrase_save_30');
          if (saves >= 100) u('daily_phrase_save_100');
        }
        break;
      }
      case 'active_recall': {
        const key = 'achievement_active_recall_correct_count';
        const add = Math.max(1, Math.floor(event.correct ?? 1));
        const current = parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
        const next = current + add;
        await AsyncStorage.setItem(key, String(next));
        if (next >= 1) u('recall_first');
        if (next >= 50) u('recall_50');
        break;
      }
      case 'arena_win': {
        const key = 'achievement_arena_win_count';
        const current = parseInt((await AsyncStorage.getItem(key)) ?? '0', 10) || 0;
        const next = current + 1;
        await AsyncStorage.setItem(key, String(next));
        if (next >= 1) u('arena_first_win');
        if (next >= 10) u('arena_10_wins');
        if (next >= 25) u('arena_25_wins');
        if (next >= 50) u('arena_50_wins');
        if (next >= 100) u('arena_100_wins');
        break;
      }
      case 'shards': {
        if (event.balance >= 100) u('shards_100');
        if (event.balance >= 250) u('shards_250');
        if (event.balance >= 500) u('shards_500');
        if (event.balance >= 1000) u('shards_1000');
        break;
      }
      case 'shards_spent': {
        const spent = await bumpStoredCounter('achievement_shards_spent_total', event.amount);
        if (spent >= 100) u('shards_spent_100');
        if (spent >= 500) u('shards_spent_500');
        if (spent >= 1000) u('shards_spent_1000');
        break;
      }
      case 'energy_refill': {
        const refills = await bumpStoredCounter('achievement_energy_refill_count');
        if (refills >= 1) u('energy_refill_first');
        if (refills >= 5) u('energy_refill_5');
        if (refills >= 10) u('energy_refill_10');
        if (refills >= 25) u('energy_refill_25');
        break;
      }
      case 'league_result': {
        const rank = Math.max(1, Math.floor(event.myRank));
        const total = Math.max(0, Math.floor(event.totalInGroup));
        if (total >= 2) u('league_result_first');
        if (total >= 3 && rank <= 3) {
          u('league_top3');
          const top3 = await bumpStoredCounter('achievement_league_top3_count');
          if (top3 >= 5) u('league_top3_5');
        }
        if (total >= 2 && rank === 1) {
          u('league_champion');
          const champion = await bumpStoredCounter('achievement_league_champion_count');
          if (champion >= 5) u('league_champion_5');
          if (champion >= 10) u('league_champion_10');
        }
        if (event.promoted) u('league_promoted');
        if ((event.newLeagueId ?? 0) >= 8) {
          u('league_diamond');
          const diamondStreak = await bumpConsecutiveWeekStreak('achievement_league_diamond_week_streak_v1');
          if (diamondStreak >= 4) u('league_diamond_4_weeks');
        }
        break;
      }
      case 'league_boost': {
        const boosts = await bumpStoredCounter('achievement_league_boost_count');
        if (boosts >= 1) u('league_boost_first');
        if (boosts >= 5) u('league_boost_5');
        if (event.multiplier >= 3) u('league_boost_x3');
        break;
      }
      case 'gem': {
        const lvlKey = event.level.toLowerCase();
        if (event.gem === 'ruby')    u(`gem_${lvlKey}_ruby`);
        if (event.gem === 'emerald') u(`gem_${lvlKey}_emerald`);
        if (event.gem === 'diamond') {
          u(`gem_${lvlKey}_diamond`);
          const allDiamonds = ['gem_a1_diamond','gem_a2_diamond','gem_b1_diamond','gem_b2_diamond']
            .every(id => states.find(s => s.id === id)?.unlockedAt !== null);
          if (allDiamonds) u('gem_all_complete');
        }
        await unlockLessonPassAchievements(u);
        break;
      }

      // ── Новые события ──────────────────────────────────────────────────────
      case 'friend_added': {
        const tf = event.totalFriends;
        if (tf >= 1)  u('social_friend_first');
        if (tf >= 3)  u('social_friends_3');
        if (tf >= 10) u('social_friends_10');
        if (tf >= 25) u('social_friends_25');
        if (tf >= 50) u('social_friends_50');
        break;
      }
      case 'gift_sent': {
        const giftKey = 'achievement_gift_sent_count';
        const cur = parseInt((await AsyncStorage.getItem(giftKey)) ?? '0', 10) || 0;
        const next = cur + 1;
        await AsyncStorage.setItem(giftKey, String(next));
        if (next >= 1) u('social_gift_send');
        if (next >= 5) u('social_gift_5');
        if (next >= 10) u('social_gift_10');
        if (next >= 25) u('social_gift_25');
        if (next >= 100) u('social_gift_100');
        break;
      }
      case 'achievement_liked': {
        u('social_like_received');
        if ((event.likeTotal ?? 0) >= 5) u('social_likes_5');
        if ((event.likeTotal ?? 0) >= 25) u('social_likes_25');
        if ((event.likeTotal ?? 0) >= 100) u('social_likes_100');
        break;
      }
      case 'league_chat_message': {
        const messages = await bumpStoredCounter('achievement_league_chat_message_count');
        if (messages >= 1) u('league_chat_first');
        if (messages >= 10) u('league_chat_10');
        if (messages >= 50) u('league_chat_50');
        if (messages >= 100) u('league_chat_100');
        break;
      }
      case 'arena_win_streak': {
        const ws = event.streak;
        if (ws >= 5)  u('arena_streak_5');
        if (ws >= 10) u('arena_streak_10');
        if (ws >= 15) u('arena_streak_15');
        if (ws >= 25) u('arena_streak_25');
        break;
      }
      case 'arena_duel_friend_win': {
        u('arena_duel_friend');
        break;
      }
      case 'arena_wager_win': {
        u('arena_wager_win');
        const wagerKey = 'achievement_arena_wager_win_count';
        const cur = parseInt((await AsyncStorage.getItem(wagerKey)) ?? '0', 10) || 0;
        const next = event.count !== undefined
          ? await setStoredCounterAtLeast(wagerKey, event.count)
          : (cur > 0 ? cur : await bumpStoredCounter(wagerKey));
        if (next >= 5) u('arena_wager_5');
        if (next >= 10) {
          u('arena_wager_10');
          u('wager_win_10');
        }
        if (next >= 25) u('arena_wager_25');
        break;
      }
      case 'trainer_correct': {
        const trainerKey = 'achievement_trainer_correct_count';
        const cur = parseInt((await AsyncStorage.getItem(trainerKey)) ?? '0', 10) || 0;
        const add = Math.max(1, Math.floor(event.correct));
        const next = cur + add;
        await AsyncStorage.setItem(trainerKey, String(next));
        await setStoredCounterAtLeast('achievement_active_recall_correct_count', next);
        if (next >= 1)   u('recall_first');
        if (next >= 50)  u('recall_50');
        if (next >= 100) u('trainer_100_correct');
        if (next >= 500) u('trainer_500_correct');
        if (next >= 1000) u('trainer_1000_correct');
        if (next >= 2500) u('trainer_2500_correct');
        if (next >= 10000) u('trainer_10000_correct');
        {
          const streak = await bumpConsecutiveDayStreak('achievement_trainer_correct_streak_v1');
          if (streak >= 7) u('trainer_7_days');
        }
        break;
      }
      case 'trainer_session_result': {
        if (event.total > 0) u('trainer_session');
        if (event.total >= 5 && event.wrong <= 0 && event.correct >= event.total) {
          u('trainer_perfect_session');
          const perfectSessions = await bumpStoredCounter('achievement_trainer_perfect_session_count');
          if (perfectSessions >= 10) u('trainer_perfect_10_sessions');
          if (perfectSessions >= 50) u('trainer_perfect_50_sessions');
        }
        break;
      }
      case 'avatar_custom_set': {
        u('avatar_custom');
        break;
      }
      case 'profile_theme_set': {
        u('profile_themed');
        break;
      }
      case 'pack_purchased': {
        const tp = event.totalPacks;
        if (tp >= 1) u('pack_purchased');
        if (tp >= 5) u('pack_5_purchased');
        if (tp >= 10) u('pack_10_purchased');
        if (tp >= 25) u('pack_25_purchased');
        break;
      }
      case 'achievement_shared': {
        u('share_achievement');
        const shares = await bumpStoredCounter('achievement_share_count');
        if (shares >= 10) u('share_achievement_10');
        break;
      }
      case 'level_reached': {
        if (event.level >= 50) u('level_50');
        break;
      }
      case 'quiz_session_count': {
        if (event.count >= 10) u('quiz_10_completed');
        if (event.count >= 25) u('quiz_25_completed');
        if (event.count >= 50) u('quiz_50_completed');
        if (event.count >= 100) u('quiz_100_completed');
        break;
      }
      case 'streak_freeze_used': {
        await markStreakSafetyUsed();
        u('arena_streak_freeze');
        break;
      }
      case 'wager_win_streak': {
        if (event.count >= 3) u('wager_win_3');
        if (event.count >= 10) u('wager_win_10');
        break;
      }
    }

    if (justUnlocked.length > 0) {
      await saveStates(states);
      emitAppEvent('achievement_unlocked');

      const userName = await AsyncStorage.getItem('user_name').catch(() => null);
      const lang = (await AsyncStorage.getItem('app_lang').catch(() => null))
        || (await AsyncStorage.getItem('user_lang').catch(() => null));
      const safeUser = userName || 'Player';
      const safeLang = (lang as 'ru' | 'uk') || 'ru';
      for (const ach of justUnlocked) {
        if (ach.xp > 0) {
          const xpAmt = ach.xp;
          // Нельзя await registerXP отсюда: вызывающий registerXP (урок/задание) уже держит xp-lock —
          // вложенный await навсегда висит на цепочке _xpLock (мертвая блокировка, «Забрать» крутится).
          setTimeout(() => {
            void registerXP(xpAmt, 'achievement_reward', safeUser, safeLang).catch(() => {});
          }, 0);
        }
        writeFriendEvent('achievement', { id: ach.id, nameRu: ach.nameRu, icon: ach.icon }).catch(() => {});
      }
    }
    return justUnlocked;
  } catch { return []; }
  });
  _achievementLock = result.catch(() => {});
  return result;
};

export const claimAchievementShardReward = async (achievementId: string): Promise<boolean> => {
  const reserved = await withStorageLock(async () => {
    const states = await loadAchievementStates();
    const s = states.find(x => x.id === achievementId);
    if (!s || s.unlockedAt === null || s.shardClaimed) {
      return false;
    }
    s.shardClaimed = true;
    await saveStates(states);
    return true;
  });
  if (!reserved) return false;

  const n = await addShardsRaw(1, `achievement:${achievementId}`, {
    showEarnModal: true,
    earnModalKey: 'achievement_shard',
  });
  if (n >= 1) {
    try {
      const balance = await getShardsBalance();
      emitAppEvent('shards_balance_updated', { balance });
    } catch {}
    return true;
  }

  await withStorageLock(async () => {
    const states = await loadAchievementStates();
    const s = states.find(x => x.id === achievementId);
    if (s) {
      s.shardClaimed = false;
      await saveStates(states);
    }
  });
  return false;
};

export const hasPendingShardReward = (state: AchievementState | undefined): boolean =>
  !!state && state.unlockedAt !== null && state.shardClaimed === false;

export const markAchievementsNotified = async (ids: string[]) => {
  try {
    const states = await loadAchievementStates();
    ids.forEach(id => {
      const s = states.find(s => s.id === id);
      if (s) s.notified = true;
    });
    await saveStates(states);
  } catch {}
};

export const getPendingNotifications = async (): Promise<Achievement[]> => {
  try {
    const states = await loadAchievementStates();
    return states
      .filter(s => s.unlockedAt !== null && !s.notified)
      .map(s => ALL_ACHIEVEMENTS.find(a => a.id === s.id))
      .filter(Boolean) as Achievement[];
  } catch { return []; }
};

export const unlockAllAchievements = async (): Promise<void> => {
  try {
    const states = await loadAchievementStates();
    const now = new Date().toISOString();
    const existingIds = new Set(states.map(s => s.id));

    states.forEach(state => {
      if (state.unlockedAt === null) {
        state.unlockedAt = now;
        state.notified = true;
        state.shardClaimed = true;
      }
    });

    ALL_ACHIEVEMENTS.forEach(achievement => {
      if (!existingIds.has(achievement.id)) {
        states.push({ id: achievement.id, unlockedAt: now, notified: true, shardClaimed: true });
      }
    });

    await saveStates(states);
  } catch {}
};

export const devSeedAchievementsSmoke = async (): Promise<{ total: number; unlocked: number; missing: string[] }> => {
  const isDevRuntime = typeof __DEV__ !== 'undefined' && __DEV__;
  const isTestRuntime = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  if ((!isDevRuntime && !DEV_MODE && !isTestRuntime) || IS_STORE_RELEASE) {
    throw new Error('devSeedAchievementsSmoke is not available in production builds');
  }

  await unlockAllAchievements();

  const now = new Date().toISOString();
  const fullLessonProgress = JSON.stringify(Array.from({ length: 50 }, () => 'correct'));
  const lessonPairs: Array<[string, string]> = Array.from({ length: 32 }, (_, i) => [
    `lesson${i + 1}_progress`,
    fullLessonProgress,
  ]);

  await AsyncStorage.multiSet([
    ['streak_count', '500'],
    ['user_total_xp', '100000'],
    ['login_bonus_v1', JSON.stringify({ consecutiveDays: 365, lastClaimDate: now })],
    ['achievement_active_recall_correct_count', '50'],
    ['achievement_arena_win_count', '10'],
    ['shards_balance', '100'],
    ['quiz_hard_count', '5'],
    // Новые счётчики для новых достижений
    ['achievement_all_daily_streak_v1', JSON.stringify({ lastDay: localDayKey(), streak: 7 })],
    ['achievement_gift_sent_count', '10'],
    ['achievement_league_chat_message_count', '10'],
    ['achievement_league_boost_count', '5'],
    ['achievement_energy_refill_count', '5'],
    ['achievement_shards_spent_total', '100'],
    ['achievement_flashcards_saved_count', '50'],
    ['achievement_flashcards_flip_count', '100'],
    ['achievement_flashcards_view_streak_v1', JSON.stringify({ lastDay: localDayKey(), streak: 7 })],
    ['achievement_flashcards_source_set_v1', JSON.stringify(['lesson', 'word', 'verb', 'daily_phrase'])],
    ['achievement_arena_wager_win_count', '5'],
    ['achievement_trainer_correct_count', '500'],
    ['achievement_trainer_correct_streak_v1', JSON.stringify({ lastDay: localDayKey(), streak: 7 })],
    ['achievement_arena_win_streak', '10'],
    ['quiz_session_count', '10'],
    ['achievement_wager_win_count', '3'],
    ['pack_purchased_count', '5'],
    ...lessonPairs,
  ]);

  const states = await loadAchievementStates();
  const unlockedIds = new Set(states.filter(s => s.unlockedAt !== null).map(s => s.id));
  const missing = ALL_ACHIEVEMENTS.map(a => a.id).filter(id => !unlockedIds.has(id));

  return {
    total: ALL_ACHIEVEMENTS.length,
    unlocked: ALL_ACHIEVEMENTS.length - missing.length,
    missing,
  };
};

export default {};
