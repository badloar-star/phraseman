"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateV2LanguageProfile = validateV2LanguageProfile;
// зачем: владелец утвердил мультиязычную генерацию юнитов (32×12); профиль языка —
// неизменяемое ПРЕДУСЛОВИЕ генерации (exact ref, не 14-я стадия фабрики). Валидатор
// fail-closed: любое неизвестное поле, битое вложенное тело или пустая способность —
// отказ, потому что от этого профиля зависят компилятор сессий и QA-блокировки.
const activity_1 = require("../contracts/activity");
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
]);
const SCRIPT_KEYS = Object.freeze(['system', 'direction', 'tokenization', 'joiningBehavior']);
const GRAMMAR_KEYS = Object.freeze(['dominantWordOrders', 'morphology', 'grammaticalFeatures', 'registerFeatures']);
const SPEECH_KEYS = Object.freeze(['lexicalTone', 'stressSystem', 'ttsLocales', 'sttLocales']);
const SCRIPT_SYSTEMS = Object.freeze([
    'latin', 'cyrillic', 'greek', 'hanzi', 'kana_kanji', 'hangul', 'arabic', 'hebrew', 'devanagari', 'thai',
]);
const SCRIPT_CURRICULA = Object.freeze([
    'pinyin_tones', 'hanzi_components', 'hiragana', 'katakana', 'kanji_readings', 'jamo_blocks', 'joining_forms', 'diacritics',
]);
// зачем: письменности со сложной графикой обязаны нести свою учебную программу письма —
// иначе компилятор соберёт юнит без введения в скрипт и ученик упрётся в нечитаемые карточки.
const REQUIRED_CURRICULA = Object.freeze({
    hanzi: Object.freeze(['pinyin_tones', 'hanzi_components']),
    kana_kanji: Object.freeze(['hiragana', 'katakana', 'kanji_readings']),
    hangul: Object.freeze(['jamo_blocks']),
    arabic: Object.freeze(['joining_forms', 'diacritics']),
});
const MORPHOLOGIES = Object.freeze(['analytic', 'synthetic', 'agglutinative', 'mixed']);
const STRESS_SYSTEMS = Object.freeze(['none', 'fixed', 'lexical', 'phrase_level']);
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const LOCALE_TAG = /^[a-z]{2,3}(?:-[A-Za-z]{2,8})*$/i;
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonEmptyStringArray(value) {
    return Array.isArray(value)
        && value.length > 0
        && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0);
}
function hasUnknownKeys(input, allowed) {
    return Object.keys(input).some((key) => !allowed.includes(key));
}
function deepFreeze(value) {
    if (typeof value === 'object' && value !== null) {
        for (const child of Object.values(value))
            deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
function validateScript(value, issues) {
    if (!isPlainObject(value)) {
        issues.push('language_profile_script_invalid');
        return false;
    }
    if (hasUnknownKeys(value, SCRIPT_KEYS))
        issues.push('language_profile_unknown_field');
    if (!SCRIPT_SYSTEMS.includes(value.system))
        issues.push('language_profile_script_system_invalid');
    if (value.direction !== 'ltr' && value.direction !== 'rtl')
        issues.push('language_profile_script_direction_invalid');
    if (value.tokenization !== 'space_delimited' && value.tokenization !== 'language_specific')
        issues.push('language_profile_script_tokenization_invalid');
    if (value.joiningBehavior !== 'none' && value.joiningBehavior !== 'contextual')
        issues.push('language_profile_script_joining_invalid');
    return true;
}
function validateGrammar(value, issues) {
    if (!isPlainObject(value)) {
        issues.push('language_profile_grammar_invalid');
        return;
    }
    if (hasUnknownKeys(value, GRAMMAR_KEYS))
        issues.push('language_profile_unknown_field');
    if (!isNonEmptyStringArray(value.dominantWordOrders))
        issues.push('language_profile_grammar_word_orders_required');
    if (!MORPHOLOGIES.includes(value.morphology))
        issues.push('language_profile_grammar_morphology_invalid');
    if (!Array.isArray(value.grammaticalFeatures) || value.grammaticalFeatures.some((entry) => typeof entry !== 'string' || !entry.trim())) {
        issues.push('language_profile_grammar_features_invalid');
    }
    if (!Array.isArray(value.registerFeatures) || value.registerFeatures.some((entry) => typeof entry !== 'string' || !entry.trim())) {
        issues.push('language_profile_grammar_registers_invalid');
    }
}
function validateSpeech(value, issues) {
    if (!isPlainObject(value)) {
        issues.push('language_profile_speech_invalid');
        return;
    }
    if (hasUnknownKeys(value, SPEECH_KEYS))
        issues.push('language_profile_unknown_field');
    if (typeof value.lexicalTone !== 'boolean')
        issues.push('language_profile_speech_tone_invalid');
    if (!STRESS_SYSTEMS.includes(value.stressSystem))
        issues.push('language_profile_speech_stress_invalid');
    // зачем: без хотя бы одной TTS/STT-локали голосовые режимы юнита молча умрут на
    // устройстве — профиль обязан заранее заявить озвучиваемость.
    const locales = [value.ttsLocales, value.sttLocales];
    if (!locales.every((list) => isNonEmptyStringArray(list) && list.every((tag) => LOCALE_TAG.test(tag)))) {
        issues.push('language_profile_speech_locales_required');
    }
}
function validateV2LanguageProfile(value) {
    if (!isPlainObject(value))
        return { ok: false, issues: Object.freeze(['language_profile_invalid']) };
    const input = value;
    const issues = hasUnknownKeys(input, TOP_LEVEL_KEYS) ? ['language_profile_unknown_field'] : [];
    if (input.schemaVersion !== 'v2-language-profile-body.v1')
        issues.push('language_profile_schema_invalid');
    if (typeof input.profileId !== 'string' || !input.profileId.trim())
        issues.push('language_profile_id_required');
    if (!Number.isSafeInteger(input.version) || Number(input.version) < 1)
        issues.push('language_profile_version_invalid');
    if (typeof input.targetLanguage !== 'string' || !LANGUAGE_TAG.test(input.targetLanguage))
        issues.push('language_profile_language_invalid');
    const scriptShapeOk = validateScript(input.script, issues);
    validateGrammar(input.grammar, issues);
    validateSpeech(input.speech, issues);
    const curricula = Array.isArray(input.scriptCurricula) ? input.scriptCurricula : [];
    if (!Array.isArray(input.scriptCurricula) || curricula.some((entry) => !SCRIPT_CURRICULA.includes(entry))) {
        issues.push('language_profile_curriculum_invalid');
    }
    if (new Set(curricula).size !== curricula.length)
        issues.push('language_profile_curriculum_duplicate');
    if (scriptShapeOk) {
        const system = input.script.system;
        for (const required of REQUIRED_CURRICULA[system] ?? []) {
            if (!curricula.includes(required))
                issues.push('script_curriculum_required');
        }
    }
    const families = Array.isArray(input.supportedActivityFamilies) ? input.supportedActivityFamilies : [];
    if (!Array.isArray(input.supportedActivityFamilies) || families.length === 0) {
        issues.push('language_profile_families_required');
    }
    if (families.some((family) => !activity_1.V2_ACTIVITY_FAMILIES.includes(family))) {
        issues.push('language_profile_activity_family_invalid');
    }
    if (new Set(families).size !== families.length)
        issues.push('language_profile_family_duplicate');
    if (issues.length)
        return { ok: false, issues: Object.freeze([...new Set(issues)]) };
    // зачем: возвращаем ОТВЯЗАННУЮ от входа глубоко замороженную копию — по правилу
    // иммутабельности владельца нельзя ни мутировать вход, ни дать вызывающему
    // мутировать провалидированное тело (от него считается канонический hash).
    const normalized = deepFreeze({
        schemaVersion: 'v2-language-profile-body.v1',
        profileId: input.profileId.trim(),
        version: input.version,
        targetLanguage: input.targetLanguage,
        script: { ...input.script },
        grammar: {
            dominantWordOrders: [...input.grammar.dominantWordOrders],
            morphology: input.grammar.morphology,
            grammaticalFeatures: [...input.grammar.grammaticalFeatures],
            registerFeatures: [...input.grammar.registerFeatures],
        },
        speech: {
            lexicalTone: input.speech.lexicalTone,
            stressSystem: input.speech.stressSystem,
            ttsLocales: [...input.speech.ttsLocales],
            sttLocales: [...input.speech.sttLocales],
        },
        scriptCurricula: [...curricula],
        supportedActivityFamilies: [...families],
    });
    return { ok: true, value: normalized };
}
//# sourceMappingURL=language_profile.js.map