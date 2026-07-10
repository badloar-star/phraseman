import type { QuizPhrase } from './quiz_data';
import {
  ACTIVE_INTERFACE_SOURCE_LOCALES,
  normalizeSourceLocale,
  type SourceLocale,
} from './source_locales';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

type PhraseLevel = QuizPhrase['level'];
type SkylerTarget = 'en' | 'fr' | 'smartest';
type SkylerLocalizedText = Partial<Record<SourceLocale, string>>;
type SkylerLocalizedExplanations = Partial<Record<SourceLocale, string[]>>;
type SkylerSourceTier = 'A' | 'B' | 'C' | (string & {});

type SkylerResearchPolicy = {
  directTranslationUsed?: boolean;
  notes?: string;
};

type SkylerStyleProfile = {
  basedOnExistingPools?: boolean;
  sampledFiles?: string[];
  promptPattern?: string;
  explanationPattern?: string;
  readerRewardPattern?: string;
  distractorPattern?: string;
  itemCount?: number;
  generationRulesVersion?: string;
  notes?: string;
};

type SkylerSocialListening = {
  status?: string;
  signals?: {
    source?: string;
    text?: string;
    url?: string;
  }[];
};

type SkylerOfficialSource = {
  id: string;
  title: string;
  url: string;
  tier?: SkylerSourceTier;
  publisherType?: string;
  usedFor?: string;
  limitations?: string;
  checkedAt?: string;
};

type SkylerSourceClaim = {
  id: string;
  type?: string;
  itemId?: string;
  text?: string;
  answerIndex?: number;
  sourceIds?: string[];
  verificationStatus?: string;
  sourceComparison?: string;
};

type SkylerLocaleReview = {
  locale: SourceLocale;
  method?: string;
  reviewer?: string;
  directTranslationUsed?: boolean;
  adaptationBasis?: string;
  sourceIds?: string[];
  notes?: string;
};

type SkylerVisualAssets = {
  status?: 'generated' | 'queued' | string;
  styleBasis?: string;
  assets?: {
    family?: string;
    plaquePrompt?: string;
    iconPrompt?: string;
    plaquePath?: string;
    iconPath?: string;
  }[];
};

type SkylerReleasePolicy = {
  environment?: 'dev-only' | 'production' | string;
  productionActivation?: 'blocked_until_explicit_user_approval' | 'approved_by_user' | string;
  approvedBy?: string;
  approvedAt?: string;
  approvalSource?: string;
  notes?: string;
};

export type SkylerThematicPackItem = {
  id: string;
  type: 'mcq';
  prompt: string;
  localizedPrompts: SkylerLocalizedText;
  choices: string[];
  correctIndex: number;
  learningGoal: string;
  skillTag?: string;
  sourceIds: string[];
  claimIds: string[];
  choiceRationales?: string[];
  qualityChecks?: {
    singleCorrect?: boolean;
    distractorsPlausible?: boolean;
    noAmbiguity?: boolean;
    sourceBacked?: boolean;
  };
  explanations: SkylerLocalizedExplanations;
};

export type SkylerThematicPack = {
  schemaVersion: 'skyler-quiz-pack-v1';
  target: SkylerTarget;
  categoryId: string;
  categoryTitle: string;
  researchPolicy?: SkylerResearchPolicy;
  styleProfile?: SkylerStyleProfile;
  socialListening?: SkylerSocialListening;
  officialSources?: SkylerOfficialSource[];
  claims?: SkylerSourceClaim[];
  localeReviews?: SkylerLocaleReview[];
  visualAssets?: SkylerVisualAssets;
  releasePolicy?: SkylerReleasePolicy;
  items: SkylerThematicPackItem[];
};

export type SkylerThematicPackIssue = {
  id: string;
  detail: string;
};

export type SkylerThematicPackAdapterOptions = {
  sourceLocale?: SourceLocale | string | null;
  studyTarget?: RuntimeStudyTarget;
  level?: PhraseLevel;
  lessonNum?: number;
};

const REQUIRED_THEMATIC_LOCALES = ACTIVE_INTERFACE_SOURCE_LOCALES;

function localeCopyForItem(item: SkylerThematicPackItem, locale: SourceLocale) {
  const prompt = item.localizedPrompts?.[locale];
  const explanations = item.explanations?.[locale];
  return prompt && explanations?.length === 4 ? { prompt, explanations } : null;
}

export function thematicQuizPackAvailableForTarget(
  pack: Pick<SkylerThematicPack, 'target'>,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  const target = storageStudyTarget(studyTarget);
  return pack.target === 'en' && (target === 'en' || target === 'es');
}

export function thematicQuizPackSurfaceVisibleForTarget(
  pack: Pick<SkylerThematicPack, 'target'>,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  const target = storageStudyTarget(studyTarget);
  return pack.target === 'en' && (target === 'en' || target === 'es' || target === 'fr');
}

