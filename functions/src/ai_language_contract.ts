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

/**
 * Единый справочник человеческих имён ИЗУЧАЕМЫХ языков (ось StudyTarget) для промптов.
 * Это единственный источник — не дублировать по файлам. Добавление языка = одна запись здесь.
 * Не путать с именами языков ВЫВОДА (AiOutputLang) — то отдельная ось (родной язык юзера).
 */
const STUDY_TARGET_NAME: Record<StudyTarget, string> = {
  en: 'English',
  fr: 'French',
};

export function studyTargetName(target: StudyTarget): string {
  return STUDY_TARGET_NAME[target] ?? STUDY_TARGET_NAME.en;
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

/**
 * Guard that generated text is in the STUDY language (StudyTarget: en/fr), not the learner's own
 * language. Unlike assertAiOutputLanguage (which validates against the 9 AiOutputLang UI languages),
 * this validates against a StudyTarget, so 'fr' is accepted. Used by the dialog reply language-lock:
 * a French dialog reply is correct when studyTarget='fr', an English one is rejected, and vice versa.
 */
export function assertAiStudyLanguage(params: {
  text: string;
  studyTarget: StudyTarget;
  feature: AiLanguageFeature;
}): void {
  const reason = rejectGeneratedLanguageText(params.text, params.studyTarget);
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
