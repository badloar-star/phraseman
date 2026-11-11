/**
 * Строка-подтверждение бонуса для окна результата занятия: появляется, когда бонус выдан (в том числе чуть позже открытия экрана).
 * зачем (владелец 30.10): «видимое подтверждение в окне результата, коротко». Лог: [RANK-GATE] first_lesson_bonus note.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../constants/i18n';
import { firstLessonBonusText } from '../app/first_lesson_bonus_copy';

export type FirstLessonBonusNoteHandle = Readonly<{
  note: string | undefined;
  onGranted: (coins: number) => void;
}>;

type VisibleGrant = Readonly<{
  coins: number;
  scopeKey: string;
  scopeRevision: number;
}>;

export function useFirstLessonBonusNote(
  lang: Lang,
  scopeKey: string,
  isScopeCurrent: () => boolean,
): FirstLessonBonusNoteHandle {
  const [visibleGrant, setVisibleGrant] = useState<VisibleGrant | null>(null);
  const mountedRef = useRef(false);
  const scopeRef = useRef({ key: scopeKey, revision: 0 });
  if (scopeRef.current.key !== scopeKey) {
    scopeRef.current = { key: scopeKey, revision: scopeRef.current.revision + 1 };
  }
  const scopeRevision = scopeRef.current.revision;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const onGranted = useCallback((coins: number) => {
    if (
      !mountedRef.current
      || scopeRef.current.key !== scopeKey
      || scopeRef.current.revision !== scopeRevision
      || !isScopeCurrent()
    ) return;
    setVisibleGrant({ coins, scopeKey, scopeRevision });
  }, [isScopeCurrent, scopeKey, scopeRevision]);

  const note = visibleGrant
    && visibleGrant.scopeKey === scopeKey
    && visibleGrant.scopeRevision === scopeRevision
    && isScopeCurrent()
    ? firstLessonBonusText(lang, visibleGrant.coins)
    : undefined;

  return { note, onGranted };
}
