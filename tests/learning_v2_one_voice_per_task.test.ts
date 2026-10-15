// зачем (владелец 15.10, EN-сессия, «один голос на задание»): Codex озвучивает каждое задание ОДНИМ случайным голосом
// и не делает четыре версии. Рантайм прежде требовал все 4 голоса — такое занятие не открылось бы вовсе. Сторож:
//  • реплика только в одном голосе — задание озвучено, звучит ИМЕННО этим голосом при любом индексе выбора;
//  • реплика без единой записи — задание неозвучено (запасного голоса нет);
//  • реплика во всех четырёх голосах — как раньше: голос по индексу (s01–s15 не меняются).
let mockDropVoice: (transcript: string, voiceId: string) => boolean = () => false;
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

describe("Learning V2: one assigned voice per task", () => {
  afterEach(() => {
    mockDropVoice = () => false;
  });

  test("a phrase recorded in ONE voice is voiced and always plays that voice", () => {
    const probe = session1(freshModules());
    mockDropVoice = (transcript, voiceId) => transcript === probe.transcript && voiceId !== "nova";
    const modules = freshModules();
    const { learner, interactionId } = session1(modules);
    expect(modules.production.learningV2FactoryMissingAudioInteractionIdsV1(learner)).not.toContain(interactionId);
    const audioChild = modules.production.buildLearningV2FactoryBundledAudioChildV1(learner);
    expect(audioChild).not.toBeNull();
    const audio = audioChild!.interactions.find((entry) => entry.interactionId === interactionId)!;
    expect(audio.fullPhraseFiles).toHaveLength(1);
    expect(audio.fullPhraseFiles![0].voiceId).toBe("nova");
    for (const voiceSelectionIndex of [0, 1, 2, 3] as const) {
      const selection = modules.child.selectLearningV2CourseSessionInteractionAudioV1({
        child: audioChild!,
        interactionId,
        voiceSelectionIndex,
      });
      expect([voiceSelectionIndex, selection.voiceId, selection.fullPhraseFile?.voiceId])
        .toEqual([voiceSelectionIndex, "nova", "nova"]);
    }
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

  test("a phrase in all four voices keeps the rotating voice choice", () => {
    const modules = freshModules();
    const { learner, interactionId } = session1(modules);
    const audioChild = modules.production.buildLearningV2FactoryBundledAudioChildV1(learner);
    expect(audioChild).not.toBeNull();
    const audio = audioChild!.interactions.find((entry) => entry.interactionId === interactionId)!;
    expect(audio.fullPhraseFiles).toHaveLength(4);
    const voices = ([0, 1, 2, 3] as const).map((voiceSelectionIndex) =>
      modules.child.selectLearningV2CourseSessionInteractionAudioV1({ child: audioChild!, interactionId, voiceSelectionIndex }).voiceId);
    expect(voices).toEqual(["ash", "onyx", "nova", "coral"]);
  });
});
