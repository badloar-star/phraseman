import { maxVoiceCallable } from './max_call_mint_request';

export type MaxMemoryLanguagePreference = 'more_target' | 'more_native' | null;
export type MaxMemoryPacePreference = 'slower' | 'normal' | 'faster' | null;

export interface MaxMemoryProjection {
  schemaVersion: 2;
  preferredName: string | null;
  learningGoal: string | null;
  languagePreference: MaxMemoryLanguagePreference;
  pacePreference: MaxMemoryPacePreference;
  conversationHooks: { id: string; text: string }[];
  activeIssues: { id: string; label: string; evidenceCount: number }[];
  resolvedIssues: { id: string; label: string }[];
  homework: string[];
  nextTopic: string;
  callCount: number;
  lastCefr: 'A1' | 'A2' | 'B1' | 'B2';
}

export type MaxMemoryUpdate =
  | { field: 'preferredName' | 'learningGoal'; value: string | null }
  | { field: 'languagePreference'; value: 'default' | 'more_target' | 'more_native' | null }
  | { field: 'pacePreference'; value: MaxMemoryPacePreference }
  | { itemId: string; text: string };

export type MaxMemoryInvoke = (name: string, data: Record<string, unknown>) => Promise<unknown>;

const EXPECTED_KEYS = new Set([
  'schemaVersion', 'preferredName', 'learningGoal', 'languagePreference', 'pacePreference',
  'conversationHooks', 'activeIssues', 'resolvedIssues', 'homework', 'nextTopic',
  'callCount', 'lastCefr',
]);

function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && Array.from(value).length <= max;
}

function isNullableText(value: unknown, max: number): boolean {
  return value === null || isText(value, max);
}

export function parseMaxMemoryProjection(value: unknown): MaxMemoryProjection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !EXPECTED_KEYS.has(key)) || row.schemaVersion !== 2) return null;
  if (!isNullableText(row.preferredName, 60) || !isNullableText(row.learningGoal, 160)) return null;
  if (row.languagePreference !== null && row.languagePreference !== 'more_target' && row.languagePreference !== 'more_native') return null;
  if (row.pacePreference !== null && row.pacePreference !== 'slower' && row.pacePreference !== 'normal' && row.pacePreference !== 'faster') return null;
  if (!Array.isArray(row.conversationHooks) || row.conversationHooks.length > 8
    || !row.conversationHooks.every((item) => item && typeof item === 'object'
      && Object.keys(item as object).length === 2
      && isText((item as { id?: unknown }).id, 64)
      && isText((item as { text?: unknown }).text, 140))) return null;
  if (!Array.isArray(row.activeIssues) || row.activeIssues.length > 8
    || !row.activeIssues.every((item) => item && typeof item === 'object'
      && Object.keys(item as object).length === 3
      && isText((item as { id?: unknown }).id, 64)
      && isText((item as { label?: unknown }).label, 140)
      && Number.isInteger((item as { evidenceCount?: unknown }).evidenceCount)
      && Number((item as { evidenceCount?: unknown }).evidenceCount) >= 0)) return null;
  if (!Array.isArray(row.resolvedIssues) || row.resolvedIssues.length > 12
    || !row.resolvedIssues.every((item) => item && typeof item === 'object'
      && Object.keys(item as object).length === 2
      && isText((item as { id?: unknown }).id, 64)
      && isText((item as { label?: unknown }).label, 140))) return null;
  if (!Array.isArray(row.homework) || row.homework.length > 6 || !row.homework.every((item) => isText(item, 180))) return null;
  if (!isText(row.nextTopic, 180) || !Number.isInteger(row.callCount) || Number(row.callCount) < 0
    || !['A1', 'A2', 'B1', 'B2'].includes(String(row.lastCefr))) return null;
  return value as MaxMemoryProjection;
}

const defaultInvoke: MaxMemoryInvoke = async (name, data) => maxVoiceCallable<unknown>(name)(data);

async function projectionCall(name: string, data: Record<string, unknown>, invoke: MaxMemoryInvoke): Promise<MaxMemoryProjection> {
  const result = parseMaxMemoryProjection(await invoke(name, data));
  if (!result) throw new Error('max_memory_response_invalid');
  return result;
}

export function getMaxMemory(invoke: MaxMemoryInvoke = defaultInvoke): Promise<MaxMemoryProjection> {
  return projectionCall('maxVoiceGetMemory', {}, invoke);
}

export function updateMaxMemory(update: MaxMemoryUpdate, invoke: MaxMemoryInvoke = defaultInvoke): Promise<MaxMemoryProjection> {
  return projectionCall('maxVoiceUpdateMemory', update as unknown as Record<string, unknown>, invoke);
}

export function deleteMaxMemoryItem(itemId: string, invoke: MaxMemoryInvoke = defaultInvoke): Promise<MaxMemoryProjection> {
  return projectionCall('maxVoiceDeleteMemoryItem', { itemId }, invoke);
}

export async function clearMaxMemory(invoke: MaxMemoryInvoke = defaultInvoke): Promise<void> {
  const response = await invoke('maxVoiceClearMemory', {});
  if (!response || typeof response !== 'object' || (response as { ok?: unknown }).ok !== true
    || Object.keys(response as object).some((key) => key !== 'ok')) {
    throw new Error('max_memory_clear_invalid');
  }
}
