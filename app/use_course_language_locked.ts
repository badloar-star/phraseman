// зачем (владелец 04.11 через координатора): дополнительный язык нового пользователя — Plus; человек не должен видеть такие уроки «открытыми» и ловить пейвол
// только на тапе. Хук отдаёт вердикт замка языка для списка уроков: сразу из памяти процесса (первый кадр без ожидания), затем один раз уточняет по локальной
// записи (AsyncStorage, без сети). Сбой/нет записи/старый пользователь/язык с прогрессом = НЕ заперт (см. course_language_access).
import { useEffect, useState } from 'react';
import { isCourseLanguageLockedSync, resolveCourseLanguageLock } from './course_language_access';

const LOG = '[COURSE-LANG-LOCK]';

export function useCourseLanguageLocked(studyTarget: string | null | undefined): boolean {
  const [locked, setLocked] = useState<boolean>(() => isCourseLanguageLockedSync(studyTarget));
  useEffect(() => {
    let alive = true;
    setLocked(isCourseLanguageLockedSync(studyTarget));
    resolveCourseLanguageLock(studyTarget)
      .then((verdict) => {
        if (alive) setLocked(verdict.locked);
      })
      .catch((error: unknown) => {
        console.warn(`${LOG} hook:resolve_failed`, error instanceof Error ? error.message : String(error));
        if (alive) setLocked(false);
      });
    return () => {
      alive = false;
    };
  }, [studyTarget]);
  return locked;
}
