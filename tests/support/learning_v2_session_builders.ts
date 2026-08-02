import * as fs from "fs";
import * as path from "path";

import type {
  V2EpisodeContractV1,
  V2EpisodeContractV2,
} from "../../modules/learning-v2/contracts/episode";
import type { V2SessionSetBody } from "../../modules/learning-v2/contracts/session";
import { hashCanonicalBody } from "../../modules/learning-v2/policies/decision_registry";

const deepFreeze = <Value>(value: Value): Readonly<Value> => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
};

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

export const readLegacyE1 = (): Readonly<V2EpisodeContractV1> => {
  const fixture = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "fixtures",
        "learning-v2",
        "episode-01.valid.json",
      ),
      "utf8",
    ),
  ) as { readonly episode: V2EpisodeContractV1 };
  return deepFreeze(clone(fixture.episode));
};

export const buildValidSessionSet = (): Readonly<V2SessionSetBody> => {
  const zones = [
    "understand",
    "understand",
    "understand",
    "understand",
    "use",
    "use",
    "use",
    "use",
    "master",
    "master",
    "master",
    "master",
  ] as const;
  const families = [
    "listen_choose",
    "phrase_builder",
    "context_gap_grammar",
    "sound_contrast",
  ] as const;

  return deepFreeze({
    schemaVersion: "v2-session-set.v1",
    episodeId: "ep-01",
    version: 1,
    sessions: zones.map((zone, index) => ({
      sessionId: `episode-01.session-${String(index + 1).padStart(2, "0")}`,
      ordinal: index + 1,
      zone,
      targetSeconds: 180,
      cards: Array.from({ length: 12 }, (_unused, cardIndex) => ({
        cardId: `episode-01.session-${String(index + 1).padStart(2, "0")}.card-${cardIndex + 1}`,
        contentItemId: `content-item-${(cardIndex % 4) + 1}`,
        objectiveId: "objective.introduce-self",
        family: families[cardIndex % families.length],
        learningFunction:
          cardIndex < 2
            ? "notice"
            : cardIndex < 4
              ? "comprehend"
              : cardIndex < 6
                ? "retrieve"
                : "transfer",
        support: index < 4 ? "full_text" : index < 8 ? "partial_cue" : "none",
        promptId: `prompt.session-${index + 1}.card-${cardIndex + 1}`,
        promptNovelty: index < 4 ? "trained" : index < 8 ? "varied" : "novel",
      })),
    })),
    optionalPracticeSlots: [
      {
        slotId: "episode-01.optional-01",
        episodeId: "ep-01",
        capabilityId: "quick-speak.v1",
        family: "quick_spoken_response",
        sourcePriority: "current_unit",
        expectedSeconds: 75,
        requiredForProgress: false,
        canWriteMastery: false,
      },
    ],
  } as unknown as V2SessionSetBody);
};

export const buildV2E1 = (): Readonly<V2EpisodeContractV2> => {
  const legacy = clone(readLegacyE1()) as unknown as Record<string, unknown>;
  const sessionSet = buildValidSessionSet();
  legacy.schemaVersion = "v2-episode-contract.v2";
  legacy.estimatedMinutes = 36;
  legacy.sessionSetRef = {
    episodeId: sessionSet.episodeId,
    version: sessionSet.version,
    contentHash: hashCanonicalBody(sessionSet),
  };
  return deepFreeze(legacy as unknown as V2EpisodeContractV2);
};
