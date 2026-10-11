/**
 * Хук «сколько своих наборов и упёрся ли Free в лимит» — для экрана «Новый набор» и «Мои наборы» (Дизайн).
 *
 * зачем (координатор 11.10, Карточки 2.0): при 3/3 предлагать «Безлимит с Plus» на входе, а не после заполнения
 * набора. Первый кадр — последнее известное число из памяти процесса (без ожидания), дальше — пересчёт с устройства.
 * Firestore не читается. Пересчёт: при монтировании, после `community_pack_added` и по `refresh()` (например, на фокус).
 * quota === null — ещё ни разу не считали: экран не показывает ни счётчик, ни запрет (не пугаем ложным 0/3).
 */
import { useCallback, useEffect, useState } from 'react';
import { onAppEvent } from '../events';
import { authorPackQuotaFor, loadAuthorPackQuota, peekAuthorPackCount, type AuthorPackQuota } from './localAuthorPacks';

export function useAuthorPackQuota(isPremium: boolean): { quota: AuthorPackQuota | null; refresh: () => void } {
  const [quota, setQuota] = useState<AuthorPackQuota | null>(() => {
    const known = peekAuthorPackCount();
    return known === null ? null : authorPackQuotaFor(known, isPremium);
  });

  const refresh = useCallback(() => {
    let alive = true;
    void loadAuthorPackQuota(isPremium)
      .then((next) => {
        if (!alive) return;
        // Тот же результат — без лишнего рендера.
        setQuota((prev) => (prev && prev.count === next.count && prev.limitReached === next.limitReached && prev.limit === next.limit ? prev : next));
      })
      .catch((error: unknown) => {
        console.warn('[AUTHOR-PACK-QUOTA] пересчёт не удался — оставляю прежнее значение', String(error)); // guard-ok: catch логируется
      });
    return () => { alive = false; };
  }, [isPremium]);

  useEffect(() => refresh(), [refresh]);
  useEffect(() => {
    const sub = onAppEvent('community_pack_added', () => { refresh(); });
    return () => sub.remove();
  }, [refresh]);

  return { quota, refresh };
}
