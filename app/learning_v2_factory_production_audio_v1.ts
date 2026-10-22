import { lazyContent } from "./content_lazy";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2CourseSessionAudioChildV1,
  materializePartialLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileV1,
  type LearningV2CourseSessionAudioFileInputV1,
  type LearningV2CourseSessionAudioVoiceIdV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import type { LearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";

const VOICES = Object.freeze(["ash", "onyx", "nova", "coral"] as const);
const FACTORY_AUDIO_PACK_COORDINATE_V1 = hashCanonicalBody({
  schemaVersion: "learning-v2-factory-production-audio-pack.v1",
});
type FactoryProductionAudioEntriesModuleV1 = typeof import("./learning_v2_factory_production_audio_entries_v1.generated");
type FactorySingleVoiceModuleV1 = typeof import("./learning_v2_factory_single_voice_v1.generated");
type FactoryProductionAudioEntryV1 = Readonly<{
  transcript: string;
  voiceId: LearningV2CourseSessionAudioVoiceIdV1;
  contentHash: string;
  byteSize: number;
}>;
// зачем (PM-216, [CONTENT-LAZY]): 568 КБ записей озвучки и две карты по ним раньше строились при ИМПОРТЕ модуля,
// а импортируют его экраны, которые expo-router поднимает при старте (sync-режим). Теперь — при первом обращении
// к озвучке занятия; данные и результат те же, потребители не менялись.
// зачем (владелец 15.10, «один голос на задание»): к записям манифеста фабрики добавляются записи Codex
// (content/learning-v2-course/audio/en/single-voice-v1.json → app/learning_v2_factory_single_voice_v1.generated.ts)
// и назначенный голос каждого задания. Манифест главнее: запись Codex не перекрывает уже известный текст+голос.
const factoryAudioTables = lazyContent("learning_v2_factory_production_audio", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FACTORY_PRODUCTION_AUDIO_ENTRIES_V1 } = require("./learning_v2_factory_production_audio_entries_v1.generated") as FactoryProductionAudioEntriesModuleV1;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FACTORY_SINGLE_VOICE_ENTRIES_V1, FACTORY_SINGLE_VOICE_ASSIGNMENTS_V1 } = require("./learning_v2_factory_single_voice_v1.generated") as FactorySingleVoiceModuleV1;
  // зачем (18.10, сигнал сессии переписывания): сервис озвучки вернул 21 пустую запись (пик ниже −40 дБ, app/learning_v2_factory_silent_audio_v1.json).
  // Тихая запись манифеста перекрывала настоящую запись Codex того же слова — карточки fork/away/scared были немыми. Тихие
  // записи в выбор звука не попадают: берётся настоящая запись (другой голос), иначе — запасной голос телефона, а не тишина.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const silentList = require("./learning_v2_factory_silent_audio_v1.json") as { entries: readonly { contentHash: string }[] };
  const silent = new Set(silentList.entries.map((entry) => entry.contentHash));
  // Старые записи keypad, nobody, thin, hard, mean, reach, already, excuse me, pain, blond, gold, bossy и downstairs есть только в авторском архиве, но не в bootstrap/Storage.
  // По поручению владельца для отсутствующих записей используется TTS устройства.
  // Удалить соответствующий хеш из исключений после проверенной публикации записи.
  const unpublished = new Set([
    "3600756e6db8fa33a681786afa388cc3c275de8e58cadc54e485f2b181595d15",
    "e884dbaaf46d3267fb1078dad728e5dbc33e8cce6cadb8fa1372a57115921fbe",
    "3fd386d5314bf02ad58b1b6d216b239d0e120f4cd4a416a9ddaa18c5636b41e6",
    "ed897c5197cc07387d0c965be1b385c504de93a861e31c803c3a95102deaa916",
    "7b6d442f2f67cd93216283a46c7e53f18df8d9e0f2bfcdcec17272f8360a2f60",
    "fcf4e1750732f2a34ac4d25c56ab6f6a2f0307e3405fbc3802d7edb9882a2885",
    "13b83680bf1425f98b32730aca9e9eb639046be2f0ea54bf3b6581fa877cb9b6",
    "3cf9b32aa4d212ca1cfca33353af75feafaff792f44846b2c57646364fe6dda6",
    "8c7a763d0a4b1b3bb38f596044b3566e4aed95d411655585cb596a88043635ba",
    "7fc2d0764ac545ea64c3703b2bbe3947c5bb4adfa1fc0248f3ceefffa42216af",
    "0b7b7b6a64fe75dc56ce70e452167fdb188ee3cb78b886be281eee192ce4fcfa",
    "f7beed518047c148119b43daae42be8651bf689a4d96cfce6efe628564155c9f",
    "c38759e1793b734cd65fc256bbf37107ccedf3af5ce6d1be888519bc2a92cc52",
    "fe177cbe44c536a4bdbae1e1c55f2cae23a6667ffc33e067d70dcb5a00c8ade5",
    "8b30cc576c7f765eba8d10c6713f3e7ecaa80a89459d46148bb90727fa0589ac",
    "c8b04cd47fe868657f9e159de687fecf65c2e28a4aecd7a8603b0d149d98e47f",
    "b4061545625fa897c9dcd5d466e268170232be117869c11d0aa83feb35e1f91e",
    "072f808ed119443905b357ea5d8e7720d4ded2b39d82e9c4918ddbd2276c5e21",
    "f433238f84e313d922253b3a3ea062f7530fc4f1a17bf8fe35b684081150861e",
    "3657a9de3e26a7efa43e7403c88a19f201bf7dac9a13103587dd670646a80451",
    "0936a8a1c50ea101e90f11c233308177cf04bfa2f4197e16e0172ea67b1a9dfa",
    "df39bf072a718e65f2fcaeb0d53bb8a609dfabd1b2133b2b42ab8b69c98bac28",
    "5cb62f069a659727edce32524265708c98bd441e2e42893c093dde4ccaed804c",
    "f04a3ef78e7e4dadf8367ebb115961f659e0b4cd5cbfb52b6acb967a7b379a22",
    "8927e9758131d1a7b082e4f59cb269f797fb351f188479196111447d4b804d3b",
    "92c177855c1e0c7b20322a92c16c120924a3af2b3db20cae829d9d9f4abe9c57",
    "1fe8d041238c2230072b0d7f285959b6903cd28391af40c7306aedf7e50a4fec",
    "f917ff813226ff690ab26ea9a2ec5d8c79c706f8d77edc173adb00ce5e80f073",
    "a57f16203a5957d37d46df395067c40513a2eabaf7252a4a59904127a9be4e23",
    "4039f7e4f0a3194f96bd08aaa6781d1239a3cc36764794fe7a62f9e3deeec0ae",
    "cbc9f5c2c248eec864956a29e147bc48a5431b90084ef9416cee0eac82509559",
    "c0449cf5ac226ff16b93c602e177afa80d1bb4ace568dd05d8cc722e3b5e1b7e",
    "66fdc43bd69a2fd646f81be2544eeefbcb25193f55465668ab20919f80d4129e",
    "82de55d7d289489d54f75f8a3fcd2ae8396cbc5b1b55421519687137da417a3c",
    "ab9dd34008f9d5f8ea72ba3af3e6fef49844991d33a68f37dcd71360da560e01",
    "64f5f8f9c73b3c421c5febeb4b76828d69b12e049cbfb5aaa5ae8699e7adc922",
    "be6a3543fc327d502e1bf6ffe4fc32cf77d3f636626b44732f713925a1ee6afa",
    "bc727233876c816d5c12cc86aee81fe95cfb7cf60a58f05319eed2dbbba7ed29",
    "e3c90abc294f8f76d3bc0072748b86138ace129d4fda2fdd49d7eac339445eec",
    "d61f0685a933e5f7a1365cbafc74eabb8f3fc9c461cd7c0153626f21ac99ed96",
    "7d4979b1321842db851b749a0c6861165cba6d105b2046549a3120f042b02cbd",
    "403fcb92b02d0cde654fed2af186b16c5149f3c1069bd22a7ebde48049c51e3b",
    "d3a3809ecfc37785ba736c2938f043853f8c6fd499429c533964b34f6cec8d3d",
    "c6ae900b5c5bf57ccd78061bcc44d738640828c423c361df479e36a2f49474e3",
    "2922b9e98c85743a58bf01c0fc74423442c244a7bd28e7214e93e4642ea0712e",
    "91649746f55a645a01949e3ffd37f4c05f25dec09c7de1e852d6878e83ffcb92",
    "791677a7987ed4445d703e1871a3caf2fd656d9f4e387ee2a506f6aaa98db3cc",
    "904935cca066d5ba9d38afda278ebadcc67235ca8add7fa208bb0994d427862e",
    "46ba7790f6fcb820b4d6cea9bd0f782d5a7c91b47b02512c7fc69a8bec57f7a0",
    "15ce8e47e793e0b9f9406d69c4d70b4285df8949d96eb8f66bcfad7c034d3395",
    "7a75456de1711048761249cca920d678e2d6ff1239a9c9368e106608e36f5011",
    "5ff8be0dd89b46d1fde77a8ff5bf1f9d13e161b47b6e2a22b9d188319d5d98cd",
    // decorate: обе архивные записи отсутствуют в bootstrap и проверенном Storage; используется TTS устройства.
    "c9a5c40d628c3411c4fcc70ca737a0ce8d4c4ea6e93e027ba2a811d9cfe80f46",
    "9d110910137464c55e7a6e8acc5847b1327638e38caf11c79bf6fa19192551be",
  ]);
  const audible = <T extends { contentHash: string }>(entries: readonly T[]): T[] =>
    entries.filter((entry) => !silent.has(entry.contentHash) && !unpublished.has(entry.contentHash));
  const productionEntries = audible(FACTORY_PRODUCTION_AUDIO_ENTRIES_V1);
  // зачем: __DEV__ через globalThis — в тестах и в сборке functions имени __DEV__ нет (сторож functions_shared_code_dev_global_guard)
  if ((globalThis as { __DEV__?: boolean }).__DEV__ === true) console.log(`[V2-AUDIO-SILENT] excluded=${FACTORY_PRODUCTION_AUDIO_ENTRIES_V1.length - productionEntries.length + FACTORY_SINGLE_VOICE_ENTRIES_V1.length - audible(FACTORY_SINGLE_VOICE_ENTRIES_V1).length} listed=${silent.size} unpublished=${unpublished.size}`);
  const entryByCoordinate = new Map<string, FactoryProductionAudioEntryV1>(
    productionEntries.map((entry) => [`${entry.transcript}\u0000${entry.voiceId}`, entry] as const),
  );
  const entryByContentHash = new Map<string, FactoryProductionAudioEntryV1>(
    productionEntries.map((entry) => [entry.contentHash, entry] as const),
  );
  for (const entry of audible(FACTORY_SINGLE_VOICE_ENTRIES_V1)) {
    const coordinate = `${entry.transcript}\u0000${entry.voiceId}`;
    if (!entryByCoordinate.has(coordinate)) entryByCoordinate.set(coordinate, entry);
    if (!entryByContentHash.has(entry.contentHash)) entryByContentHash.set(entry.contentHash, entry);
  }
  return { entryByCoordinate, entryByContentHash, assignedVoiceByInteractionId: FACTORY_SINGLE_VOICE_ASSIGNMENTS_V1 };
});

