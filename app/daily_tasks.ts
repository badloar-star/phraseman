// ════════════════════════════════════════════════════════════════════════════
// daily_tasks.ts — Ежедневные задания
// Хранение: AsyncStorage 'daily_tasks_YYYY-MM-DD' → TaskProgress[]
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TaskType =
  | 'correct_streak'      // N правильных подряд в уроке
  | 'lesson_no_mistakes'  // урок без ошибок (10 подряд)
  | 'quiz_hard'           // N вопросов на сложном
  | 'quiz_score'          // набрать N очков в квизе
  | 'words_learned'       // выучить N слов в словнике
  | 'total_answers'       // ответить на N вопросов за день
  | 'open_theory'         // открыть теорию любого урока
  | 'daily_active'        // просто заниматься сегодня
  | 'verb_learned';       // выучить N глаголов

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
  phrasemenReward: number;
}

export interface TaskProgress {
  taskId: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}

// ── 90 заданий (30 дней × 3) ─────────────────────────────────────────────
const ALL_TASKS: DailyTask[] = [
  // daily_active — открыть урок и ответить хотя бы на 1 вопрос
  { id:'da1', type:'daily_active', icon:'☀️', target:1, xp:15, phrasemenReward:5,
    titleRU:'Просто зайди', titleUK:'Просто зайди',
    descRU:'Открой любой урок и ответь на 1 вопрос.',
    descUK:'Відкрий будь-який урок і дай 1 відповідь.' },
  { id:'da2', type:'daily_active', icon:'🌅', target:1, xp:15, phrasemenReward:5,
    titleRU:'Начни день', titleUK:'Почни день',
    descRU:'Открой урок и дай хотя бы 1 ответ сегодня.',
    descUK:'Відкрий урок і дай хоча б 1 відповідь сьогодні.' },
  { id:'da3', type:'daily_active', icon:'💪', target:1, xp:15, phrasemenReward:5,
    titleRU:'Ни дня без урока', titleUK:'Жодного дня без уроку',
    descRU:'Открой урок и ответь хотя бы на один вопрос.',
    descUK:'Відкрий урок і відповідь хоча б на одне питання.' },

  // total_answers — ответить на N вопросов в уроках
  { id:'ta1', type:'total_answers', icon:'⚡', target:10, xp:20, phrasemenReward:8,
    titleRU:'Разогрев', titleUK:'Розігрів',
    descRU:'Ответь на 10 вопросов в любом уроке.',
    descUK:'Дай 10 відповідей у будь-якому уроці.' },
  { id:'ta2', type:'total_answers', icon:'🔥', target:20, xp:30, phrasemenReward:12,
    titleRU:'Двадцатка', titleUK:'Двадцятка',
    descRU:'Ответь на 20 вопросов в уроках за день.',
    descUK:'Дай 20 відповідей в уроках за день.' },
  { id:'ta3', type:'total_answers', icon:'💥', target:30, xp:40, phrasemenReward:15,
    titleRU:'Тридцатник', titleUK:'Тридцятник',
    descRU:'Ответь на 30 вопросов в уроках за день.',
    descUK:'Дай 30 відповідей в уроках за день.' },
  { id:'ta4', type:'total_answers', icon:'🚀', target:50, xp:55, phrasemenReward:20,
    titleRU:'Полтинник', titleUK:'П\'ятдесятка',
    descRU:'Ответь на 50 вопросов в уроках за день.',
    descUK:'Дай 50 відповідей в уроках за день.' },
  { id:'ta5', type:'total_answers', icon:'🌪️', target:75, xp:75, phrasemenReward:25,
    titleRU:'На всех парах', titleUK:'На повних парах',
    descRU:'Ответь на 75 вопросов в уроках за день.',
    descUK:'Дай 75 відповідей в уроках за день.' },
  { id:'ta6', type:'total_answers', icon:'💯', target:100, xp:100, phrasemenReward:30,
    titleRU:'Сотня', titleUK:'Сотня',
    descRU:'Ответь на 100 вопросов в уроках за день.',
    descUK:'Дай 100 відповідей в уроках за день.' },

  // correct_streak — N правильных подряд без ошибок
  { id:'cs1', type:'correct_streak', icon:'🎯', target:5, xp:25, phrasemenReward:10,
    titleRU:'Первая серия', titleUK:'Перша серія',
    descRU:'Ответь правильно 5 раз подряд без ошибок в уроке.',
    descUK:'Відповідь правильно 5 разів поспіль без помилок.' },
  { id:'cs2', type:'correct_streak', icon:'🎯', target:10, xp:40, phrasemenReward:15,
    titleRU:'Горячая десятка', titleUK:'Гаряча десятка',
    descRU:'Ответь правильно 10 раз подряд без ошибок в уроке.',
    descUK:'Відповідь правильно 10 разів поспіль без помилок.' },
  { id:'cs3', type:'correct_streak', icon:'⚡', target:15, xp:55, phrasemenReward:20,
    titleRU:'15 без промаха', titleUK:'15 без промаху',
    descRU:'Ответь правильно 15 раз подряд без ошибок в уроке.',
    descUK:'Відповідь правильно 15 разів поспіль без помилок.' },
  { id:'cs4', type:'correct_streak', icon:'🔥', target:20, xp:70, phrasemenReward:25,
    titleRU:'В зоне потока', titleUK:'В зоні потоку',
    descRU:'Ответь правильно 20 раз подряд без ошибок в уроке.',
    descUK:'Відповідь правильно 20 разів поспіль без помилок.' },

  // lesson_no_mistakes — N вопросов подряд без единой ошибки
  { id:'lnm1', type:'lesson_no_mistakes', icon:'✨', target:10, xp:60, phrasemenReward:20,
    titleRU:'Чистая десятка', titleUK:'Чиста десятка',
    descRU:'Пройди 10 вопросов в уроке без единой ошибки.',
    descUK:'Пройди 10 питань в уроці без жодної помилки.' },
  { id:'lnm2', type:'lesson_no_mistakes', icon:'🎖️', target:15, xp:80, phrasemenReward:25,
    titleRU:'Снайпер', titleUK:'Снайпер',
    descRU:'Пройди 15 вопросов в уроке без единой ошибки.',
    descUK:'Пройди 15 питань в уроці без жодної помилки.' },
  { id:'lnm3', type:'lesson_no_mistakes', icon:'💎', target:20, xp:100, phrasemenReward:30,
    titleRU:'Безупречность', titleUK:'Бездоганність',
    descRU:'Пройди 20 вопросов в уроке без единой ошибки.',
    descUK:'Пройди 20 питань в уроці без жодної помилки.' },

  // quiz_hard — отвечать в квизе на уровне «Сложно»
  { id:'qh1', type:'quiz_hard', icon:'💪', target:3, xp:30, phrasemenReward:12,
    titleRU:'Первый вызов', titleUK:'Перший виклик',
    descRU:'Открой Квизы → Сложно и ответь на 3 вопроса.',
    descUK:'Відкрий Квізи → Складно і дай 3 відповіді.' },
  { id:'qh2', type:'quiz_hard', icon:'🗡️', target:5, xp:45, phrasemenReward:18,
    titleRU:'Принял вызов', titleUK:'Прийняв виклик',
    descRU:'Открой Квизы → Сложно и ответь на 5 вопросов.',
    descUK:'Відкрий Квізи → Складно і дай 5 відповідей.' },
  { id:'qh3', type:'quiz_hard', icon:'🏆', target:10, xp:65, phrasemenReward:25,
    titleRU:'Хардкорщик', titleUK:'Хардкорщик',
    descRU:'Открой Квизы → Сложно и ответь на 10 вопросов.',
    descUK:'Відкрий Квізи → Складно і дай 10 відповідей.' },
  { id:'qh4', type:'quiz_hard', icon:'👑', target:15, xp:85, phrasemenReward:30,
    titleRU:'Легенда', titleUK:'Легенда',
    descRU:'Открой Квизы → Сложно и ответь на 15 вопросов.',
    descUK:'Відкрий Квізи → Складно і дай 15 відповідей.' },

  // quiz_score — набрать N очков за одну сессию квиза
  { id:'qs1', type:'quiz_score', icon:'⭐', target:10, xp:25, phrasemenReward:10,
    titleRU:'Первые очки', titleUK:'Перші очки',
    descRU:'Набери 10 очков за одну сессию в Квизах.',
    descUK:'Набери 10 очок за одну сесію в Квізах.' },
  { id:'qs2', type:'quiz_score', icon:'🌟', target:20, xp:40, phrasemenReward:15,
    titleRU:'Набираю обороты', titleUK:'Набираю оберти',
    descRU:'Набери 20 очков за одну сессию в Квизах.',
    descUK:'Набери 20 очок за одну сесію в Квізах.' },
  { id:'qs3', type:'quiz_score', icon:'💫', target:30, xp:55, phrasemenReward:20,
    titleRU:'Квиз-машина', titleUK:'Квіз-машина',
    descRU:'Набери 30 очков в Квизах за день.',
    descUK:'Набери 30 очок у Квізах за день.' },
  { id:'qs4', type:'quiz_score', icon:'💥', target:50, xp:75, phrasemenReward:30,
    titleRU:'Неудержимый', titleUK:'Нестримний',
    descRU:'Набери 50 очков в Квизах за день (уровень Сложно + серия).',
    descUK:'Набери 50 очок у Квізах за день (рівень Складно + серія).' },

  // words_learned — выучить N слов в разделе Слова
  { id:'wl1', type:'words_learned', icon:'📖', target:3, xp:25, phrasemenReward:10,
    titleRU:'Три слова в копилку', titleUK:'Три слова в скарбничку',
    descRU:'Выучи 3 слова в разделе Слова любого урока.',
    descUK:'Вивчи 3 слова в розділі Слова будь-якого уроку.' },
  { id:'wl2', type:'words_learned', icon:'📚', target:5, xp:40, phrasemenReward:15,
    titleRU:'Пополняю словарь', titleUK:'Поповнюю словник',
    descRU:'Выучи 5 слов в разделе Слова любого урока.',
    descUK:'Вивчи 5 слів в розділі Слова будь-якого уроку.' },
  { id:'wl3', type:'words_learned', icon:'🧠', target:10, xp:60, phrasemenReward:25,
    titleRU:'Словарный марафон', titleUK:'Словниковий марафон',
    descRU:'Выучи 10 слов в разделе Слова любого урока.',
    descUK:'Вивчи 10 слів в розділі Слова будь-якого уроку.' },

  // verb_learned — выучить N глаголов в разделе Глаголы
  { id:'vl1', type:'verb_learned', icon:'⚙️', target:2, xp:25, phrasemenReward:10,
    titleRU:'Первые глаголы', titleUK:'Перші дієслова',
    descRU:'Выучи 2 неправильных глагола в разделе Глаголы.',
    descUK:'Вивчи 2 неправильних дієслова в розділі Дієслова.' },
  { id:'vl2', type:'verb_learned', icon:'🔧', target:4, xp:45, phrasemenReward:18,
    titleRU:'Глагольный рывок', titleUK:'Дієслівний ривок',
    descRU:'Выучи 4 неправильных глагола в разделе Глаголы.',
    descUK:'Вивчи 4 неправильних дієслова в розділі Дієслова.' },
  { id:'vl3', type:'verb_learned', icon:'🔩', target:6, xp:65, phrasemenReward:25,
    titleRU:'Мастер форм', titleUK:'Майстер форм',
    descRU:'Выучи 6 неправильных глаголов в разделе Глаголы.',
    descUK:'Вивчи 6 неправильних дієслів в розділі Дієслова.' },

  // open_theory — открыть раздел Теория в уроке
  { id:'ot1', type:'open_theory', icon:'💡', target:1, xp:10, phrasemenReward:5,
    titleRU:'Загляни в Теорию', titleUK:'Зазирни в Теорію',
    descRU:'Открой раздел Теория в любом уроке.',
    descUK:'Відкрий розділ Теорія в будь-якому уроці.' },
  { id:'ot2', type:'open_theory', icon:'📖', target:2, xp:15, phrasemenReward:8,
    titleRU:'Теоретик', titleUK:'Теоретик',
    descRU:'Открой раздел Теория в 2 разных уроках.',
    descUK:'Відкрий розділ Теорія в 2 різних уроках.' },
];

