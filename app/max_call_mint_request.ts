// Сборка запроса maxVoiceMint и callable-обвязка MAX-звонка.
//
// Зачем отдельный модуль: минт теперь делают ДВА экрана — пре-экран
// (max_call_prestart, заранее, чтобы тап «Позвонить» соединял мгновенно —
// владелец 2026-08-16) и экран звонка (max_call_session, если заготовки нет
// или это ре-минт реконнекта). Промпт-поля (personaName/personaRole/
// scenarioBlock/memoryBlock/srsCount) обязаны собираться ОДИНАКОВО в обоих
// местах — сервер строит instructions из них и по scenarioId ничего не
// резолвит. Здесь — единственная реализация.

import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  getScenarioById,
  scenarioObjectives,
  scenarioTemperament,
  type DialogScenario,
} from './ai_dialog_scenarios';
import { buildCompanionMemory } from './ai_companion_memory';
import type { DialogMemory } from './ai_dialog_client';
import { getTrainerCounts } from './trainer_store';
import {
  parseMintResponse,
  type MaxVoiceMintRequest,
  type MaxVoiceMintResponse,
} from './max_call_client';
import { MaxVoiceStageError, maxVoiceFailureReason } from './max_voice_error';

const FUNCTIONS_REGION = 'us-central1';

/** Тонкая обвязка callable: App Check → httpsCallable → data. */
export function maxVoiceCallable<TRes>(name: string): (req: Record<string, unknown>) => Promise<TRes> {
  return async (req) => {
    await initFirebaseAppCheckIfAvailable();
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name);
    const res = await fn(req);
    return res.data as TRes;
  };
}

/**
 * Имя персонажа из persona-строки (копия приёма ai_dialog_session: там функция
 * не экспортируется, а тянуть 2800-строчный экран ради регэкспа — дороже).
 */
