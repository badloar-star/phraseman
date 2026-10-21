// ═══════════════════════════════════════════════════════════════════════════
// home_scene_state.ts — какой герой стоит на «Сцене» Главной.
//
// зачем (владелец 21.10 ~23:40: «ВАРИАНТ 1 СЦЕНА! ОТЛИЧНО, МНЕ ОЧЕНЬ НРАВИТСЯ!»; координатор: десять состояний героя
// и приоритет при совпадении — таблица docs/design/v2-app/home-scene-states.html): чистая функция без React, хранилища
// и сети. Главная передаёт только то, что уже знает; функция отдаёт состояние, строку «Нет сети» и ПРИЧИНУ решения —
// её пишет журнал [HOME-SCENE]. Порядок сверху вниз, побеждает первое подходящее:
// new → streak_risk → no_energy → welcome_back → streak_lost → exam_ready → all_done → day_done → offline → continue.
// «Нет сети» при любом герое показывается ещё и строкой под шапкой (эталон, состояние «Нет сети»).
// ═══════════════════════════════════════════════════════════════════════════

export const HOME_SCENE_STATES = [
  'new', 'continue', 'streak_risk', 'day_done', 'no_energy', 'offline', 'exam_ready', 'streak_lost', 'welcome_back', 'all_done',
] as const;
export type HomeSceneState = typeof HOME_SCENE_STATES[number];

/** Вечер начинается в 20:00 по часам телефона (таблица, приоритет 2). */
export const HOME_SCENE_EVENING_HOUR = 20;
/** «С возвращением» — с 3 дней без занятий (таблица, приоритет 4). */
export const HOME_SCENE_WELCOME_BACK_DAYS = 3;

export type HomeSceneInput = Readonly<{
  /** Пройден хоть один эпизод за всё время. false — новичок («Начать»); null — ещё не известно (не решаем «новичок» вслепую). */
  hasProgress: boolean | null;
  /** Час по часам телефона, 0..23. */
  hour: number;
  /** Серия в днях, как в шапке. */
  streakDays: number;
  /** Сегодня день серии уже засчитан; null — ещё не известно (тогда ни «под угрозой», ни «засчитан»). */
  dayCounted: boolean | null;
  /** Plus — энергия без лимита. */
  plus: boolean;
  /** Энергия сейчас; null — неизвестно (кэш пуст), тогда «нет энергии» не показываем. */
  energy: number | null;
  /** Дней с последнего занятия; null — неизвестно. */
  daysAway: number | null;
  /** Серия от 2 дней сбросилась (пропущен 1–2 дня), и это первый вход за день. */
  streakLostToday: boolean;
  /** Все эпизоды текущей главы пройдены, экзамен главы не сдан. */
  chapterExamReady: boolean;
  /** Все выпущенные эпизоды пройдены, следующего нет. */
  allReleasedDone: boolean;
  /** Сети нет по данным системы; null — ещё не известно. */
  offline: boolean | null;
}>;

export type HomeSceneDecision = Readonly<{
  state: HomeSceneState;
  /** Показать строку «Нет сети» под шапкой. */
  offlineLine: boolean;
  /** Вечер при 0 энергии (Free): герой вечера остаётся, в тексте — когда вернётся энергия. */
  zeroEnergyNote: boolean;
  /** Что решило выбор — значения, а не голое true/false; пишется в [HOME-SCENE]. */
  reason: string;
}>;

export function pickHomeSceneState(input: HomeSceneInput): HomeSceneDecision {
  const offline = input.offline === true;
  const zeroEnergy = !input.plus && input.energy === 0;
  const decide = (state: HomeSceneState, reason: string, zeroEnergyNote = false): HomeSceneDecision =>
    Object.freeze({ state, offlineLine: offline, zeroEnergyNote, reason });
  if (input.hasProgress === false) return decide('new', 'hasProgress=false');
  if (input.hour >= HOME_SCENE_EVENING_HOUR && input.streakDays >= 1 && input.dayCounted === false) {
    return decide('streak_risk', `hour=${input.hour} streakDays=${input.streakDays} dayCounted=false energy=${String(input.energy)} plus=${String(input.plus)}`, zeroEnergy);
  }
  if (zeroEnergy) return decide('no_energy', 'plus=false energy=0');
  if (input.daysAway !== null && input.daysAway >= HOME_SCENE_WELCOME_BACK_DAYS) return decide('welcome_back', `daysAway=${input.daysAway}`);
  if (input.streakLostToday) return decide('streak_lost', 'streakLostToday=true');
  if (input.chapterExamReady) return decide('exam_ready', 'chapterExamReady=true');
  if (input.allReleasedDone) return decide('all_done', 'allReleasedDone=true');
  if (input.dayCounted === true) return decide('day_done', `dayCounted=true streakDays=${input.streakDays}`);
  if (offline) return decide('offline', 'offline=true');
  return decide('continue', `default hasProgress=${String(input.hasProgress)} hour=${input.hour} energy=${String(input.energy)}`);
}

/**
 * Будущий файл героя и заглушка, пока его нет. Файлы рисует владелец: assets/images/v2art/{light,dark}/home_scene_<state>.webp;
 * имя добавляется в реестр картинок (components/theme/themed_art_registry.ts) — до этого стоит заглушка из нынешних картинок Главной.
 */
export const HOME_SCENE_HERO: Readonly<Record<HomeSceneState, Readonly<{ file: string; placeholder: 'continue' | 'today' | 'lessons' }>>> = Object.freeze({
  new: Object.freeze({ file: 'home_scene_new', placeholder: 'continue' }),
  continue: Object.freeze({ file: 'home_scene_continue', placeholder: 'continue' }),
  streak_risk: Object.freeze({ file: 'home_scene_streak_risk', placeholder: 'today' }),
  day_done: Object.freeze({ file: 'home_scene_day_done', placeholder: 'today' }),
  no_energy: Object.freeze({ file: 'home_scene_no_energy', placeholder: 'continue' }),
  offline: Object.freeze({ file: 'home_scene_offline', placeholder: 'continue' }),
  exam_ready: Object.freeze({ file: 'home_scene_exam_ready', placeholder: 'continue' }),
  streak_lost: Object.freeze({ file: 'home_scene_streak_lost', placeholder: 'today' }),
  welcome_back: Object.freeze({ file: 'home_scene_welcome_back', placeholder: 'continue' }),
  all_done: Object.freeze({ file: 'home_scene_all_done', placeholder: 'lessons' }),
});

/** Минуты до полуночи по часам телефона — для «До полуночи 2 ч 20 мин». */
export function minutesUntilMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 60000));
}
