import type { IntroLine, IntroTextPart, LessonIntroScreen } from './lesson_data_types';
import { assertFrenchLessonIntroApproved } from './french_content_source_gate';

export const FRENCH_DRAFT_INTRO_LESSON_IDS = Object.freeze([] as number[]);
export const FRENCH_INTRO_LESSON_IDS = Object.freeze([] as number[]);
export const FRENCH_INTRO_SCREENS: Record<number, LessonIntroScreen[]> = {};

const RICH_FRENCH_INTRO_KINDS = new Set(['concept', 'formula', 'practice']);
const RICH_FRENCH_INTRO_LINE_TYPES = new Set(['text', 'formula', 'example', 'wrong', 'correct', 'step', 'tip', 'spacer']);
const FRENCH_INTRO_DEV_NOTE_FIELDS = ['screenGoal', 'visualPriority', 'highlightRules', 'forbiddenContent', 'layoutRules'] as const;

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasTextPart(parts: IntroTextPart[] | undefined): boolean {
  return Array.isArray(parts) && parts.some((part) => hasText(part.text));
}

function hasRenderableLine(lines: IntroLine[] | undefined): boolean {
  return Array.isArray(lines) && lines.some((line) => (
    line.type !== 'spacer' && (hasText(line.text) || hasTextPart(line.parts))
  ));
}

function collectLineIssues(lines: IntroLine[] | undefined, fieldName: 'linesRU' | 'linesUK'): string[] {
  const issues: string[] = [];
  if (!hasRenderableLine(lines)) {
    issues.push(`${fieldName} must contain at least one non-spacer rich line`);
    return issues;
  }

  lines?.forEach((line, index) => {
    if (!RICH_FRENCH_INTRO_LINE_TYPES.has(line.type)) {
      issues.push(`${fieldName}[${index}].type must use the connected rich intro line model`);
    }
    if (line.type !== 'spacer' && !hasText(line.text) && !hasTextPart(line.parts)) {
      issues.push(`${fieldName}[${index}] must contain text or rich parts`);
    }
  });
  return issues;
}

export function validateFrenchIntroScreenShape(
  screen: LessonIntroScreen,
  lessonId: number,
  index = 0,
): string[] {
  const prefix = `screen[${index}]`;
  const issues: string[] = [];

  if (screen.lessonId !== lessonId) {
    issues.push(`${prefix}.lessonId must match lesson ${lessonId}`);
  }
  if (!hasText(screen.screenId) || !screen.screenId.startsWith(`fr_lesson_${lessonId}_intro_`)) {
    issues.push(`${prefix}.screenId must start with fr_lesson_${lessonId}_intro_`);
  }
  if (!Number.isInteger(screen.order) || (screen.order ?? 0) <= 0) {
    issues.push(`${prefix}.order must be a positive integer`);
  }
  if (!screen.kind || !RICH_FRENCH_INTRO_KINDS.has(screen.kind)) {
    issues.push(`${prefix}.kind must be concept, formula, or practice`);
  }
  if (!hasText(screen.titleRU)) {
    issues.push(`${prefix}.titleRU is required for the Russian source UI`);
  }
  if (!hasText(screen.titleUK)) {
    issues.push(`${prefix}.titleUK is required for the Ukrainian source UI`);
  }
  if (hasText(screen.titleES) || hasText(screen.subtitleES) || hasText(screen.textES) || hasRenderableLine(screen.linesES)) {
    issues.push(`${prefix} must not add ES/French UI fields; French target is only available from RU/UK UI`);
  }

  issues.push(...collectLineIssues(screen.linesRU, 'linesRU').map((issue) => `${prefix}.${issue}`));
  issues.push(...collectLineIssues(screen.linesUK, 'linesUK').map((issue) => `${prefix}.${issue}`));

  screen.examples?.forEach((example, exampleIndex) => {
    if (!hasTextPart(example.en)) {
      issues.push(`${prefix}.examples[${exampleIndex}].en must use rich target-language parts`);
    }
    if (!hasText(example.ru) && !hasText(example.trRU)) {
      issues.push(`${prefix}.examples[${exampleIndex}] needs a Russian meaning/review field`);
    }
    if (!hasText(example.uk) && !hasText(example.trUK)) {
      issues.push(`${prefix}.examples[${exampleIndex}] needs a Ukrainian meaning/review field`);
    }
  });

  const developerNotes = screen.developerNotes;
  if (!developerNotes) {
    issues.push(`${prefix}.developerNotes are required for source-reviewed French intros`);
  } else {
    for (const field of FRENCH_INTRO_DEV_NOTE_FIELDS) {
      const value = developerNotes[field];
      if (typeof value === 'string') {
        if (!hasText(value)) issues.push(`${prefix}.developerNotes.${field} must be non-empty`);
      } else if (!Array.isArray(value) || value.length === 0 || !value.every(hasText)) {
        issues.push(`${prefix}.developerNotes.${field} must be a non-empty reviewed list`);
      }
    }
  }

  return issues;
}

export function assertFrenchIntroScreensRichShape(lessonId: number, screens: LessonIntroScreen[]): void {
  const issues = screens.flatMap((screen, index) => validateFrenchIntroScreenShape(screen, lessonId, index));
  if (issues.length > 0) {
    throw new Error(`French lesson ${lessonId} intro screens are not approved rich screens: ${issues.join('; ')}`);
  }
}

export function getFrenchLessonIntroScreens(lessonId: number): LessonIntroScreen[] | undefined {
  const screens = FRENCH_INTRO_SCREENS[lessonId];
  if (!screens?.length) return undefined;
  assertFrenchLessonIntroApproved(lessonId);
  assertFrenchIntroScreensRichShape(lessonId, screens);
  return screens;
}

export default function __LessonIntroScreensFrRouteShim() {
  return null;
}
