import {
  buildGavanDay1AuthoringBundle,
  type GavanDay1AuthoringBundle,
  type GavanDay1AuthoringBundleChecklistItem,
  type GavanDay1AuthoringBundleSectionStatus,
} from './personal_plan_gavan_day1_authoring_bundle';

export type GavanDay1AuthoringDisplayCardId =
  GavanDay1AuthoringBundleChecklistItem['id'];

export type GavanDay1AuthoringDisplayCard = {
  id: GavanDay1AuthoringDisplayCardId;
  label: string;
  status: GavanDay1AuthoringBundleSectionStatus;
  countSummary: string;
  issueCodes: string[];
  reviewerCopy: string;
};

export type GavanDay1AuthoringDisplayModel = {
  kind: 'gavan_day1_authoring_display_model';
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  cards: GavanDay1AuthoringDisplayCard[];
  summary: {
    ready: number;
    planned: number;
    blocked: number;
    canRelease: boolean;
    blockedSections: string[];
  };
};

export type GavanDay1AuthoringDisplayModelIssueCode =
  | 'wrong_display_model_kind'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_card'
  | 'missing_reviewer_copy'
  | 'unsafe_reviewer_copy'
  | 'planned_media_looks_ready'
  | 'release_card_hides_blockers';

export type GavanDay1AuthoringDisplayModelIssue = {
  code: GavanDay1AuthoringDisplayModelIssueCode;
  cardId?: string;
  detail: string;
};

export type GavanDay1AuthoringDisplayModelValidationResult = {
  valid: boolean;
  issues: GavanDay1AuthoringDisplayModelIssue[];
};

const CARD_ORDER: GavanDay1AuthoringDisplayCardId[] = [
  'content',
  'package',
  'quiz',
  'explanations',
  'listening',
  'pronunciation',
  'release',
];

const UNSAFE_COPY_RE = /DEV|debug|sourcePhraseId|contentUnit|renderer|TODO|placeholder/i;
const FAKE_MEDIA_CLAIM_RE =
  /final audio|final scoring|exact pronunciation score|score is available/i;
const READY_WORD_RE = /ready|final|approved|production-ready/i;

function issue(
  code: GavanDay1AuthoringDisplayModelIssueCode,
  detail: string,
  cardId?: string,
): GavanDay1AuthoringDisplayModelIssue {
  return { code, detail, cardId };
}

