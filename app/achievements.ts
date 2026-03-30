import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface Achievement {
  id:       string;
  icon:     string;           // emoji
  category: 'streak' | 'lessons' | 'xp' | 'quiz' | 'combo' | 'special' | 'medal';
  nameRu:   string;
  nameUk:   string;
  descRu:   string;
  descUk:   string;
  secret?:  boolean;          // скрыто до разблокировки
}

export interface AchievementState {
  id:          string;
  unlockedAt:  string | null; // ISO datetime
  notified:    boolean;       // тост показан
}

// ─── Все ачивки (35 штук) ────────────────────────────────────────────────────

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // ── Цепочка ────────────────────────────────────────────────────────────────
  {
    id:'streak_3', icon:'🔥', category:'streak',
    nameRu:'Первые три',        nameUk:'Перші три',
    descRu:'3 дня цепочки',     descUk:'3 дні ланцюжка',
  },
  {
    id:'streak_7', icon:'🏅', category:'streak',
    nameRu:'Одна неделя',       nameUk:'Один тиждень',
    descRu:'7 дней цепочки',    descUk:'7 днів ланцюжка',
  },
  {
    id:'streak_14', icon:'🏅', category:'streak',
    nameRu:'Две недели',        nameUk:'Два тижні',
    descRu:'14 дней цепочки',   descUk:'14 днів ланцюжка',
  },
  {
    id:'streak_30', icon:'🎖️', category:'streak',
    nameRu:'Месяц в строю',     nameUk:'Місяць у строю',
    descRu:'30 дней цепочки',   descUk:'30 днів ланцюжка',
  },
  {
    id:'streak_60', icon:'🎖️', category:'streak',
    nameRu:'Два месяца',        nameUk:'Два місяці',
    descRu:'60 дней цепочки',   descUk:'60 днів ланцюжка',
  },
  {
    id:'streak_100', icon:'💎', category:'streak',
    nameRu:'Сто дней',          nameUk:'Сто днів',
    descRu:'100 дней цепочки',  descUk:'100 днів ланцюжка',
  },
  {
    id:'streak_200', icon:'💎', category:'streak',
    nameRu:'Двести дней',       nameUk:'Двісті днів',
    descRu:'200 дней цепочки',  descUk:'200 днів ланцюжка',
  },
  {
    id:'streak_365', icon:'👑', category:'streak',
    nameRu:'Целый год',         nameUk:'Цілий рік',
    descRu:'365 дней цепочки',  descUk:'365 днів ланцюжка',
  },
  {
    id:'streak_500', icon:'👑', category:'streak',
    nameRu:'500 дней',          nameUk:'500 днів',
    descRu:'500 дней цепочки',  descUk:'500 днів ланцюжка',
    secret: true,
  },
  {
    id:'streak_repair', icon:'🦅', category:'streak',
    nameRu:'Феникс',            nameUk:'Фенікс',
    descRu:'Восстановил цепочку', descUk:'Відновив ланцюжок',
  },
  {
    id:'perfect_week', icon:'⭐', category:'streak',
    nameRu:'Идеальная неделя',  nameUk:'Ідеальний тиждень',
    descRu:'Все 7 дней недели', descUk:'Всі 7 днів тижня',
  },

  // ── Уроки ──────────────────────────────────────────────────────────────────
  {
    id:'lesson_1', icon:'📖', category:'lessons',
    nameRu:'Первый шаг',        nameUk:'Перший крок',
    descRu:'Первый урок',       descUk:'Перший урок',
  },
  {
    id:'lesson_3', icon:'📖', category:'lessons',
    nameRu:'Три урока',         nameUk:'Три уроки',
    descRu:'3 урока пройдено',  descUk:'3 уроки пройдено',
  },
  {
    id:'lesson_5', icon:'📚', category:'lessons',
    nameRu:'Пять уроков',       nameUk:"П'ять уроків",
    descRu:'5 уроков',          descUk:'5 уроків',
  },
  {
    id:'lesson_10', icon:'🎓', category:'lessons',
    nameRu:'Десять уроков',     nameUk:'Десять уроків',
    descRu:'10 уроков',         descUk:'10 уроків',
  },
  {
    id:'lesson_15', icon:'🧠', category:'lessons',
    nameRu:'Пятнадцать',        nameUk:"П'ятнадцять",
    descRu:'15 уроков',         descUk:'15 уроків',
  },
  {
    id:'lesson_20', icon:'🧠', category:'lessons',
    nameRu:'Двадцать уроков',   nameUk:'Двадцять уроків',
    descRu:'20 уроков',         descUk:'20 уроків',
  },
  {
    id:'lesson_all', icon:'🏆', category:'lessons',
    nameRu:'Полный курс',       nameUk:'Повний курс',
    descRu:'Все 32 урока',      descUk:'Всі 32 уроки',
  },
  {
    id:'lesson_perfect', icon:'💯', category:'lessons',
    nameRu:'Ни одной ошибки',   nameUk:'Жодної помилки',
    descRu:'Урок без ошибок',   descUk:'Урок без помилок',
  },
  {
    id:'lesson_perfect3', icon:'🎯', category:'lessons',
    nameRu:'Три без ошибок',    nameUk:'Три без помилок',
    descRu:'3 идеальных урока', descUk:'3 ідеальних уроки',
  },
  {
    id:'lesson_all_perfect', icon:'👑', category:'lessons',
    nameRu:'Абсолют',           nameUk:'Абсолют',
    descRu:'Все 32 урока без единой ошибки', descUk:'Всі 32 уроки без жодної помилки',
    secret: true,
  },

  // ── XP и уровни ────────────────────────────────────────────────────────────
  {
    id:'xp_100', icon:'✨', category:'xp',
    nameRu:'Первая сотня',      nameUk:'Перша сотня',
    descRu:'100 XP',            descUk:'100 XP',
  },
  {
    id:'xp_250', icon:'⚡', category:'xp',
    nameRu:'250 опыта',         nameUk:'250 досвіду',
    descRu:'250 XP',            descUk:'250 XP',
  },
  {
    id:'xp_500', icon:'⚡', category:'xp',
    nameRu:'Пятьсот',           nameUk:"П'ятсот",
    descRu:'500 XP',            descUk:'500 XP',
  },
  {
    id:'xp_1000', icon:'🌟', category:'xp',
    nameRu:'Тысячник',          nameUk:'Тисячник',
    descRu:'1 000 XP',          descUk:'1 000 XP',
  },
  {
    id:'xp_2500', icon:'🔮', category:'xp',
    nameRu:'2 500 опыта',       nameUk:'2 500 досвіду',
    descRu:'2 500 XP',          descUk:'2 500 XP',
  },
  {
    id:'xp_5000', icon:'🔮', category:'xp',
    nameRu:'Пять тысяч',        nameUk:"П'ять тисяч",
    descRu:'5 000 XP',          descUk:'5 000 XP',
  },
  {
    id:'xp_10000', icon:'🌀', category:'xp',
    nameRu:'Десять тысяч',      nameUk:'Десять тисяч',
    descRu:'10 000 XP',         descUk:'10 000 XP',
  },
  {
    id:'xp_20000', icon:'🌀', category:'xp',
    nameRu:'Двадцать тысяч',    nameUk:'Двадцять тисяч',
    descRu:'20 000 XP',         descUk:'20 000 XP',
  },
  {
    id:'xp_50000', icon:'🌀', category:'xp',
    nameRu:'Полсотни тысяч',    nameUk:'Пів сотні тисяч',
    descRu:'50 000 XP',         descUk:'50 000 XP',
    secret: true,
  },
  {
    id:'xp_100000', icon:'🌀', category:'xp',
    nameRu:'Легенда',           nameUk:'Легенда',
    descRu:'100 000 XP',        descUk:'100 000 XP',
    secret: true,
  },
  {
    id:'wager_win', icon:'🎲', category:'xp',
    nameRu:'Рискнул — победил', nameUk:'Ризикнув — переміг',
    descRu:'Выиграл пари на цепочку', descUk:'Виграв парі на ланцюжок',
  },
  {
    id:'personal_best', icon:'📈', category:'xp',
    nameRu:'Лучшая неделя',     nameUk:'Найкращий тиждень',
    descRu:'Рекорд XP за неделю', descUk:'Рекорд XP за тиждень',
  },

  // ── Квизы ──────────────────────────────────────────────────────────────────
  {
    id:'quiz_first', icon:'🎯', category:'quiz',
    nameRu:'Первый квиз',       nameUk:'Перший квіз',
    descRu:'Прошёл любой квиз', descUk:'Пройшов будь-який квіз',
  },
  {
    id:'quiz_medium', icon:'🔥', category:'quiz',
    nameRu:'Средний уровень',   nameUk:'Середній рівень',
    descRu:'Квиз уровня Medium', descUk:'Квіз рівня Medium',
  },
  {
    id:'quiz_hard', icon:'🔱', category:'quiz',
    nameRu:'Принял вызов',      nameUk:'Прийняв виклик',
    descRu:'Квиз уровня Hard',  descUk:'Квіз рівня Hard',
  },
  {
    id:'quiz_all_levels', icon:'🌈', category:'quiz',
    nameRu:'Полный набор',      nameUk:'Повний набір',
    descRu:'Квиз на всех трёх уровнях', descUk:'Квіз на всіх трьох рівнях',
  },
  {
    id:'quiz_perfect_easy', icon:'✅', category:'quiz',
    nameRu:'Лёгкий идеал',      nameUk:'Легкий ідеал',
    descRu:'Easy квиз без ошибок', descUk:'Easy квіз без помилок',
  },
  {
    id:'quiz_perfect', icon:'🏹', category:'quiz',
    nameRu:'Железные нервы',    nameUk:'Залізні нерви',
    descRu:'Hard квиз без ошибок', descUk:'Hard квіз без помилок',
  },
  {
    id:'quiz_perfect_medium', icon:'🎯', category:'quiz',
    nameRu:'Меткий стрелок',    nameUk:'Влучний стрілець',
    descRu:'Medium квиз без ошибок', descUk:'Medium квіз без помилок',
  },
  {
    id:'quiz_triple_perfect', icon:'💫', category:'quiz', secret: true,
    nameRu:'Трижды идеал',      nameUk:'Тричі ідеал',
    descRu:'Все три уровня без ошибок', descUk:'Всі три рівні без помилок',
  },
  {
    id:'quiz_speed_demon', icon:'⚡', category:'quiz', secret: true,
    nameRu:'Скоростной',        nameUk:'Швидкісний',
    descRu:'5 Hard квизов пройдено', descUk:'5 Hard квізів пройдено',
  },

  // ── Серии и комбо ──────────────────────────────────────────────────────────
  {
    id:'combo_3', icon:'⚔️', category:'combo',
    nameRu:'В потоке',          nameUk:'У потоці',
    descRu:'3 ответа подряд',   descUk:'3 відповіді поспіль',
  },
  {
    id:'combo_10', icon:'🎪', category:'combo',
    nameRu:'Снайпер',           nameUk:'Снайпер',
    descRu:'10 подряд',         descUk:'10 поспіль',
  },
  {
    id:'combo_20', icon:'🛡️', category:'combo',
    nameRu:'Несокрушимый',      nameUk:'Нездоланний',
    descRu:'20 подряд',         descUk:'20 поспіль',
  },
  {
    id:'combo_50', icon:'⚡', category:'combo',
    nameRu:'Машина',            nameUk:'Машина',
    descRu:'50 ответов подряд', descUk:'50 відповідей поспіль',
  },
  {
    id:'combo_100', icon:'💥', category:'combo',
    nameRu:'Непобедимый',       nameUk:'Непереможний',
    descRu:'100 ответов подряд', descUk:'100 відповідей поспіль',
    secret: true,
  },
  {
    id:'daily_task_first', icon:'✅', category:'combo',
    nameRu:'Первое задание',    nameUk:'Перше завдання',
    descRu:'Задание дня выполнено', descUk:'Завдання дня виконано',
  },
  {
    id:'all_daily', icon:'🌈', category:'combo',
    nameRu:'Всё за день',       nameUk:'Все за день',
    descRu:'Все задания за день', descUk:'Всі завдання за день',
  },

  // ── Особые ─────────────────────────────────────────────────────────────────
  {
    id:'login_7', icon:'📅', category:'special',
    nameRu:'Верный ученик',     nameUk:'Вірний учень',
    descRu:'7 дней подряд',     descUk:'7 днів підряд',
  },
  {
    id:'login_14', icon:'📅', category:'special',
    nameRu:'Две недели',        nameUk:'Два тижні',
    descRu:'14 дней подряд',    descUk:'14 днів підряд',
  },
  {
    id:'login_30', icon:'🗓️', category:'special',
    nameRu:'Месяц в приложении', nameUk:'Місяць у застосунку',
    descRu:'30 дней подряд',    descUk:'30 днів підряд',
  },
  {
    id:'login_60', icon:'🗓️', category:'special',
    nameRu:'Два месяца',        nameUk:'Два місяці',
    descRu:'60 дней подряд',    descUk:'60 днів підряд',
  },
  {
    id:'login_365', icon:'🌍', category:'special',
    nameRu:'Целый год в деле',  nameUk:'Цілий рік у справі',
    descRu:'365 дней подряд',   descUk:'365 днів підряд',
    secret: true,
  },
  {
    id:'comeback', icon:'🚀', category:'special', secret: true,
    nameRu:'Возвращение короля', nameUk:'Повернення короля',
    descRu:'Вернулся после долгой паузы', descUk:'Повернувся після довгої паузи',
  },
  {
    id:'diagnosis', icon:'🔬', category:'special',
    nameRu:'Диагноз поставлен', nameUk:'Діагноз поставлено',
    descRu:'Прошёл диагностику', descUk:'Пройшов діагностику',
  },
  {
    id:'night_owl', icon:'🦉', category:'special', secret: true,
    nameRu:'Ночной филин',      nameUk:'Нічний пугач',
    descRu:'Учился после 23:00', descUk:'Навчався після 23:00',
  },
  {
    id:'early_bird', icon:'🌅', category:'special', secret: true,
    nameRu:'Ранний подъём',     nameUk:'Ранній підйом',
    descRu:'Учился до 7:00',    descUk:'Навчався до 7:00',
  },

  // ── Гемы (повторные проходы уровней) ───────────────────────────────────────
  { id:'gem_a1_ruby',    icon:'🔴', category:'medal', nameRu:'Рубин A1',    nameUk:'Рубін A1',    descRu:'Все уроки A1 пройдены дважды',    descUk:'Всі уроки A1 пройдено двічі' },
  { id:'gem_a1_emerald', icon:'💚', category:'medal', nameRu:'Изумруд A1',  nameUk:'Смарагд A1',  descRu:'Все уроки A1 пройдены трижды',    descUk:'Всі уроки A1 пройдено тричі' },
  { id:'gem_a1_diamond', icon:'💎', category:'medal', nameRu:'Диамант A1',  nameUk:'Діамант A1',  descRu:'Все уроки A1 пройдены 4 раза',    descUk:'Всі уроки A1 пройдено 4 рази', secret:true },
  { id:'gem_a2_ruby',    icon:'🔴', category:'medal', nameRu:'Рубин A2',    nameUk:'Рубін A2',    descRu:'Все уроки A2 пройдены дважды',    descUk:'Всі уроки A2 пройдено двічі' },
  { id:'gem_a2_emerald', icon:'💚', category:'medal', nameRu:'Изумруд A2',  nameUk:'Смарагд A2',  descRu:'Все уроки A2 пройдены трижды',    descUk:'Всі уроки A2 пройдено тричі' },
  { id:'gem_a2_diamond', icon:'💎', category:'medal', nameRu:'Диамант A2',  nameUk:'Діамант A2',  descRu:'Все уроки A2 пройдены 4 раза',    descUk:'Всі уроки A2 пройдено 4 рази', secret:true },
  { id:'gem_b1_ruby',    icon:'🔴', category:'medal', nameRu:'Рубин B1',    nameUk:'Рубін B1',    descRu:'Все уроки B1 пройдены дважды',    descUk:'Всі уроки B1 пройдено двічі' },
  { id:'gem_b1_emerald', icon:'💚', category:'medal', nameRu:'Изумруд B1',  nameUk:'Смарагд B1',  descRu:'Все уроки B1 пройдены трижды',    descUk:'Всі уроки B1 пройдено тричі' },
  { id:'gem_b1_diamond', icon:'💎', category:'medal', nameRu:'Диамант B1',  nameUk:'Діамант B1',  descRu:'Все уроки B1 пройдены 4 раза',    descUk:'Всі уроки B1 пройдено 4 рази', secret:true },
  { id:'gem_b2_ruby',    icon:'🔴', category:'medal', nameRu:'Рубин B2',    nameUk:'Рубін B2',    descRu:'Все уроки B2 пройдены дважды',    descUk:'Всі уроки B2 пройдено двічі' },
  { id:'gem_b2_emerald', icon:'💚', category:'medal', nameRu:'Изумруд B2',  nameUk:'Смарагд B2',  descRu:'Все уроки B2 пройдены трижды',    descUk:'Всі уроки B2 пройдено тричі' },
  { id:'gem_b2_diamond', icon:'💎', category:'medal', nameRu:'Диамант B2',  nameUk:'Діамант B2',  descRu:'Все уроки B2 пройдены 4 раза',    descUk:'Всі уроки B2 пройдено 4 рази', secret:true },

  // ── Экзамен ────────────────────────────────────────────────────────────────
  {
    id:'exam_first', icon:'📝', category:'special',
    nameRu:'Экзаменатор',       nameUk:'Екзаменатор',
    descRu:'Сдал первый экзамен', descUk:'Склав перший іспит',
  },
  {
    id:'exam_ace', icon:'🎯', category:'special', secret: true,
    nameRu:'Отличник',          nameUk:'Відмінник',
    descRu:'90%+ на экзамене',  descUk:'90%+ на іспиті',
  },

  // ── Диалоги ────────────────────────────────────────────────────────────────
  {
    id:'dialog_first', icon:'💬', category:'lessons',
    nameRu:'Собеседник',        nameUk:'Співрозмовник',
    descRu:'Первый диалог пройден', descUk:'Перший діалог пройдено',
  },
  {
    id:'dialog_all', icon:'🗣️', category:'lessons', secret: true,
    nameRu:'Мастер диалогов',   nameUk:'Майстер діалогів',
    descRu:'Все диалоги пройдены', descUk:'Всі діалоги пройдені',
  },

  // ── Карточки ───────────────────────────────────────────────────────────────
  {
    id:'flashcards_session', icon:'🃏', category:'special',
    nameRu:'Картёжник',         nameUk:'Картяр',
    descRu:'Просмотрел все карточки', descUk:'Переглянув усі картки',
  },

  // ── Клубы ──────────────────────────────────────────────────────────────────
  {
    id:'league_1', icon:'⭐', category:'special',
    nameRu:'В клубе',           nameUk:'У клубі',
    descRu:'Вступил в первый клуб', descUk:'Вступив у перший клуб',
  },
  {
    id:'league_3', icon:'🎙️', category:'special',
    nameRu:'Эрудит',            nameUk:'Ерудит',
    descRu:'Клуб Эрудитов (6-й клуб)', descUk:'Клуб Ерудитів (6-й клуб)',
  },
  {
    id:'league_5', icon:'🏆', category:'special', secret: true,
    nameRu:'Профессор',         nameUk:'Професор',
    descRu:'Высший клуб — Профессоров', descUk:'Найвищий клуб — Професорів',
  },
  {
    id:'club_all', icon:'👑', category:'special', secret: true,
    nameRu:'Все клубы',         nameUk:'Всі клуби',
    descRu:'Прошёл все 12 клубов', descUk:'Пройшов всі 12 клубів',
  },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'achievements_v1';

