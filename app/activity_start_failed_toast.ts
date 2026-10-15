/**
 * Тост «Не получилось начать» для отказа старта занятия на энергии (результат 'cancelled').
 *
 * зачем (координатор 15.10, аудит Optimistic UI п.3; текст одобрен координатором): экзамен, экзамен уровня и диагностика
 * при отказе списания (сбой записи, смена аккаунта) молча возвращались на вступление — тап выглядел мёртвым. Брифинг
 * диалогов уже говорил «Не получилось начать диалог»; здесь та же фраза без слова «диалог». Показываем, только если экран
 * ещё открыт: ушедшему человеку чужой тост поверх другого экрана не нужен. Журнал [ENERGY-START-FAIL].
 */
import { useEffect, useRef, type MutableRefObject } from 'react';

import { actionToastTri, emitAppEvent } from './events';

export function activityStartFailedToast() {
  return actionToastTri('error', {
    ru: 'Не получилось начать. Попробуй ещё раз',
    uk: 'Не вдалося почати. Спробуй ще раз',
    en: 'Could not start. Please try again',
    es: 'No se pudo iniciar. Inténtalo de nuevo',
    'pt-BR': 'Não foi possível iniciar. Tente de novo',
    vi: 'Không thể bắt đầu. Hãy thử lại',
    id: 'Gagal memulai. Coba lagi',
    tr: 'Başlatılamadı. Tekrar dene',
    pl: 'Nie udało się rozpocząć. Spróbuj ponownie',
  });
}

/** true, пока экран смонтирован. */
export function useScreenOpenRef(): MutableRefObject<boolean> {
  const openRef = useRef(true);
  useEffect(() => {
    openRef.current = true;
    return () => { openRef.current = false; };
  }, []);
  return openRef;
}

export function notifyActivityStartFailed(screen: string, openRef: Readonly<{ current: boolean }>): void {
  if (!openRef.current) {
    console.log(`[ENERGY-START-FAIL] screen=${screen} toast=skip reason=screen_closed`);
    return;
  }
  console.warn(`[ENERGY-START-FAIL] screen=${screen} toast=shown — списание не подтвердилось, занятие не начато`);
  emitAppEvent('action_toast', activityStartFailedToast());
}

/* expo-router: keep this utility from being treated as a screen */
export default function __ActivityStartFailedToastRouteShim() {
  return null;
}
