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
import { getUserSettingsSnapshot } from '../user_settings_store';
import * as haptics from './haptics';
import { play, type SoundName } from './sound_bank';
import { comboLevelFor } from './combo_engine';

/** Разрешены ли UI-звуки прямо сейчас (синхронно из снапшота настроек). */
function soundsOn(): boolean {
  return getUserSettingsSnapshot().uiSounds !== false;
}

/** Проиграть звук с учётом тумблера uiSounds. */
function sfx(name: SoundName, volume?: number): void {
  if (!soundsOn()) return;
  play(name, volume != null ? { volume } : undefined);
}

export type MilestoneKind = 'star1' | 'star2' | 'star3' | 'medal' | 'chord';

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
    sfx('correct');
    haptics.correct();
  },

  /**
   * Ошибка: по просьбе пользователя ЗВУК неправильного ответа убран совсем —
   * остаётся только error-хаптика (мягкая вибрация, НЕ «бззз»).
   */
  wrong(): void {
    haptics.wrong();
  },

  /**
   * Серия (хост передаёт своё текущее значение n). Проигрывает ноту лесенки
   * min(n-1,10) и — при входе в новый уровень — пороговый стингер. Вибрация
   * усиливается с уровнем (искра→light, молния→medium, гроза→peak).
   *
   * fk НЕ хранит счётчик: он лишь маппит n→звук. Пороговый стингер срабатывает,
   * когда n РАВНО порогу входа в уровень (3/5/10) — ровно один раз на серию.
   */
  combo(n: number): void {
    if (n <= 0) return;
    const level = comboLevelFor(n);

    // Звуки серии оставлены ТОЛЬКО на двух молниях (по решению пользователя):
    //  - crack на n===5 (1-я молния), thunder на n===10 (2-я молния).
    // Лесенка нот (ladder), spark (n===3) и fizzle убраны из звука; вибрация
    // на каждый верный ответ остаётся.
    if (n === 5) {
      sfx('crack');
    } else if (n === 10) {
      sfx('thunder');
    }

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
        sfx('star_1');
        break;
      case 'star2':
        sfx('star_2');
        break;
      case 'star3':
        sfx('star_3');
        break;
      case 'medal':
      case 'chord':
        // Звук убран — только хаптика ниже.
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
