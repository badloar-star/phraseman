/**
 * Встроенный выпуск Диалогов V2 из ОДОБРЕННОГО владельцем кандидата.
 *
 * зачем (владелец 01.10: «ТАКОГО НИГДЕ НЕ ДОЛЖНО БЫТЬ В ПРИЛОЖЕНИИ!!!» про карточку
 * «Диалоги не загрузились»): в проде нет выпуска (dialogue_v2_release_control/active
 * отсутствует) и в репозитории нет публикатора. Вместо записи прод-данных выпуск
 * собирается здесь детерминированно и едет вместе с кодом:
 *   - functions/src/generated/dialogue_v2_server_release.json — полный серверный
 *     выпуск (манифест + 304 пакета), запасной источник для всех функций Диалогов V2,
 *     когда указателя в Firestore нет;
 *   - content.opening каждого пакета — первая реплика персонажа из
 *     content/dialogues-v2/opening-lines/opening_lines.v1.json (вне кандидата, с автопроверками);
 *   - shared/generated/dialogue_v2_learner_catalogue.<язык>.json — только поля
 *     learner-пакета (то же, что отдаёт dialogueV2Catalogue), чтобы телефон показал
 *     каталог сразу, даже без сети и без выложенной функции.
 *
 * Вход принимается ТОЛЬКО если квитанция одобрения совпадает с кандидатом, а кандидат —
 * с исходниками (evaluateDialogueV2ContentPromotionGate). Каждый пакет дополнительно
 * сверяется с targetPayloadSha256 из одобренного кандидата: в выпуск не может попасть
 * текст, которого владелец не одобрял.
 *
 * Запуск:  npx tsx scripts/dialogue_v2_embedded_release.ts --write
 * Сторож:  npx tsx scripts/dialogue_v2_embedded_release.ts --check   (падает при расхождении)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_REVIEW_ROLES,
  DIALOGUE_V2_STUDY_TARGETS,
  validateDialogueV2LanguagePack,
  type DialogueV2ApprovedLanguagePackManifest,
  type DialogueV2LanguagePack,
  type DialogueV2StudyTarget,
} from '../shared/dialogue_v2_language_pack_contract';
import { computeDialogueV2PackSha256 } from '../functions/src/dialogue_v2_pack_integrity';
import {
  authorizeDialogueV2ServerCatalogue,
  authorizeDialogueV2ServerPacket,
} from '../functions/src/dialogue_v2_server_authorization';
import {
  evaluateDialogueV2ContentPromotionGate,
  hashDialogueV2CandidateValue,
  type DialogueV2ContentCandidateManifest,
} from './dialogue_v2_content_release_candidate';
import { readDialogueV2OpeningLines, type DialogueV2OpeningLines } from './dialogue_v2_opening_lines';

const LOG = '[DIALOGUE-V2-RELEASE]';
const CANDIDATE_PATH = 'content/dialogues-v2/release-candidate/dialogue_v2_content_candidate.v1.json';
const APPROVED_RECEIPT_PATH = 'content/dialogues-v2/release-candidate/dialogue_v2_content_review_receipt.owner-approved.v1.json';
const LEDGER_PATH = 'content/dialogues-v2/authoring/dialogue_v2_authoring_ru.json';
const PROFILES_PATH = 'content/dialogues-v2/authoring/dialogue_v2_persona_locale_profiles.v1.json';
export const DIALOGUE_V2_EMBEDDED_SERVER_RELEASE_PATH = 'functions/src/generated/dialogue_v2_server_release.json';
/** Один файл на язык: телефон вычисляет (парсит) только снимок текущего языка. */
export function dialogueV2EmbeddedLearnerSnapshotPath(studyTarget: DialogueV2StudyTarget): string {
  return `shared/generated/dialogue_v2_learner_catalogue.${studyTarget}.json`;
}
const SERVER_SCHEMA = 'dialogue-v2-embedded-server-release.v1';
const SNAPSHOT_SCHEMA = 'dialogue-v2-embedded-learner-catalogue.v1';
/** Канонический токен пакета (validateDialogueV2PackReference): id одобренного кандидата. */
const PACK_VERSION = 'dialogue-v2-content-candidate-v1';
/**
 * зачем: в авторском контенте нет voiceMode. Готовой озвучки реплик персонажей
 * (prepared bot voice) в выпуске нет, а 'optional_prepared_voice' заставил бы сервер
 * искать клипы, которых не существует. 'text_only' — честное значение по факту
 * контента; включение голоса — отдельное решение владельца (вопрос координатору).
 */