function fileInput(
  _courseSessionId: string,
  transcript: string,
  voiceId: LearningV2CourseSessionAudioVoiceIdV1,
): LearningV2CourseSessionAudioFileInputV1 {
  const entry = factoryAudioTables().entryByCoordinate.get(`${transcript}\u0000${voiceId}`);
  if (!entry) {
    // зачем (инцидент 04.10): какой именно текст/голос не нашёлся в таблице озвучки — без этого отказ сессии не диагностируется.
    console.warn(`[V2-BUNDLED] audio_entry_missing voice=${voiceId} transcript=${JSON.stringify(transcript.slice(0, 120))}`);
    throw new Error("learning_v2_factory_production_audio_missing");
  }
  return fileInputForEntry(entry);
}

/** Файл ровно этой записи (по её contentHash), а не «первой записи того же текста и голоса». */
function fileInputForEntry(entry: FactoryProductionAudioEntryV1): LearningV2CourseSessionAudioFileInputV1 {
  return Object.freeze({
    voiceId: entry.voiceId,
    objectPath: [
      "learning-v2/voice-audio",
      FACTORY_AUDIO_PACK_COORDINATE_V1,
      hashCanonicalBody({ transcript: entry.transcript }),
      hashCanonicalBody({ voiceId: entry.voiceId }),
      `${entry.contentHash}.mp3`,
    ].join("/"),
    contentHash: entry.contentHash,
    objectGeneration: "1",
    byteSize: entry.byteSize,
    contentType: "audio/mpeg" as const,
  });
}

