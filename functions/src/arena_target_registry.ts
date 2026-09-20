import { createHash } from 'node:crypto';

/** Server twin of modules/arena/target_registry.ts. Keep both covered by mirror tests. */
export const ARENA_STUDY_TARGETS = ['en', 'es', 'fr', 'de'] as const;
export type ArenaStudyTarget = typeof ARENA_STUDY_TARGETS[number];

export const ARENA_TASK_MODES = [
  'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
] as const;
export type ArenaTaskMode = typeof ARENA_TASK_MODES[number];

export type ArenaStudyTargetMeta = Readonly<{
  name: 'English' | 'Spanish' | 'French' | 'German';
  sourceLocale: 'ru';
  speechLocale: 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';
  distractorProfile: 'english_core' | 'spanish_agreement' | 'french_agreement' | 'german_case_order';
  modes: readonly ArenaTaskMode[];
}>;

const META: Readonly<Record<ArenaStudyTarget, ArenaStudyTargetMeta>> = Object.freeze({
  en: Object.freeze({ name: 'English', sourceLocale: 'ru', speechLocale: 'en-US', distractorProfile: 'english_core', modes: ARENA_TASK_MODES }),
  es: Object.freeze({ name: 'Spanish', sourceLocale: 'ru', speechLocale: 'es-ES', distractorProfile: 'spanish_agreement', modes: ARENA_TASK_MODES }),
  fr: Object.freeze({ name: 'French', sourceLocale: 'ru', speechLocale: 'fr-FR', distractorProfile: 'french_agreement', modes: ARENA_TASK_MODES }),
  de: Object.freeze({ name: 'German', sourceLocale: 'ru', speechLocale: 'de-DE', distractorProfile: 'german_case_order', modes: ARENA_TASK_MODES }),
});

export const ARENA_LANGUAGE_REGISTRY_VERSION = 'arena-language-registry-v1' as const;

export function resolveArenaStudyTarget(value: unknown): ArenaStudyTarget | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return (ARENA_STUDY_TARGETS as readonly string[]).includes(normalized)
    ? normalized as ArenaStudyTarget
    : null;
}

export function arenaStudyTargetMeta(target: ArenaStudyTarget): ArenaStudyTargetMeta {
  return META[target];
}

export type ArenaTargetPublicationPending<T extends ArenaStudyTarget = ArenaStudyTarget> = Readonly<{
  studyTarget: T;
  enabled: false;
  ready: false;
}>;

export type ArenaTargetPublicationIdentity<T extends ArenaStudyTarget = ArenaStudyTarget> = Readonly<{
  studyTarget: T;
  poolVersion: string;
  manifestSha256: string;
  merkleRootSha256: string;
  factPackVersion: string;
  factPackSha256: string;
}>;

export type ArenaTargetPublication<T extends ArenaStudyTarget = ArenaStudyTarget> =
  ArenaTargetPublicationIdentity<T> & Readonly<{
    enabled: true;
    ready: true;
    publicationFingerprint: string;
    /**
     * Публикация собрана из СТАРОГО конфига, в котором нет `targetPublications`.
     *
     * зачем (владелец 2026-09-20): «контуры других языков не готовы, значит
     * они НЕ ДОЛЖНЫ НИКАК ВЛИЯТЬ на Арену в английском». Задания в Firestore
     * записаны старой схемой — без `studyTarget` и `publicationFingerprint`.
     * Контурный запрос их не находит, и Арена умирает во ВСЕХ языках.
     * По этому признаку выбор заданий идёт старой формой.
     */
    legacy?: true;
  }>;

export type ArenaTargetPublicationState<T extends ArenaStudyTarget = ArenaStudyTarget> =
  | ArenaTargetPublicationPending<T>
  | ArenaTargetPublication<T>;

