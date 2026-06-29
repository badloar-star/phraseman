import type { Lang } from '../constants/i18n';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type AiDialogSourceGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_ai_dialog_scenarios_available' | 'french_ai_dialog_source_gate';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export const FRENCH_AI_DIALOG_REQUIRED_EVIDENCE = Object.freeze([
  'french_ai_dialog_scenario_bank',
  'french_ai_dialog_prompt_contract',
  'french_ai_dialog_lesson_scenario_mapping',
  'french_ai_dialog_tts_voice_contract',
  'ru_uk_ai_dialog_help_prompt_review',
  'official_source_llm_ai_dialog_review',
]);

export function aiDialogContentGateForTarget(studyTarget?: RuntimeStudyTarget): AiDialogSourceGate {
  const target = storageStudyTarget(studyTarget);
  if (target !== 'fr') {
    return {
      enabled: true,
      studyTarget: 'en',
      reason: 'english_ai_dialog_scenarios_available',
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  return {
    enabled: false,
    studyTarget: 'fr',
    reason: 'french_ai_dialog_source_gate',
    blockedRoutes: ['/ai_dialog_home', '/ai_dialog_session', '/ai_companion_session'],
    requiredEvidence: FRENCH_AI_DIALOG_REQUIRED_EVIDENCE,
  };
}

export function aiDialogContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return aiDialogContentGateForTarget(studyTarget).enabled;
}

export function frenchAiDialogGateCopy(lang: Lang): { title: string; body: string; action: string } {
  const uk = lang === 'uk';
  return uk
    ? {
        title: 'French AI-діалоги ще на source gate',
        body: 'English AI-сценарії та prompts приховано в режимі French. Діалоги відкриються після окремого French dialog packet: сценарії, lesson mappings, prompt contract, TTS та LLM official-source review.',
        action: 'До уроків',
      }
    : {
        title: 'French AI-диалоги еще на source gate',
        body: 'English AI-сценарии и prompts скрыты в режиме French. Диалоги откроются после отдельного French dialog packet: сценарии, lesson mappings, prompt contract, TTS и LLM official-source review.',
        action: 'К урокам',
      };
}

export const FRENCH_AI_DIALOG_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_AI_DIALOG_REQUIRED_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __AiDialogTargetGateRouteShim() {
  return null;
}
