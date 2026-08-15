// ════════════════════════════════════════════════════════════════════════════
// labKit.ts — ядро Motion Lab (DEV-раздел «Лаборатория движения»).
//
// Зачем: три направления движения (I «Чекан», II «Световод», III «Метроном»)
// перенесены в приложение ОДИН В ОДИН из HTML-макетов, чтобы их можно было
// запустить на реальном устройстве и сравнить. Ничего из этого НЕ применяется
// к боевым экранам — лаборатория живёт только в DEV Hub.
//
// Замедление: k = 1 / speed. Длительности и задержки умножаются на k,
// у пружин на k² умножается масса — период гармонического осциллятора
// пропорционален sqrt(m), поэтому масштабирование получается точным,
// а не «на глаз».
// ════════════════════════════════════════════════════════════════════════════

import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

export type LabDirectionId = 'impact' | 'lumen' | 'metro';

export type LabSurfaceId =
  | 'principle'
  | 'level-up'
  | 'no-energy'
  | 'streak'
  | 'confirm'
  | 'sheet'
  | 'toast-success'
  | 'toast-reward'
  | 'toast-error'
  | 'toast-queue'
  | 'loading'
  | 'empty'
  | 'button';

export type LabSurfaceMeta = Readonly<{
  id: LabSurfaceId;
  title: string;
  detail: string;
  category: 'Принцип' | 'Модалки' | 'Тосты' | 'Состояния' | 'Микро';
  /** Полная длительность сценария в мс при скорости 1×. Нужна для авто-повтора. */
  duration: number;
}>;

export const LAB_SURFACES: readonly LabSurfaceMeta[] = [
  { id: 'principle', title: 'Принцип направления', detail: 'Базовое движение, из которого выведено всё остальное', category: 'Принцип', duration: 2600 },

  { id: 'level-up', title: 'Повышение уровня', detail: 'Ключевая поверхность. Сейчас в приложении — молчит: ноль хаптики на 539 строк', category: 'Модалки', duration: 3400 },
  { id: 'no-energy', title: 'Закончилась энергия', detail: 'Сейчас: spring 90/7 на входе и setValue() вместо выхода', category: 'Модалки', duration: 3000 },
  { id: 'streak', title: 'Цепочка под угрозой', detail: 'Самое эмоциональное событие приложения', category: 'Модалки', duration: 3200 },
  { id: 'confirm', title: 'Подтверждение удаления', detail: 'Деструктив должен читаться движением, а не только цветом', category: 'Модалки', duration: 2400 },
  { id: 'sheet', title: 'Нижний лист', detail: 'Шесть клонов шторки в проекте дублируют 380/240 копипастой', category: 'Модалки', duration: 2600 },

  { id: 'toast-success', title: 'Тост · успех', detail: 'Единая система вместо 19 разных жизненных циклов', category: 'Тосты', duration: 3600 },
  { id: 'toast-reward', title: 'Тост · награда с действием', detail: 'Награда не должна теряться, если тост ушёл без тапа', category: 'Тосты', duration: 4600 },
  { id: 'toast-error', title: 'Тост · ошибка', detail: 'Единственный липкий тир: не уходит сам', category: 'Тосты', duration: 3000 },
  { id: 'toast-queue', title: 'Тост · очередь из трёх', detail: 'Сейчас три глобальных тоста выезжают в одну точку экрана', category: 'Тосты', duration: 5200 },

  { id: 'loading', title: 'Загрузка → содержимое', detail: 'В приложении анимированного перехода нет НИГДЕ', category: 'Состояния', duration: 3200 },
  { id: 'empty', title: 'Пустое состояние', detail: 'Пустота как приглашение, а не как поломка', category: 'Состояния', duration: 2800 },

  { id: 'button', title: 'Кнопка под пальцем', detail: 'Нажатие и отпускание с разным характером', category: 'Микро', duration: 2800 },
] as const;