/**
 * Есть ли слышимая запись с этим хешем (тихие из learning_v2_factory_silent_audio_v1.json сюда не входят).
 * зачем (Ревизор 3.42, R125): прогрев урока заранее отсеивает незнакомые хеши и пишет причину, а не падает целиком.
 */
/**
 * Подогрев таблиц озвучки (4 МБ generated-файлов: require + Maps) ВНЕ входа в занятие.
 * зачем (Сверка 21.10, Galaxy A04, «виснет в уроках»): таблицы строились лениво при ПЕРВОМ обращении, т. е. прямо при входе в
 * эпизод, и замирали на слабом железе. Теперь их можно построить заранее — после первого кадра карты курса. Данные и результат
 * те же (тот же lazyContent), побочный эффект один — разовая сборка; лог [CONTENT-LAZY] пишет сам загрузчик.
 */
export function warmLearningV2FactoryAudioTablesV1(): void {
  try {
    factoryAudioTables();
  } catch (error) {
    console.warn("[AUDIO-TABLES-WARM] failed", error instanceof Error ? error.message : String(error));
  }
}

export function learningV2FactoryHasAudibleAudioForContentHashV1(contentHash: string): boolean {
  return factoryAudioTables().entryByContentHash.has(contentHash);
}

/**
 * Хеши клипов одного занятия по таблице «один голос на задание» (ключи `lesson-LL:session:SS:…`: задания, интро, карточки).
 * зачем (звук по сети, владелец 18.10): индекс прогрева знает только урок 1; чтобы скачать занятие любого урока, список
 * его файлов берётся из той же таблицы, по которой плеер выбирает звук. Только слышимые записи.
 */
