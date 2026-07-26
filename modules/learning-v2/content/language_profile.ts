// зачем: владелец утвердил мультиязычную генерацию юнитов (32×12); профиль языка —
// неизменяемое ПРЕДУСЛОВИЕ генерации (exact ref, не 14-я стадия фабрики). Валидатор
// fail-closed: любое неизвестное поле, битое вложенное тело или пустая способность —
// отказ, потому что от этого профиля зависят компилятор сессий и QA-блокировки.
import { V2_ACTIVITY_FAMILIES, type V2ActivityFamily } from '../contracts/activity';

export type V2ScriptSystem =
  | 'latin'
  | 'cyrillic'
  | 'greek'
  | 'hanzi'
  | 'kana_kanji'
  | 'hangul'
  | 'arabic'
  | 'hebrew'
  | 'devanagari'
  | 'thai';

export type V2ScriptCurriculum =
  | 'pinyin_tones'
  | 'hanzi_components'
  | 'hiragana'
  | 'katakana'
  | 'kanji_readings'
  | 'jamo_blocks'
  | 'joining_forms'
  | 'diacritics';

export interface V2LanguageProfileRef {
  readonly profileId: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface V2LanguageProfileScript {
  readonly system: V2ScriptSystem;
  readonly direction: 'ltr' | 'rtl';
  readonly tokenization: 'space_delimited' | 'language_specific';
  readonly joiningBehavior: 'none' | 'contextual';
}

export interface V2LanguageProfileGrammar {
  readonly dominantWordOrders: readonly string[];
  readonly morphology: 'analytic' | 'synthetic' | 'agglutinative' | 'mixed';
  readonly grammaticalFeatures: readonly string[];
  readonly registerFeatures: readonly string[];
}

export interface V2LanguageProfileSpeech {
  readonly lexicalTone: boolean;
  readonly stressSystem: 'none' | 'fixed' | 'lexical' | 'phrase_level';
  readonly ttsLocales: readonly string[];
  readonly sttLocales: readonly string[];
}

export interface V2LanguageProfileBody {
  readonly schemaVersion: 'v2-language-profile-body.v1';
  readonly profileId: string;
  readonly version: number;
  readonly targetLanguage: string;
  readonly script: V2LanguageProfileScript;
  readonly grammar: V2LanguageProfileGrammar;
  readonly speech: V2LanguageProfileSpeech;
  readonly scriptCurricula: readonly V2ScriptCurriculum[];
  readonly supportedActivityFamilies: readonly V2ActivityFamily[];
}

export type V2LanguageProfileValidation =
  | { readonly ok: true; readonly value: Readonly<V2LanguageProfileBody> }
  | { readonly ok: false; readonly issues: readonly string[] };

const TOP_LEVEL_KEYS = Object.freeze([
  'schemaVersion',
  'profileId',
  'version',
  'targetLanguage',
  'script',
  'grammar',
  'speech',
  'scriptCurricula',
  'supportedActivityFamilies',
] as const);

const SCRIPT_KEYS = Object.freeze(['system', 'direction', 'tokenization', 'joiningBehavior'] as const);
const GRAMMAR_KEYS = Object.freeze(['dominantWordOrders', 'morphology', 'grammaticalFeatures', 'registerFeatures'] as const);
const SPEECH_KEYS = Object.freeze(['lexicalTone', 'stressSystem', 'ttsLocales', 'sttLocales'] as const);

const SCRIPT_SYSTEMS: readonly V2ScriptSystem[] = Object.freeze([
  'latin', 'cyrillic', 'greek', 'hanzi', 'kana_kanji', 'hangul', 'arabic', 'hebrew', 'devanagari', 'thai',
]);

const SCRIPT_CURRICULA: readonly V2ScriptCurriculum[] = Object.freeze([
  'pinyin_tones', 'hanzi_components', 'hiragana', 'katakana', 'kanji_readings', 'jamo_blocks', 'joining_forms', 'diacritics',
]);

// зачем: письменности со сложной графикой обязаны нести свою учебную программу письма —
// иначе компилятор соберёт юнит без введения в скрипт и ученик упрётся в нечитаемые карточки.
const REQUIRED_CURRICULA: Partial<Record<V2ScriptSystem, readonly V2ScriptCurriculum[]>> = Object.freeze({
  hanzi: Object.freeze(['pinyin_tones', 'hanzi_components'] as const),
  kana_kanji: Object.freeze(['hiragana', 'katakana', 'kanji_readings'] as const),
  hangul: Object.freeze(['jamo_blocks'] as const),
  arabic: Object.freeze(['joining_forms', 'diacritics'] as const),
});

const MORPHOLOGIES = Object.freeze(['analytic', 'synthetic', 'agglutinative', 'mixed'] as const);
const STRESS_SYSTEMS = Object.freeze(['none', 'fixed', 'lexical', 'phrase_level'] as const);
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const LOCALE_TAG = /^[a-z]{2,3}(?:-[A-Za-z]{2,8})*$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function hasUnknownKeys(input: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(input).some((key) => !allowed.includes(key));
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function validateScript(value: unknown, issues: string[]): value is V2LanguageProfileScript {
  if (!isPlainObject(value)) {
    issues.push('language_profile_script_invalid');
    return false;
  }
  if (hasUnknownKeys(value, SCRIPT_KEYS)) issues.push('language_profile_unknown_field');
  if (!SCRIPT_SYSTEMS.includes(value.system as V2ScriptSystem)) issues.push('language_profile_script_system_invalid');
  if (value.direction !== 'ltr' && value.direction !== 'rtl') issues.push('language_profile_script_direction_invalid');
  if (value.tokenization !== 'space_delimited' && value.tokenization !== 'language_specific') issues.push('language_profile_script_tokenization_invalid');
  if (value.joiningBehavior !== 'none' && value.joiningBehavior !== 'contextual') issues.push('language_profile_script_joining_invalid');
  return true;
}

function validateGrammar(value: unknown, issues: string[]): void {
  if (!isPlainObject(value)) {
    issues.push('language_profile_grammar_invalid');
    return;
  }
  if (hasUnknownKeys(value, GRAMMAR_KEYS)) issues.push('language_profile_unknown_field');
  if (!isNonEmptyStringArray(value.dominantWordOrders)) issues.push('language_profile_grammar_word_orders_required');
  if (!MORPHOLOGIES.includes(value.morphology as (typeof MORPHOLOGIES)[number])) issues.push('language_profile_grammar_morphology_invalid');
  if (!Array.isArray(value.grammaticalFeatures) || value.grammaticalFeatures.some((entry) => typeof entry !== 'string' || !entry.trim())) {
    issues.push('language_profile_grammar_features_invalid');
  }
  if (!Array.isArray(value.registerFeatures) || value.registerFeatures.some((entry) => typeof entry !== 'string' || !entry.trim())) {
    issues.push('language_profile_grammar_registers_invalid');
  }
}

function validateSpeech(value: unknown, issues: string[]): void {
  if (!isPlainObject(value)) {
    issues.push('language_profile_speech_invalid');
    return;
  }
  if (hasUnknownKeys(value, SPEECH_KEYS)) issues.push('language_profile_unknown_field');
  if (typeof value.lexicalTone !== 'boolean') issues.push('language_profile_speech_tone_invalid');
  if (!STRESS_SYSTEMS.includes(value.stressSystem as (typeof STRESS_SYSTEMS)[number])) issues.push('language_profile_speech_stress_invalid');
  // зачем: без хотя бы одной TTS/STT-локали голосовые режимы юнита молча умрут на
  // устройстве — профиль обязан заранее заявить озвучиваемость.
  const locales = [value.ttsLocales, value.sttLocales];
  if (!locales.every((list) => isNonEmptyStringArray(list) && list.every((tag) => LOCALE_TAG.test(tag)))) {
    issues.push('language_profile_speech_locales_required');
  }
}

export function validateV2LanguageProfile(value: unknown): V2LanguageProfileValidation {
  if (!isPlainObject(value)) return { ok: false, issues: Object.freeze(['language_profile_invalid']) };
  const input = value;
  const issues: string[] = hasUnknownKeys(input, TOP_LEVEL_KEYS) ? ['language_profile_unknown_field'] : [];

  if (input.schemaVersion !== 'v2-language-profile-body.v1') issues.push('language_profile_schema_invalid');
  if (typeof input.profileId !== 'string' || !input.profileId.trim()) issues.push('language_profile_id_required');
  if (!Number.isSafeInteger(input.version) || Number(input.version) < 1) issues.push('language_profile_version_invalid');
  if (typeof input.targetLanguage !== 'string' || !LANGUAGE_TAG.test(input.targetLanguage)) issues.push('language_profile_language_invalid');

  const scriptShapeOk = validateScript(input.script, issues);
  validateGrammar(input.grammar, issues);
  validateSpeech(input.speech, issues);

  const curricula = Array.isArray(input.scriptCurricula) ? input.scriptCurricula : [];
  if (!Array.isArray(input.scriptCurricula) || curricula.some((entry) => !SCRIPT_CURRICULA.includes(entry as V2ScriptCurriculum))) {
    issues.push('language_profile_curriculum_invalid');
  }
  if (new Set(curricula).size !== curricula.length) issues.push('language_profile_curriculum_duplicate');
  if (scriptShapeOk) {
    const system = (input.script as V2LanguageProfileScript).system;
    for (const required of REQUIRED_CURRICULA[system] ?? []) {
      if (!curricula.includes(required)) issues.push('script_curriculum_required');
    }
  }

  const families = Array.isArray(input.supportedActivityFamilies) ? input.supportedActivityFamilies : [];
  if (!Array.isArray(input.supportedActivityFamilies) || families.length === 0) {
    issues.push('language_profile_families_required');
  }
  if (families.some((family) => !V2_ACTIVITY_FAMILIES.includes(family as V2ActivityFamily))) {
    issues.push('language_profile_activity_family_invalid');
  }
  if (new Set(families).size !== families.length) issues.push('language_profile_family_duplicate');

  if (issues.length) return { ok: false, issues: Object.freeze([...new Set(issues)]) };

  // зачем: возвращаем ОТВЯЗАННУЮ от входа глубоко замороженную копию — по правилу
  // иммутабельности владельца нельзя ни мутировать вход, ни дать вызывающему
  // мутировать провалидированное тело (от него считается канонический hash).
  const normalized: V2LanguageProfileBody = deepFreeze({
    schemaVersion: 'v2-language-profile-body.v1',
    profileId: (input.profileId as string).trim(),
    version: input.version as number,
    targetLanguage: input.targetLanguage as string,
    script: { ...(input.script as V2LanguageProfileScript) },
    grammar: {
      dominantWordOrders: [...(input.grammar as V2LanguageProfileGrammar).dominantWordOrders],
      morphology: (input.grammar as V2LanguageProfileGrammar).morphology,
      grammaticalFeatures: [...(input.grammar as V2LanguageProfileGrammar).grammaticalFeatures],
      registerFeatures: [...(input.grammar as V2LanguageProfileGrammar).registerFeatures],
    },
    speech: {
      lexicalTone: (input.speech as V2LanguageProfileSpeech).lexicalTone,
      stressSystem: (input.speech as V2LanguageProfileSpeech).stressSystem,
      ttsLocales: [...(input.speech as V2LanguageProfileSpeech).ttsLocales],
      sttLocales: [...(input.speech as V2LanguageProfileSpeech).sttLocales],
    },
    scriptCurricula: [...curricula] as V2ScriptCurriculum[],
    supportedActivityFamilies: [...families] as V2ActivityFamily[],
  });
  return { ok: true, value: normalized };
}
