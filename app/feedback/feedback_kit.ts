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
 * fk.combo(n) НЕ владеет счётчиком серии — счётчик у хоста (в lesson1 он ещё и
 * участвует в формуле XP, спек §2). n — текущее значение серии; fk сам выбирает
 * ноту лесенки и пороговый стингер по уровню.
 */
import * as haptics from './haptics';
import { comboLevelFor } from './combo_engine';
import { soundDirector } from '../../modules/audio/sound_director';

export type MilestoneKind = 'star1' | 'star2' | 'star3' | 'medal' | 'chord';
export type FeedbackSurface = 'lesson' | 'practice';

export interface ComboOptions {
  surface?: FeedbackSurface;
}

export interface VerdictOptions extends ComboOptions {
  correct: boolean;
  combo?: number;
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
  correct(): void {
    soundDirector.request('pm.learn.correct');
    haptics.correct();
  },

  /**
   * Ошибка: по просьбе пользователя ЗВУК неправильного ответа убран совсем —
   * остаётся только error-хаптика (мягкая вибрация, НЕ «бззз»).
   */
  wrong(): void {
    soundDirector.request('pm.learn.needs_work');
    haptics.wrong();
  },

  /** Atomic verdict: one decision replaces correct+combo/completion stacking. */
  verdict({ correct, combo: n, completesUnit, completionEvent, dedupeKey }: VerdictOptions): void {
    soundDirector.requestLearningVerdict({
      correct,
      combo: n,
      completesUnit,
      completionEvent,
      dedupeKey,
      scope: 'learning-verdict',
    });
    if (!correct) {
      haptics.wrong();
      return;
    }
    haptics.correct();
    const level = comboLevelFor(n ?? 0);
    if (level >= 3) haptics.peak();
    else if (level >= 2) haptics.medium();
    else if (level >= 1) haptics.light();
  },

  /**
   * Серия (хост передаёт своё текущее значение n). Проигрывает ноту лесенки
   * min(n-1,10) и — при входе в новый уровень — пороговый стингер. Вибрация
   * усиливается с уровнем (искра→light, молния→medium, гроза→peak).
   *
   * fk НЕ хранит счётчик: он лишь маппит n→звук. Пороговый стингер срабатывает,
   * когда n РАВНО порогу входа в уровень (3/5/10) — ровно один раз на серию.
   */
  combo(n: number, options: ComboOptions = {}): void {
    if (n <= 0) return;

    const level = comboLevelFor(n);

    // Звуки серии оставлены ТОЛЬКО на двух молниях в основном уроке:
    //  - crack на n===5 (1-я молния), thunder на n===10 (2-я молния).
    // Лесенка нот (ladder), spark (n===3) и fizzle убраны из звука; вибрация
    // на каждый верный ответ остаётся.
    // Хаптика по уровню серии.
    if (level >= 3) haptics.peak();
    else if (level >= 2) haptics.medium();
    else if (level >= 1) haptics.light();
    else haptics.tap();
  },

  /**
   * Обрыв серии: «шипение остывания» + error haptic. fromValue — значение серии
   * до обрыва. Обрыв — это всё же неверный ответ, поэтому несёт тот же error
   * haptic, что и fk.wrong() (сохраняем прежнюю тактильную обратную связь ошибки),
   * а звук — «остывание» вместо «тупа».
   */
  comboBreak(fromValue: number): void {
    if (fromValue <= 0) return;
    // Звук 'fizzle' убран — остаётся только error-хаптика.
    haptics.wrong();
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
  milestone(kind: MilestoneKind): void {
    switch (kind) {
      case 'star1':
        soundDirector.request('pm.complete.star_1');
        break;
      case 'star2':
        soundDirector.request('pm.complete.star_2');
        break;
      case 'star3':
        soundDirector.request('pm.complete.star_3');
        break;
      case 'medal':
        soundDirector.request('pm.complete.micro');
        break;
      case 'chord':
        soundDirector.request('pm.complete.session');
        break;
    }
    haptics.success();
  },

  /** Тик счётчика XP. Звук 'tick' убран — метод оставлен как no-op для хостов. */
  tick(): void {
  },
} as const;

export type FeedbackKit = typeof fk;
export default fk;
