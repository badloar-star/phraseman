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
const OPENAI_CHAT_TIMEOUT_MS = 30000;
const OPENAI_CHAT_MAX_ATTEMPTS = 3;
function asText(value) {
    return typeof value === 'string' ? value : '';
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isRetryableStatus(status) {
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
function isRetryableFetchError(error) {
    const text = `${error?.code || ''} ${error?.name || ''} ${error?.message || ''} ${error?.cause?.code || ''}`.toLowerCase();
    return (text.includes('timeout') ||
        text.includes('econnreset') ||
        text.includes('econnrefused') ||
        text.includes('etimedout') ||
        text.includes('fetch failed') ||
        text.includes('network'));
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
    let response = null;
    let lastError = null;
    for (let attempt = 1; attempt <= OPENAI_CHAT_MAX_ATTEMPTS; attempt += 1) {
        try {
            response = await fetch(OPENAI_CHAT_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(OPENAI_CHAT_TIMEOUT_MS),
            });
            if (response.ok || !isRetryableStatus(response.status) || attempt === OPENAI_CHAT_MAX_ATTEMPTS)
                break;
            const detail = await response.text().catch(() => '');
            console.warn('explain_provider retryable chat status', response.status, detail.slice(0, 240), { attempt });
        }
        catch (error) {
            lastError = error;
            if (!isRetryableFetchError(error) || attempt === OPENAI_CHAT_MAX_ATTEMPTS) {
                console.error('explain_provider chat fetch failed', error);
                throw new https_1.HttpsError('unavailable', 'explain_provider_failed');
            }
            console.warn('explain_provider retryable fetch failure', { attempt, message: error?.message || String(error) });
        }
        await sleep(400 * attempt * attempt);
    }
    if (!response) {
        console.error('explain_provider chat failed without response', lastError);
        throw new https_1.HttpsError('unavailable', 'explain_provider_failed');
    }
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