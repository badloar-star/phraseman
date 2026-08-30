/**
 * Каталог звуков Арены.
 *
 * Существует, чтобы три вещи не разъехались: промпты в
 * `docs/arena/SOUND_PROMPTS.md`, объявления в `modules/audio/sound_events.ts` и
 * места вызова на экранах. Разъезжаются они молча: звук, у которого нет
 * промпта, никогда не будет сгенерирован, а звук без места вызова никогда не
 * прозвучит, и заметить это можно только на слух.
 *
 * Файлов ещё нет — их генерирует владелец через Adobe Firefly по промптам.
 * Поэтому события зарегистрированы с пустым источником: звуковой директор
 * молча пропускает такие, и приложение работает без единой заглушки. Когда
 * файл кладут в `assets/sounds/ar/`, меняется одна строка объявления.
 *
 * Чистые данные: ни звука, ни импортов.
 */

export type ArenaSoundKey =
  | 'searchStart' | 'searchLoop' | 'opponentFound'
  | 'countdownTick' | 'countdownGo'
  | 'taskIn' | 'optionTap'
  | 'answerCorrect' | 'answerFirst' | 'answerWrong'
  | 'opponentAnswered' | 'timerTick' | 'timeout'
  | 'comboStart' | 'comboUp' | 'comboBreak'
  | 'pairMatch' | 'pairMiss' | 'pairClear'
  | 'resultWin' | 'resultLoss' | 'resultDraw'
  | 'starFly' | 'starLand'
  | 'goalComplete' | 'rewardUnlock'
  | 'rankUp' | 'rankDown';

export type ArenaSoundSpec = Readonly<{
  key: ArenaSoundKey;
  /** Имя файла ровно как в промптах. По нему они и сверяются. */
  file: string;
  /** Идентификатор события звукового директора. */
  eventId: string;
  volume: number;
  durationMs: number;
  /**
   * Пауза между повторами. Ставится не «на всякий случай», а по каденции:
   * слишком длинная глотает каждый второй тик отсчёта, слишком короткая
   * превращает доску пар в треск.
   */
  cooldownMs: number;
  /** Кто кого перебивает. Исход матча важнее тика таймера. */
  priority: number;
}>;