export const LAB_DIRECTIONS = [
  {
    id: 'impact' as const,
    roman: 'I',
    name: 'Чекан',
    tagline: 'Материал и вес. Всё падает, ударяется и вздрагивает. Один отскок, ни одного лишнего.',
    accent: '#E8C86A',
  },
  {
    id: 'lumen' as const,
    roman: 'II',
    name: 'Световод',
    tagline: 'Свет и глубина. Ничто не летит — сначала загорается свет, потом из него выходит форма.',
    accent: '#8FA0FF',
  },
  {
    id: 'metro' as const,
    roman: 'III',
    name: 'Метроном',
    tagline: 'Ритм и цифры. База — такт 60 мс, но каскад замедляется к кульминации.',
    accent: '#E8E8EE',
  },
] as const;

// ─── Кривые ─────────────────────────────────────────────────────────────────
// Один в один с макетами: те же четыре контрольные точки.
export const EASE = {
  /** Основной вход: резкий старт, длинный выкат. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Раскрытие панели. */
  std: Easing.bezier(0.32, 0.72, 0, 1),
  /** Падение с ускорением — тело набирает скорость к удару. */
  fall: Easing.bezier(0.6, 0, 0.95, 0.5),
  /** Выход: быстро уезжает. */
  exit: Easing.bezier(0.4, 0, 1, 1),
  /** Растворение вглубь. */
  in: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.ease),
  linear: Easing.linear,
} as const;

// ─── Замедление ─────────────────────────────────────────────────────────────

export type Slow = {
  /** Коэффициент замедления: 1 / speed. */
  k: number;
  /** Длительность или задержка в мс с учётом замедления. */
  ms: (v: number) => number;
  /** Конфиг timing с учётом замедления. */
  t: (duration: number, easing?: WithTimingConfig['easing']) => WithTimingConfig;
  /** Конфиг spring с учётом замедления (масса × k²). */
  s: (cfg: WithSpringConfig) => WithSpringConfig;
};

export function makeSlow(speed: number): Slow {
  const k = 1 / (speed || 1);
  return {
    k,
    ms: (v: number) => Math.round(v * k),
    t: (duration: number, easing = EASE.out) => ({ duration: Math.round(duration * k), easing }),
    s: (cfg: WithSpringConfig) => ({
      ...cfg,
      mass: (cfg.mass ?? 1) * k * k,
    }),
  };
}

// ─── Токены направлений ─────────────────────────────────────────────────────
// Значения перенесены из макетов без округлений.

/** RN Animated.spring(tension, friction) → stiffness/damping (Origami-формула RN). */
export function origami(tension = 40, friction = 7): WithSpringConfig {
  return {
    stiffness: (tension - 30) * 3.62 + 194,
    damping: (friction - 8) * 3 + 25,
    mass: 1,
  };
}

/** I «ЧЕКАН» */
export const IMPACT = {
  FALL_MS: 220,
  ANTICIPATION_MS: 180,
  SQUASH: { stiffness: 260, damping: 5, mass: 1 } as WithSpringConfig,
  RECOIL: { stiffness: 180, damping: 6, mass: 1 } as WithSpringConfig,
  PANEL: { stiffness: 165, damping: 15, mass: 0.9 } as WithSpringConfig,
  ROW: { stiffness: 145, damping: 12, mass: 0.6 } as WithSpringConfig,
  CHIP: { stiffness: 190, damping: 10, mass: 0.5 } as WithSpringConfig,
  TOAST: { stiffness: 190, damping: 12, mass: 1 } as WithSpringConfig,
  TOAST_ERR: { stiffness: 240, damping: 11, mass: 1 } as WithSpringConfig,
  EXIT_MS: 190,
  BACKDROP_MS: 240,
  OFFSET: 130,
  /** Закон 2 эталона: каскад ЗАМЕДЛЯЕТСЯ к кульминации, ровный шаг запрещён. */
  LADDER: [0, 62, 146, 262, 410, 590],
} as const;

/** II «СВЕТОВОД» */
export const LUMEN = {
  BLOOM_MS: 420,
  RESOLVE_MS: 380,
  SETTLE: { stiffness: 150, damping: 22, mass: 1 } as WithSpringConfig,
  RIM_MS: 620,
  DEPTH_MS: 460,
  EXIT_MS: 260,
  /** Единственное перемещение направления, в пикселях. */
  SHIFT: 16,
  /** Расфокус имитируется масштабом, а НЕ BlurView — Android-бюджетники. */
  DEFOCUS: 1.06,
  LADDER: [0, 74, 172, 306, 478, 688],
} as const;

