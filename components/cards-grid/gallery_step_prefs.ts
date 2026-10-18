/**
 * Запоминание масштаба сетки карточек (шаг 1 / 2 / 3 / 5 колонок).
 *
 * зачем (Карточки 2.0, макет cards-v2 «ползунок масштаба», решение владельца 12.10: «запоминание масштаба»): человек выбрал мелкие плитки —
 * при следующем входе, в «Сохранённых» и в наборе, они сразу такие же. Первый кадр — из памяти процесса (синхронно, без «сперва по умолчанию,
 * потом поправили»); с диска значение подтягивается один раз при загрузке модуля, раньше, чем экран успевает отрисоваться. Один ключ на все
 * экраны с сеткой: масштаб — привычка руки, а не свойство набора. Firebase не задействован.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { noteSwallowedHandler } from '../../app/swallow_log';
import { GALLERY_LAST_STEP, GALLERY_OPEN_STEP } from './cardsGalleryLayout';

export const GALLERY_STEP_KEY = 'fc_gallery_step_v1';
const TAG = '[CARDS-ZOOM]';

let memory: number | null = null;
let loading: Promise<number | null> | null = null;

/** Чистая функция разбора сохранённого значения: мусор → null (экран возьмёт значение по умолчанию). */
export function parseGalleryStep(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > GALLERY_LAST_STEP) return null;
  return value;
}

/** Синхронно: шаг из памяти процесса или null, если диск ещё не прочитан / значения нет. */
export function peekGalleryStep(): number | null {
  return memory;
}

/** Шаг для первого кадра: из памяти (выбор человека), иначе горизонтальный вид по макету. */
export function initialGalleryStep(): number {
  return memory ?? GALLERY_OPEN_STEP;
}

export function loadGalleryStep(): Promise<number | null> {
  if (memory !== null) return Promise.resolve(memory);
  if (!loading) {
    loading = AsyncStorage.getItem(GALLERY_STEP_KEY)
      .then((raw) => {
        const parsed = parseGalleryStep(raw);
        if (parsed !== null) memory = parsed;
        console.log(`${TAG} прочитан сохранённый шаг raw=${String(raw)} → ${String(parsed)}`);
        return parsed;
      })
      .catch((error: unknown) => {
        console.warn(`${TAG} не удалось прочитать сохранённый шаг: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
  }
  return loading;
}

export function saveGalleryStep(step: number): void {
  if (!Number.isInteger(step) || step < 0 || step > GALLERY_LAST_STEP) {
    console.warn(`${TAG} шаг вне диапазона, не сохраняем: ${String(step)}`);
    return;
  }
  memory = step;
  AsyncStorage.setItem(GALLERY_STEP_KEY, String(step)).catch(noteSwallowedHandler('gallery_step_prefs:save'));
}

/** Только для юнит-тестов. */
export function __resetGalleryStepPrefsForTests(): void {
  memory = null;
  loading = null;
}

// зачем: прогрев при импорте модуля — к первому кадру экрана значение обычно уже в памяти
void loadGalleryStep();
