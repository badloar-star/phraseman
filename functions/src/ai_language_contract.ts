import { HttpsError } from 'firebase-functions/v2/https';
import { rejectGeneratedLanguageText } from './ai_language_gate';

export const LANGUAGE_CONTRACT_VERSION = 'ai-language-contract-v1';

export type AiOutputLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl' | 'en';
export type StudyTarget = 'en' | 'fr';

export type AiLanguageFeature =
  | 'explain'
  | 'choice'
  | 'quiz'
  | 'compass'
  | 'help_board'
  | 'mistake_explain'
  | 'weekly_review'
  | 'stats_insights'
  | 'premium_dialog'
  | 'premium_dialog_translate';

const AI_OUTPUT_LANGS: AiOutputLang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'en'];

function normalizeLangCode(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.toLowerCase();
}

export function resolveAiOutputLang(value: unknown, feature: AiLanguageFeature): AiOutputLang {
  const normalized = normalizeLangCode(value);
  const normalizedLower = normalized.toLowerCase();
  const exact = AI_OUTPUT_LANGS.find((lang) => lang.toLowerCase() === normalizedLower);
  if (exact) return exact;
  throw new HttpsError('invalid-argument', `${feature}_unsupported_language`);
}

export function resolveStudyTarget(value: unknown): StudyTarget {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'fr' ? 'fr' : 'en';
}

export function assertAiOutputLanguage(params: {
  text: string;
  targetLang: string;
  feature: AiLanguageFeature;
}): void {
  const lang = resolveAiOutputLang(params.targetLang, params.feature);
  const reason = rejectGeneratedLanguageText(params.text, lang);
  if (reason) {
    throw new HttpsError('unavailable', `${params.feature}_wrong_language`);
  }
}

export function assertAiJsonTextFieldsLanguage(params: {
  texts: string[];
  targetLang: string;
  feature: AiLanguageFeature;
}): void {
  const text = params.texts.map((item) => String(item ?? '').trim()).filter(Boolean).join('\n');
  if (!text) return;
  assertAiOutputLanguage({ text, targetLang: params.targetLang, feature: params.feature });
}
