import { getDialogueV2CatalogueEntry } from '../shared/dialogue_v2_catalogue_index';
import { projectAuthorizedDialogueV2Catalogue } from './dialogue_v2_authorized_catalogue_projection';

import { dialogueV2UiCopy } from './dialogue_v2_ui_copy';

export type DialogueV2BriefingModel = Readonly<{
  title: string;
  cefr: string;
  briefing: string;
  rankRequired: number;
  unlocked: boolean;
  objectives: readonly Readonly<{ id: string; label: string }>[];
  participants: readonly Readonly<{ id: string; displayName: string; styleNote: string }>[];
  /** Первая реплика персонажа из пакета (content.opening) — видна в первом кадре; нет поля — null.
   *  translation — перевод на язык интерфейса из content.opening.translations; нет в пакете — null (кнопки «Перевод» нет). */
  opening: Readonly<{ personaId: string; text: string; translation: string | null }> | null;
}>;

export type DialogueV2BriefingModelInput = Readonly<{
  packets: readonly unknown[];
  studyTarget: unknown;
  scenarioId: unknown;
  localCoinRank: unknown;
  /** Язык интерфейса: служебный текст (название, описание, задания, имена) — на нём. */
  uiLang?: unknown;
}>;

const INTERNAL_WORLD_HEADINGS = Object.freeze([
  { id: 'social', title: 'social' }, { id: 'work', title: 'work' },
  { id: 'travel', title: 'travel' }, { id: 'everyday', title: 'everyday' },
]);

type VerifiedPacket = Readonly<{
  scenario: Readonly<{
    id: string;
    personas: readonly Readonly<{ id: string; displayName: string; styleNote: string }>[];
    objectives: readonly Readonly<{ id: string; label: string }>[];
  }>;
  content: Readonly<{ title: string; briefing: string; opening?: unknown }>;
}>;

function packetWithId(packets: readonly unknown[], scenarioId: string): VerifiedPacket | null {
  for (const packet of packets) {
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) continue;
    const scenario = (packet as { scenario?: unknown }).scenario;
    if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)
      || (scenario as { id?: unknown }).id !== scenarioId) continue;
    return packet as VerifiedPacket;
  }
  return null;
}

/**
 * Converts an already revalidated public V2 catalogue response into the exact
 * briefing view data for one route ID. Route params contain only the ID; no
 * learner content is serialized into navigation.
 */
export function buildDialogueV2BriefingModel(
  input: DialogueV2BriefingModelInput,
): DialogueV2BriefingModel | null {
  if (typeof input.scenarioId !== 'string' || !getDialogueV2CatalogueEntry(input.scenarioId)) return null;
  const catalogue = projectAuthorizedDialogueV2Catalogue({
    packets: input.packets,
    studyTarget: input.studyTarget,
    localCoinRank: input.localCoinRank,
    worldHeadings: INTERNAL_WORLD_HEADINGS,
  });
  const item = catalogue?.items.find((candidate) => candidate.id === input.scenarioId);
  const packet = item ? packetWithId(input.packets, item.id) : null;
  if (!item || !packet) return null;
  // зачем (владелец 01.10): служебный текст сцены — на языке интерфейса (данные Ядра,
  // app/dialogue_v2_ui_copy.ts); перевода нет — показываем пакет как раньше. Реплики не трогаем.
  const ui = input.uiLang === undefined ? null : dialogueV2UiCopy(input.uiLang, item.id);
  return Object.freeze({
    title: ui?.title ?? packet.content.title,
    cefr: item.cefr,
    briefing: ui?.briefing ?? packet.content.briefing,
    rankRequired: item.rankRequired,
    unlocked: item.status !== 'locked',
    objectives: Object.freeze(packet.scenario.objectives.map((objective) => Object.freeze({
      ...objective,
      label: ui?.objectiveLabels[objective.id] ?? objective.label,
    }))),
    participants: Object.freeze(packet.scenario.personas.map((participant) => Object.freeze({
      id: participant.id,
      displayName: ui?.personas[participant.id]?.displayName ?? participant.displayName,
      styleNote: ui?.personas[participant.id]?.styleNote ?? participant.styleNote,
    }))),
    opening: openingOf(packet, input.uiLang),
  });
}

// зачем (владелец 01.10: «первая реплика всегда уже должна быть на экране»): поле content.opening
// добавляет Ядро; пока его нет или оно битое — null, экран открывается без падения.
function openingOf(packet: VerifiedPacket, uiLang: unknown): Readonly<{ personaId: string; text: string; translation: string | null }> | null {
  const raw = packet.content.opening;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { personaId, text, translations } = raw as { personaId?: unknown; text?: unknown; translations?: unknown };
  if (typeof personaId !== 'string' || typeof text !== 'string' || text.trim().length === 0 || text.length > 600) return null;
  if (!packet.scenario.personas.some((persona) => persona.id === personaId)) return null;
  return Object.freeze({ personaId, text: text.trim(), translation: openingTranslationOf(translations, uiLang) });
}

/**
 * зачем (жалоба владельца 25.10 «нет кнопки Перевести»; решение координатора: перевод готовых реплик — из контента пакета, офлайн):
 * content.opening.translations — { [язык интерфейса]: текст } от Ядра. Нет поля / нет языка / битый текст — null (кнопки нет).
 */
function openingTranslationOf(translations: unknown, uiLang: unknown): string | null {
  if (typeof uiLang !== 'string' || !translations || typeof translations !== 'object' || Array.isArray(translations)) return null;
  const value = (translations as Record<string, unknown>)[uiLang];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 800 ? trimmed : null;
}