export function extractPersonaName(persona?: string): string {
  if (!persona) return '';
  const match = persona.match(/your name is\s+((?:(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?[^.,]+)/i);
  return match ? match[1].trim() : '';
}

// Формат блока — как ai_dialog_session собирает для premiumDialogSend
// (role/setting/persona/goalEn/objectives/temperament), только связным текстом:
// без [[...]]-маркеров и JSON-конверта mood (спека §7).

/** Текстовый SCENARIO_BLOCK по формату раздела 7 спеки. */
export function buildScenarioBlock(scenario: DialogScenario): string {
  const lines: string[] = ['SCENARIO'];
  lines.push(`You are ${scenario.role}.`);
  lines.push(`Setting: ${scenario.setting}.`);
  if (scenario.persona) lines.push(`Persona: ${scenario.persona}`);
  const temperament = scenarioTemperament(scenario);
  lines.push(`Temperament: ${temperament.patience} patience, ${temperament.warmth} warmth.`);
  lines.push(`Goal of the conversation: ${scenario.goalEn}.`);
  const objectives = scenarioObjectives(scenario);
  if (objectives.length > 0) {
    lines.push(
      `The learner should accomplish: ${objectives.map((o) => o.en || o.id).join('; ')}.`,
    );
  }
  lines.push('Drive toward the goal in 5-8 exchanges.');
  return lines.join('\n');
}

/** COMPANION-память → текстовый блок «WHAT YOU REMEMBER ABOUT THIS LEARNER». */
export function formatMemoryBlock(memory: DialogMemory): string {
  const lines: string[] = ['WHAT YOU REMEMBER ABOUT THIS LEARNER'];
  if (memory.profile) lines.push(memory.profile);
  if (memory.weakWords && memory.weakWords.length > 0) {
    // Слабые слова вплетаются в вопросы (замкнутый SRS-цикл, спека §8).
    lines.push(`Words to weave naturally into your questions: ${memory.weakWords.join(', ')}.`);
  }
  if (memory.summary) lines.push(memory.summary);
  return lines.join('\n');
}

/**
 * Промпт-поля минта по формату звонка. Никогда не бросает: минт без памяти /
 * без srsCount хуже минта без звонка — сервер деградирует к дефолтам сам.
 */
export async function buildMintExtras(
  format: MaxVoiceMintRequest['format'],
  scenario: DialogScenario | undefined,
  cefr: string | undefined,
): Promise<Partial<MaxVoiceMintRequest>> {
  const extras: Partial<MaxVoiceMintRequest> = {};
  if (scenario) {
    extras.scenarioBlock = buildScenarioBlock(scenario);
    const name = extractPersonaName(scenario.persona);
    if (name !== '') extras.personaName = name;
    extras.personaRole = scenario.role;
  }
  if (format === 'companion') {
    extras.personaName = 'Alex';
    extras.personaRole = 'a friendly conversation partner who knows the learner';
    try {
      extras.memoryBlock = formatMemoryBlock(await buildCompanionMemory(cefr ?? 'A2'));
    } catch {
      // Память недоступна (чистый профиль/сбой стора) — компаньон без памяти.
    }
  }
  if (format === 'trial') {
    // Ветвление пробника companion/scenario делает сервер по SRS≥порога:
    // шлём дешёвый локальный счётчик SRS-элементов (getTrainerCounts — кэш).
    try {
      const counts = await getTrainerCounts();
      extras.srsCount = Object.values(counts).reduce((sum, n) => sum + Math.max(0, n), 0);
    } catch {
      // Счётчик не доехал — сервер применит scenario-ветку по умолчанию.
    }
  }
  return extras;
}

/** Параметры звонка, общие для пре-экрана и экрана звонка (из route params). */
export interface MaxCallParams {
  format: MaxVoiceMintRequest['format'];
  scenarioId: string;
  cefr?: string;
  devMode: boolean;
}

/** Сценарий для промпт-полей: companion — без сценария. */
export function scenarioForCall(params: MaxCallParams): DialogScenario | undefined {
  return params.format === 'companion' ? undefined : getScenarioById(params.scenarioId);
}

/** Тело первого минта звонка (без reconnect-полей) из параметров экрана. */
export function initialMintRequest(params: MaxCallParams): MaxVoiceMintRequest {
  return {
    format: params.format,
    scenarioId: params.format === 'companion' ? undefined : params.scenarioId,
    cefr: params.cefr,
    ...(params.devMode ? { devMode: true } : {}),
  };
}

/**
 * Настоящий минт: промпт-поля + callable + защитный разбор ответа. Ошибка —
 * MaxVoiceStageError со стабильным reason для UI. Используется и для первого
 * минта (пре-экран или экран звонка), и для ре-минтов реконнекта (req несёт
 * reconnectOf/reconnectSummary; extras собираются заново — сервер строит
 * instructions с нуля и на переносе резерва).
 */
export async function performMaxVoiceMint(
  params: MaxCallParams,
  req: MaxVoiceMintRequest,
): Promise<MaxVoiceMintResponse> {
  try {
    const extras = await buildMintExtras(params.format, scenarioForCall(params), params.cefr);
    const data = await maxVoiceCallable<unknown>('maxVoiceMint')(
      { ...extras, ...req } as unknown as Record<string, unknown>,
    );
    return parseMintResponse(data);
  } catch (error) {
    if (__DEV__) console.warn('[MAX Voice] mint failed', error);
    throw new MaxVoiceStageError(maxVoiceFailureReason(error, 'mint_failed'), error);
  }
}

/**
 * Возврат резерва заготовленного, но не использованного минта (юзер ушёл с
 * пре-экрана, заготовка протухла): maxVoiceSessionEnd 'dropped' с нулём секунд
 * и нулевым usage. Сервер видит «ни одного heartbeat» и отпускает резерв целиком.
 * Никогда не бросает: если не доехало — вытеснит следующий минт или watchdog.
 */
export async function releaseUnusedMint(mint: MaxVoiceMintResponse): Promise<void> {
  try {
    await maxVoiceCallable<unknown>('maxVoiceSessionEnd')({
      sessionId: mint.session_id,
      endReason: 'dropped',
      elapsedSec: 0,
      usage: { audioInputTokens: 0, audioOutputTokens: 0, cachedTokens: 0, textTokens: 0 },
      channel: 'realtime',
    });
  } catch {
    // См. docstring: серверные страховки дожмут.
  }
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
