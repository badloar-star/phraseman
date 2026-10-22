/**
 * Сброс прежнего сохранённого масштаба сетки карточек на шаг 0.
 *
 * зачем (владелец 22.10 через координатора: «ползунок, который уменьшает карточки, убираем, оставляем только их нормальный вид»): масштаб больше не выбирается —
 * сетка всегда на шаге 0 (одна горизонтальная карточка на строку, высота 118, радиус 16, как в макете при открытии). У тех, кто раньше сам сдвинул ползунок,
 * на диске осталось fc_gallery_step_v1 = 1/2/3; оно игнорируется (экран шаг с диска не читает) и один раз перезаписывается на 0, чтобы старое значение не вернулось
 * при откате и не путало Сверку. Журнал [CARDS-GRID]: что было на диске → 0. Firebase не задействован.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { noteSwallowedHandler } from '../../app/swallow_log';
import { GALLERY_OPEN_STEP } from './cardsGalleryLayout';

export const GALLERY_STEP_KEY = 'fc_gallery_step_v1';
const TAG = '[CARDS-GRID]';

let resetDone: Promise<void> | null = null;

/**
 * Один раз за процесс: прочитать сохранённый шаг и, если он не 0, перезаписать на 0. Никогда не бросает.
 * Нет записи или уже 0 — на диск ничего не пишем (журнал всё равно называет, что нашли).
 */
export function resetStoredGalleryStep(): Promise<void> {
  if (!resetDone) {
    resetDone = AsyncStorage.getItem(GALLERY_STEP_KEY)
      .then(async (raw) => {
        const target = String(GALLERY_OPEN_STEP);
        if (raw === null || raw === target) {
          console.log(`${TAG} old=${raw === null ? 'нет' : raw} → ${target} (на диске уже нормальный вид, запись не нужна)`);
          return;
        }
        console.log(`${TAG} old=${raw} → ${target}`);
        await AsyncStorage.setItem(GALLERY_STEP_KEY, target);
      })
      .catch((error: unknown) => {
        noteSwallowedHandler('gallery_step_prefs:reset')(error);
        console.warn(`${TAG} не удалось сбросить сохранённый шаг: ${error instanceof Error ? error.message : String(error)}`);
      });
  }
  return resetDone;
}

/** Только для юнит-тестов. */
export function __resetGalleryStepPrefsForTests(): void {
  resetDone = null;
}

// зачем: прогрев при импорте модуля — к первому открытию галереи старое значение уже сброшено
void resetStoredGalleryStep();
