"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAiChat = openAiChat;
/**
 * Thin OpenAI chat wrapper for "Explain like I'm five".
 *
 * B-readiness seam: this is the SINGLE place that talks to OpenAI for the explain feature.
 * To swap to Claude/Haiku later, change only this file — the orchestrator and the judge stay
 * the same. Pattern (URL, Bearer auth, gpt-4o-mini, error handling) mirrors premium_dialog.ts.
 *
 * NO firebase-admin here: it only does an HTTP round-trip and returns text + token usage, so the
 * caller (explain_phrase.ts) owns billing/Firestore and the judge can reuse this for its own call.
 */
const https_1 = require("firebase-functions/v2/https");
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
function asText(value) {
    return typeof value === 'string' ? value : '';
}
/**
 * One chat completion call. Returns the assistant text and token usage.
 * Throws HttpsError('unavailable', 'explain_provider_failed') on a non-OK response, logging the
 * status + a truncated body (same shape as premium_dialog) — never leaks the full provider body.
 */
async function openAiChat(params) {
    const { apiKey, model, messages, maxTokens, temperature, responseFormat } = params;
    const body = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
    };
    if (responseFormat)
        body.response_format = responseFormat;
    const response = await fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error('explain_provider chat failed', response.status, detail.slice(0, 500));
        throw new https_1.HttpsError('unavailable', 'explain_provider_failed');
    }
    const json = (await response.json());
    const usage = json.usage ?? {};
    return {
        text: asText(json.choices?.[0]?.message?.content).trim(),
        promptTokens: Number(usage.prompt_tokens ?? 0),
        completionTokens: Number(usage.completion_tokens ?? 0),
    };
}
//# sourceMappingURL=explain_provider.js.map