export function learningV2FactorySessionClipHashesV1(lessonOrdinal: number, sessionOrdinal: number): readonly string[] {
  const prefix = `lesson-${String(lessonOrdinal).padStart(2, "0")}:session:${String(sessionOrdinal).padStart(2, "0")}:`;
  const tables = factoryAudioTables();
  const hashes = new Set<string>();
  for (const [key, assignment] of Object.entries(tables.assignedVoiceByInteractionId)) {
    if (!key.startsWith(prefix)) continue;
    for (const hash of Object.values(assignment.clips)) if (tables.entryByContentHash.has(hash)) hashes.add(hash);
  }
  return Object.freeze([...hashes]);
}

export function learningV2FactoryRemoteAudioFilesForContentHashesV1(
  contentHashes: readonly string[],
): readonly LearningV2CourseSessionAudioFileV1[] {
  return Object.freeze(contentHashes.map((contentHash) => {
    const entry = factoryAudioTables().entryByContentHash.get(contentHash);
    if (!entry) throw new Error("learning_v2_factory_production_audio_missing");
    // зачем (Ревизор 2.74): один текст+голос может иметь несколько записей (разные задания) — берём запрошенный файл.
    const input = fileInputForEntry(entry);
    return Object.freeze({
      ...input,
      fileFingerprint: hashCanonicalBody(input),
    });
  }));
}

