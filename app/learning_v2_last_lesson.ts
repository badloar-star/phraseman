// learning_v2_last_lesson.ts — «последний открытый урок» на карте Learning V2: карта открывается на нём, а не всегда на уроке 1.
//
// зачем (поручение владельца через координатора 18.10): «в обучении всегда открывается урок 1, даже если последним открывал урок 2 или другой».
// Карта выбирала урок только по первому незавершённому занятию (currentSessionId) и ничего не помнила о выборе человека. Теперь урок, который человек
// открыл на карте (тап в «Все уроки», раскрытие главы, запуск занятия), запоминается ЛОКАЛЬНО сразу: в памяти — мгновенно, на диск — в фоне, без сети
// (синк — как у остальных меток «последнего места», отдельно не нужен). Нет запомненного урока — как раньше, урок первого незавершённого занятия.
//
// Ключ — метка Главной вида `map` (homeContinueMarkKey('map', язык)): стирается вместе с остальными метками при смене/удалении аккаунта и для «чистого гостя»
// считается служебной (guest_clean_classifier), поэтому гость, у которого запомнен только урок, остаётся «чистым» (f004c322d: last_opened_lesson=1 — умолчание гостя).
// Журнал [V2-LAST-LESSON]: что записано (ключ, значение, источник), что прочитано (память / хранилище / нет), какая ветка выбрала урок.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { onAccountOwnerChanged } from './account_owner_change';
import { homeContinueMarkKey, type RuntimeStudyTarget } from './target_storage_keys';

const LOG = '[V2-LAST-LESSON]';
const MAX_LESSON_ORDINAL = 99;

const tk = (target: RuntimeStudyTarget): string => String(target ?? 'en');
const memory = new Map<string, number | null>();
const listeners = new Set<() => void>();
const emit = (): void => { listeners.forEach((listener) => listener()); };

export function learningV2LastLessonKey(target: RuntimeStudyTarget): string {
  return homeContinueMarkKey('map', target);
}

onAccountOwnerChanged('learning_v2_last_lesson', () => {
  // ключи на диске снимает общее стирание меток (homeContinueMarkKeys); здесь — только память
  console.log(`${LOG} reset: владелец аккаунта сменился, память очищена`);
  memory.clear();
  emit();
});

/** Строка из хранилища → номер урока или null (битое значение — в журнал, не в крэш). */
export function parseLearningV2LastLesson(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (!/^\d{1,2}$/.test(raw.trim())) {
    console.warn(`${LOG} parse: значение не номер урока — игнорируем (len=${raw.length})`);
    return null;
  }
  const value = Number(raw.trim());
  return value >= 1 && value <= MAX_LESSON_ORDINAL ? value : null;
}

/** Синхронно из памяти (первый кадр); undefined — ещё не читали с диска, null — читали, пусто. */
export function peekLearningV2LastLesson(target: RuntimeStudyTarget): number | null | undefined {
  return memory.get(tk(target));
}

/** Прогрев памяти уже прочитанной строкой (Главная читает метки одним multiGet — второго чтения не нужно). */
export function hydrateLearningV2LastLesson(target: RuntimeStudyTarget, raw: string | null | undefined): void {
  if (memory.has(tk(target))) return;
  const value = parseLearningV2LastLesson(raw);
  memory.set(tk(target), value);
  console.log(`${LOG} read: source=marks_batch target=${target} raw=${raw ?? 'null'} value=${value ?? 'null'}`);
  emit();
}

/** Читает с диска один раз; повторные вызовы берут память. Ошибка — в журнал, значение «нет». */
export async function loadLearningV2LastLesson(target: RuntimeStudyTarget): Promise<number | null> {
  const known = memory.get(tk(target));
  if (known !== undefined) {
    console.log(`${LOG} read: source=memory target=${target} value=${known ?? 'null'}`);
    return known;
  }
  try {
    const raw = await AsyncStorage.getItem(learningV2LastLessonKey(target));
    if (!memory.has(tk(target))) {
      const value = parseLearningV2LastLesson(raw);
      memory.set(tk(target), value);
      console.log(`${LOG} read: source=storage target=${target} raw=${raw ?? 'null'} value=${value ?? 'null'}`);
      emit();
    }
    return memory.get(tk(target)) ?? null;
  } catch (error) {
    console.warn(`${LOG} read: source=storage_failed target=${target} reason=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
}

/**
 * Запомнить открытый урок. Память — сразу (карта и следующий вход видят значение мгновенно), диск — в фоне; тот же урок повторно ничего не пишет.
 * source — откуда пришло открытие (open_lesson / toggle_chapter / launch_session) для журнала.
 */
export function rememberLearningV2LastLesson(target: RuntimeStudyTarget, lessonOrdinal: number, source: string): void {
  if (!Number.isInteger(lessonOrdinal) || lessonOrdinal < 1 || lessonOrdinal > MAX_LESSON_ORDINAL) {
    console.warn(`${LOG} write: пропуск source=${source} reason=bad_ordinal value=${String(lessonOrdinal)}`);
    return;
  }
  if (memory.get(tk(target)) === lessonOrdinal) {
    console.log(`${LOG} write: пропуск source=${source} reason=same_value value=${lessonOrdinal}`);
    return;
  }
  memory.set(tk(target), lessonOrdinal);
  emit();
  const key = learningV2LastLessonKey(target);
  console.log(`${LOG} write: key=${key} value=${lessonOrdinal} source=${source} at=${Date.now()}`);
  AsyncStorage.setItem(key, String(lessonOrdinal)).catch((error: unknown) => {
    console.warn(`${LOG} write: на диск не записалось, до перезапуска работает из памяти (${error instanceof Error ? error.name : typeof error})`);
  });
}

export type InitialLessonChoice = Readonly<{ ordinal: number; branch: 'remembered' | 'canonical' | 'canonical_remembered_hidden' }>;

/**
 * Какой урок открыть на карте: запомненный, если он есть и виден; иначе — урок первого незавершённого занятия.
 * visibleOrdinals = null — видимость ещё неизвестна (первый кадр), запомненный берём как есть.
 */
export function pickInitialLessonOrdinal(args: Readonly<{
  remembered: number | null | undefined;
  canonical: number;
  visibleOrdinals: readonly number[] | null;
}>): InitialLessonChoice {
  const { remembered, canonical, visibleOrdinals } = args;
  if (remembered === null || remembered === undefined) return { ordinal: canonical, branch: 'canonical' };
  if (visibleOrdinals && !visibleOrdinals.includes(remembered)) return { ordinal: canonical, branch: 'canonical_remembered_hidden' };
  return { ordinal: remembered, branch: 'remembered' };
}

/** Для экранов: значение из памяти + дочитывание с диска; undefined — ещё не знаем (первый кадр без прыжка: рисуем по canonical). */
export function useLearningV2LastLesson(target: RuntimeStudyTarget): number | null | undefined {
  const [value, setValue] = useState<number | null | undefined>(() => peekLearningV2LastLesson(target));
  useEffect(() => {
    let alive = true;
    const sync = () => { if (alive) setValue(peekLearningV2LastLesson(target)); };
    listeners.add(sync);
    sync();
    if (peekLearningV2LastLesson(target) === undefined) void loadLearningV2LastLesson(target);
    return () => { alive = false; listeners.delete(sync); };
  }, [target]);
  return value;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __LearningV2LastLessonRouteShim() {
  return null;
}