export function validateSkylerThematicPackForRuntime(pack: SkylerThematicPack): {
  ok: boolean;
  issues: SkylerThematicPackIssue[];
} {
  const issues: SkylerThematicPackIssue[] = [];

  if (pack.schemaVersion !== 'skyler-quiz-pack-v1') {
    issues.push({ id: 'schemaVersion', detail: 'Unsupported Skyler pack schema version.' });
  }
  if (pack.target !== 'en') {
    issues.push({ id: 'target', detail: 'Only English Skyler thematic packs can map to the current quiz runtime.' });
  }
  if (!pack.categoryId?.trim()) {
    issues.push({ id: 'categoryId', detail: 'Thematic pack categoryId is required.' });
  }
  if (!pack.categoryTitle?.trim()) {
    issues.push({ id: 'categoryTitle', detail: 'Thematic pack categoryTitle is required.' });
  }
  if (!Array.isArray(pack.items) || pack.items.length === 0) {
    issues.push({ id: 'items', detail: 'Thematic pack needs at least one item.' });
    return { ok: issues.length === 0, issues };
  }

  const seenItemIds = new Set<string>();
  pack.items.forEach((item, index) => {
    const label = item.id || `items.${index}`;
    if (!item.id?.trim()) issues.push({ id: `${label}.id`, detail: 'Item id is required.' });
    else if (seenItemIds.has(item.id)) issues.push({ id: `${label}.id.duplicate`, detail: 'Duplicate item id.' });
    else seenItemIds.add(item.id);

    if (item.type !== 'mcq') issues.push({ id: `${label}.type`, detail: 'Only MCQ items can map to QuizPhrase.' });
    if (!Array.isArray(item.choices) || item.choices.length !== 4) {
      issues.push({ id: `${label}.choices`, detail: 'Item needs exactly four choices.' });
    } else if (new Set(item.choices.map(choice => choice.trim())).size !== 4) {
      issues.push({ id: `${label}.choices.unique`, detail: 'Item choices must be unique.' });
    }
    if (!Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex > 3) {
      issues.push({ id: `${label}.correctIndex`, detail: 'Item correctIndex must be 0..3.' });
    }
    if (!item.skillTag?.trim()) {
      issues.push({ id: `${label}.skillTag`, detail: 'English thematic items need skillTag metadata.' });
    }
    for (const locale of REQUIRED_THEMATIC_LOCALES) {
      const copy = localeCopyForItem(item, locale);
      if (!copy) {
        issues.push({ id: `${label}.${locale}`, detail: 'Missing localized prompt or four explanations for locale.' });
      }
    }
  });

  return { ok: issues.length === 0, issues };
}

export function skylerThematicPackToQuizPhrases(
  pack: SkylerThematicPack,
  options: SkylerThematicPackAdapterOptions = {},
): QuizPhrase[] {
  if (!thematicQuizPackAvailableForTarget(pack, options.studyTarget)) return [];

  const validation = validateSkylerThematicPackForRuntime(pack);
  if (!validation.ok) return [];

  const sourceLocale = normalizeSourceLocale(options.sourceLocale) ?? 'ru';
  const level = options.level ?? 'A1';
  const lessonNum = options.lessonNum ?? 0;

  return pack.items.map((item): QuizPhrase => {
    const sourceCopy = localeCopyForItem(item, sourceLocale) ?? localeCopyForItem(item, 'ru')!;
    const ruCopy = localeCopyForItem(item, 'ru')!;
    const ukCopy = localeCopyForItem(item, 'uk')!;
    const esCopy = localeCopyForItem(item, 'es')!;

    const phrase = {
      choices: [...item.choices],
      correct: item.correctIndex,
      answer: item.choices[item.correctIndex] ?? '',
      explanations: [...ruCopy.explanations],
      explanationsUK: [...ukCopy.explanations],
      explanationsES: [...esCopy.explanations],
      sourceLocales: {
        'pt-BR': localeCopyForItem(item, 'pt-BR') ?? undefined,
        vi: localeCopyForItem(item, 'vi') ?? undefined,
        id: localeCopyForItem(item, 'id') ?? undefined,
        tr: localeCopyForItem(item, 'tr') ?? undefined,
        pl: localeCopyForItem(item, 'pl') ?? undefined,
      },
      sourceLocale,
      sourceText: sourceCopy.prompt,
      sourceExplanations: [...sourceCopy.explanations],
      lessonNum,
      level,
      questionId: item.id,
      skillTag: item.skillTag,
      reviewerFlag: null,
      difficultyStars: level === 'A1' || level === 'A2' ? 1 : level === 'B1' || level === 'B2' ? 2 : 3,
      quizItemType: `skyler_thematic:${pack.categoryId}`,
    } as QuizPhrase;
    phrase.ru = ruCopy.prompt;
    phrase.uk = ukCopy.prompt;
    phrase.es = esCopy.prompt;
    return phrase;
  });
}