type FactoryVoicePlanV1 = Readonly<{
  voices: readonly LearningV2CourseSessionAudioVoiceIdV1[];
  source: "codex_assignment" | "all_four_voices" | "assigned_recorded_voice";
  /** Только для назначения Codex: файл каждой реплики — клип ЭТОГО задания (contentHash). */
  clipHashByTranscript?: Readonly<Record<string, string>>;
}>;

/**
 * Каким голосом (голосами) звучит задание по его репликам.
 *
 * зачем (владелец 15.10, EN-сессия, «один голос на задание»): Codex озвучивает каждое задание ОДНИМ случайным голосом
 * и не делает четыре версии. Порядок:
 *  1) голос, назначенный заданию в файле Codex (single-voice-v1.json), и файлы — клипы ЭТОГО задания по contentHash
 *     (Ревизор 2.74: одна фраза в разных заданиях записана разными голосами — глобальная таблица «фраза × голос»
 *     дала бы чужой голос или круг по sessionRunId);
 *  2) все 4 голоса у всех реплик → как раньше (голос крутится по заданиям);
 *  3) запасной путь — голос, записанный у ВСЕХ реплик задания (первый в порядке ash/onyx/nova/coral).
 * Чужого голоса не подставляем: общей записи нет → null, задание считается неозвученным.
 */
function factoryVoicePlanV1(interactionId: string, transcripts: readonly string[]): FactoryVoicePlanV1 | null {
  const tables = factoryAudioTables();
  const has = (transcript: string, voiceId: LearningV2CourseSessionAudioVoiceIdV1) =>
    tables.entryByCoordinate.has(`${transcript}\u0000${voiceId}`);
  const codexAssignment = tables.assignedVoiceByInteractionId[interactionId];
  if (
    codexAssignment &&
    transcripts.every((transcript) => {
      const entry = tables.entryByContentHash.get(
        codexAssignment.clips[transcript] ?? "",
      );
      return entry?.transcript === transcript && entry.voiceId === codexAssignment.voice;
    })
  )
    return Object.freeze({
      voices: Object.freeze([codexAssignment.voice]),
      source: "codex_assignment" as const,
      clipHashByTranscript: codexAssignment.clips,
    });
  if (codexAssignment) {
    // Назначение есть, а клипа реплики нет — громко, это расхождение файла Codex и таблицы озвучки.
    console.warn(`[V2-AUDIO-VOICE] codex_assignment_unrecorded interactionId=${interactionId} voice=${codexAssignment.voice} transcripts=${JSON.stringify(transcripts.map((t) => t.slice(0, 80)))}`);
  }
  if (transcripts.every((transcript) => VOICES.every((voiceId) => has(transcript, voiceId))))
    return Object.freeze({ voices: VOICES, source: "all_four_voices" as const });
  const assigned = VOICES.find((voiceId) => transcripts.every((transcript) => has(transcript, voiceId)));
  return assigned
    ? Object.freeze({ voices: Object.freeze([assigned]), source: "assigned_recorded_voice" as const })
    : null;
}

function voiceFiles(courseSessionId: string, transcript: string, plan: FactoryVoicePlanV1) {
  const clipHash = plan.clipHashByTranscript?.[transcript];
  if (clipHash) {
    const entry = factoryAudioTables().entryByContentHash.get(clipHash);
    if (!entry) throw new Error("learning_v2_factory_production_audio_missing");
    return Object.freeze([fileInputForEntry(entry)]);
  }
  return Object.freeze(plan.voices.map((voiceId) => fileInput(courseSessionId, transcript, voiceId)));
}