// ── 30 наборов по 3 задания на каждый день месяца ────────────────────────
const DAILY_SETS: string[][] = [
  ['da1','ta1','cs1'],   // день 1
  ['da2','qh1','wl1'],   // день 2
  ['da3','ta2','lnm1'],  // день 3
  ['da1','qs1','vl1'],   // день 4
  ['da2','cs2','ta3'],   // день 5
  ['da3','wl2','qh2'],   // день 6
  ['da1','lnm2','qs2'],  // день 7
  ['da2','ta4','vl2'],   // день 8
  ['da3','cs3','ot1'],   // день 9
  ['da1','qh3','wl3'],   // день 10
  ['da2','ta5','lnm3'],  // день 11
  ['da3','qs3','cs4'],   // день 12
  ['da1','vl3','ta2'],   // день 13
  ['da2','cs1','qh4'],   // день 14
  ['da3','wl1','qs4'],   // день 15
  ['da1','ta6','lnm1'],  // день 16
  ['da2','ot2','cs2'],   // день 17
  ['da3','qh1','ta3'],   // день 18
  ['da1','vl1','qs2'],   // день 19
  ['da2','wl2','lnm2'],  // день 20
  ['da3','cs3','ta4'],   // день 21
  ['da1','qh2','ot1'],   // день 22
  ['da2','ta5','vl2'],   // день 23
  ['da3','qs3','cs4'],   // день 24
  ['da1','lnm3','wl3'],  // день 25
  ['da2','ta2','qh3'],   // день 26
  ['da3','cs1','qs1'],   // день 27
  ['da1','vl3','ta3'],   // день 28
  ['da2','wl1','lnm1'],  // день 29
  ['da3','cs2','qh4'],   // день 30
];

