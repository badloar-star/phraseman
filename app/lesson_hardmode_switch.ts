// lesson_hardmode_switch.ts — переход «ввод с клавиатуры → выбор слов» прямо из урока, с тостом «Вернуть».
// зачем (жалоба №4, решение координатора 25.10): тап по строке под полем выключает настройку «Ввод с клавиатуры» сразу и на месте, без
// похода в настройки и без ожидания сети; набранный текст сбрасывается; внизу тост с «Вернуть» снова включает ввод. Защита от двойного тапа.
// Запись — тем же applyUserSettingsNow, что экран «Настройки обучения» (память + снимок синхронно, хранилище фоном); перед записью настройки
// читаются целиком (loadSettings), чтобы не затереть остальные поля значениями по умолчанию. Не записалось — откат и сообщение.
import { useCallback, useRef } from 'react';

import { actionToastTri, emitAppEvent } from './events';
import { applyUserSettingsNow, loadSettings } from './user_settings_store';
import { lessonHardModeSwitchAll } from '../components/lessons/lesson_hardmode_switch_copy';

const LOG = '[LESSON-INPUT]';

type HardModeHost = Readonly<{
  lessonId: number | string;
  /** Локальное состояние урока — меняется в этот же кадр. */
  setHardMode: (hardMode: boolean) => void;
  clearTyped: () => void;
}>;

const SAVE_FAILED = {
  ru: 'Не удалось сохранить настройку. Попробуй ещё раз.', uk: 'Не вдалося зберегти налаштування. Спробуй ще раз.', en: "Couldn't save the setting. Try again.",
  es: 'No se pudo guardar el ajuste. Inténtalo de nuevo.', 'pt-BR': 'Não foi possível salvar a configuração. Tente de novo.', vi: 'Không lưu được cài đặt. Hãy thử lại.',
  id: 'Pengaturan tidak bisa disimpan. Coba lagi.', tr: 'Ayar kaydedilemedi. Tekrar dene.', pl: 'Nie udało się zapisać ustawienia. Spróbuj ponownie.',
} as const;

async function persistHardMode(hardMode: boolean): Promise<boolean> {
  try {
    const current = await loadSettings();
    return await applyUserSettingsNow({ ...current, hardMode });
  } catch (error) {
    console.warn(`${LOG} switch:persist_threw`, JSON.stringify({ hardMode, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    return false;
  }
}

/** Колбэк строки-перехода; повторный тап, пока идёт запись, игнорируется. */
export function useLessonHardModeSwitch({ lessonId, setHardMode, clearTyped }: HardModeHost): () => void {
  const busyRef = useRef(false);

  const setAndPersist = useCallback((hardMode: boolean, reason: string) => {
    if (busyRef.current) {
      console.log(`${LOG} switch:ignored_busy`, JSON.stringify({ lessonId, hardMode, reason })); // guard-ok: ранний выход с причиной
      return;
    }
    busyRef.current = true;
    setHardMode(hardMode);
    if (!hardMode) clearTyped();
    console.log(`${LOG} switch:local`, JSON.stringify({ lessonId, hardMode, reason })); // guard-ok: что сделали на экране сразу
    void persistHardMode(hardMode).then((ok) => {
      busyRef.current = false;
      console.log(`${LOG} switch:persisted`, JSON.stringify({ lessonId, hardMode, ok })); // guard-ok: итог записи
      if (ok) return;
      setHardMode(!hardMode);
      emitAppEvent('action_toast', actionToastTri('error', SAVE_FAILED));
    });
  }, [clearTyped, lessonId, setHardMode]);

  return useCallback(() => {
    if (busyRef.current) {
      console.log(`${LOG} switch:ignored_busy`, JSON.stringify({ lessonId, reason: 'line_tap' })); // guard-ok: ранний выход с причиной
      return;
    }
    setAndPersist(false, 'line_tap');
    const toast = lessonHardModeSwitchAll('toast');
    const undo = lessonHardModeSwitchAll('undo');
    emitAppEvent('action_toast', {
      ...actionToastTri('info', toast),
      action: {
        labelRu: undo.ru, labelUk: undo.uk, labelEn: undo.en, labelEs: undo.es, labelPtBr: undo['pt-BR'],
        labelVi: undo.vi, labelId: undo.id, labelTr: undo.tr, labelPl: undo.pl,
        onPress: () => setAndPersist(true, 'toast_undo'),
      },
    });
  }, [lessonId, setAndPersist]);
}

export default function __RouteShim() { return null; }