export const loadAchievementStates = async (): Promise<AchievementState[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const initial: AchievementState[] = ALL_ACHIEVEMENTS.map(a => ({
      id: a.id, unlockedAt: null, notified: false,
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch { return []; }
};

const saveStates = async (states: AchievementState[]) => {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(states)); } catch {}
};

// Разблокировать ачивку; возвращает true если только что разблокирована
const unlockOne = (states: AchievementState[], id: string): boolean => {
  const existing = states.find(s => s.id === id);
  if (existing) {
    if (existing.unlockedAt !== null) return false;
    existing.unlockedAt = new Date().toISOString();
    return true;
  }
  // Новая ачивка, не было в storage ранее
  states.push({ id, unlockedAt: new Date().toISOString(), notified: false });
  return true;
};

// ─── Event types ─────────────────────────────────────────────────────────────

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
  | { type: 'time_of_day' }   // night_owl / early_bird
  | { type: 'exam';            pct: number }
  | { type: 'dialog';          totalCompleted: number; totalDialogs: number }
  | { type: 'flashcards_session' }
  | { type: 'league_promoted'; newLeagueId: number }
  | { type: 'gem'; level: string; gem: 'ruby' | 'emerald' | 'diamond' };

/**
 * Проверяет какие ачивки нужно разблокировать на основе события.
 * Сохраняет в AsyncStorage. Возвращает список ТОЛЬКО ЧТО разблокированных.
 */
export const checkAchievements = async (event: AchievementEvent): Promise<Achievement[]> => {
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
        // quiz_all_levels: check if all three levels played
        {
          const allLevels = ['quiz_first','quiz_medium','quiz_hard'].every(
            id => states.find(s => s.id === id)?.unlockedAt !== null
          );
          if (allLevels) u('quiz_all_levels');
        }
        // quiz_triple_perfect: check if all three levels perfected
        {
          const allPerfect = ['quiz_perfect_easy','quiz_perfect_medium','quiz_perfect'].every(
            id => states.find(s => s.id === id)?.unlockedAt !== null
          );
          if (allPerfect) u('quiz_triple_perfect');
        }
        // quiz_speed_demon: track hard quiz count in states check
        if (event.level === 'hard') {
          // count unlocked hard-related achieves as proxy; use AsyncStorage counter instead
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
      case 'dialog': {
        u('dialog_first');
        if (event.totalCompleted >= event.totalDialogs && event.totalDialogs > 0) u('dialog_all');
        break;
      }
      case 'flashcards_session': u('flashcards_session'); break;
      case 'league_promoted': {
        const lid = event.newLeagueId;
        if (lid >= 0)  u('league_1');   // вступил в любой клуб
        if (lid >= 5)  u('league_3');   // клуб Эрудитов
        if (lid >= 11) u('league_5');   // клуб Профессоров
        if (lid >= 11) u('club_all');   // все 12 клубов
        break;
      }
      case 'gem': {
        const lvlKey = event.level.toLowerCase();
        if (event.gem === 'ruby')    u(`gem_${lvlKey}_ruby`);
        if (event.gem === 'emerald') u(`gem_${lvlKey}_emerald`);
        if (event.gem === 'diamond') u(`gem_${lvlKey}_diamond`);
        break;
      }
    }

    if (justUnlocked.length > 0) {
      await saveStates(states);
    }
    return justUnlocked;
  } catch { return []; }
};

/** Пометить ачивки как "тост показан" */
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

/** Получить ачивки, разблокированные но тост ещё не показан */
export const getPendingNotifications = async (): Promise<Achievement[]> => {
  try {
    const states = await loadAchievementStates();
    return states
      .filter(s => s.unlockedAt !== null && !s.notified)
      .map(s => ALL_ACHIEVEMENTS.find(a => a.id === s.id))
      .filter(Boolean) as Achievement[];
  } catch { return []; }
};

// Required by Expo Router — not a screen
export default {};
