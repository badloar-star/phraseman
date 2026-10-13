import type {
  DialogueV2CatalogueLearnerItem,
  DialogueV2CatalogueWorld,
} from '../components/dialogs/DialogueV2CatalogueSection';
import {
  DIALOGUE_V2_CATALOGUE_INDEX,
  type DialogueV2CatalogueEntry,
} from '../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_OPENING_MAX_LENGTH,
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from '../shared/dialogue_v2_language_pack_contract';
import { DIALOGUE_V2_WORLD_IDS, type DialogueV2WorldId } from '../shared/dialogue_v2_contract';
import {
  getDialogueV2LocalRankAccess,
  logDialogueV2RankGate,
  type DialogueV2RankGateRow,
} from './dialogue_v2_local_rank_access';

export type DialogueV2AuthorizedCatalogueProjection = Readonly<{
  worlds: readonly DialogueV2CatalogueWorld[];
  items: readonly DialogueV2CatalogueLearnerItem[];
}>;

export type DialogueV2AuthorizedCatalogueProjectionInput = Readonly<{
  /** Exact allowlisted learner packets from the authorized server callable. */
  packets: readonly unknown[];
  studyTarget: unknown;
  localCoinRank: unknown;
  worldHeadings: readonly unknown[];
  /**
   * зачем (координатор 12.10, dialogs-003): id сценариев, пройденных на этом устройстве (app/dialogue_v2_done_store.ts). Нет набора = ни один не пройден.
   * Пройденный сценарий получает статус 'done' (доступ по рангу уже был, иначе его не прошли); сеть и Firestore не участвуют.
   */
  doneScenarioIds?: ReadonlySet<string>;
}>;

type PlainRecord = Record<string, unknown>;

const TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const PERSONA_STYLES = new Set(['warm', 'direct', 'calm', 'playful', 'formal']);
const VOICE_MODES = new Set(['text_only', 'optional_prepared_voice']);
const MOODS = new Set(['open', 'focused', 'helpful', 'measured', 'energetic']);
const CORRECTIONS = new Set(['none', 'gentle', 'playful_gentle']);

function plainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) return null;
    if (Object.values(descriptors).some((descriptor) => !descriptor.enumerable || !('value' in descriptor))) return null;
    return value as PlainRecord;
  } catch {
    return null;
  }
}

function exactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function learnerText(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string' && value === value.trim()
    && value.length >= minimum && value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value);
}

