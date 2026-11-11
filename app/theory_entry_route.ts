import { theoryEntryFor, type Lang } from '../constants/i18n';
import { markNextNavigationAsReplace } from './navigation_back';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type TheoryEntryRoute = 'hint' | 'lesson_help' | 'hidden';

export function theoryEntryRouteForTarget(input: {
  readonly uiLang: Lang;
  readonly studyTarget: RuntimeStudyTarget | undefined;
  readonly interactive: boolean;
  readonly origin: 'lesson_menu' | 'lesson1';
}): TheoryEntryRoute {
  if (storageStudyTarget(input.studyTarget) !== 'en') return 'lesson_help';
  return theoryEntryFor(input.uiLang, input.interactive, input.origin);
}

export function lessonHelpRedirectReasonForHint(input: {
  readonly theoryEntry: TheoryEntryRoute;
  readonly studyTarget: RuntimeStudyTarget | undefined;
}): 'ui_locale' | 'foreign_target' | null {
  if (storageStudyTarget(input.studyTarget) !== 'en') return 'foreign_target';
  return input.theoryEntry === 'hint' ? null : 'ui_locale';
}

export function redirectHintToLessonHelp(
  router: Readonly<{ replace: (target: any) => void }>,
  lessonId: number,
): void {
  markNextNavigationAsReplace();
  router.replace({ pathname: '/lesson_help', params: { id: String(lessonId) } });
}
