"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const explain_provider_1 = require("./explain_provider");
describe('OpenAI transport request accounting hook', () => {
    const originalFetch = global.fetch;
    let warn;
    beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
    afterEach(() => { global.fetch = originalFetch; warn.mockRestore(); });
    test('runs the hook before every real HTTP retry', async () => {
        let request = 0;
        global.fetch = jest.fn(async () => {
            request += 1;
            if (request === 1)
                return new Response('retry', { status: 500 });
            return new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } });
        });
        const attempts = [];
        await (0, explain_provider_1.openAiChat)({ apiKey: 'test', model: 'fake', messages: [{ role: 'user', content: 'json' }], maxTokens: 10, temperature: 0, responseFormat: { type: 'json_object' }, beforeRequest: async (attempt) => { attempts.push(attempt); } });
        expect(attempts).toEqual([1, 2]);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    test('stops before fetch when the budget hook rejects', async () => {
        global.fetch = jest.fn();
        await expect((0, explain_provider_1.openAiChat)({ apiKey: 'test', model: 'fake', messages: [{ role: 'user', content: 'json' }], maxTokens: 10, temperature: 0, beforeRequest: async () => { throw new Error('cap'); } })).rejects.toThrow('cap');
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=explain_provider_accounting.test.js.map