export const ARENA_SOUNDS: readonly ArenaSoundSpec[] = Object.freeze([
  // зачем 2026-08-30: durations шести подключённых звуков — честные длины
  // файлов раунда 5 (реальный путь assets/audio/sfx/v1/arena/*.m4a).
  { key: 'searchStart', file: 'ar_search_start.mp3', eventId: 'pm.arena.search_start', volume: 0.35, durationMs: 2000, cooldownMs: 600, priority: 55 },
  { key: 'searchLoop', file: 'ar_search_loop.mp3', eventId: 'pm.arena.search_loop', volume: 0.12, durationMs: 3000, cooldownMs: 1800, priority: 20 },
  { key: 'opponentFound', file: 'ar_opponent_found.mp3', eventId: 'pm.arena.opponent_found', volume: 0.60, durationMs: 700, cooldownMs: 1500, priority: 78 },

  // Отсчёт: кулдаун СТРОГО короче секундного шага, иначе глотается каждый
  // второй тик и игрок слышит «3…1» вместо «3, 2, 1». На этом уже обжигались
  // в турнире, см. комментарий у pm.learn.timer_warning.
  { key: 'countdownTick', file: 'ar_countdown_tick.mp3', eventId: 'pm.arena.countdown_tick', volume: 0.34, durationMs: 200, cooldownMs: 700, priority: 62 },
  { key: 'countdownGo', file: 'ar_countdown_go.mp3', eventId: 'pm.arena.countdown_go', volume: 0.55, durationMs: 1390, cooldownMs: 1200, priority: 74 },

  { key: 'taskIn', file: 'ar_task_in.mp3', eventId: 'pm.arena.task_in', volume: 0.24, durationMs: 260, cooldownMs: 500, priority: 40 },
  { key: 'optionTap', file: 'ar_option_tap.mp3', eventId: 'pm.arena.option_tap', volume: 0.20, durationMs: 120, cooldownMs: 60, priority: 30 },

  { key: 'answerCorrect', file: 'ar_answer_correct.mp3', eventId: 'pm.arena.answer_correct', volume: 0.42, durationMs: 380, cooldownMs: 160, priority: 70 },
  // Отдельный звук на «ответил верно И раньше соперника»: третья звезда — то,
  // ради чего в Арене торопятся, и на слух она обязана отличаться от обычной.
  { key: 'answerFirst', file: 'ar_answer_first.mp3', eventId: 'pm.arena.answer_first', volume: 0.48, durationMs: 460, cooldownMs: 160, priority: 72 },
  { key: 'answerWrong', file: 'ar_answer_wrong.mp3', eventId: 'pm.arena.answer_wrong', volume: 0.28, durationMs: 320, cooldownMs: 220, priority: 68 },

  { key: 'opponentAnswered', file: 'ar_opponent_answered.mp3', eventId: 'pm.arena.opponent_answered', volume: 0.22, durationMs: 200, cooldownMs: 400, priority: 45 },
  { key: 'timerTick', file: 'ar_timer_tick.mp3', eventId: 'pm.arena.timer_tick', volume: 0.30, durationMs: 140, cooldownMs: 700, priority: 60 },
  { key: 'timeout', file: 'ar_timeout.mp3', eventId: 'pm.arena.timeout', volume: 0.34, durationMs: 420, cooldownMs: 500, priority: 66 },

  { key: 'comboStart', file: 'ar_combo_start.mp3', eventId: 'pm.arena.combo_start', volume: 0.38, durationMs: 420, cooldownMs: 600, priority: 64 },
  { key: 'comboUp', file: 'ar_combo_up.mp3', eventId: 'pm.arena.combo_up', volume: 0.40, durationMs: 380, cooldownMs: 300, priority: 65 },
  { key: 'comboBreak', file: 'ar_combo_break.mp3', eventId: 'pm.arena.combo_break', volume: 0.26, durationMs: 340, cooldownMs: 600, priority: 58 },

  // Пары: тык идёт быстрыми сериями, поэтому кулдаун почти нулевой — иначе
  // доска звучит как один слипшийся щелчок.
  { key: 'pairMatch', file: 'ar_pair_match.mp3', eventId: 'pm.arena.pair_match', volume: 0.34, durationMs: 180, cooldownMs: 80, priority: 66 },
  { key: 'pairMiss', file: 'ar_pair_miss.mp3', eventId: 'pm.arena.pair_miss', volume: 0.24, durationMs: 200, cooldownMs: 120, priority: 62 },
  { key: 'pairClear', file: 'ar_pair_clear.mp3', eventId: 'pm.arena.pair_clear', volume: 0.46, durationMs: 520, cooldownMs: 800, priority: 74 },

  { key: 'resultWin', file: 'ar_result_win.mp3', eventId: 'pm.arena.result_win', volume: 0.55, durationMs: 1400, cooldownMs: 2000, priority: 90 },
  { key: 'resultLoss', file: 'ar_result_loss.mp3', eventId: 'pm.arena.result_loss', volume: 0.38, durationMs: 1200, cooldownMs: 2000, priority: 90 },
  { key: 'resultDraw', file: 'ar_result_draw.mp3', eventId: 'pm.arena.result_draw', volume: 0.42, durationMs: 2480, cooldownMs: 2000, priority: 90 },

  { key: 'starFly', file: 'ar_star_fly.mp3', eventId: 'pm.arena.star_fly', volume: 0.26, durationMs: 240, cooldownMs: 70, priority: 50 },
  { key: 'starLand', file: 'ar_star_land.mp3', eventId: 'pm.arena.star_land', volume: 0.34, durationMs: 260, cooldownMs: 90, priority: 56 },

  { key: 'goalComplete', file: 'ar_goal_complete.mp3', eventId: 'pm.arena.goal_complete', volume: 0.44, durationMs: 700, cooldownMs: 1500, priority: 76 },
  { key: 'rewardUnlock', file: 'ar_reward_unlock.mp3', eventId: 'pm.arena.reward_unlock', volume: 0.50, durationMs: 900, cooldownMs: 1500, priority: 84 },

  { key: 'rankUp', file: 'ar_rank_up.mp3', eventId: 'pm.arena.rank_up', volume: 0.55, durationMs: 3000, cooldownMs: 2000, priority: 88 },
  { key: 'rankDown', file: 'ar_rank_down.mp3', eventId: 'pm.arena.rank_down', volume: 0.34, durationMs: 2480, cooldownMs: 2000, priority: 82 },
]);

const BY_KEY = new Map(ARENA_SOUNDS.map((spec) => [spec.key, spec]));

export function arenaSound(key: ArenaSoundKey): ArenaSoundSpec {
  const spec = BY_KEY.get(key);
  if (!spec) throw new Error(`arena_sound_unknown:${key}`);
  return spec;
}

/** Идентификатор события для звукового директора. */
export function arenaSoundEventId(key: ArenaSoundKey): string {
  return arenaSound(key).eventId;
}
