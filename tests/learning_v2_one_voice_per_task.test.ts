// зачем (владелец 15.10, EN-сессия, «один голос на задание»): Codex озвучивает каждое задание ОДНИМ случайным голосом,
// хранит выбор в content/learning-v2-course/audio/en/single-voice-v1.json и не делает четыре версии. Рантайм прежде
// требовал все 4 голоса — такое занятие не открылось бы вовсе. Сторож порядка выбора голоса:
//  1) голос, назначенный заданию Codex, — первым (даже если у реплики есть все 4 старые записи);
//  2) без назначения и со всеми 4 голосами — как раньше: голос по индексу;
//  3) без назначения — голос, записанный у всех реплик задания (запасной путь);
//  • реплика без единой записи — задание неозвучено (чужого голоса не подставляем).
let mockDropVoice: (transcript: string, voiceId: string) => boolean = () => false;
let mockAssignments: Record<string, { voice: string; clips: Record<string, string> }> | null = null;
jest.mock("../app/learning_v2_factory_production_audio_entries_v1.generated", () => {
  const actual = jest.requireActual("../app/learning_v2_factory_production_audio_entries_v1.generated");
  return {
    ...actual,
    get FACTORY_PRODUCTION_AUDIO_ENTRIES_V1() {
      return actual.FACTORY_PRODUCTION_AUDIO_ENTRIES_V1.filter(
        (entry: { transcript: string; voiceId: string }) => !mockDropVoice(entry.transcript, entry.voiceId),
      );
    },
  };
});
jest.mock("../app/learning_v2_factory_single_voice_v1.generated", () => {
  const actual = jest.requireActual("../app/learning_v2_factory_single_voice_v1.generated");
  return {
    get FACTORY_SINGLE_VOICE_ENTRIES_V1() {
      return actual.FACTORY_SINGLE_VOICE_ENTRIES_V1.filter(
        (entry: { transcript: string; voiceId: string }) => !mockDropVoice(entry.transcript, entry.voiceId),
      );
    },
    get FACTORY_SINGLE_VOICE_ASSIGNMENTS_V1() {
      return mockAssignments ?? actual.FACTORY_SINGLE_VOICE_ASSIGNMENTS_V1;
    },
  };
});

type Modules = {
  production: typeof import("../app/learning_v2_factory_production_audio_v1");
  child: typeof import("../modules/learning-v2/runtime/course_session_audio_child_v1");
  factory: typeof import("../modules/learning-v2/content/factory_native/factory_native_course_v1");
};

function freshModules(): Modules {
  let loaded: Modules | null = null;
  // Таблицы озвучки ленивые и кэшируются на модуль — каждому сценарию свой чистый экземпляр.
  jest.isolateModules(() => {
    loaded = {
      production: require("../app/learning_v2_factory_production_audio_v1"),
      child: require("../modules/learning-v2/runtime/course_session_audio_child_v1"),
      factory: require("../modules/learning-v2/content/factory_native/factory_native_course_v1"),
    };
  });
  return loaded!;
}

function session1(modules: Modules) {
  const material = modules.factory.materializeFactoryNativeLearningV2SessionV1({
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    interfaceLocale: "ru",
  });
  expect(material).not.toBeNull();
  const learner = material!.learnerChild;
  const target = learner.interactions.find((interaction) => {
    const payload = interaction.modePayload as { referenceAudio?: { transcript: string } | null } | null;
    return interaction.audioTargetIds.length > 0 && Boolean(payload?.referenceAudio);
  });
  expect(target).toBeDefined();
  const transcript = (target!.modePayload as { referenceAudio: { transcript: string } }).referenceAudio.transcript;
  return { learner, interactionId: target!.interactionId, transcript };
}

function fullPhrase(modules: Modules, learner: ReturnType<typeof session1>["learner"], interactionId: string) {
  const silence = jest.spyOn(console, "log").mockImplementation(() => undefined);
  try {
    const audioChild = modules.production.buildLearningV2FactoryBundledAudioChildV1(learner);
    expect(audioChild).not.toBeNull();
    const audio = audioChild!.interactions.find((entry) => entry.interactionId === interactionId)!;
    const voices = ([0, 1, 2, 3] as const).map((voiceSelectionIndex) =>
      modules.child.selectLearningV2CourseSessionInteractionAudioV1({ child: audioChild!, interactionId, voiceSelectionIndex }).voiceId);
    return { files: audio.fullPhraseFiles!, voices };
  } finally {
    silence.mockRestore();
  }
}

