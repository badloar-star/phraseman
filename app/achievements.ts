import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
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

// Всего 81 достижение

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
    id:'social_like_received', icon:'❤️', category:'special', xp:30,
    nameRu:'Тебя заметили',  nameUk:'Тебе помітили',
    descRu:'Друг отметил лайком одно из твоих достижений. Слава пришла.', descUk:'Друг відзначив лайком одне з твоїх досягнень. Слава прийшла.',
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
    descRu:'Купи свой первый набор карточек в магазине.', descUk:'Купи свій перший набір карток у магазині.',
  },
  {
    id:'pack_5_purchased', icon:'📚', category:'special', xp:180,
    nameRu:'Библиотекарь',  nameUk:'Бібліотекар',
    descRu:'5 паков в коллекции. Слов становится всё больше.', descUk:'5 паків у колекції. Слів стає дедалі більше.',
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
    nameRu:'Три из трёх',  nameUk:'Три з трьох',
    descRu:'Выиграл 3 ставки на цепочку. Везение или мастерство?', descUk:'Виграв 3 ставки на ланцюжок. Везіння чи майстерність?',
    secret: true,
  },
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

export type AchievementEvent =
  | { type: 'streak';         streak:    number }
  | { type: 'xp';             totalXP:   number }
  | { type: 'lesson_complete'; lessonCount: number; wasPerfect?: boolean; perfectCount?: number }
  | { type: 'quiz';           level: string; perfect?: boolean }
  | { type: 'combo';          count: number }
  | { type: 'daily_task';     allDone?: boolean }
  | { type: 'login';          consecutiveDays: number }
  | { type: 'comeback' }
  | { type: 'wager_win' }
  | { type: 'personal_best' }
  | { type: 'streak_repair' }
  | { type: 'perfect_week' }
  | { type: 'diagnosis' }
  | { type: 'time_of_day' }
  | { type: 'exam';            pct: number }
  | { type: 'flashcards_session' }
  | { type: 'daily_phrase'; action: 'read' | 'save' }
  | { type: 'active_recall'; correct?: number }
  | { type: 'arena_win' }
  | { type: 'shards'; balance: number }
  | { type: 'gem'; level: string; gem: 'ruby' | 'emerald' | 'diamond' }
  // ── Новые события ────────────────────────────────────────────────────────
  | { type: 'friend_added';   totalFriends: number }
  | { type: 'gift_sent' }
  | { type: 'achievement_liked' }
  | { type: 'arena_win_streak'; streak: number }
  | { type: 'arena_duel_friend_win' }
  | { type: 'arena_wager_win' }
  | { type: 'trainer_correct'; correct: number }
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

    switch (event.type) {
      case 'streak': {
        const s = event.streak;
        if (s >= 3)   u('streak_3');
        if (s >= 7)   u('streak_7');
        if (s >= 14)  u('streak_14');
        if (s >= 30)  u('streak_30');
        if (s >= 60)  u('streak_60');
        if (s >= 100) u('streak_100');
        if (s >= 200) u('streak_200');
        if (s >= 365) u('streak_365');
        if (s >= 500) u('streak_500');
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
          if ((event.perfectCount ?? 0) >= 32) u('lesson_all_perfect');
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
        if (event.level === 'hard') {
          const hardCount = parseInt((await AsyncStorage.getItem('quiz_hard_count') ?? '0')) + 1;
          await AsyncStorage.setItem('quiz_hard_count', String(hardCount));
          if (hardCount >= 5) u('quiz_speed_demon');
        }
        break;
      }
      case 'combo': {
        if (event.count >= 3)  u('combo_3');
        if (event.count >= 10) u('combo_10');
        if (event.count >= 20) u('combo_20');
        if (event.count >= 50)  u('combo_50');
        if (event.count >= 100) u('combo_100');
        break;
      }
      case 'daily_task': {
        u('daily_task_first');
        if (event.allDone) u('all_daily');
        break;
      }
      case 'login': {
        const d = event.consecutiveDays;
        if (d >= 7)  u('login_7');
        if (d >= 14) u('login_14');
        if (d >= 30) u('login_30');
        if (d >= 60)  u('login_60');
        if (d >= 365) u('login_365');
        break;
      }
      case 'comeback':      u('comeback');      break;
      case 'wager_win':     u('wager_win');     break;
      case 'personal_best': u('personal_best'); break;
      case 'streak_repair': u('streak_repair'); break;
      case 'perfect_week':  u('perfect_week');  break;
      case 'diagnosis':     u('diagnosis');     break;
      case 'time_of_day': {
        const h = new Date().getHours();
        if (h >= 23 || h < 5) u('night_owl');
        if (h >= 5 && h < 7)  u('early_bird');
        break;
      }
      case 'exam': {
        u('exam_first');
        if (event.pct >= 90) u('exam_ace');
        break;
      }
      case 'flashcards_session': u('flashcards_session'); break;
      case 'daily_phrase': {
        if (event.action === 'read') u('daily_phrase_first');
        if (event.action === 'save') u('daily_phrase_save');
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
        break;
      }
      case 'shards': {
        if (event.balance >= 100) u('shards_100');
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
        break;
      }

      // ── Новые события ──────────────────────────────────────────────────────
      case 'friend_added': {
        const tf = event.totalFriends;
        if (tf >= 1)  u('social_friend_first');
        if (tf >= 3)  u('social_friends_3');
        if (tf >= 10) u('social_friends_10');
        break;
      }
      case 'gift_sent': {
        const giftKey = 'achievement_gift_sent_count';
        const cur = parseInt((await AsyncStorage.getItem(giftKey)) ?? '0', 10) || 0;
        const next = cur + 1;
        await AsyncStorage.setItem(giftKey, String(next));
        if (next >= 1) u('social_gift_send');
        if (next >= 5) u('social_gift_5');
        break;
      }
      case 'achievement_liked': {
        u('social_like_received');
        break;
      }
      case 'arena_win_streak': {
        const ws = event.streak;
        if (ws >= 5)  u('arena_streak_5');
        if (ws >= 10) u('arena_streak_10');
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
        const next = cur + 1;
        await AsyncStorage.setItem(wagerKey, String(next));
        if (next >= 5) u('arena_wager_5');
        break;
      }
      case 'trainer_correct': {
        const trainerKey = 'achievement_trainer_correct_count';
        const cur = parseInt((await AsyncStorage.getItem(trainerKey)) ?? '0', 10) || 0;
        const next = cur + Math.max(1, event.correct);
        await AsyncStorage.setItem(trainerKey, String(next));
        if (next >= 1)   u('trainer_session');
        if (next >= 100) u('trainer_100_correct');
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
        break;
      }
      case 'achievement_shared': {
        u('share_achievement');
        break;
      }
      case 'level_reached': {
        if (event.level >= 50) u('level_50');
        break;
      }
      case 'quiz_session_count': {
        if (event.count >= 10) u('quiz_10_completed');
        break;
      }
      case 'streak_freeze_used': {
        u('arena_streak_freeze');
        break;
      }
      case 'wager_win_streak': {
        if (event.count >= 3) u('wager_win_3');
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
    ['achievement_gift_sent_count', '5'],
    ['achievement_arena_wager_win_count', '5'],
    ['achievement_trainer_correct_count', '100'],
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
