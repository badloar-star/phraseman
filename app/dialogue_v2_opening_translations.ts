/**
 * Перевод ПЕРВОЙ реплики сценарного диалога на язык интерфейса — таблица в бандле, вне пакета.
 *
 * зачем (жалоба владельца 25.10 «нет кнопки ПЕРЕВЕСТИ»; координатор: «Перевести» у каждого сообщения): ответы собеседника
 * переводит разбор хода, а у content.opening перевода нет, и положить его в пакет нельзя без выкладки сервера (хэш пакета,
 * проверка opening в 2.0.0 — ровно 2 поля). Снимок shared/generated/dialogue_v2_opening_translations.<uiLang>.json
 * (scripts/dialogue_v2_opening_translations.mjs) хранит исходник: реплика в пакете изменилась — перевод не показываем.
 * Исполняется только файл текущего языка интерфейса, один раз за процесс; без сети и Firestore.
 */

type OpeningLang = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type OpeningEntry = Readonly<{ source: string; text: string }>;
type OpeningTable = Readonly<{ uiLang: OpeningLang; entries: Readonly<Record<string, OpeningEntry>> }>;

const LOG = '[DIALOG-BUBBLE]';

function requireTable(uiLang: OpeningLang): unknown {
  switch (uiLang) {
    case 'ru': return require('../shared/generated/dialogue_v2_opening_translations.ru.json');
    case 'uk': return require('../shared/generated/dialogue_v2_opening_translations.uk.json');
    case 'en': return require('../shared/generated/dialogue_v2_opening_translations.en.json');
    case 'es': return require('../shared/generated/dialogue_v2_opening_translations.es.json');
    case 'pt-BR': return require('../shared/generated/dialogue_v2_opening_translations.pt-BR.json');
    case 'vi': return require('../shared/generated/dialogue_v2_opening_translations.vi.json');
    case 'id': return require('../shared/generated/dialogue_v2_opening_translations.id.json');
    case 'tr': return require('../shared/generated/dialogue_v2_opening_translations.tr.json');
    case 'pl': return require('../shared/generated/dialogue_v2_opening_translations.pl.json');
    default: return null;
  }
}

const LANGS: ReadonlySet<string> = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
const tableCache = new Map<OpeningLang, OpeningTable | null>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function loadTable(uiLang: OpeningLang): OpeningTable | null {
  if (tableCache.has(uiLang)) return tableCache.get(uiLang) ?? null;
  let table: OpeningTable | null = null;
  try {
    const raw = requireTable(uiLang);
    if (isRecord(raw) && raw.uiLang === uiLang && isRecord(raw.entries)) table = raw as unknown as OpeningTable;
    else console.warn(LOG, JSON.stringify({ event: 'opening_table_invalid', uiLang }));
  } catch (error) {
    console.warn(LOG, JSON.stringify({ event: 'opening_table_load_failed', uiLang, message: error instanceof Error ? error.message : String(error) }));
  }
  tableCache.set(uiLang, table);
  return table;
}

/** Перевод первой реплики или null (нет языка/записи, исходник разошёлся с пакетом) — причина в журнале. */
export function dialogueV2OpeningTranslation(input: Readonly<{
  uiLang: unknown;
  studyTarget: unknown;
  scenarioId: string;
  openingText: string;
}>): string | null {
  if (typeof input.uiLang !== 'string' || !LANGS.has(input.uiLang) || typeof input.studyTarget !== 'string') return null;
  if (input.uiLang === input.studyTarget) return null;
  const key = `${input.studyTarget}:${input.scenarioId}`;
  const entry = loadTable(input.uiLang as OpeningLang)?.entries[key];
  if (!entry) return null;
  if (entry.source !== input.openingText) {
    console.warn(LOG, JSON.stringify({ event: 'opening_table_mismatch', uiLang: input.uiLang, key }));
    return null;
  }
  const text = typeof entry.text === 'string' ? entry.text.trim() : '';
  return text.length > 0 && text.length <= 800 ? text : null;
}

/** Только для тестов. */
export function resetDialogueV2OpeningTranslationsForTests(): void {
  tableCache.clear();
}