function token(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

function studyTarget(value: unknown): value is DialogueV2StudyTarget {
  return typeof value === 'string' && (DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(value);
}

function validWorldHeadings(value: readonly unknown[]): readonly DialogueV2CatalogueWorld[] | null {
  if (value.length !== DIALOGUE_V2_WORLD_IDS.length) return null;
  const ids = new Set<string>();
  const headings: DialogueV2CatalogueWorld[] = [];
  for (const candidate of value) {
    const heading = plainRecord(candidate);
    if (!heading || !exactKeys(heading, ['id', 'title'])
      || typeof heading.id !== 'string' || !DIALOGUE_V2_WORLD_IDS.includes(heading.id as DialogueV2WorldId)
      || ids.has(heading.id) || !learnerText(heading.title, 1, 80)) return null;
    ids.add(heading.id);
    headings.push(Object.freeze({ id: heading.id, title: heading.title }));
  }
  return ids.size === DIALOGUE_V2_WORLD_IDS.length ? Object.freeze(headings) : null;
}

function validPacket(value: unknown, expected: DialogueV2CatalogueEntry, target: DialogueV2StudyTarget): string | null {
  const packet = plainRecord(value);
  if (!packet || !exactKeys(packet, ['studyTarget', 'scenario', 'content']) || packet.studyTarget !== target) return null;
  const scenario = plainRecord(packet.scenario);
  if (!scenario || !exactKeys(scenario, [
    'id', 'worldId', 'rankRequired', 'cefr', 'personas', 'objectives', 'groupReplyPolicy',
  ]) || scenario.id !== expected.id || scenario.worldId !== expected.worldId
    || scenario.rankRequired !== expected.rankRequired || scenario.cefr !== expected.cefr) return null;
  if (!Array.isArray(scenario.personas) || scenario.personas.length < 1 || scenario.personas.length > 6
    || !Array.isArray(scenario.objectives) || scenario.objectives.length < 6 || scenario.objectives.length > 12) return null;
  const personaIds = new Set<string>();
  for (const rawPersona of scenario.personas) {
    const persona = plainRecord(rawPersona);
    if (!persona || !exactKeys(persona, ['id', 'replyStyle', 'voiceMode', 'displayName', 'styleNote', 'mood', 'correctionStyle'])
      || !token(persona.id) || personaIds.has(persona.id) || !PERSONA_STYLES.has(persona.replyStyle as string)
      || !VOICE_MODES.has(persona.voiceMode as string) || !MOODS.has(persona.mood as string)
      || !CORRECTIONS.has(persona.correctionStyle as string) || !learnerText(persona.displayName, 1, 64)
      || !learnerText(persona.styleNote, 3, 240)) return null;
    personaIds.add(persona.id);
  }
  const objectiveIds = new Set<string>();
  for (const rawObjective of scenario.objectives) {
    const objective = plainRecord(rawObjective);
    if (!objective || !exactKeys(objective, ['id', 'label']) || !token(objective.id)
      || objectiveIds.has(objective.id) || !learnerText(objective.label, 3, 240)) return null;
    objectiveIds.add(objective.id);
  }
  const policy = plainRecord(scenario.groupReplyPolicy);
  if (!policy || !exactKeys(policy, ['maxDirectReplies', 'maxUsefulFollowUps', 'silenceAllowed'])
    || policy.maxDirectReplies !== 1 || (policy.maxUsefulFollowUps !== 0 && policy.maxUsefulFollowUps !== 1)
    || policy.silenceAllowed !== true) return null;
  const content = plainRecord(packet.content);
  // зачем (контракт с «Дизайном» 01.10): content.opening = { personaId, text } — первая
  // реплика на изучаемом языке, необязательна; если есть — строго от участника сцены.
  const hasOpening = Boolean(content) && Object.prototype.hasOwnProperty.call(content, 'opening');
  if (!content || !exactKeys(content, hasOpening
    ? ['title', 'briefing', 'completionTone', 'opening']
    : ['title', 'briefing', 'completionTone'])) return null;
  if (hasOpening && !validOpening(content.opening, personaIds)) return null;
  return learnerText(content.title, 3, 120) && learnerText(content.briefing, 8, 480)
    && learnerText(content.completionTone, 3, 96) ? content.title : null;
}

function validOpening(value: unknown, personaIds: ReadonlySet<string>): boolean {
  const opening = plainRecord(value);
  return Boolean(opening && exactKeys(opening, ['personaId', 'text'])
    && typeof opening.personaId === 'string' && personaIds.has(opening.personaId)
    && learnerText(opening.text, 1, DIALOGUE_V2_OPENING_MAX_LENGTH));
}

/**
 * Re-validates the deliberately reduced public callable response before it is
 * rendered. It is not an authorization boundary: server release authorization
 * happens first. This protects the mobile surface from malformed or extended
 * network data without reintroducing private release metadata to the client.
 */
export function projectAuthorizedDialogueV2Catalogue(
  input: DialogueV2AuthorizedCatalogueProjectionInput,
): DialogueV2AuthorizedCatalogueProjection | null {
  try {
    if (!studyTarget(input.studyTarget) || input.packets.length !== DIALOGUE_V2_CATALOGUE_INDEX.length) return null;
    const worlds = validWorldHeadings(input.worldHeadings);
    if (!worlds) return null;
    const observed = new Set<string>();
    const items: DialogueV2CatalogueLearnerItem[] = [];
    const doneIds = input.doneScenarioIds ?? null;
    const statusLog: string[] = [];
    const gateRows: DialogueV2RankGateRow[] = [];
    for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
      const packet = input.packets.find((candidate) => plainRecord(candidate)?.scenario
        && plainRecord(plainRecord(candidate)?.scenario)?.id === entry.id);
      const title = validPacket(packet, entry, input.studyTarget);
      const rankAccess = getDialogueV2LocalRankAccess(entry.id, input.localCoinRank);
      if (!title || !rankAccess || observed.has(entry.id)) return null;
      observed.add(entry.id);
      const unlocked = rankAccess.access.status === 'unlocked';
      const isDone = doneIds?.has(entry.id) === true;
      const status: DialogueV2CatalogueLearnerItem['status'] = isDone ? 'done' : unlocked ? 'available' : 'locked';
      if (isDone || !unlocked) statusLog.push(`${entry.id}:${status}(${isDone ? 'в_хранилище_прохождений' : `ранг_${entry.unlockRank}_закрыт`})`);
      gateRows.push({ id: entry.id, cefr: entry.cefr, unlockRank: entry.unlockRank, decision: isDone ? 'пройден' : unlocked ? 'открыт' : 'закрыт' });
      items.push(Object.freeze({
        id: entry.id,
        worldId: entry.worldId,
        title,
        cefr: entry.cefr,
        // зачем (правило владельца 13.10): в подписи «Откроется на ранге N» и в брифинге — ранг открытия из таблицы, не номер в разделе
        rankRequired: entry.unlockRank,
        status,
      }));
    }
    logDialogueV2RankGate('authorized', input.studyTarget, input.localCoinRank, gateRows);
    console.log(`[DIALOG-DONE] projection target=${String(input.studyTarget)} rank=${String(input.localCoinRank)} сценариев=${items.length} известно_пройденных=${doneIds?.size ?? 0} done=${items.filter((item) => item.status === 'done').length} locked=${items.filter((item) => item.status === 'locked').length} available=${items.filter((item) => item.status === 'available').length} решения=[${statusLog.join(' ')}]`); // guard-ok: итог проекции
    return observed.size === DIALOGUE_V2_CATALOGUE_INDEX.length
      ? Object.freeze({ worlds, items: Object.freeze(items) })
      : null;
  } catch (error: unknown) {
    console.warn(`[DIALOG-DONE] projection → исключение, каталог не показан: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
    return null;
  }
}
