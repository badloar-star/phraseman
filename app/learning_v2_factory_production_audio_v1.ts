import { lazyContent } from "./content_lazy";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2CourseSessionAudioChildV1,
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
  const audible = <T extends { contentHash: string }>(entries: readonly T[]): T[] => entries.filter((entry) => !silent.has(entry.contentHash));
  const productionEntries = audible(FACTORY_PRODUCTION_AUDIO_ENTRIES_V1);
  // зачем: __DEV__ через globalThis — в тестах и в сборке functions имени __DEV__ нет (сторож functions_shared_code_dev_global_guard)
  if ((globalThis as { __DEV__?: boolean }).__DEV__ === true) console.log(`[V2-AUDIO-SILENT] excluded=${FACTORY_PRODUCTION_AUDIO_ENTRIES_V1.length - productionEntries.length + FACTORY_SINGLE_VOICE_ENTRIES_V1.length - audible(FACTORY_SINGLE_VOICE_ENTRIES_V1).length} listed=${silent.size}`);
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
    transcripts.every((transcript) => tables.entryByContentHash.has(codexAssignment.clips[transcript] ?? ""))
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
): ReturnType<typeof materializeLearningV2CourseSessionAudioChildV1> | null {
  const audioInteractions = learner.interactions.filter((interaction) => interaction.audioTargetIds.length > 0);
  // зачем (координатор 15.10): видно, каким голосом звучит каждое задание и откуда он взят — одна строка на сборку.
  const voicePlans: { interactionId: string; assignedVoice: string; source: FactoryVoicePlanV1["source"] }[] = [];
  const planFor = (interactionId: string, transcripts: readonly string[]): FactoryVoicePlanV1 => {
    const plan = requireFactoryVoicePlanV1(interactionId, transcripts);
    voicePlans.push({ interactionId, assignedVoice: plan.voices.length === 1 ? plan.voices[0]! : "rotating", source: plan.source });
    return plan;
  };
  try {
    const child = materializeLearningV2CourseSessionAudioChildV1({
      learner,
      interactions: audioInteractions.map((interaction) => {
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
    console.log(`[V2-AUDIO-VOICE] plan ${JSON.stringify({ courseSessionId: learner.courseSessionId, interactions: voicePlans })}`); // guard-ok: одна строка на сборку озвучки
    return child;
  } catch (error) {
    if (error instanceof Error && error.message === "learning_v2_factory_production_audio_missing") {
      // зачем (инцидент 04.10): отказ из-за отсутствия записи в таблице озвучки был немым — теперь [V2-BUNDLED] пишет, что именно не нашли.
      console.warn(`[V2-BUNDLED] audio_child_null reason=${error.message} audioInteractions=${audioInteractions.length}`);
      return null;
    }
    throw error;
  }
}
