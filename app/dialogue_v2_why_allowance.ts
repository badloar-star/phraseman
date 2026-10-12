import AsyncStorage from '@react-native-async-storage/async-storage';

import { isDevDialogWhySpent } from './dev_dialog_state';

// зачем (макет dialogs.html C7/C8, владелец 2026-09-18 «Почему так — 3 бесплатно в день»):
// у Free три разбора «Почему так» в день, дальше — «Открыть Plus». Руны убраны в 2.0.
// Разбор приходит вместе с репликой (D112) — сети здесь нет вовсе: счётчик живёт на
// телефоне (D66 local-first), открытие шторки мгновенное, запись догоняет фоном.
// Повторное открытие уже раскрытой реплики счётчик не тратит.

export const DIALOGUE_V2_WHY_FREE_PER_DAY = 3 as const;

const STORAGE_KEY = 'dialogue_v2_why_allowance:v1';
const MAX_REMEMBERED_IDS = 24;

export type DialogueV2WhyAllowance = Readonly<{
  day: string;
  revealedIds: readonly string[];
}>;

export function localDayKey(nowMs: number = Date.now()): string {
  const now = new Date(nowMs);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function emptyWhyAllowance(nowMs: number = Date.now()): DialogueV2WhyAllowance {
  return Object.freeze({ day: localDayKey(nowMs), revealedIds: Object.freeze([]) });
}

function parseAllowance(raw: string | null, nowMs: number): DialogueV2WhyAllowance {
  if (!raw) return emptyWhyAllowance(nowMs);
  try {
    const parsed = JSON.parse(raw) as { day?: unknown; revealedIds?: unknown };
    if (parsed.day !== localDayKey(nowMs) || !Array.isArray(parsed.revealedIds)) return emptyWhyAllowance(nowMs);
    const ids = parsed.revealedIds.filter((id): id is string => typeof id === 'string' && id.length <= 160);
    return Object.freeze({ day: parsed.day, revealedIds: Object.freeze(ids.slice(-MAX_REMEMBERED_IDS)) });
  } catch (error: unknown) {
    console.warn('[DIALOGUE-V2] why:parse → reset allowance', error instanceof Error ? error.message : String(error));
    return emptyWhyAllowance(nowMs);
  }
}

export async function readDialogueV2WhyAllowance(nowMs: number = Date.now()): Promise<DialogueV2WhyAllowance> {
  if (isDevDialogWhySpent()) {
    // зачем (dialogs-020): разборы на сегодня исчерпаны — подставные раскрытия только в памяти
    console.log('[DIALOGUE-V2] why:read → dev_dialog_why=spent, бесплатных 0 (только память)');
    return Object.freeze({ day: localDayKey(nowMs), revealedIds: Object.freeze(['dev_why_1', 'dev_why_2', 'dev_why_3']) });
  }
  try {
    return parseAllowance(await AsyncStorage.getItem(STORAGE_KEY), nowMs);
  } catch (error: unknown) {
    console.warn('[DIALOGUE-V2] why:read → storage failed, using empty allowance', error instanceof Error ? error.message : String(error));
    return emptyWhyAllowance(nowMs);
  }
}

export function whyFreeLeft(allowance: DialogueV2WhyAllowance): number {
  return Math.max(0, DIALOGUE_V2_WHY_FREE_PER_DAY - allowance.revealedIds.length);
}

/**
 * Чистый шаг: раскрыть разбор `revealId`. Уже раскрытый — бесплатно; новый — только
 * если остались бесплатные. Возвращает НОВЫЙ объект (исходный не меняется).
 */
export function revealWhy(
  allowance: DialogueV2WhyAllowance,
  revealId: string,
  nowMs: number = Date.now(),
): Readonly<{ allowed: boolean; next: DialogueV2WhyAllowance }> {
  const current = allowance.day === localDayKey(nowMs) ? allowance : emptyWhyAllowance(nowMs);
  if (current.revealedIds.includes(revealId)) return Object.freeze({ allowed: true, next: current });
  if (whyFreeLeft(current) <= 0) return Object.freeze({ allowed: false, next: current });
  return Object.freeze({
    allowed: true,
    next: Object.freeze({
      day: current.day,
      revealedIds: Object.freeze([...current.revealedIds, revealId].slice(-MAX_REMEMBERED_IDS)),
    }),
  });
}

/** Фоновая запись; сбой хранилища не отнимает уже показанный разбор. */
export function persistDialogueV2WhyAllowance(allowance: DialogueV2WhyAllowance): void {
  if (isDevDialogWhySpent()) {
    console.log('[DIALOGUE-V2] why:persist → пропущено: dev_dialog_why=spent (подставной счётчик не пишется)');
    return;
  }
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allowance)).catch((error: unknown) => {
    console.warn('[DIALOGUE-V2] why:persist → storage failed', error instanceof Error ? error.message : String(error));
  });
}