function requireFactoryVoicePlanV1(interactionId: string, transcripts: readonly string[]): FactoryVoicePlanV1 {
  const plan = factoryVoicePlanV1(interactionId, transcripts);
  if (!plan) {
    // Немой отказ запрещён: какие реплики не имеют общей записи.
    console.warn(`[V2-AUDIO-VOICE] no_common_recorded_voice interactionId=${interactionId} transcripts=${JSON.stringify(transcripts.map((t) => t.slice(0, 80)))}`);
    throw new Error("learning_v2_factory_production_audio_missing");
  }
  return plan;
}

export function learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(
  transcript: string,
  voiceId: LearningV2CourseSessionAudioVoiceIdV1,
): LearningV2CourseSessionAudioFileV1 | null {
  const normalized = transcript.normalize("NFKC").trim();
  if (!normalized || !VOICES.includes(voiceId)) return null;
  try {
    const input = fileInput("factory-pack", normalized, voiceId);
    return Object.freeze({ ...input, fileFingerprint: hashCanonicalBody(input) });
  } catch (error) {
    if (error instanceof Error && error.message === "learning_v2_factory_production_audio_missing") return null;
    throw error;
  }
}

/**
 * Запись слова карточки: голосом ash, если он записан; иначе — записанным голосом слова (onyx, nova, coral по порядку).
 *
 * зачем (координатор 17.10, слово владельца «все восемь уроков доступны»): после переписывания Codex озвучил слова
 * карточек «одним голосом на задание» — «grateful» в l01/s17 есть только голосом onyx. Прежнее правило «слова только
 * ash» роняло подготовку занятия (word_audio_missing) для l01 s17+ и всего, что за ним. Чужого текста не подставляем:
 * нет ни одной записи слова → null, как раньше. Одно правило для подготовки занятия, «кармана слов», набора и сторожа.
 */
export function learningV2FactoryWordAudioFileV1(word: string): LearningV2CourseSessionAudioFileV1 | null {
  const normalized = word.normalize("NFKC").trim();
  if (!normalized) return null;
  const voiceId = VOICES.find((candidate) =>
    factoryAudioTables().entryByCoordinate.has(`${normalized}\u0000${candidate}`));
  return voiceId ? learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(normalized, voiceId) : null;
}

export function learningV2FactoryMissingAudioInteractionIdsV1(
  learner: LearningV2CourseSessionLearnerChildV1,
): readonly string[] {
  const missing: string[] = [];
  for (const interaction of learner.interactions) {
    if (interaction.audioTargetIds.length === 0) continue;
    const payload = interaction.modePayload;
    const references = payload?.family === "sound_contrast"
      ? [payload.audioA, payload.audioB].filter(
          (candidate): candidate is NonNullable<typeof candidate> => candidate !== null,
        )
      : payload && "referenceAudio" in payload && payload.referenceAudio
        ? [payload.referenceAudio]
        : [];
    if (
      (payload?.family === "sound_contrast" && references.length !== 2) ||
      (payload?.family !== "sound_contrast" && references.length !== 1)
    ) {
      throw new Error("learning_v2_factory_reference_audio_missing");
    }
    // Озвучено = у всех реплик задания есть общая запись (4 голоса или один назначенный).
    const complete = factoryVoicePlanV1(interaction.interactionId, references.map((reference) => reference.transcript)) !== null;
    if (!complete) missing.push(interaction.interactionId);
  }
  return Object.freeze(missing);
}

