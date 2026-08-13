import path from "node:path";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";
import {
  assembleV2ActivityEpisodeProjectionV1,
  parseV2ActivitySessionProjectionSource,
} from "../functions/src/content_factory/v2_activity_session_projection";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const editor = require(
  path.join(__dirname, "..", "admin", "learning_v2_owner_episode_editor.js"),
);

type EditorTask = {
  family: string;
  learningFunction: string;
  learner: {
    prompt: string;
    accessibilityLabel: string;
    responseOptions: { responseId: string; text: string }[];
  };
  scriptedAlternate: null | { instruction: string };
  evaluator: {
    inputKind: "choice_token" | "text" | "transcript";
    correctResponse: string;
    acceptedResponses: string[];
  };
};

type EditorSource = {
  session: { ordinal: number; sessionId: string; tasks: EditorTask[] };
};

type EditorIntro = {
  title: string;
  paragraphs: string[];
  concepts: { conceptId: string; heading: string; explanation: string }[];
};

type EditorDocument = {
  sessionIntros: EditorIntro[];
  sessionSources: EditorSource[];
};

type NeutralEditorFixture = EditorDocument & {
  contentClass: "neutral_test_fixture";
  localTestOnly: true;
  publicationAuthority: "none";
  runtimeConsumer: false;
  releaseAuthority: false;
};

const task = (slot: number, family = "phrase_builder") => ({
  slot,
  purpose: [
    "intro_comprehension_check",
    "intro_comprehension_check",
    "intro_comprehension_check",
    "supported_practice",
    "supported_practice",
    "guided_practice",
    "guided_practice",
    "retrieval_practice",
    "near_transfer",
    "independent_check",
    "interleaved_review",
    "independent_check",
  ][slot - 1],
  family,
  learningFunction: `Цель ${slot}`,
  support: slot === 10 || slot === 12 ? "none" : "partial_cue",
  hintsAllowed: slot === 10 || slot === 12 ? 0 : 2,
  answerExposure:
    slot === 10 || slot === 12 ? "forbidden" : "allowed_after_attempt",
  promptNovelty: slot === 10 || slot === 12 ? "novel" : "trained",
  introQuestionRef: slot <= 3 ? { questionId: `q-${slot}` } : null,
  reviewSource: slot === 11 ? { reviewOfTaskId: "earlier" } : null,
  learner: {
    prompt: `Условие ${slot}`,
    accessibilityLabel: `Задание ${slot}`,
    responseOptions: [
      { responseId: `r-${slot}-a`, text: "A" },
      { responseId: `r-${slot}-b`, text: "B" },
    ],
  },
  evaluator: {
    correctResponse: `answer-${slot}`,
    acceptedResponses: [`answer-${slot}`],
  },
  scriptedAlternate: null,
});

const documentFixture = () => ({
  sessionSources: Array.from({ length: 12 }, (_, sessionIndex) => ({
    session: {
      ordinal: sessionIndex + 1,
      sessionId: `session-${sessionIndex + 1}`,
      tasks: Array.from({ length: 12 }, (_, taskIndex) =>
        task(
          taskIndex + 1,
          editor.REQUIRED_FAMILIES[(sessionIndex + taskIndex) % 7],
        ),
      ),
    },
  })),
});

