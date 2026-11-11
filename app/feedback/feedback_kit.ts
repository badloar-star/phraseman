/**
 * feedback_kit — фасад-синглтон ощущений FeedbackKit (спек §2 feedback_kit.ts).
 *
 * Событийный, синхронный, БЕЗ React-state (чтобы не дёргать ре-рендеры — Perf
 * Bible §6). Единственное состояние — ленивый банк звуков внутри sound_bank.
 * Хосты (экраны) ничего не знают о настройках/громкостях: зовут fk.correct() и т.п.
 *
 * Гейты:
 *  - ЗВУК: если !getUserSettingsSnapshot().uiSounds — звук скипается (спек §4,
 *    §10.1: глушение UI-звуков ТОЛЬКО через этот тумблер, глобальный аудио-режим
 *    не трогаем).
 *  - ВИБРАЦИЯ: идёт через hooks/use-haptics (haptics.ts-обёртка), которая сама
 *    уважает настройку тактильного отклика (кэш haptics_tap) и анти-наложение.
 *    Тумблер uiSounds вибрацию НЕ глушит — у неё свой тумблер.
 *
 * зачем 2026-08-03 (владелец: «убрать эффект серии полностью»): эффект серии
 * 5/10 (визуальная молния + отдельные звуки combo_5/combo_10 + усиленная
 * хаптика по уровню) убран целиком. Вердикт больше не зависит от длины серии —
 * везде звучит и вибрирует одинаково, как обычный верный/неверный ответ.
 */
import * as haptics from './haptics';
import { soundDirector } from '../../modules/audio/sound_director';
import type { SoundRequestOptions } from '../../modules/audio/sound_arbiter';
import { tryPlayV2Event } from '../../modules/sound_v2/legacy_bridge';

export type MilestoneKind = 'star1' | 'star2' | 'star3' | 'medal' | 'chord';
export type ResultsRewardSoundKind = 'activeRewardReveal' | 'activeGiftUnlock' | 'multiplierReveal' | 'multiplierUpgrade';
export type FeedbackSurface = 'lesson' | 'practice';

/**
 * зачем 2026-08-04 (владелец: «звуки в турнире работают рандомно и через
 * раз»): correct()/wrong() раньше не принимали никаких опций, поэтому все
 * вызовы (сейчас — только из турнира) делили общий на всё приложение лимит
 * звуков 2/сек. В турнире несколько источников (тап, вердикт, тик таймера)
 * легитимно случаются в одну секунду. rateLimit опционален — без него
 * поведение не меняется ни для одного существующего вызова.
 */
export type VerdictSoundOptions = Pick<SoundRequestOptions, 'scope' | 'rateLimit'>;

export interface VerdictOptions {
  correct: boolean;
  completesUnit?: boolean;
  completionEvent?: 'pm.complete.micro' | 'pm.complete.session' | 'pm.complete.perfect';
  dedupeKey?: string;
}

// зачем (владелец 11.11: «звуки должны быть точно закреплены за событием и воспроизводится мгновенно»; журнал 22:36:36 — плеер
// «неверно» создавался в момент ответа, warm=false, это ~0,4 с опоздания): плееры «верно/неверно» готовятся при первом касании
// в уроке, до первого ответа. Прогрев на старте приложения убран из корня чужим решением и сторожем холодного старта — туда не лезем.
let verdictSoundsWarmed = false;
function warmVerdictSoundsOnce(): void {
  if (verdictSoundsWarmed) return;
  verdictSoundsWarmed = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { prewarmSoundV2 } = require('../../modules/sound_v2/sound_bank') as typeof import('../../modules/sound_v2/sound_bank');
    prewarmSoundV2(['correct', 'wrong']);
  } catch (error) {
    verdictSoundsWarmed = false;
    console.warn(`[SOUND-V2] прогрев звуков вердикта не удался (${error instanceof Error ? error.message : String(error)}) — первый звук может опоздать`);
  }
}

