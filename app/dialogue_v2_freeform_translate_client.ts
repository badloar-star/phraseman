// dialogue_v2_freeform_translate_client.ts — «Перевести» одну реплику ИИ свободного разговора по тапу.
// зачем (жалоба владельца 25.10; Ревизор по e00c839e0): перевод — отдельный вызов только по явному тапу, ответ хода не меняется.
// Вызов существует только на новом сервере, поэтому кнопку показываем лишь при флаге «Пульта»
// dialogue_freeform_translate_enabled (включают ПОСЛЕ выкладки функции). Любой сбой → null с причиной [DIALOG-BUBBLE].
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getRemoteBool, hasRemoteBoolOverride } from './remote_flags';

const FUNCTIONS_REGION = 'us-central1';
const TIMEOUT_MS = 15_000;
const LANGS: ReadonlySet<string> = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);

type TranslateRequest = Readonly<{ sessionId: string; turnId: string; translateTo: string }>;

let loggedFlag: boolean | null = null;

/** Включён ли перевод по тапу (флаг «Пульта», по умолчанию ВЫКЛ). */
export function dialogueV2FreeformTranslateEnabled(): boolean {
  const flag = getRemoteBool('dialogue_freeform_translate_enabled') === true;
  if (loggedFlag !== flag) {
    loggedFlag = flag;
    console.log('[DIALOG-BUBBLE]', JSON.stringify({ event: 'freeform_translate_gate', flag, source: hasRemoteBoolOverride('dialogue_freeform_translate_enabled') ? 'cache' : 'default' })); // guard-ok: одна строка на смену значения
  }
  return flag;
}

/** Перевод реплики ИИ (по ходу из журнала сессии на сервере) или null. */
export async function requestDialogueV2FreeformTranslation(input: TranslateRequest): Promise<string | null> {
  if (!LANGS.has(input.translateTo)) {
    console.log('[DIALOG-BUBBLE]', JSON.stringify({ event: 'freeform_translate_skip', reason: 'language_unsupported', translateTo: String(input.translateTo).slice(0, 16) })); // guard-ok: ранний выход называет причину
    return null;
  }
  const startedAt = Date.now();
  try {
    const callable = httpsCallable<TranslateRequest, unknown>(getFunctions(getApp(), FUNCTIONS_REGION), 'dialogueV2FreeformTranslate', { timeout: TIMEOUT_MS });
    const data = (await callable({ sessionId: input.sessionId, turnId: input.turnId, translateTo: input.translateTo })).data as { ok?: unknown; translation?: unknown } | null;
    const translation = data?.ok === true && typeof data.translation === 'string' ? data.translation.trim() : '';
    console.log('[DIALOG-BUBBLE]', JSON.stringify({ event: 'freeform_translate_response', turnId: input.turnId, ms: Date.now() - startedAt, valid: translation.length > 0 })); // guard-ok: одна строка на тап
    return translation.length > 0 && translation.length <= 3_000 ? translation : null;
  } catch (error) {
    const row = (error && typeof error === 'object' ? error : {}) as { code?: unknown; message?: unknown };
    console.warn('[DIALOG-BUBBLE]', JSON.stringify({ event: 'freeform_translate_failed', turnId: input.turnId, ms: Date.now() - startedAt, code: String(row.code ?? 'unknown').slice(0, 60), message: String(row.message ?? '').slice(0, 80) })); // guard-ok: причина сбоя
    return null;
  }
}
