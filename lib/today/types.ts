import type { Lang } from '../../constants/i18n';

export type TodayDestinationId = 'lessons' | 'plan' | 'practice' | 'flashcards' | 'daily_tasks';

export type TodayLocalizedCopy = Readonly<Record<Lang, string>>;

export type TodayRecommendation = Readonly<{
  ruleId: string;
  variantId: string;
  destinationId: TodayDestinationId;
  label: string;
  accessibilityLabel: string;
}>;

export type TodayRecommendationIdentity = Pick<TodayRecommendation, 'ruleId' | 'variantId' | 'destinationId'>;

export type TodayScopeLike = Readonly<{ scopeKey: string }>;

export type TodayScope = Readonly<{
  accountScopeId: string;
  accountGeneration: number;
  studyTargetId: string;
  uiLocale: Lang;
  localDateKey: string;
  timeZone: string;
  scopeKey: string;
}>;