// ── Утилиты ───────────────────────────────────────────────────────────────
export const getTodayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export const getTodayTasks = (): DailyTask[] => {
  const dayOfMonth = new Date().getDate(); // 1-31
  const setIdx = (dayOfMonth - 1) % DAILY_SETS.length;
  const ids = DAILY_SETS[setIdx];
  return ids.map(id => ALL_TASKS.find(t => t.id === id)!).filter(Boolean);
};

const STORAGE_PREFIX = 'daily_tasks_';

export const loadTodayProgress = async (): Promise<TaskProgress[]> => {
  try {
    const key = STORAGE_PREFIX + getTodayKey();
    const saved = await AsyncStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    // Инициализируем пустой прогресс
    const tasks = getTodayTasks();
    const initial: TaskProgress[] = tasks.map(t => ({
      taskId: t.id, current: 0, completed: false, claimed: false,
    }));
    await AsyncStorage.setItem(key, JSON.stringify(initial));
    return initial;
  } catch { return []; }
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
  const tasks = getTodayTasks();
  const progress = await loadTodayProgress();
  let newlyCompleted: TaskProgress | null = null;

  const updated = progress.map(p => {
    const task = tasks.find(t => t.id === p.taskId);
    if (!task || task.type !== type || p.completed) return p;
    const newCurrent = Math.round(Math.min(p.current + increment, task.target) * 10) / 10;
    const nowCompleted = newCurrent >= task.target;
    if (nowCompleted && !p.completed) newlyCompleted = { ...p, current: newCurrent, completed: true };
    return { ...p, current: newCurrent, completed: nowCompleted };
  });

  await saveTodayProgress(updated);
  return { completed: newlyCompleted, allProgress: updated };
};

