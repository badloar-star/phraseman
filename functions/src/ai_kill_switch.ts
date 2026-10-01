import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

import { aiGloballyDisabled } from './remote_gates';

/**
 * Аварийный стоп ИИ (`ai_global_disable` в «Пульте») для callable, которые сами его не проверяли.
 *
 * зачем (Q102, координатор §62): стоп не покрывал разбор диалога (premiumDialogReview) и свободный
 * разговор (dialogueV2Freeform*) — при включённом стопе они продолжали тратить OpenAI. Проверка
 * стоит до любой работы обработчика; сбой чтения конфига ИИ не блокирует (как в aiGloballyDisabled).
 */
export async function aiKillSwitchOn(
  callableName: string,
  read: () => Promise<boolean> = () => aiGloballyDisabled(admin.firestore()),
): Promise<boolean> {
  try {
    return (await read()) === true;
  } catch (error) {
    // Сбой чтения флага ИИ не выключает (правило aiGloballyDisabled), но причина — в лог.
    console.warn('[AI-KILL-SWITCH] read_failed', JSON.stringify({
      callable: callableName,
      message: error instanceof Error ? error.message : String(error),
    }));
    return false;
  }
}

export function withAiKillSwitch<Req, Res>(
  callableName: string,
  handler: (request: Req) => Promise<Res>,
  isDisabled: () => Promise<boolean> = () => aiKillSwitchOn(callableName),
): (request: Req) => Promise<Res> {
  return async (request: Req) => {
    if (await isDisabled()) {
      console.warn('[AI-KILL-SWITCH] rejected', JSON.stringify({ callable: callableName }));
      throw new HttpsError('unavailable', 'ai_globally_disabled');
    }
    return handler(request);
  };
}