const DEFAULT_VOICE_MODE = 'text_only' as const;

type PlainRecord = Record<string, unknown>;

function record(value: unknown, error: string): PlainRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(error);
  return value as PlainRecord;
}

function array(value: unknown, error: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(error);
  return value;
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && value.length > 0;
}

function readJson(repoRoot: string, relativePath: string): Readonly<{ value: unknown; bytes: Buffer }> {
  const bytes = fs.readFileSync(path.join(repoRoot, ...relativePath.split('/')));
  return { value: JSON.parse(bytes.toString('utf8')) as unknown, bytes };
}

type LedgerPersona = Readonly<{ id: string; replyStyle: string; mood: string; correctionStyle: string }>;

function ledgerPersonasByScenario(ledger: PlainRecord): ReadonlyMap<string, readonly LedgerPersona[]> {
  const result = new Map<string, readonly LedgerPersona[]>();
  for (const rawWorld of array(ledger.worlds, 'ledger_worlds_invalid')) {
    const world = record(rawWorld, 'ledger_world_invalid');
    for (const rawScenario of array(world.scenarios, 'ledger_scenarios_invalid')) {
      const scenario = record(rawScenario, 'ledger_scenario_invalid');
      const personas = array(scenario.personas, `ledger_personas_invalid:${String(scenario.id)}`).map((raw) => {
        const persona = record(raw, `ledger_persona_invalid:${String(scenario.id)}`);
        if (!text(persona.id) || !text(persona.replyStyle) || !text(persona.mood) || !text(persona.correctionStyle)) {
          throw new Error(`ledger_persona_behavior_missing:${String(scenario.id)}:${String(persona.id)}`);
        }
        return Object.freeze({
          id: persona.id,
          replyStyle: persona.replyStyle,
          mood: persona.mood,
          correctionStyle: persona.correctionStyle,
        });
      });
      result.set(String(scenario.id), Object.freeze(personas));
    }
  }
  return result;
}

export type DialogueV2EmbeddedServerReleaseFile = Readonly<{
  schemaVersion: typeof SERVER_SCHEMA;
  source: Readonly<{
    candidateId: string;
    candidateManifestSha256: string;
    reviewReceiptPath: string;
    reviewReceiptSha256: string;
    packetCount: number;
  }>;
  release: Readonly<{
    manifest: DialogueV2ApprovedLanguagePackManifest;
    packets: Readonly<Record<string, DialogueV2LanguagePack>>;
  }>;
}>;

export type DialogueV2EmbeddedLearnerSnapshotFile = Readonly<{
  schemaVersion: typeof SNAPSHOT_SCHEMA;
  candidateManifestSha256: string;
  studyTarget: DialogueV2StudyTarget;
  packets: readonly unknown[];
}>;

export type DialogueV2EmbeddedReleaseBuild = Readonly<{
  server: DialogueV2EmbeddedServerReleaseFile;
  snapshots: Readonly<Record<DialogueV2StudyTarget, DialogueV2EmbeddedLearnerSnapshotFile>>;
  /** Открывающие фразы свободного разговора (shared/dialogue_v2_freeform_openings.generated.ts). */
  freeformOpenings: Readonly<Record<DialogueV2StudyTarget, string>>;
}>;

/** Общий для телефона и сервера модуль открывающих фраз свободного разговора. */
export const DIALOGUE_V2_FREEFORM_OPENINGS_PATH = 'shared/dialogue_v2_freeform_openings.generated.ts';