/** III «МЕТРОНОМ» */
export const BEAT = 60;
export const METRO = {
  BEAT,
  LINE_MS: BEAT * 6,   // 360
  TEXT_MS: BEAT * 4,   // 240
  COUNT_MS: BEAT * 12, // 720
  OPEN_MS: BEAT * 7,   // 420
  EXIT_MS: BEAT * 3,   // 180
  SHIFT: 6,
  LADDER: [0, 60, 140, 260, 420, 620],
} as const;

// ─── Общий контент поверхностей ─────────────────────────────────────────────
// Один и тот же текст во всех трёх направлениях — сравниваем движение,
// а не копирайт.

export const LAB_COPY = {
  level: {
    kicker: 'Уровень достигнут',
    level: 12,
    prevLevel: 11,
    title: 'Wordsmith',
    sub: 'Ты в верхних 18% учеников курса',
    rewards: [
      { icon: '✦', label: 'Бонус', value: '+100 XP', tint: 'gold' as const },
      { icon: '⚡', label: 'Энергия', value: 'Максимум поднят до 6', tint: 'accent' as const },
      { icon: '🎖', label: 'Титул', value: 'Wordsmith', tint: 'second' as const },
    ],
    cta: 'Забрать награду',
  },
  energy: {
    kicker: 'Энергия',
    title: 'Энергия закончилась',
    sub: 'Следующая единица через 14:32',
    rewards: [{ icon: '💎', label: 'Мгновенно', value: '25 осколков', tint: 'gold' as const }],
    ctaGhost: 'Позже',
    cta: 'Восстановить',
  },
  streak: {
    kicker: 'Цепочка под угрозой',
    days: 28,
    title: '28 дней сгорят в полночь',
    sub: 'Позанимайся 5 минут — или заморозь цепочку',
    ctaGhost: 'Отпустить',
    cta: 'Спасти · 50 💎',
  },
  confirm: {
    kicker: 'Необратимое действие',
    count: 54,
    title: 'Удалить колоду?',
    sub: 'Колода «Idioms» и весь прогресс по ней исчезнут. Восстановить нельзя.',
    ctaGhost: 'Отмена',
    cta: 'Удалить',
  },
  sheet: {
    title: 'Выбери режим',
    rows: [
      { icon: '🎧', label: 'Аудирование', value: 'Слушай и повторяй' },
      { icon: '✍️', label: 'Письмо', value: 'Собирай фразы' },
      { icon: '⚡', label: 'Блиц', value: '60 секунд на серию' },
    ],
    cta: 'Начать',
  },
  toasts: {
    success: { title: 'Урок пройден', sub: '+50 XP получено', value: 50, life: 3000 },
    reward: { title: 'Вызов дня выполнен', sub: 'Награда: +50 XP', action: 'Забрать', life: 4000 },
    error: { title: 'Не удалось сохранить', sub: 'Проверь соединение', action: 'Повторить', life: 0 },
    queue: [
      { title: 'Карточка добавлена', sub: 'В колоду «Idioms»', value: '' },
      { title: 'Достижение', sub: 'Марафонец · 7 дней', value: '+120 XP' },
      { title: 'Ранг вырос', sub: 'Золотая лига · 3 место', value: '' },
    ],
  },
  loading: {
    rows: [
      { kicker: 'Урок 14 · A2', title: 'Present Perfect' },
      { kicker: 'Карточки', title: '124 слова к повтору' },
      { kicker: 'Арена', title: 'Онлайн 312' },
    ],
  },
  empty: {
    kicker: 'Колода «Idioms»',
    title: 'Здесь пока пусто',
    sub: 'Добавь первую карточку — она появится здесь и сразу попадёт в повторение',
    cta: 'Добавить карточку',
  },
  button: { label: 'Продолжить' },
} as const;