export type ArenaTargetPublications = Readonly<{
  [T in ArenaStudyTarget]: ArenaTargetPublicationState<T>;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const SHA256_RE = /^[a-f0-9]{64}$/u;
const PENDING_KEYS = ['enabled', 'ready', 'studyTarget'] as const;
const READY_KEYS = [
  'enabled',
  'factPackSha256',
  'factPackVersion',
  'manifestSha256',
  'merkleRootSha256',
  'poolVersion',
  'publicationFingerprint',
  'ready',
  'studyTarget',
] as const;

function hasExactKeys(row: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(row).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function exactNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200 || value.trim() !== value) {
    return null;
  }
  return value;
}

/** Canonical, target-bound identity for one immutable Arena publication. */
export function arenaTargetPublicationFingerprint(
  identity: ArenaTargetPublicationIdentity,
): string {
  const canonical = JSON.stringify([
    'arena-target-publication.v1',
    identity.studyTarget,
    identity.poolVersion,
    identity.manifestSha256,
    identity.merkleRootSha256,
    identity.factPackVersion,
    identity.factPackSha256,
  ]);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** Parse one slot without inventing a legacy/default target. */
export function parseArenaTargetPublicationState<T extends ArenaStudyTarget>(
  value: unknown,
  target: T,
): ArenaTargetPublicationState<T> | null {
  const raw = record(value);
  if (!raw || raw.studyTarget !== target || typeof raw.enabled !== 'boolean') return null;

  if (raw.ready === false) {
    if (raw.enabled !== false || !hasExactKeys(raw, PENDING_KEYS)) return null;
    return { studyTarget: target, enabled: false, ready: false };
  }

  if (raw.ready !== true || raw.enabled !== true || !hasExactKeys(raw, READY_KEYS)) return null;
  const poolVersion = exactNonEmptyString(raw.poolVersion);
  const manifestSha256 = exactNonEmptyString(raw.manifestSha256);
  const merkleRootSha256 = exactNonEmptyString(raw.merkleRootSha256);
  const factPackVersion = exactNonEmptyString(raw.factPackVersion);
  const factPackSha256 = exactNonEmptyString(raw.factPackSha256);
  const publicationFingerprint = exactNonEmptyString(raw.publicationFingerprint);
  if (!poolVersion || !factPackVersion || !manifestSha256 || !merkleRootSha256
    || !factPackSha256 || !publicationFingerprint
    || !SHA256_RE.test(manifestSha256) || !SHA256_RE.test(merkleRootSha256)
    || !SHA256_RE.test(factPackSha256) || !SHA256_RE.test(publicationFingerprint)) return null;

  const identity: ArenaTargetPublicationIdentity<T> = {
    studyTarget: target,
    poolVersion,
    manifestSha256,
    merkleRootSha256,
    factPackVersion,
    factPackSha256,
  };
  if (arenaTargetPublicationFingerprint(identity) !== publicationFingerprint) return null;
  return { ...identity, enabled: true, ready: true, publicationFingerprint };
}

export function parseArenaTargetPublications(value: unknown): ArenaTargetPublications | null {
  const raw = record(value);
  if (!raw || !hasExactKeys(raw, [...ARENA_STUDY_TARGETS].sort())) return null;
  const parsed = {} as Record<ArenaStudyTarget, ArenaTargetPublicationState>;
  for (const target of ARENA_STUDY_TARGETS) {
    const publication = parseArenaTargetPublicationState(raw[target], target);
    if (!publication) return null;
    parsed[target] = publication;
  }
  return parsed as ArenaTargetPublications;
}

/** A language is playable only after its own immutable publication is marked ready. */
export function resolveArenaTargetPublication(
  config: unknown,
  target: ArenaStudyTarget,
): ArenaTargetPublication | null {
  const root = record(config);
  /**
   * Конфиг БЕЗ поля `targetPublications` — документ, написанный до появления
   * языковых контуров. Такой лежит на боевом Firestore прямо сейчас.
   *
   * зачем (инцидент 2026-09-20): деплой новых функций на этот старый конфиг
   * положил Арену целиком — `arena_config_incompatible:target_publications`,
   * очередь не создавалась вовсе, поиск шёл бесконечно. Отсутствие поля
   * означает «контуров ещё нет», а не «Арена сломана»: до них один контент
   * обслуживал все языки, и вернуть это поведение безопасно.
   *
   * Поле ЕСТЬ, но контур не готов -> по-прежнему отказ: это осознанное
   * решение администратора, и обходить его нельзя.
   */
  if (root && root.targetPublications === undefined) {
    return legacySingleContourPublication(config, target);
  }
  const publications = parseArenaTargetPublications(root?.targetPublications);
  if (!publications) return null;
  const publication = publications[target];
  return publication.ready ? publication : null;
}

/**
 * Публикация до эпохи контуров: идентичность берётся из `contentPublication`,
 * который в старом конфиге есть всегда. Отпечаток считается тем же способом,
 * что и для контурной публикации, поэтому клиент его принимает.
 */
function legacySingleContourPublication(
  config: unknown,
  target: ArenaStudyTarget,
): ArenaTargetPublication | null {
  const root = record(config);
  const content = record(root?.contentPublication);
  const poolVersion = typeof content?.poolVersion === 'string' ? content.poolVersion : '';
  const manifestSha256 = typeof content?.manifestSha256 === 'string' ? content.manifestSha256 : '';
  const merkleRootSha256 = typeof content?.merkleRootSha256 === 'string'
    ? content.merkleRootSha256
    : '';
  // Без этих трёх полей конфиг нерабочий и в старой схеме тоже — отказ честен.
  if (!poolVersion || !manifestSha256 || !merkleRootSha256) return null;
  const identity = {
    studyTarget: target,
    poolVersion,
    manifestSha256,
    merkleRootSha256,
    factPackVersion: typeof content?.factPackVersion === 'string' ? content.factPackVersion : '',
    factPackSha256: typeof content?.factPackSha256 === 'string' ? content.factPackSha256 : '',
  } as const;
  return {
    ...identity,
    enabled: true,
    ready: true,
    publicationFingerprint: arenaTargetPublicationFingerprint(identity),
    legacy: true,
  };
}

export function arenaTargetPublicationDisabled<T extends ArenaStudyTarget>(
  studyTarget: T,
): ArenaTargetPublicationPending<T> {
  return Object.freeze({ studyTarget, enabled: false, ready: false });
}

/** CAS comparison used by publication activation/rollback; pending slots compare as null. */
export function arenaTargetPublicationPointer(
  value: ArenaTargetPublicationState | null | undefined,
): string | null {
  return value?.ready === true ? value.publicationFingerprint : null;
}

/** Firestore row identity is publication-scoped so unchanged content can coexist across rotations. */
export function arenaPublishedTaskDocumentId(
  publication: Pick<ArenaTargetPublication, 'studyTarget' | 'publicationFingerprint'>,
  sourceTaskId: string,
): string {
  if (!ARENA_STUDY_TARGETS.includes(publication.studyTarget)
    || !SHA256_RE.test(publication.publicationFingerprint)
    || typeof sourceTaskId !== 'string' || !sourceTaskId || sourceTaskId.includes('/')) {
    throw new Error('arena_published_task_identity_invalid');
  }
  const digest = createHash('sha256')
    .update(JSON.stringify(['arena-published-task.v1', publication.publicationFingerprint, sourceTaskId]), 'utf8')
    .digest('hex');
  return `apub_${publication.studyTarget}_${publication.publicationFingerprint.slice(0, 16)}_${digest}`;
}

export function arenaPublishedTaskCursorDocumentId(
  publication: Pick<ArenaTargetPublication, 'studyTarget' | 'publicationFingerprint'>,
  cursorMaterial: string,
): string {
  return arenaPublishedTaskDocumentId(publication, `cursor:${cursorMaterial}`);
}