// ── Сброс прогресса задания (например при ошибке в серии) ─────────────────
export const resetTaskProgress = async (type: TaskType): Promise<void> => {
  const tasks = getTodayTasks();
  const progress = await loadTodayProgress();

  const updated = progress.map(p => {
    const task = tasks.find(t => t.id === p.taskId);
    if (!task || task.type !== type || p.completed || p.claimed) return p;
    return { ...p, current: 0 };
  });

  await saveTodayProgress(updated);
};

// ── Атомарный сброс нескольких типов + опциональные инкременты (без race condition) ──
export const resetAndUpdateTaskProgress = async (
  resets: TaskType[],
  updates: { type: TaskType; increment?: number }[] = [],
): Promise<void> => {
  const tasks = getTodayTasks();
  let progress = await loadTodayProgress();

  // Сначала сбрасываем
  for (const type of resets) {
    progress = progress.map(p => {
      const task = tasks.find(t => t.id === p.taskId);
      if (!task || task.type !== type || p.completed || p.claimed) return p;
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
};

// ── Отметить задание как полученное (claimed) ─────────────────────────────
export const claimTask = async (taskId: string): Promise<void> => {
  const progress = await loadTodayProgress();
  const updated = progress.map(p =>
    p.taskId === taskId ? { ...p, claimed: true } : p
  );
  await saveTodayProgress(updated);
};

// ── Батч-обновление нескольких типов за одну операцию чтения/записи ──────────
// Используй вместо нескольких updateTaskProgress подряд — иначе race condition
export const updateMultipleTaskProgress = async (
  updates: { type: TaskType; increment?: number }[],
): Promise<void> => {
  const tasks = getTodayTasks();
  let progress = await loadTodayProgress();

  for (const { type, increment = 1 } of updates) {
    progress = progress.map(p => {
      const task = tasks.find(t => t.id === p.taskId);
      if (!task || task.type !== type || p.completed) return p;
      const newCurrent = Math.round(Math.min(p.current + increment, task.target) * 10) / 10;
      return { ...p, current: newCurrent, completed: newCurrent >= task.target };
    });
  }

  await saveTodayProgress(progress);
};

export const getTaskById = (id: string): DailyTask | undefined =>
  ALL_TASKS.find(t => t.id === id);

export { ALL_TASKS };
