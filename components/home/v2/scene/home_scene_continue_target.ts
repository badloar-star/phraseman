// ═══════════════════════════════════════════════════════════════════════════
// home_scene_continue_target.ts — куда ведёт «Продолжить» на «Сцене» Главной, когда продолжать нечего.
//
// зачем (координатор 24.10, решение Р3 чек-листа: «„Продолжить" никогда не мёртвая — герой „newbie" или переход в доступный раздел,
// с логом ветки»): у языка изучения без раздела «Уроки» и без метки диалога/карточек «Сцена» рисовала героя «continue» без названия,
// а кнопка молча ничего не делала. Теперь «Сцена» становится местом первого доступного раздела: «Диалоги», иначе «Карточки».
// ═══════════════════════════════════════════════════════════════════════════

export type HomeSceneSectionFallback = 'dialogs' | 'cards';

export type HomeSceneContinueTargetInput = Readonly<{
  /** Продолжать нечего: ни урока, ни занятия V2, ни диалога, ни набора карточек. */
  nothingToContinue: boolean;
  /** Прочитан ли последний урок (пока нет — заготовка, решать рано). */
  resolved: boolean;
  /** Раздел «Уроки» есть для языка изучения (тогда «Начать урок 1» — прежний путь). */
  learnVisible: boolean;
  dialogsVisible: boolean;
  cardsVisible: boolean;
}>;

export type HomeSceneContinueTarget = Readonly<{
  section: HomeSceneSectionFallback | null;
  /** Ветка — для журнала [HOME-CONTINUE] scene_target. */
  reason: 'has_continue' | 'pending' | 'start_lesson_1' | 'section_dialogs' | 'section_cards' | 'no_section_for_target';
}>;

export function homeSceneContinueTarget(i: HomeSceneContinueTargetInput): HomeSceneContinueTarget {
  if (!i.nothingToContinue) return { section: null, reason: 'has_continue' };
  if (!i.resolved) return { section: null, reason: 'pending' };
  if (i.learnVisible) return { section: null, reason: 'start_lesson_1' };
  if (i.dialogsVisible) return { section: 'dialogs', reason: 'section_dialogs' };
  if (i.cardsVisible) return { section: 'cards', reason: 'section_cards' };
  return { section: null, reason: 'no_section_for_target' };
}
