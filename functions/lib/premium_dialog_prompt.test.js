"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FakeHttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
    onCall: (optsOrHandler, maybeHandler) => typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));
jest.mock('firebase-functions/params', () => ({
    defineSecret: () => ({ value: () => 'sk-test-key' }),
}));
jest.mock('firebase-admin', () => ({
    firestore: jest.fn(),
}));
jest.mock('./callable_options', () => ({
    ENFORCE_APP_CHECK_OPENAI: false,
}));
const premium_dialog_1 = require("./premium_dialog");
describe('premium dialog prompt language isolation', () => {
    it('accepts every app UI language and fails closed on unknown values', () => {
        expect(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'].map(premium_dialog_1.asInterfaceLang)).toEqual([
            'ru',
            'uk',
            'es',
            'pt-BR',
            'vi',
            'id',
            'tr',
            'pl',
        ]);
        expect(() => (0, premium_dialog_1.asInterfaceLang)('pt_BR')).toThrow('premium_dialog_unsupported_language');
        expect(() => (0, premium_dialog_1.asInterfaceLang)('vn')).toThrow('premium_dialog_unsupported_language');
    });
    it('renders scenario prompts with the caller interface language, not a hard-coded Russian profile', () => {
        const prompt = (0, premium_dialog_1.buildScenarioSystemPrompt)('A2', {
            interfaceLang: 'es',
            role: 'a friendly barista',
            setting: 'a cafe',
            goalEn: 'order coffee',
        });
        expect(prompt).toContain('Spanish (es)');
        // No Russian assumption for a Spanish learner.
        expect(prompt).not.toContain('The learner is a Russian speaker');
        expect(prompt).not.toContain('Russian (ru)');
    });
    it('locks every reply to English regardless of the learner language (scenario)', () => {
        const prompt = (0, premium_dialog_1.buildScenarioSystemPrompt)('A2', {
            interfaceLang: 'ru',
            role: 'a friendly barista',
            setting: 'a cafe',
            goalEn: 'order coffee',
        });
        // The absolute output-language rule must be present, with no exception.
        expect(prompt).toContain('OUTPUT LANGUAGE (ABSOLUTE RULE)');
        expect(prompt).toContain('ALWAYS in English');
        expect(prompt).toContain('There are NO exceptions to this rule');
        // End-of-prompt reinjection re-states English-only.
        expect(prompt).toContain('reply ONLY in English');
    });
    it('companion answers in English even when asked in the native language (no L1 meta-help leak)', () => {
        const prompt = (0, premium_dialog_1.buildCompanionSystemPrompt)('A2', { weakWords: ['reservation'] }, 'pl');
        expect(prompt).toContain('Polish (pl)');
        // The old "answer briefly in Polish" exception must be gone.
        expect(prompt).not.toContain('briefly in Polish');
        expect(prompt).not.toContain('in their interface language (Polish)');
        // New contract: even if asked in Polish, answer in English.
        expect(prompt).toContain('still ANSWER IN ENGLISH');
        expect(prompt).toContain('OUTPUT LANGUAGE (ABSOLUTE RULE)');
    });
});
//# sourceMappingURL=premium_dialog_prompt.test.js.map