describe("Learning V2: one assigned voice per task", () => {
  afterEach(() => {
    mockDropVoice = () => false;
    mockAssignments = null;
  });

  test("the Codex-assigned voice wins even when all four old recordings exist", () => {
    const probe = session1(freshModules());
    const coralFile = freshModules().production.learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(probe.transcript, "coral");
    expect(coralFile).not.toBeNull();
    mockAssignments = { [probe.interactionId]: { voice: "coral", clips: { [probe.transcript]: coralFile!.contentHash } } };
    const modules = freshModules();
    const { learner, interactionId } = session1(modules);
    const { files, voices } = fullPhrase(modules, learner, interactionId);
    expect(files.map((file) => file.voiceId)).toEqual(["coral"]);
    expect(voices).toEqual(["coral", "coral", "coral", "coral"]);
  });

  // зачем (Ревизор 2.74): у фразы есть все 4 старые записи, задание назначено coral — голос не должен меняться между
  // запусками занятия (круг по sessionRunId только для заданий без назначения), а файл — клип ЭТОГО задания.
  test("an assigned task keeps its voice and its own clip across two different session runs", () => {
    const probe = session1(freshModules());
    const real = freshModules();
    const coralFile = real.production.learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(probe.transcript, "coral");
    expect(coralFile).not.toBeNull();
    mockAssignments = { [probe.interactionId]: { voice: "coral", clips: { [probe.transcript]: coralFile!.contentHash } } };
    const modules = freshModules();
    const { learner, interactionId } = session1(modules);
    const silence = jest.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const audioChild = modules.production.buildLearningV2FactoryBundledAudioChildV1(learner)!;
      const ordinal = learner.interactions.find((entry) => entry.interactionId === interactionId)!.ordinal;
      const picked = ["run-a-0001", "run-b-0002"].map((sessionRunId) => {
        const voiceSelectionIndex = modules.child.learningV2CourseSessionInteractionVoiceIndexV1({
          sessionRunId,
          courseSessionId: audioChild.courseSessionId,
          interactionOrdinal: ordinal,
        });
        const selection = modules.child.selectLearningV2CourseSessionInteractionAudioV1({ child: audioChild, interactionId, voiceSelectionIndex });
        return [selection.voiceId, selection.fullPhraseFile?.contentHash];
      });
      expect(picked).toEqual([["coral", coralFile!.contentHash], ["coral", coralFile!.contentHash]]);
    } finally {
      silence.mockRestore();
    }
  });

  test("without an assignment a phrase in all four voices keeps the rotating voice choice", () => {
    mockAssignments = {};
    const modules = freshModules();
    const { learner, interactionId } = session1(modules);
    const { files, voices } = fullPhrase(modules, learner, interactionId);
    expect(files).toHaveLength(4);
    expect(voices).toEqual(["ash", "onyx", "nova", "coral"]);
  });

  test("without an assignment a phrase recorded in ONE voice is voiced and always plays that voice", () => {
    const probe = session1(freshModules());
    mockAssignments = {};
    mockDropVoice = (transcript, voiceId) => transcript === probe.transcript && voiceId !== "nova";
    const modules = freshModules();
    const { learner, interactionId } = session1(modules);
    expect(modules.production.learningV2FactoryMissingAudioInteractionIdsV1(learner)).not.toContain(interactionId);
    const { files, voices } = fullPhrase(modules, learner, interactionId);
    expect(files.map((file) => file.voiceId)).toEqual(["nova"]);
    expect(voices).toEqual(["nova", "nova", "nova", "nova"]);
  });

  test("a phrase with no recording at all stays unvoiced — no fallback voice", () => {
    const probe = session1(freshModules());
    mockDropVoice = (transcript) => transcript === probe.transcript;
    const modules = freshModules();
    const { learner, interactionId } = session1(modules);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(modules.production.learningV2FactoryMissingAudioInteractionIdsV1(learner)).toContain(interactionId);
      expect(modules.production.buildLearningV2FactoryBundledAudioChildV1(learner)).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });
});
