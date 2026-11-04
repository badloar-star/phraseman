import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  decideRankAccess,
  type RankAccessFacts,
  type RankAccessSurface,
} from "../shared/rank_access_contract";

const rankSurfaces = ["video", "dialogues", "peak", "cards_hub"] as const;
const alwaysOpenSurfaces = [
  "saved_cards",
  "own_cards",
  "card_practice",
  "friends",
  "social_packs",
] as const;

function facts(overrides: Partial<RankAccessFacts> = {}): RankAccessFacts {
  return {
    rank: 0,
    rankResolved: true,
    plusActive: false,
    plusResolved: true,
    grantedSurfaces: new Set<RankAccessSurface>(),
    grantsResolved: true,
    available: true,
    availabilityResolved: true,
    ...overrides,
  };
}

describe("decideRankAccess", () => {
  test("1. free rank 0 locks the four gated surfaces at 1, 1, 2, and 3", () => {
    expect(
      rankSurfaces.map((surface) => decideRankAccess(surface, facts())),
    ).toEqual([
      { status: "locked", minimumRank: 1 },
      { status: "locked", minimumRank: 1 },
      { status: "locked", minimumRank: 2 },
      { status: "locked", minimumRank: 3 },
    ]);
  });

  test("2. free rank 1 opens video and dialogues only", () => {
    expect(
      rankSurfaces.map((surface) =>
        decideRankAccess(surface, facts({ rank: 1 })),
      ),
    ).toEqual([
      { status: "allowed", basis: "rank" },
      { status: "allowed", basis: "rank" },
      { status: "locked", minimumRank: 2 },
      { status: "locked", minimumRank: 3 },
    ]);
  });

  test("3. free rank 2 also opens peak while cards hub stays locked", () => {
    expect(decideRankAccess("peak", facts({ rank: 2 }))).toEqual({
      status: "allowed",
      basis: "rank",
    });
    expect(decideRankAccess("cards_hub", facts({ rank: 2 }))).toEqual({
      status: "locked",
      minimumRank: 3,
    });
  });

  test.each([3, 19])(
    "4. free rank %i opens all four gated surfaces",
    (rank) => {
      expect(
        rankSurfaces.map((surface) =>
          decideRankAccess(surface, facts({ rank })),
        ),
      ).toEqual(rankSurfaces.map(() => ({ status: "allowed", basis: "rank" })));
    },
  );

  test("5. rank 0 always opens personal cards, practice, friends, and social packs", () => {
    const input = facts({
      rankResolved: false,
      plusResolved: false,
      grantsResolved: false,
    });
    expect(
      alwaysOpenSurfaces.map((surface) => decideRankAccess(surface, input)),
    ).toEqual(
      alwaysOpenSurfaces.map(() => ({
        status: "allowed",
        basis: "always_open",
      })),
    );
  });

  test("6. resolved active Plus opens every gated surface at rank 0", () => {
    const input = facts({ plusActive: true });
    expect(
      rankSurfaces.map((surface) => decideRankAccess(surface, input)),
    ).toEqual(rankSurfaces.map(() => ({ status: "allowed", basis: "plus" })));
    expect(
      decideRankAccess("video", facts({ rank: 19, plusActive: true })),
    ).toEqual({ status: "allowed", basis: "plus" });
  });

  test("7. expired Plus does not create access beyond current rank", () => {
    expect(
      decideRankAccess(
        "video",
        facts({ plusActive: false, plusResolved: true }),
      ),
    ).toEqual({ status: "locked", minimumRank: 1 });
  });

  test("8. an explicit resolved grant survives Plus expiry only for its surface", () => {
    const input = facts({
      grantedSurfaces: new Set<RankAccessSurface>(["peak"]),
    });
    expect(decideRankAccess("peak", input)).toEqual({
      status: "allowed",
      basis: "grandfather",
    });
    expect(decideRankAccess("video", input)).toEqual({
      status: "locked",
      minimumRank: 1,
    });
    expect(decideRankAccess("peak", { ...input, plusActive: true })).toEqual({
      status: "allowed",
      basis: "grandfather",
    });
  });

  test("9. unavailable overrides rank, Plus, and a grant", () => {
    const input = facts({
      rank: 19,
      plusActive: true,
      grantedSurfaces: new Set<RankAccessSurface>(["video"]),
      available: false,
    });
    expect(decideRankAccess("video", input)).toEqual({ status: "unavailable" });
  });

  test.each([
    facts({ rank: 19, rankResolved: false }),
    facts({ plusActive: true, plusResolved: false }),
    facts({
      grantedSurfaces: new Set<RankAccessSurface>(["video"]),
      grantsResolved: false,
    }),
    facts({ available: true, availabilityResolved: false }),
  ])("10. unresolved evidence never unlocks or definitively locks", (input) => {
    expect(decideRankAccess("video", input)).toEqual({ status: "pending" });
  });

  test.each([null, -1, 1.5, 20])(
    "11. malformed resolved rank %p never unlocks by rank",
    (rank) => {
      expect(decideRankAccess("video", facts({ rank }))).toEqual({
        status: "locked",
        minimumRank: 1,
      });
    },
  );

  test("12. the source slice contains no out-of-scope integration vocabulary", () => {
    const sourceFiles = [
      resolve(__dirname, "../shared/rank_access_contract.ts"),
      resolve(__dirname, "rank_access_contract.test.ts"),
    ];
    const forbidden = [
      ["learning", "_v2"],
      ["classic", "_lesson"],
      ["ro", "om"],
      ["notifi", "cation"],
      ["to", "day"],
      ["sc", "ene"],
      ["navi", "gation"],
      ["persis", "tence"],
    ].map((parts) => parts.join(""));
    const corpus = sourceFiles
      .map((file) => readFileSync(file, "utf8").toLowerCase())
      .join("\n");
    expect(forbidden.filter((symbol) => corpus.includes(symbol))).toEqual([]);
  });
});
