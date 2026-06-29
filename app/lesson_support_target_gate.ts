import type { Lang } from '../constants/i18n';
import {
  FRENCH_CONTENT_SOURCE_GATE,
  isFrenchLessonIntroApproved,
} from './french_content_source_gate';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type LessonSupportGateSurface = 'lesson_theory' | 'lesson_hint';

export type LessonSupportContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  surface: LessonSupportGateSurface;
  lessonId?: number;
  reason?: 'french_lesson_theory_source_gate' | 'french_lesson_hint_source_gate';
  blockedRoutes: string[];
  requiredEvidence: string[];
};

const FRENCH_LESSON_THEORY_EVIDENCE = Object.freeze([
  'french_lesson_theory_bank',
  'french_rich_intro_theory_review',
  'ru_uk_theory_prompt_review',
]);

const FRENCH_LESSON_HINT_EVIDENCE = Object.freeze([
  'french_lesson_hint_bank',
  'french_hint_contrast_review',
  'ru_uk_hint_prompt_review',
]);

function evidenceForSurface(surface: LessonSupportGateSurface): string[] {
  return surface === 'lesson_hint'
    ? [...FRENCH_LESSON_HINT_EVIDENCE]
    : [...FRENCH_LESSON_THEORY_EVIDENCE];
}

export function lessonSupportContentAvailableForTarget(
  studyTarget: RuntimeStudyTarget | undefined,
  surface: LessonSupportGateSurface,
  lessonId?: number,
): boolean {
  if (storageStudyTarget(studyTarget) !== 'fr') return true;
  if (surface === 'lesson_theory' && lessonId != null) {
    return isFrenchLessonIntroApproved(lessonId);
  }
  return false;
}

export function lessonSupportContentGateForTarget(
  studyTarget: RuntimeStudyTarget | undefined,
  surface: LessonSupportGateSurface,
  lessonId?: number,
): LessonSupportContentGate {
  const enabled = lessonSupportContentAvailableForTarget(studyTarget, surface, lessonId);
  if (storageStudyTarget(studyTarget) !== 'fr') {
    return {
      enabled,
      studyTarget: 'en',
      surface,
      lessonId,
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  return {
    enabled,
    studyTarget: 'fr',
    surface,
    lessonId,
    reason: surface === 'lesson_hint'
      ? 'french_lesson_hint_source_gate'
      : 'french_lesson_theory_source_gate',
    blockedRoutes: surface === 'lesson_hint' ? ['/hint'] : ['/lesson_help'],
    requiredEvidence: evidenceForSurface(surface),
  };
}

export function frenchLessonSupportGateCopy(
  surface: LessonSupportGateSurface,
  lang: Lang,
  lessonId?: number,
): { title: string; body: string; action: string } {
  const uk = lang === 'uk';
  const lessonPart = lessonId ? (uk ? ` уроку ${lessonId}` : ` урока ${lessonId}`) : '';

  if (surface === 'lesson_hint') {
    return uk
      ? {
          title: 'Французька шпаргалка ще на перевірці',
          body: `Англійську шпаргалку${lessonPart} приховано в режимі French. Вона відкриється тільки після окремого source gate для французьких підказок, граматичних контрастів і пояснень українською/російською.`,
          action: 'До уроку',
        }
      : {
          title: 'Французская шпаргалка ещё на проверке',
          body: `Английская шпаргалка${lessonPart} скрыта в режиме French. Она откроется только после отдельного source gate для французских подсказок, грамматических контрастов и объяснений на русском/украинском.`,
          action: 'К уроку',
        };
  }

  return uk
    ? {
        title: 'Французька теорія ще на source gate',
        body: `Англійську теорію${lessonPart} приховано в режимі French. Теорія відкриється тільки після перевіреного French theory packet з rich intro, прикладами, CEFR-ціллю і поясненнями українською/російською.`,
        action: 'До уроку',
      }
    : {
        title: 'Французская теория ещё на source gate',
        body: `Английская теория${lessonPart} скрыта в режиме French. Теория откроется только после проверенного French theory packet с rich intro, примерами, CEFR-целью и объяснениями на русском/украинском.`,
        action: 'К уроку',
      };
}

export const FRENCH_LESSON_SUPPORT_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_LESSON_THEORY_EVIDENCE,
  ...FRENCH_LESSON_HINT_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __LessonSupportTargetGateRouteShim() {
  return null;
}
