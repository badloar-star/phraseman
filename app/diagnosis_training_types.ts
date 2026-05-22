import type { Lang, PlannedInterfaceLang, PlannedTriLangCopy } from '../constants/i18n';
import type { WordCategory } from './pos_taxonomy';
import type { PosMicroDiagnosisId } from './pos_micro_diagnosis';

export type CoreTriLangCopy = { ru: string; uk: string; es: string };
export type TriText = CoreTriLangCopy & PlannedTriLangCopy;

export type DiagnosisTrainingDifficulty = 'easy' | 'contrast' | 'mixed' | 'mixed_review';

export interface DiagnosisTrainingOption {
  id: string;
  text: string;
}

export interface DiagnosisTrainingStep {
  id: string;
  order?: number;
  difficulty: DiagnosisTrainingDifficulty;
  type?: 'single_choice';
  targetSkill?: string;
  translation?: TriText;
  goal?: TriText;
  teachingText?: TriText;
  explanationBlock: TriText;
  microTask: TriText;
  sentence: string;
  answerOptions: DiagnosisTrainingOption[];
  correctAnswerId: string;
  correctIndex?: number;
  correctFeedback: TriText;
  wrongFeedbackByOption: Record<string, TriText>;
  retryFeedback: [TriText, TriText, TriText, TriText];
  fallbackExplanation: TriText;
  focusWords: string[];
}

export interface DiagnosisTrainingMasteryRules {
  minCorrect: number;
  minCorrectStreak: number;
  requireCorrectAfterWrong: boolean;
  requireMixedReview: boolean;
  maxAllowedCriticalMistakes?: number;
  criticalMistakeIds?: string[];
  repeatIfCorrectRateBelow?: number;
  unlockSmartTrainerAfterMastery?: boolean;
}

export interface DiagnosisSmartTrainerConfig {
  microDiagnosisId: PosMicroDiagnosisId;
  category: WordCategory;
  contrastSet: string[];
  difficultyLevel: number;
  focusWords: string[];
  mode?: 'weak';
  source?: string;
  diagnosisLabel?: TriText;
  focusPatterns?: string[];
  includeFailedItems?: boolean;
  includeRecoveredItems?: boolean;
  includeSimilarItems?: boolean;
  minItems?: number;
  recommendedItems?: number;
  difficultyEscalation?: {
    start: DiagnosisTrainingDifficulty;
    afterCorrectInRow: number;
    next: DiagnosisTrainingDifficulty;
    afterCorrectInRowAtContrast: number;
    final: DiagnosisTrainingDifficulty;
  };
}

export interface DiagnosisTraining {
  id: PosMicroDiagnosisId;
  category: WordCategory;
  version?: string;
  status?: string;
  priority?: number;
  supportedLocales?: Lang[];
  title: TriText;
  shortTitle?: TriText;
  shortDiagnosis: TriText;
  diagnosisText: TriText;
  mentalModel: TriText;
  contrastSet: string[];
  coreRule?: TriText;
  whatUserMustLearn?: { ru: string[]; uk: string[]; es: string[] } & Partial<Record<PlannedInterfaceLang, string[]>>;
  examples?: Array<{
    en: string;
    ru: string;
    uk: string;
    es: string;
    why: TriText;
  } & Partial<Record<PlannedInterfaceLang, string>>>;
  introBlocks: Array<TriText | { id: string; type: string; text: TriText }>;
  steps: DiagnosisTrainingStep[];
  masteryRules: DiagnosisTrainingMasteryRules;
  adaptiveFeedbackPolicy?: {
    maxDepth: number;
    depth1: TriText;
    depth2: TriText;
    depth3: TriText;
    depth4: TriText;
  };
  failureRecovery?: Record<string, unknown>;
  guidedMode?: Record<string, unknown>;
  smartTrainerConfig: DiagnosisSmartTrainerConfig;
  analyticsEvents: {
    start: string;
    answer: string;
    mastery: string;
    recovery?: string;
    [key: string]: unknown;
  };
  routing?: Record<string, string>;
  qualityChecklist?: Record<string, boolean>;
}

export interface DiagnosisTrainingAttempt {
  stepId: string;
  selectedOptionId: string;
  correct: boolean;
  depth: number;
}

export interface DiagnosisTrainingRuntimeState {
  stepIndex: number;
  correctCount: number;
  correctStreak: number;
  hadWrong: boolean;
  correctAfterWrong: boolean;
  mixedReviewPassed: boolean;
  depthByStep: Record<string, number>;
  failedItems: string[];
  recoveredItems: string[];
  attempts: DiagnosisTrainingAttempt[];
}
