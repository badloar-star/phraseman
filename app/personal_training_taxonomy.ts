import type { PosMicroDiagnosisId } from './pos_micro_diagnosis';

export type PersonalTrainingStatus = 'active' | 'qa_pending';
export type JessePersonalTrainingStatus = 'reworked' | 'legacy_needs_rework';

export const JESSE_REWORKED_MARKER = 'JESSE_REWORKED_PERSONAL_TRAINING';

export interface PersonalTrainingTaxonomyEntry {
  id: PosMicroDiagnosisId;
  status: PersonalTrainingStatus;
  appPath: string;
  sourceDraft: string;
  qaReport: string;
  qaStatus: 'PASS' | 'PENDING';
  jesseStatus: JessePersonalTrainingStatus;
  jesseMarker: typeof JESSE_REWORKED_MARKER;
}

const entry = (
  id: PosMicroDiagnosisId,
  status: PersonalTrainingStatus,
  qaStatus: PersonalTrainingTaxonomyEntry['qaStatus'],
): PersonalTrainingTaxonomyEntry => ({
  id,
  status,
  appPath: `app/diagnosis_training_${id}.ts`,
  sourceDraft: `tools/personal_training_agent_room/drafts/${id}.draft.md`,
  qaReport: `tools/personal_training_agent_room/reports/${id}-qa.md`,
  qaStatus,
  jesseStatus: 'reworked',
  jesseMarker: JESSE_REWORKED_MARKER,
});

export const PERSONAL_TRAINING_TAXONOMY: PersonalTrainingTaxonomyEntry[] = [
  entry('article_a_an', 'active', 'PASS'),
  entry('article_zero', 'active', 'PASS'),
  entry('preposition_duration_for_since', 'active', 'PASS'),
  entry('preposition_place_in_on_at', 'active', 'PASS'),
  entry('pronoun_case', 'active', 'PASS'),
  entry('to_be_present_agreement', 'active', 'PASS'),
  entry('verb_present_simple_negative_question', 'active', 'PASS'),
  entry('word_order_basic_question', 'active', 'PASS'),

  entry('article_the_specific', 'active', 'PASS'),
  entry('preposition_time_in_on_at', 'active', 'PASS'),
  entry('verb_third_person', 'active', 'PASS'),
];

export const ACTIVE_PERSONAL_TRAINING_IDS = PERSONAL_TRAINING_TAXONOMY
  .filter((item) => item.status === 'active')
  .map((item) => item.id);

export function getPersonalTrainingTaxonomyEntry(
  id: PosMicroDiagnosisId | string,
): PersonalTrainingTaxonomyEntry | null {
  return PERSONAL_TRAINING_TAXONOMY.find((item) => item.id === id) ?? null;
}

export function getPersonalTrainingStatus(id: PosMicroDiagnosisId | string): PersonalTrainingStatus | null {
  return getPersonalTrainingTaxonomyEntry(id)?.status ?? null;
}
