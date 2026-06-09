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
import { HttpsError } from 'firebase-functions/v2/https';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface OpenAiChatParams {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  /** Optional response_format passthrough (gpt-4o-mini supports json_object). */
  responseFormat?: { type: 'json_object' | 'text' };
}

export interface OpenAiChatResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
}

interface OpenAiRawResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * One chat completion call. Returns the assistant text and token usage.
 * Throws HttpsError('unavailable', 'explain_provider_failed') on a non-OK response, logging the
 * status + a truncated body (same shape as premium_dialog) — never leaks the full provider body.
 */
export async function openAiChat(params: OpenAiChatParams): Promise<OpenAiChatResult> {
  const { apiKey, model, messages, maxTokens, temperature, responseFormat } = params;

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (responseFormat) body.response_format = responseFormat;

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
    throw new HttpsError('unavailable', 'explain_provider_failed');
  }

  const json = (await response.json()) as OpenAiRawResponse;
  const usage = json.usage ?? {};
  return {
    text: asText(json.choices?.[0]?.message?.content).trim(),
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
  };
}
