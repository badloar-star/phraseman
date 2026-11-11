/**
 * Разметка занятия для блока «Навыки растут».
 *
 * зачем (владелец 11.11: «составь пары — при чём тут навыки растут?»): блок показывает прирост только того режима,
 * который сам объявил занятие. Режим зовёт этот хук один раз: при открытии экрана занятие начинается, при уходе
 * с экрана — закрывается, даже если человек вышел, не дойдя до итога. Режим без хука блок не показывает никогда.
 */
import { useEffect } from 'react';

import { beginSkillSession, endSkillSession } from './skill_store';

export function useSkillSession(): void {
  useEffect(() => {
    const token = beginSkillSession();
    return () => endSkillSession(token);
  }, []);
}