export function serializeDialogueV2FreeformOpenings(openings: Readonly<Record<DialogueV2StudyTarget, string>>): string {
  return [
    '// СГЕНЕРИРОВАНО scripts/dialogue_v2_embedded_release.ts --write — руками не править.',
    '// Источник: content/dialogues-v2/opening-lines/opening_lines.v1.json (freeform).',
    '// зачем (владелец 01.10): первая реплика свободного разговора видна сразу; сервер',
    '// кладёт ту же фразу первым ходом собеседника в историю (не генерирует её ИИ).',
    `export const DIALOGUE_V2_FREEFORM_OPENINGS = Object.freeze(${JSON.stringify(openings, null, 2)} as const);`,
    '',
  ].join('\n');
}

/** Детерминированная сборка из одобренного кандидата; бросает при любом расхождении. */
export function buildDialogueV2EmbeddedRelease(repoRoot: string): DialogueV2EmbeddedReleaseBuild {
  const candidateRead = readJson(repoRoot, CANDIDATE_PATH);
  const receiptRead = readJson(repoRoot, APPROVED_RECEIPT_PATH);
  const gate = evaluateDialogueV2ContentPromotionGate(candidateRead.value, receiptRead.value, repoRoot);
  if (!gate.ok) throw new Error(`promotion_gate_blocked:${gate.error}`);
  const candidate = candidateRead.value as DialogueV2ContentCandidateManifest;
  // Квитанция — канонический хэш JSON (форматирование файла не меняет выпуск).
  const reviewReceiptSha256 = hashDialogueV2CandidateValue(receiptRead.value);
  const ledgerPersonas = ledgerPersonasByScenario(record(readJson(repoRoot, LEDGER_PATH).value, 'ledger_invalid'));
  const profiles = record(record(readJson(repoRoot, PROFILES_PATH).value, 'profiles_invalid').targets, 'profiles_targets_invalid');
  // зачем (владелец 01.10: «первая реплика всегда уже должна быть на экране»): реплики —
  // отдельный файл вне одобренного кандидата; попадают в пакет только через автопроверки.
  const openingRead = readDialogueV2OpeningLines(repoRoot, new Map(
    [...ledgerPersonas].map(([scenarioId, personas]) => [scenarioId, personas.map((persona) => persona.id)]),
  ));
  if (openingRead.issues.length > 0) {
    throw new Error(`opening_lines_check_failed:${openingRead.issues.length}:${openingRead.issues.slice(0, 5).join('|')}`);
  }
  const openingLines: DialogueV2OpeningLines = openingRead.lines;

  const packets: Record<string, DialogueV2LanguagePack> = {};
  const manifest: Record<string, DialogueV2ApprovedLanguagePackManifest[string]> = {};
  for (const pin of candidate.packets) {
    const studyTarget = pin.studyTarget as DialogueV2StudyTarget;
    const scenarioId = pin.sourceScenarioId;
    const draft = record(readJson(repoRoot, pin.sourceDraftPath).value, `draft_invalid:${pin.key}`);
    const target = record(record(draft.targets, `draft_targets_invalid:${pin.key}`)[studyTarget], `draft_target_invalid:${pin.key}`);
    const content = record(target.content, `content_invalid:${pin.key}`);
    const objectives = array(target.objectives, `objectives_invalid:${pin.key}`).map((raw) => record(raw, `objective_invalid:${pin.key}`));
    const targetProfiles = record(profiles[studyTarget], `profiles_target_invalid:${studyTarget}`);
    const behaviours = ledgerPersonas.get(scenarioId);
    if (!behaviours) throw new Error(`ledger_scenario_missing:${scenarioId}`);
    const draftPersonas = array(target.personas, `personas_invalid:${pin.key}`).map((raw) => record(raw, `persona_invalid:${pin.key}`));
    // Та же нормализация, что у сборщика кандидата: имя/стиль из черновика, иначе из профиля.
    const normalizedPersonas = draftPersonas.map((persona) => {
      const profile = record(targetProfiles[String(persona.id)], `persona_profile_missing:${pin.key}:${String(persona.id)}`);
      const displayName = text(persona.displayName) ? persona.displayName : profile.displayName;
      const styleNote = text(persona.styleNote) ? persona.styleNote : profile.styleNote;
      if (!text(displayName) || !text(styleNote)) throw new Error(`persona_copy_invalid:${pin.key}`);
      return { id: String(persona.id), displayName, styleNote };
    });
    const payloadSha = hashDialogueV2CandidateValue({ content, personas: normalizedPersonas, objectives });
    if (payloadSha !== pin.targetPayloadSha256) throw new Error(`approved_payload_mismatch:${pin.key}`);
    if (behaviours.length !== normalizedPersonas.length
      || behaviours.some((behaviour, index) => behaviour.id !== normalizedPersonas[index].id)) {
      throw new Error(`ledger_persona_order_mismatch:${pin.key}`);
    }

    const withoutHash = {
      studyTarget,
      packVersion: PACK_VERSION,
      packSha256: '0'.repeat(64),
      catalogueSha256: candidate.manifestSha256,
      reviewReceiptSha256,
      scenario: {
        id: scenarioId,
        worldId: pin.worldId,
        rankRequired: pin.rankRequired,
        cefr: pin.cefr,
        personas: normalizedPersonas.map((persona, index) => ({
          id: persona.id,
          replyStyle: behaviours[index].replyStyle,
          voiceMode: DEFAULT_VOICE_MODE,
          displayName: persona.displayName,
          styleNote: persona.styleNote,
          mood: behaviours[index].mood,
          correctionStyle: behaviours[index].correctionStyle,
        })),
        objectives: objectives.map((objective) => ({ id: String(objective.id), label: String(objective.label) })),
        // зачем: политики группы нет в контенте. Контракт допускает только
        // maxDirectReplies=1 и silenceAllowed=true; доп. реплика (follow-up) имеет
        // смысл только когда в сцене больше одного собеседника (планировщик берёт её
        // у ДРУГОГО персонажа) — отсюда 1 для групп и 0 для одиночных сцен.
        groupReplyPolicy: {
          maxDirectReplies: 1 as const,
          maxUsefulFollowUps: (normalizedPersonas.length > 1 ? 1 : 0) as 0 | 1,
          silenceAllowed: true as const,
        },
      },
      content: {
        title: String(content.title),
        briefing: String(content.briefing),
        completionTone: String(content.completionTone),
        opening: openingFor(openingLines, scenarioId, studyTarget, pin.key),
      },
      // Одобрение владельца 28.09 покрывает все шесть ролей (квитанция выше).
      review: Object.fromEntries(DIALOGUE_V2_REVIEW_ROLES.map((role) => [role, 'PASS'])),
    } as unknown as DialogueV2LanguagePack;
    const packet = { ...withoutHash, packSha256: computeDialogueV2PackSha256(withoutHash) } as DialogueV2LanguagePack;
    const validation = validateDialogueV2LanguagePack(packet);
    if (!validation.ok) throw new Error(`packet_contract_invalid:${pin.key}:${validation.error}`);
    packets[pin.key] = packet;
    manifest[pin.key] = {
      studyTarget,
      scenarioId,
      packVersion: packet.packVersion,
      packSha256: packet.packSha256,
      catalogueSha256: packet.catalogueSha256,
      reviewReceiptSha256: packet.reviewReceiptSha256,
    };
  }
  const expectedCount = DIALOGUE_V2_STUDY_TARGETS.length * DIALOGUE_V2_CATALOGUE_INDEX.length;
  if (Object.keys(packets).length !== expectedCount) throw new Error(`packet_count_invalid:${Object.keys(packets).length}`);

  const release = { manifest, packets };
  const snapshots = {} as Record<DialogueV2StudyTarget, DialogueV2EmbeddedLearnerSnapshotFile>;
  for (const studyTarget of DIALOGUE_V2_STUDY_TARGETS) {
    const authorized = authorizeDialogueV2ServerCatalogue(studyTarget, release);
    if (!authorized || authorized.packets.length !== DIALOGUE_V2_CATALOGUE_INDEX.length) {
      throw new Error(`server_catalogue_authorization_failed:${studyTarget}`);
    }
    if (!authorizeDialogueV2ServerPacket({ studyTarget, scenarioId: DIALOGUE_V2_CATALOGUE_INDEX[0].id }, release)) {
      throw new Error(`server_packet_authorization_failed:${studyTarget}`);
    }
    // JSON-круг снимает freeze/null-прототипы: в снимок идут чистые данные.
    snapshots[studyTarget] = Object.freeze({
      schemaVersion: SNAPSHOT_SCHEMA,
      candidateManifestSha256: candidate.manifestSha256,
      studyTarget,
      packets: JSON.parse(JSON.stringify(authorized.packets)) as unknown[],
    });
  }

  return Object.freeze({
    server: Object.freeze({
      schemaVersion: SERVER_SCHEMA,
      source: Object.freeze({
        candidateId: candidate.candidateId,
        candidateManifestSha256: candidate.manifestSha256,
        reviewReceiptPath: APPROVED_RECEIPT_PATH,
        reviewReceiptSha256,
        packetCount: expectedCount,
      }),
      release,
    }),
    snapshots: Object.freeze(snapshots),
    freeformOpenings: openingLines.freeform,
  });
}

