// lesson_menu_bounce_route.ts — куда уводить с меню закрытого урока: назад по стеку или replace на вкладку «Уроки».
//
// зачем (координатор 29.10, журнал Сверки 28.10): replace('/(tabs)/lessons') со стекового экрана пересоздаёт группу вкладок — человек
// видел Главную, а вкладка «Уроки» стартовала на карте V2 вместо списка, с которого он пришёл. Если список лежит прямо под меню,
// закрываем меню шагом назад. Назад НЕ идём, когда под меню что-то другое: 15.10 под меню оказывался lesson1, его охранник снова делал
// replace на меню — бесконечная петля. Тогда, как и раньше, один replace на вкладку.

export type LessonMenuBounceMethod = 'back' | 'replace';
export type LessonMenuBounceDecision = Readonly<{ method: LessonMenuBounceMethod; reason: string; underlay: string | null }>;

type StackStateLike = Readonly<{ index?: number; routes?: readonly Readonly<{ name?: string }>[] }> | null | undefined;

/** Экраны-списки, на которые безопасно вернуться шагом назад (их охранники меню снова не открывают). */
const LIST_UNDERLAYS: ReadonlySet<string> = new Set(['(tabs)', 'lessons_list']);

export function lessonMenuBounceDecisionV1(state: StackStateLike, canGoBack: boolean): LessonMenuBounceDecision {
  const routes = state?.routes ?? [];
  const index = typeof state?.index === 'number' ? state.index : routes.length - 1;
  const underlay = index >= 1 ? routes[index - 1]?.name ?? null : null;
  if (!canGoBack) return { method: 'replace', reason: 'no_stack', underlay };
  if (underlay === null) return { method: 'replace', reason: 'underlay_unknown', underlay };
  if (!LIST_UNDERLAYS.has(underlay)) return { method: 'replace', reason: 'underlay_not_list', underlay };
  return { method: 'back', reason: 'list_under_menu', underlay };
}

export default function __RouteShim() { return null; }
