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

export const fk = {
  /**
   * Лёгкий клик касания (onPressIn интерактивов). По просьбе пользователя
   * ЗВУК-«писк» при нажатии кнопок убран совсем — остаётся только тактильный
   * отклик (вибрация уважает свой тумблер).
   */
  tap(): void {
    haptics.tap();
  },

  /** Плитка легла в слот. Звук 'pop' удалён — остаётся тактильный отклик. */
  pop(): void {
    haptics.pop();
  },

  /** Верный ответ: тёплый «дин-дон» + success haptic. */
  correct(options?: VerdictSoundOptions): void {
    soundDirector.request('pm.learn.correct', options);
    haptics.correct();
  },

  /**
   * Ошибка: по просьбе пользователя ЗВУК неправильного ответа убран совсем —
   * остаётся только error-хаптика (мягкая вибрация, НЕ «бззз»).
   */
  wrong(options?: VerdictSoundOptions): void {
    soundDirector.request('pm.learn.needs_work', options);
    haptics.wrong();
  },

  /** Atomic verdict: one decision replaces correct+completion stacking. */
  verdict({ correct, completesUnit, completionEvent, dedupeKey }: VerdictOptions): void {
    soundDirector.requestLearningVerdict({
      correct,
      completesUnit,
      completionEvent,
      dedupeKey,
      scope: 'learning-verdict',
    });
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

  /** Тик счётчика XP. Звук 'tick' убран — метод оставлен как no-op для хостов. */
  tick(options?: SoundRequestOptions): void {
    soundDirector.request('pm.complete.xp_counter_tick', options);
  },

  xpCounterStart(options?: SoundRequestOptions): void {
    soundDirector.request('pm.complete.xp_counter_start', options);
  },

  xpCounterComplete(options?: SoundRequestOptions): void {
    soundDirector.request('pm.complete.xp_counter_complete', options);
  },

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