function openingFor(
  lines: DialogueV2OpeningLines,
  scenarioId: string,
  studyTarget: DialogueV2StudyTarget,
  key: string,
): Readonly<{ personaId: string; text: string }> {
  const line = lines.scenarios[scenarioId]?.[studyTarget];
  if (!line) throw new Error(`opening_line_missing:${key}`);
  return { personaId: line.personaId, text: line.text };
}

/** Компактный JSON (без отступов): меньше бандл телефона и меньше парсинг на холодном старте функций. */
export function serializeDialogueV2EmbeddedArtifact(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function sha(textValue: string): string {
  return crypto.createHash('sha256').update(textValue, 'utf8').digest('hex').slice(0, 12);
}

function runCli(): void {
  const repoRoot = path.resolve(__dirname, '..');
  const mode = process.argv[2] ?? '--check';
  if (mode !== '--write' && mode !== '--check') throw new Error(`unknown_mode:${mode}`);
  const built = buildDialogueV2EmbeddedRelease(repoRoot);
  const outputs: readonly [string, string][] = [
    [DIALOGUE_V2_EMBEDDED_SERVER_RELEASE_PATH, serializeDialogueV2EmbeddedArtifact(built.server)],
    ...DIALOGUE_V2_STUDY_TARGETS.map((studyTarget): [string, string] => [
      dialogueV2EmbeddedLearnerSnapshotPath(studyTarget),
      serializeDialogueV2EmbeddedArtifact(built.snapshots[studyTarget]),
    ]),
    [DIALOGUE_V2_FREEFORM_OPENINGS_PATH, serializeDialogueV2FreeformOpenings(built.freeformOpenings)],
  ];
  let drift = 0;
  for (const [relativePath, expected] of outputs) {
    const absolute = path.join(repoRoot, ...relativePath.split('/'));
    // зачем: git с autocrlf на Windows превращает LF в CRLF при checkout — это не расхождение контента.
    const current = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n') : null;
    const kb = (Buffer.byteLength(expected, 'utf8') / 1024).toFixed(1);
    if (mode === '--write') {
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, expected, 'utf8');
      process.stdout.write(`${LOG} WROTE ${relativePath} (${kb} KB, sha ${sha(expected)})\n`);
    } else if (current !== expected) {
      drift += 1;
      process.stderr.write(`${LOG} DRIFT ${relativePath}: ${current === null ? 'missing' : 'differs from approved content'}\n`);
    } else {
      process.stdout.write(`${LOG} OK ${relativePath} (${kb} KB)\n`);
    }
  }
  if (drift > 0) {
    process.stderr.write(`${LOG} FAIL: regenerate with npx tsx scripts/dialogue_v2_embedded_release.ts --write\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${LOG} PASS candidate=${built.server.source.candidateManifestSha256.slice(0, 12)} packets=${built.server.source.packetCount}\n`);
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${LOG} FAIL ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