export function buildLearningV2FactoryBundledAudioChildV1(
  learner: LearningV2CourseSessionLearnerChildV1,
): ReturnType<typeof materializeLearningV2CourseSessionAudioChildV1> {
  const audioInteractions = learner.interactions.filter((interaction) => interaction.audioTargetIds.length > 0);
  const recordedAudioInteractions = audioInteractions.filter((interaction) => {
    const payload = interaction.modePayload;
    const references = payload?.family === "sound_contrast"
      ? [payload.audioA, payload.audioB].filter(
          (candidate): candidate is NonNullable<typeof candidate> => candidate !== null,
        )
      : payload && "referenceAudio" in payload && payload.referenceAudio
        ? [payload.referenceAudio]
        : [];
    if (
      (payload?.family === "sound_contrast" && references.length !== 2) ||
      (payload?.family !== "sound_contrast" && references.length !== 1)
    )
      throw new Error("learning_v2_factory_reference_audio_missing");
    return factoryVoicePlanV1(
      interaction.interactionId,
      references.map((reference) => reference.transcript),
    ) !== null;
  });
  // зачем (координатор 15.10): видно, каким голосом звучит каждое задание и откуда он взят — одна строка на сборку.
  const voicePlans: { interactionId: string; assignedVoice: string; source: FactoryVoicePlanV1["source"] }[] = [];
  const planFor = (interactionId: string, transcripts: readonly string[]): FactoryVoicePlanV1 => {
    const plan = requireFactoryVoicePlanV1(interactionId, transcripts);
    voicePlans.push({ interactionId, assignedVoice: plan.voices.length === 1 ? plan.voices[0]! : "rotating", source: plan.source });
    return plan;
  };
  const child = materializePartialLearningV2CourseSessionAudioChildV1({
      learner,
      interactions: recordedAudioInteractions.map((interaction) => {
      const payload = interaction.modePayload;
      if (payload?.family === "sound_contrast") {
        const references = [payload.audioA, payload.audioB].filter(
          (candidate): candidate is NonNullable<typeof candidate> => candidate !== null,
        );
        if (references.length !== 2) throw new Error("learning_v2_factory_sound_contrast_audio_missing");
        // Обе реплики сравнения звучат одним голосом задания.
        const plan = planFor(interaction.interactionId, references.map((reference) => reference.transcript));
        const selectables = references.map((reference, index) => {
          const option = interaction.responseOptions.find(
            (candidate) => candidate.text === reference.transcript,
          ) ?? interaction.responseOptions[index];
          if (!option) throw new Error("learning_v2_factory_sound_contrast_audio_missing");
          return Object.freeze({
            selectableId: option.responseId,
            audioTargetId: reference.audioTargetId,
            wordId: hashCanonicalBody({
              schemaVersion: "learning-v2-factory-sound-word.v1",
              courseSessionId: learner.courseSessionId,
              interactionId: interaction.interactionId,
              audioTargetId: reference.audioTargetId,
              ordinal: index + 1,
            }),
            wordOrdinal: index + 1,
            visibleText: option.text,
            files: voiceFiles(learner.courseSessionId, reference.transcript, plan),
          });
        });
        return Object.freeze({
          interactionId: interaction.interactionId,
          taskVoiceGroupFingerprint: hashCanonicalBody({
            schemaVersion: "learning-v2-factory-task-voice-group.v1",
            courseSessionId: learner.courseSessionId,
            interactionId: interaction.interactionId,
            transcripts: references.map((reference) => reference.transcript),
          }),
          fullPhraseFiles: null,
          selectables: Object.freeze(selectables),
        });
      }
      const reference = payload && "referenceAudio" in payload ? payload.referenceAudio : null;
      if (!reference) throw new Error("learning_v2_factory_reference_audio_missing");
      const transcript = reference.transcript;
      return Object.freeze({
        interactionId: interaction.interactionId,
        taskVoiceGroupFingerprint: hashCanonicalBody({
          schemaVersion: "learning-v2-factory-task-voice-group.v1",
          courseSessionId: learner.courseSessionId,
          interactionId: interaction.interactionId,
          transcript,
        }),
        fullPhraseFiles: voiceFiles(learner.courseSessionId, transcript, planFor(interaction.interactionId, [transcript])),
        selectables: Object.freeze([]),
      });
      }),
  });
  console.log(`[V2-AUDIO-VOICE] plan ${JSON.stringify({
    courseSessionId: learner.courseSessionId,
    recordedInteractions: recordedAudioInteractions.length,
    deviceSpeechInteractions: audioInteractions.length - recordedAudioInteractions.length,
    interactions: voicePlans,
  })}`); // guard-ok: одна строка на сборку озвучки
  return child;
}
