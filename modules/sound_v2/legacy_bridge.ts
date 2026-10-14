// legacy_bridge.ts — мост старых звуков (SoundDirector pm.* и playSfx fc_*) к звукам V2.
//
// зачем (координатор 14.10, п.4): все места, где сейчас звучат старые события, подключаются к sound_v2 ОДНОЙ точкой на каждом из двух входов (SoundDirector.execute и SoundService.playSfx),
// а не правкой 40 экранов. Флаг sound_v2 выключен — мост возвращает false и звучит прежний путь, байт в байт. Включён и событие есть в карте — играет V2 (4 варианта, колода «не повторять»,
// серии); не сыграло по причине «платформа/плеер» — возвращаем false, и старый звук подхватывает; причина «звуки выключены / идёт запись» — тишина (мост возвращает true, как и старый путь не играл бы).
// Карта осторожная: только события, у которых в V2 есть равное по смыслу. Остальные (флип карточки, тики, нарастание, сундук) остаются старыми.
// Верный ответ в УРОКАХ не озвучивается по решению владельца 2026-09-15 (вердикт — вибрацией); карта это НЕ меняет: «correct/wrong» подключены только к карточкам (playSfx).
import type { SoundV2EventId } from './catalog';
import { isSoundV2Enabled } from './sound_v2_flag';

const LOG = '[SOUND-V2-BRIDGE]';

type Plan = Readonly<{ event: SoundV2EventId; advance?: boolean; step?: number }>;

/** Старое событие SoundDirector → событие V2. */
export const DIRECTOR_TO_V2: Readonly<Record<string, Plan>> = {
  'pm.ui.tap_primary': { event: 'tap' },
  'pm.ui.tap_soft': { event: 'tap' },
  'pm.complete.session': { event: 'lesson_done' },
  'pm.complete.perfect': { event: 'lesson_perfect' },
  'pm.complete.star_3_perfect': { event: 'lesson_perfect' },
  'pm.complete.exam_pass': { event: 'lesson_perfect' },
  'pm.dialog.victory': { event: 'lesson_done' },
  'pm.reward.small': { event: 'coin', advance: true },
  'pm.coin.flight_start': { event: 'coin', advance: true },
  'pm.reward.rune_count_done': { event: 'coins_many' },
  'pm.complete.rewards_finale': { event: 'coins_many' },
  'pm.streak.saved': { event: 'streak_small' },
  'pm.energy.empty': { event: 'energy_out' },
  'pm.hearts.restored': { event: 'energy_back' },
};

/** Имя старого звука карточек (FcSfxName) → событие V2. Серии `correct` растут, `wrong` их сбрасывает (движок). */
export const FC_TO_V2: Readonly<Record<string, Plan>> = {
  correct: { event: 'correct', advance: true },
  incorrect: { event: 'wrong' },
  swipe_know: { event: 'swipe_know' },
  swipe_learn: { event: 'swipe_learn' },
  session_complete: { event: 'lesson_done' },
};

/** Причины отказа, при которых старый звук тоже молчал бы (звуки выключены / идёт запись) — тогда не подхватываем старым. */
const SILENT_REASONS: ReadonlySet<string> = new Set(['effects_disabled', 'quiet_recording']);

function playPlan(source: string, id: string, plan: Plan): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playEvent } = require('./sound_bank') as typeof import('./sound_bank');
    const result = playEvent(plan.event, plan.advance ? { advance: true } : plan.step !== undefined ? { step: plan.step } : undefined);
    if (result.played) return true;
    if (result.reason && SILENT_REASONS.has(result.reason)) return true;
    console.log(`${LOG} ${source}:${id} → ${plan.event} не сыграл (${String(result.reason)}) — играет старый звук`); // guard-ok: причина отката на старый путь
    return false;
  } catch (error) {
    console.warn(`${LOG} ${source}:${id} → ${plan.event} упал (${error instanceof Error ? error.message : String(error)}) — играет старый звук`);
    return false;
  }
}

/** Событие SoundDirector: true — сыграл V2 (старый звук не нужен), false — играть по-старому. */
export function tryPlayV2ForDirector(eventId: string): boolean {
  if (!isSoundV2Enabled()) return false;
  const plan = DIRECTOR_TO_V2[eventId];
  return plan ? playPlan('director', eventId, plan) : false;
}

/** Прямой запуск события V2 (моменты вовлечения): true — сыграло или звуки выключены/идёт запись; false — флаг выключен или не сыграло (вызывающий пишет заглушку/старый звук). */
export function tryPlayV2Event(event: SoundV2EventId, source: string, advance = false, step?: number): boolean {
  if (!isSoundV2Enabled()) return false;
  return playPlan('moment', source, { event, advance, step });
}

/** Звук карточек playSfx: true — сыграл V2, false — играть по-старому. */
export function tryPlayV2ForFc(name: string): boolean {
  if (!isSoundV2Enabled()) return false;
  const plan = FC_TO_V2[name];
  return plan ? playPlan('fc', name, plan) : false;
}
