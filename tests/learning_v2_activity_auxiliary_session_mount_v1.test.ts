import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseLearningV2ActivityAuxiliaryRouteScopeV1 } from "../app/use_learning_v2_activity_auxiliary_session_v1";

const source = (relative: string) =>
  readFileSync(join(__dirname, "..", relative), "utf8");

describe("Learning V2 auxiliary session runtime mount", () => {
  test("requires the complete release route scope and preserves legacy absence", () => {
    expect(parseLearningV2ActivityAuxiliaryRouteScopeV1({})).toBeNull();
    expect(
      parseLearningV2ActivityAuxiliaryRouteScopeV1({
        releaseEnvironment: "production",
        releaseSeasonId: "season-1",
      }),
    ).toBeNull();
    expect(
      parseLearningV2ActivityAuxiliaryRouteScopeV1({
        releaseEnvironment: "production",
        releaseSeasonId: "season-1",
        releaseEpisodeId: "episode-1",
      }),
    ).toEqual({
      environment: "production",
      seasonId: "season-1",
      episodeId: "episode-1",
    });
  });

  test("preloads on the map and keeps active answer transport local", () => {
    const map = source("app/learning-v2/lesson/[id].tsx");
    const session = source("app/learning-v2/session/[id].tsx");
    const client = source("app/learning_v2_activity_auxiliary_client.ts");
    const releasedClient = source(
      "app/learning_v2_activity_released_session_client_v1.ts",
    );
    expect(map).toContain("preloadCurrentLearningV2ActivityAudioSessionV1({");
    expect(map).toContain("...auxiliaryScope");
    expect(session).toContain("useLearningV2ActivityAuxiliarySessionV1({");
    expect(session).toContain("useLearningV2ActivityReleasedSessionV1({");
    expect(session).toContain("allowNetwork: false");
    expect(session).toContain("releasedAuxiliaryTask");
    expect(session).toContain(
      "evaluateLearningV2ActivityReleasedSessionTaskV1({",
    );
    expect(session).toContain(
      "materializeLearningV2ActivityReleasedSessionCompletionV1({",
    );
    expect(session).toContain(
      "createLearningV2ActivityReleasedSessionCompletionSpoolV1(",
    );
    expect(session).toContain(
      "releasedTaskResults.every((candidate) => candidate !== undefined)",
    );
    expect(client).toContain(
      'withBackgroundNetworkLease(\n    "learning-v2.activity-auxiliary"',
    );
    expect(releasedClient).toContain(
      'withBackgroundNetworkLease(\n    "learning-v2.activity-released-session"',
    );

    const chooseBody = session.slice(
      session.indexOf("const choose = (answer: string) =>"),
      session.indexOf("const chooseTile ="),
    );
    expect(chooseBody).not.toMatch(/fetch\(|httpsCallable|firebase|await/i);
    expect(chooseBody).toContain("releasedVerdict.resultCode");
    expect(chooseBody).toContain(
      'releasedEvaluatorTask?.evaluatorInputKind === "choice_token"',
    );
    expect(chooseBody).toContain("?.responseId ?? answer");
  });
});
