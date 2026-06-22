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
        expect(prompt).toContain('Do not assume Russian unless this value is Russian');
        expect(prompt).not.toContain('The learner is a Russian speaker');
    });
    it('renders companion native-language meta-help for the requested language only', () => {
        const prompt = (0, premium_dialog_1.buildCompanionSystemPrompt)('A2', { weakWords: ['reservation'] }, 'pl');
        expect(prompt).toContain('Polish (pl)');
        expect(prompt).toContain('in their interface language (Polish)');
        expect(prompt).toContain('briefly in Polish');
        expect(prompt).not.toContain('asks in Russian');
        expect(prompt).not.toContain('briefly in Russian');
    });
});
//# sourceMappingURL=premium_dialog_prompt.test.js.map