describe("Learning V2 owner episode visual editor", () => {
  test("creates only a deterministic empty 12×12 technical skeleton", () => {
    const skeleton = editor.createTechnicalSkeleton({
      episodeId: "episode-01",
      targetLanguage: "en",
    }) as EditorDocument;
    expect(skeleton.sessionSources).toHaveLength(12);
    expect(skeleton.sessionIntros).toHaveLength(12);
    expect(skeleton.sessionIntros[0].title).toBe("");
    expect(
      skeleton.sessionSources.flatMap((row) => row.session.tasks),
    ).toHaveLength(144);
    expect(skeleton.sessionSources[0].session.tasks[0].learner.prompt).toBe("");
    expect(skeleton.sessionSources[0].session.tasks[0].learningFunction).toBe(
      "",
    );
    expect(editor.inspect(skeleton).readyForServerValidation).toBe(false);
    expect(
      editor.createTechnicalSkeleton({
        episodeId: "episode-01",
        targetLanguage: "en",
      }),
    ).toEqual(skeleton);
  });

  test("becomes the exact server-valid 12×12 package after the owner fills author fields", () => {
    const skeleton = editor.createTechnicalSkeleton({
      episodeId: "episode-01",
      targetLanguage: "en",
    }) as EditorDocument;
    for (const source of skeleton.sessionSources) {
      for (const [taskIndex, task] of source.session.tasks.entries()) {
        const coordinate = `${source.session.ordinal}-${taskIndex + 1}`;
        task.learningFunction = `Neutral learning objective ${coordinate}`;
        task.learner.prompt = `Neutral learner prompt ${coordinate}`;
        task.learner.accessibilityLabel = `Neutral task label ${coordinate}`;
        task.learner.responseOptions.forEach((option, optionIndex) => {
          option.text = `Neutral option ${coordinate}-${optionIndex + 1}`;
        });
        if (task.evaluator.inputKind !== "choice_token") {
          task.evaluator.correctResponse = `neutral response ${coordinate}`;
          task.evaluator.acceptedResponses = [task.evaluator.correctResponse];
        }
        if (task.scriptedAlternate) {
          task.scriptedAlternate.instruction = `Neutral accessible alternate ${coordinate}`;
        }
      }
    }
    skeleton.sessionIntros.forEach((intro, sessionIndex) => {
      intro.title = `Neutral intro ${sessionIndex + 1}`;
      intro.paragraphs = [`Neutral explanation ${sessionIndex + 1}`];
      intro.concepts.forEach((concept, conceptIndex) => {
        concept.heading = `Neutral concept ${sessionIndex + 1}-${conceptIndex + 1}`;
        concept.explanation = `Neutral concept explanation ${sessionIndex + 1}-${conceptIndex + 1}`;
      });
    });

    expect(editor.inspect(skeleton).readyForServerValidation).toBe(true);
    const trustedSources = skeleton.sessionSources.map((source) =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(source)),
    );
    const assembly = assembleV2ActivityEpisodeProjectionV1(trustedSources);
    expect(assembly.sessionCount).toBe(12);
    expect(assembly.taskCount).toBe(144);
    expect(assembly.sessions).toHaveLength(12);
  });

  test("provides a full neutral intro + 12×12 local fixture that is impossible to mistake for release content", () => {
    const fixture = editor.createNeutralTestFixture({
      episodeId: "neutral-test-episode-never-release",
      targetLanguage: "en",
    }) as NeutralEditorFixture;
    expect(fixture).toMatchObject({
      contentClass: "neutral_test_fixture",
      localTestOnly: true,
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    expect(fixture.sessionIntros).toHaveLength(12);
    expect(fixture.sessionIntros[0].title).toBe(
      "Hello, I’m… — первое знакомство",
    );
    expect(fixture.sessionIntros[0].paragraphs).toHaveLength(2);
    expect(fixture.sessionIntros[0].concepts).toHaveLength(3);
    expect(editor.inspect(fixture).readyForServerValidation).toBe(true);
    expect(fixture.sessionIntros[11].title).toBe("Самостоятельное знакомство");
    expect(fixture.sessionSources[0].session.tasks[0].learner.prompt).toContain(
      "Which greeting",
    );
    expect(
      fixture.sessionSources[11].session.tasks[11].learningFunction,
    ).toContain("Самостоятельно применить");
    expect(
      fixture.sessionSources.flatMap((source) => source.session.tasks),
    ).toHaveLength(144);
    const reparsed = editor.parseRaw(editor.serialize(fixture));
    expect(reparsed).toEqual(fixture);
    const changedIntro = editor.patchSessionIntro(fixture, 1, {
      title: "Изменённое тестовое интро второй сессии",
    });
    expect(changedIntro.sessionIntros[1].title).toBe(
      "Изменённое тестовое интро второй сессии",
    );
    expect(fixture.sessionIntros[1].title).not.toBe(
      changedIntro.sessionIntros[1].title,
    );

    const production = editor.promoteReferenceFixture(fixture, {
      episodeId: "episode-01",
      targetLanguage: "en",
    }) as EditorDocument;
    expect(production).not.toHaveProperty("contentClass");
    expect(production.sessionSources[0].session.tasks[0].learner.prompt).toBe(
      fixture.sessionSources[0].session.tasks[0].learner.prompt,
    );
    expect(production.sessionIntros[0].title).toBe(
      fixture.sessionIntros[0].title,
    );
    expect(production.sessionSources[0].session.sessionId).toContain(
      "episode-01",
    );
    expect(editor.inspect(production).readyForServerValidation).toBe(true);
    expect(() =>
      editor.promoteReferenceFixture(production, {
        episodeId: "episode-02",
        targetLanguage: "en",
      }),
    ).toThrow("Только эталонный тестовый эпизод");

    const trustedSources = fixture.sessionSources.map((source) =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(source)),
    );
    expect(assembleV2ActivityEpisodeProjectionV1(trustedSources)).toMatchObject(
      { sessionCount: 12, taskCount: 144 },
    );
  });

  test("accepts only a 12-session authoring document and never invents content", () => {
    expect(editor.parseRaw(JSON.stringify(documentFixture()))).toEqual(
      documentFixture(),
    );
    expect(() => editor.parseRaw("{}")).toThrow(
      "Нужен массив сессий или объект { sessionSources: [...] }.",
    );
    expect(() => editor.parseRaw(" ")).toThrow(
      "Сначала откройте JSON-файл эпизода",
    );
    expect(Object.keys(editor)).not.toContain("generate");
  });

  test("reports exact local counts and independent-check errors before server validation", () => {
    const input = documentFixture();
    input.sessionSources[0].session.tasks[9].support = "partial_cue";
    const summary = editor.inspect(input);
    expect(summary.sessionCount).toBe(12);
    expect(summary.taskCount).toBe(144);
    expect(summary.readyForServerValidation).toBe(false);
    expect(summary.rows[0].tasks[9].issues).toContain(
      "Самостоятельная проверка должна быть без подсказок и показа ответа.",
    );
  });

  test("patches only the selected visible task fields and preserves the remaining package", () => {
    const input = documentFixture();
    const next = editor.patchTask(input, 2, 4, {
      prompt: "Новый авторский вопрос",
      acceptedResponses: ["new answer"],
    });
    expect(next.sessionSources[2].session.tasks[4].learner.prompt).toBe(
      "Новый авторский вопрос",
    );
    expect(
      next.sessionSources[2].session.tasks[4].evaluator.acceptedResponses,
    ).toEqual(["new answer"]);
    expect(input.sessionSources[2].session.tasks[4].learner.prompt).toBe(
      "Условие 5",
    );
    expect(next.sessionSources[1]).toEqual(input.sessionSources[1]);
    expect(JSON.parse(editor.serialize(next)).sessionSources).toHaveLength(12);
  });
});