function checklistItem(
  bundle: GavanDay1AuthoringBundle,
  id: GavanDay1AuthoringDisplayCardId,
): GavanDay1AuthoringBundleChecklistItem {
  const found = bundle.reviewerChecklist.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Missing authoring bundle checklist item: ${id}.`);
  }
  return found;
}

function card(
  bundle: GavanDay1AuthoringBundle,
  id: GavanDay1AuthoringDisplayCardId,
  label: string,
  countSummary: string,
  reviewerCopy: string,
): GavanDay1AuthoringDisplayCard {
  const item = checklistItem(bundle, id);

  return {
    id,
    label,
    status: item.status,
    countSummary,
    issueCodes: [...item.issueCodes],
    reviewerCopy,
  };
}

function buildCards(bundle: GavanDay1AuthoringBundle): GavanDay1AuthoringDisplayCard[] {
  return [
    card(
      bundle,
      'content',
      'Контент дня',
      `${bundle.content.phraseCount} фраз`,
      bundle.content.qualityValid
        ? 'Фразы кандидата прошли quality gate и готовы к ревью дня.'
        : 'Контент требует правки перед ревью дня.',
    ),
    card(
      bundle,
      'package',
      'Пакет заданий',
      `${bundle.package.blockCount} блока · ${bundle.package.explanationRequirementCount} объяснений`,
      bundle.package.valid
        ? 'Структура дня собрана и проходит package gate.'
        : 'Структура дня требует правки перед дальнейшим ревью.',
    ),
    card(
      bundle,
      'quiz',
      'Квиз',
      `${bundle.quiz.itemCount} вопросов · ${bundle.quiz.choiceCount} вариантов`,
      bundle.quiz.valid
        ? 'Квиз связан с фразами дня и готов к внутреннему ревью.'
        : 'Квиз требует правки: смотри issue codes.',
    ),
    card(
      bundle,
      'explanations',
      'Объяснения',
      `${bundle.explanations.requiredCount} карточек · ${bundle.explanations.coverageTargets} целей`,
      bundle.explanations.requiredCount > 0
        ? 'Новые слова и первые конструкции имеют обязательные объяснения.'
        : 'Для дня не хватает объяснений.',
    ),
    card(
      bundle,
      'listening',
      'Аудио на слух',
      `${bundle.listening.promptCount} prompts · ${bundle.listening.requiredAudioAssets} audio requirement`,
      bundle.listening.productionBlocked
        ? 'Blocked until a real audio asset is attached and checked.'
        : 'planned: listening prompts are authored, but audio is not attached to release yet.',
    ),
    card(
      bundle,
      'pronunciation',
      'Произношение',
      `${bundle.pronunciation.targetCount} targets · ${bundle.pronunciation.requiredScoringRequirements} scoring requirement`,
      bundle.pronunciation.productionBlocked
        ? 'Blocked until a real pronunciation scorer contract is attached and checked.'
        : 'planned: pronunciation targets are authored, but scoring is not attached to release yet.',
    ),
    card(
      bundle,
      'release',
      'Release gate',
      bundle.releaseEvidence.decision.canRelease
        ? 'go · 0 blockers'
        : `hold · ${bundle.releaseEvidence.decision.blockedSections.length} blockers`,
      bundle.releaseEvidence.decision.canRelease
        ? 'Release evidence allows the candidate while media remains optional.'
        : 'Release evidence is holding the candidate because required sections are blocked.',
    ),
  ];
}

function buildSummary(cards: GavanDay1AuthoringDisplayCard[], bundle: GavanDay1AuthoringBundle) {
  return {
    ready: cards.filter((item) => item.status === 'ready').length,
    planned: cards.filter((item) => item.status === 'planned').length,
    blocked: cards.filter((item) => item.status === 'blocked').length,
    canRelease: bundle.releaseEvidence.decision.canRelease,
    blockedSections: [...bundle.releaseEvidence.decision.blockedSections],
  };
}

export function buildGavanDay1AuthoringDisplayModel(
  bundle: GavanDay1AuthoringBundle = buildGavanDay1AuthoringBundle(),
): GavanDay1AuthoringDisplayModel {
  const cards = buildCards(bundle);

  return {
    kind: 'gavan_day1_authoring_display_model',
    dayId: bundle.dayId,
    liveIntegration: false,
    cards,
    summary: buildSummary(cards, bundle),
  };
}

export function validateGavanDay1AuthoringDisplayModel(
  model: GavanDay1AuthoringDisplayModel,
): GavanDay1AuthoringDisplayModelValidationResult {
  const issues: GavanDay1AuthoringDisplayModelIssue[] = [];
  const cardById = new Map(model.cards.map((item) => [item.id, item]));

  if (model.kind !== 'gavan_day1_authoring_display_model') {
    issues.push(issue(
      'wrong_display_model_kind',
      'Authoring display model must use the expected kind.',
    ));
  }

  if (model.dayId !== 'gavan-week1-day1') {
    issues.push(issue('wrong_day_id', 'Authoring display model must describe Gavan day 1.'));
  }

  if (model.liveIntegration !== false) {
    issues.push(issue(
      'live_integration_enabled',
      'Authoring display model must stay outside live integration.',
    ));
  }

  CARD_ORDER.forEach((id) => {
    const displayCard = cardById.get(id);
    if (!displayCard) {
      issues.push(issue('missing_card', 'Display model must include every reviewer card.', id));
      return;
    }

    const visibleText = `${displayCard.label} ${displayCard.countSummary} ${displayCard.reviewerCopy}`;
    if (!displayCard.reviewerCopy.trim()) {
      issues.push(issue('missing_reviewer_copy', 'Every card needs safe reviewer copy.', id));
    }

    if (UNSAFE_COPY_RE.test(visibleText) || FAKE_MEDIA_CLAIM_RE.test(visibleText)) {
      issues.push(issue(
        'unsafe_reviewer_copy',
        'Reviewer copy cannot contain developer wording or fake media claims.',
        id,
      ));
    }

    if (
      (id === 'listening' || id === 'pronunciation') &&
      displayCard.status === 'planned' &&
      READY_WORD_RE.test(displayCard.reviewerCopy)
    ) {
      issues.push(issue(
        'planned_media_looks_ready',
        'Planned media rows cannot look finished or production-ready.',
        id,
      ));
    }
  });

  const releaseCard = cardById.get('release');
  if (
    model.summary.blockedSections.length > 0 &&
    releaseCard &&
    model.summary.blockedSections.some((section) => !releaseCard.issueCodes.includes(section))
  ) {
    issues.push(issue(
      'release_card_hides_blockers',
      'Release card must expose all blocked release sections.',
      'release',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
