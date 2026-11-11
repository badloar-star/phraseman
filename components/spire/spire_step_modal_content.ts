// spire_step_modal_content.ts — что сейчас показывает полноэкранная модалка ступени Пика.
//
// зачем (владелец 11.11.2026: «когда мы завершаем пик выходим то мелькает главная пика а затем экран что мы не прошли»):
// итог ступени раньше был ОТДЕЛЬНОЙ модалкой. Ступень закрывалась (слайд вниз открывал башню), а окно итога ждало
// слот арбитра, ленивый модуль и проявлялось 420 мс — между ними мелькала главная Пика. Вторую модалку поверх
// первой не поставить (iOS показывает модалку от корневого контроллера). Поэтому окно итога живёт в ТОЙ ЖЕ модалке:
// ступень → итог без закрытия; модалка закрывается только когда нет ни ступени, ни подготовки, ни итога.
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

export type SpireStepModalContent = 'step' | 'pending' | 'after' | null;

/** Ступень важнее подготовки, подготовка важнее итога («Ещё раз» гасит итог и сразу показывает «Готовим ступень…»). */
export function spireStepModalContent(hasSession: boolean, hasPending: boolean, hasAfter: boolean): SpireStepModalContent {
  if (hasSession) return 'step';
  if (hasPending) return 'pending';
  if (hasAfter) return 'after';
  return null;
}

/** Содержимое модалки ступени и «назад» Android: на итоге — к башне (onAfterBack), иначе — шторка выхода ступени. */
export function useSpireStepModalContent(
  hasSession: boolean,
  hasPending: boolean,
  hasAfter: boolean,
  exitRef: MutableRefObject<(() => void) | null>,
  onAfterBack: (() => void) | undefined,
): Readonly<{ content: SpireStepModalContent; onRequestClose: () => void }> {
  const content = spireStepModalContent(hasSession, hasPending, hasAfter);
  const prevRef = useRef<SpireStepModalContent>(content);
  useEffect(() => {
    if (prevRef.current === content) return;
    console.log(`[SPIRE][PEAK-EXIT] модалка ступени: ${prevRef.current ?? 'закрыта'} → ${content ?? 'закрыта'}`); // guard-ok: одна строка на смену содержимого модалки
    prevRef.current = content;
  }, [content]);
  const onRequestClose = useCallback(() => {
    if (content === 'after') {
      console.log('[SPIRE][PEAK-EXIT] «назад» на окне итога → к башне'); // guard-ok: ветка «назад» на итоге
      onAfterBack?.();
      return;
    }
    exitRef.current?.();
  }, [content, exitRef, onAfterBack]);
  return { content, onRequestClose };
}
