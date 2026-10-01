/**
 * Служебный текст Диалогов V2 на языке ИНТЕРФЕЙСА (контракт с сессией «Дизайн», 01.10):
 * dialogueV2UiCopy(uiLang, scenarioId) → { title, briefing, objectiveLabels, personas } | null.
 *
 * зачем (владелец 01.10: «Почему диалоги в русском интерфейсе все на английском?»): пакет
 * выпуска несёт эти поля только на изучаемом языке. Здесь — снимок
 * shared/generated/dialogue_v2_ui_copy.<uiLang>.json (scripts/dialogue_v2_ui_copy.ts),
 * синхронно из бандла, без сети и без Firestore. Вычисляется ТОЛЬКО файл текущего
 * языка интерфейса (ленивый require по языку; Metro кладёт все в бандл, но модуль
 * исполняется при первом обращении). Кэш на процесс — файл разбирается один раз.
 *
 * Сама реплика персонажа и всё, что пишет ИИ, остаются на изучаемом языке —
 * переводится только «обвязка» сцены.
 */

export type DialogueV2UiCopy = Readonly<{
  title: string;
  briefing: string;
  objectiveLabels: Readonly<Record<string, string>>;
  personas: Readonly<Record<string, Readonly<{ displayName: string; styleNote: string }>>>;
}>;

type UiCopyLang = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type UiCopySnapshot = Readonly<{
  uiLang: UiCopyLang;
  source: string;
  worlds: Readonly<Record<string, string>>;
  scenarios: Readonly<Record<string, DialogueV2UiCopy>>;
}>;

const LOG = '[DIALOGUE-V2] i18n';
const UI_COPY_LANGS: ReadonlySet<string> = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
// зачем: язык интерфейса без своего снимка (будущие локали) получает английский, а не пустоту.
const FALLBACK_LANG: UiCopyLang = 'en';

function requireUiCopy(uiLang: UiCopyLang): unknown {
  switch (uiLang) {
    case 'ru': return require('../shared/generated/dialogue_v2_ui_copy.ru.json');
    case 'uk': return require('../shared/generated/dialogue_v2_ui_copy.uk.json');
    case 'en': return require('../shared/generated/dialogue_v2_ui_copy.en.json');
    case 'es': return require('../shared/generated/dialogue_v2_ui_copy.es.json');
    case 'pt-BR': return require('../shared/generated/dialogue_v2_ui_copy.pt-BR.json');
    case 'vi': return require('../shared/generated/dialogue_v2_ui_copy.vi.json');
    case 'id': return require('../shared/generated/dialogue_v2_ui_copy.id.json');
    case 'tr': return require('../shared/generated/dialogue_v2_ui_copy.tr.json');
    case 'pl': return require('../shared/generated/dialogue_v2_ui_copy.pl.json');
    default: return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const snapshotCache = new Map<UiCopyLang, UiCopySnapshot | null>();

function loadSnapshot(uiLang: UiCopyLang): UiCopySnapshot | null {
  if (snapshotCache.has(uiLang)) return snapshotCache.get(uiLang) ?? null;
  let snapshot: UiCopySnapshot | null = null;
  try {
    const raw = requireUiCopy(uiLang);
    if (isRecord(raw) && raw.uiLang === uiLang && isRecord(raw.scenarios) && isRecord(raw.worlds)) {
      snapshot = raw as unknown as UiCopySnapshot;
      console.log(LOG, JSON.stringify({ event: 'loaded', uiLang, source: snapshot.source, scenarios: Object.keys(snapshot.scenarios).length }));
    } else {
      console.warn(LOG, JSON.stringify({ event: 'snapshot_invalid', uiLang, schemaVersion: isRecord(raw) ? raw.schemaVersion ?? null : null }));
    }
  } catch (error) {
    console.warn(LOG, JSON.stringify({ event: 'snapshot_load_failed', uiLang, message: error instanceof Error ? error.message : String(error) }));
  }
  snapshotCache.set(uiLang, snapshot);
  return snapshot;
}

function resolveLang(uiLang: unknown): Readonly<{ lang: UiCopyLang; fallback: boolean }> {
  if (typeof uiLang === 'string' && UI_COPY_LANGS.has(uiLang)) return { lang: uiLang as UiCopyLang, fallback: false };
  return { lang: FALLBACK_LANG, fallback: true };
}

const loggedFallbacks = new Set<string>();

/** Служебный текст сцены на языке интерфейса; null — сцены нет в снимке (лог). */
export function dialogueV2UiCopy(uiLang: unknown, scenarioId: unknown): DialogueV2UiCopy | null {
  const resolved = resolveLang(uiLang);
  if (resolved.fallback && !loggedFallbacks.has(String(uiLang))) {
    loggedFallbacks.add(String(uiLang));
    console.warn(LOG, JSON.stringify({ event: 'fallback', uiLang: String(uiLang).slice(0, 16), to: resolved.lang }));
  }
  if (typeof scenarioId !== 'string') {
    console.warn(LOG, JSON.stringify({ event: 'scenario_invalid', uiLang: resolved.lang }));
    return null;
  }
  const snapshot = loadSnapshot(resolved.lang);
  const copy = snapshot?.scenarios[scenarioId] ?? null;
  if (!copy) {
    console.warn(LOG, JSON.stringify({ event: 'scenario_missing', uiLang: resolved.lang, scenarioId: scenarioId.slice(0, 64), hasSnapshot: Boolean(snapshot) }));
    return null;
  }
  return copy;
}

/** Название мира хаба на языке интерфейса (social/work/travel/everyday); null — нет в снимке. */
export function dialogueV2UiWorldTitle(uiLang: unknown, worldId: unknown): string | null {
  if (typeof worldId !== 'string') return null;
  const snapshot = loadSnapshot(resolveLang(uiLang).lang);
  const title = snapshot?.worlds[worldId];
  return typeof title === 'string' ? title : null;
}

/** Только для тестов: сброс кэша снимков. */
export function resetDialogueV2UiCopyCacheForTests(): void {
  snapshotCache.clear();
  loggedFallbacks.clear();
}