export const fk = {
  /**
   * Лёгкий клик касания (onPressIn интерактивов). По просьбе пользователя
   * ЗВУК-«писк» при нажатии кнопок убран совсем — остаётся только тактильный
   * отклик (вибрация уважает свой тумблер).
   */
  tap(): void {
    warmVerdictSoundsOnce();
    haptics.tap();
  },

  /** Плитка легла в слот. Звук 'pop' удалён — остаётся тактильный отклик. */
  pop(): void {
    haptics.pop();
  },

  /**
   * Верный ответ: только success haptic — НЕМОЙ НАМЕРЕННО (решение закреплено
   * аудитом §R3 2026-08-30). Владелец в раунде 5 отверг вердикт-звуки быстрых
   * игр («ни один — не надо их вообще» для answer_correct/answer_wrong Арены);
   * турнирные вердикты следуют тому же вкусу. Опции оставлены для
   * совместимости сигнатуры существующих вызовов турнира — они игнорируются
   * сознательно, не «забыто подключить».
   */
  correct(_options?: VerdictSoundOptions): void {
    haptics.correct();
  },

  /**
   * Ошибка: только error-хаптика (мягкая вибрация, НЕ «бззз»). Немой намеренно —
   * см. коммент correct() выше.
   */
  wrong(_options?: VerdictSoundOptions): void {
    haptics.wrong();
  },

  /** Вердикт ответа в уроках: выбранный владельцем звук «верно» / «неверно» и вибрация. */
  verdict({ correct, completesUnit, completionEvent, dedupeKey }: VerdictOptions): void {
    if (completesUnit) {
      soundDirector.request(completionEvent ?? 'pm.complete.micro', {
        dedupeKey,
        scope: 'learning-verdict',
      });
    }
    // зачем (владелец 11.11: «Звуки не добавлены в приложение… исправляй»): он выбрал звук для «верно» (вариант C) и «неверно» и снял
    // замок 25.10, но вердикт урока оставался немым — за 25 минут урока в журнале не было ни одного события correct/wrong.
    // «Верно» идёт серией (каждый следующий подряд — на ступень выше), ошибка серию сбрасывает; это делает сам банк.
    // Мост сам молчит, если звуки выключены в настройках или идёт запись голоса; отказ плеера он пишет в журнал.
    const played = correct ? tryPlayV2Event('correct', 'learning_verdict', true) : tryPlayV2Event('wrong', 'learning_verdict');
    if (!played) console.warn(`[SOUND-V2] вердикт урока без звука: ${correct ? 'correct' : 'wrong'} (флаг выключен или плеер недоступен)`);
    if (correct) haptics.correct();
    else haptics.wrong();
  },

  /** Смена задания. Звук 'whoosh' убран — остаётся лёгкая вибрация. */
  transition(): void {
    haptics.light();
  },

  /**
   * Финальные вехи награды. По решению пользователя звук оставлен ТОЛЬКО у трёх
   * звёзд (star_1/2/3) на экране завершения; medal и chord — без звука, только
   * success-хаптика.
   */
  milestone(kind: MilestoneKind, options?: SoundRequestOptions): void {
    switch (kind) {
      case 'star1':
        soundDirector.request('pm.complete.star_1', options);
        break;
      case 'star2':
        soundDirector.request('pm.complete.star_2', options);
        break;
      case 'star3':
        soundDirector.request('pm.complete.star_3_perfect', options);
        break;
      case 'medal':
        break;
      case 'chord':
        soundDirector.request('pm.complete.session', options);
        break;
    }
    haptics.success();
  },

  successHaptic(): void {
    haptics.success();
  },

  /** Legacy counter hooks remain callable but produce no legacy reward audio. */
  tick(_options?: SoundRequestOptions): void {},

  rewardCounterStart(_options?: SoundRequestOptions): void {},

  rewardCounterComplete(_options?: SoundRequestOptions): void {},

  resultsReward(kind: ResultsRewardSoundKind, options?: SoundRequestOptions): void {
    const event = kind === 'activeRewardReveal'
      ? 'pm.complete.active_reward_reveal'
      : kind === 'activeGiftUnlock'
        ? 'pm.complete.active_gift_unlock'
        : kind === 'multiplierReveal'
          ? 'pm.complete.multiplier_reveal'
          : 'pm.complete.multiplier_upgrade';
    soundDirector.request(event, options);
  },

  resultsFinale(options?: SoundRequestOptions): void {
    soundDirector.request('pm.complete.rewards_finale', options);
  },

  cancelResultsSequenceAudio(): void {
    soundDirector.stopActiveCompletion('results-sequence');
    soundDirector.stopActiveEvent('pm.reward.small', 'results-sequence-spin');
  },
} as const;

export type FeedbackKit = typeof fk;
export default fk;
