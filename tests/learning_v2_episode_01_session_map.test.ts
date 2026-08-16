// зачем: карта из 56 сессий держится на правилах владельца, а не на моей памяти.
// Эти проверки ломают сборку, если порядок разъехался: слово после фразы,
// зависимость от будущей сессии, глава без словарной подготовки.
import {
  EPISODE_01_SESSION_MAP_V1,
  SESSION_KIND_FAMILIES,
  featuresTaughtBySession,
} from "../modules/learning-v2/content/source/episode_01_session_map_v1";
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from "../modules/learning-v2/content/course_topology_v1";

describe("episode 1 session map", () => {
  it("covers all 56 sessions in order", () => {
    expect(EPISODE_01_SESSION_MAP_V1).toHaveLength(
      LEARNING_V2_LESSON_SESSION_COUNT_V1,
    );
    EPISODE_01_SESSION_MAP_V1.forEach((entry, index) => {
      expect(entry.sessionOrdinal).toBe(index + 1);
    });
  });

  // зачем: «юзер не может начать сессию, не ознакомившись со словами — он же не
  // знает их» (владелец). Зависимость от ещё не пройденной сессии — это ровно
  // тот случай, когда правило приходит после задания.
  it("never depends on a session that comes later", () => {
    for (const entry of EPISODE_01_SESSION_MAP_V1) {
      for (const dependency of entry.builtOn)
        expect(dependency).toBeLessThan(entry.sessionOrdinal);
      for (const recalled of entry.recalls ?? [])
        expect(recalled).toBeLessThan(entry.sessionOrdinal);
    }
  });

  it("gives every chapter a checkpoint on its eighth session", () => {
    for (const entry of EPISODE_01_SESSION_MAP_V1) {
      const isChapterEnd = entry.sessionOrdinal % 8 === 0;
      expect(entry.kind === "checkpoint").toBe(isChapterEnd);
      // Граница главы ничего нового не вводит — только собирает пройденное.
      if (isChapterEnd) expect(entry.teaches).toHaveLength(0);
    }
  });

  it("introduces every grammar feature exactly once", () => {
    const seen = new Map<string, number>();
    for (const entry of EPISODE_01_SESSION_MAP_V1)
      for (const feature of entry.teaches) {
        expect(seen.has(feature)).toBe(false);
        seen.set(feature, entry.sessionOrdinal);
      }
    expect(seen.size).toBeGreaterThan(40);
  });

  // зачем: владелец потребовал активное припоминание. Если возвратов нет,
  // курс превращается в линейную выдачу нового без закрепления.
  it("keeps active recall running through the lesson", () => {
    const withRecall = EPISODE_01_SESSION_MAP_V1.filter(
      (entry) => (entry.recalls?.length ?? 0) > 0,
    );
    expect(withRecall.length).toBeGreaterThanOrEqual(25);
    // Возврат должен быть отложенным, а не «через одну».
    const delayed = withRecall.filter((entry) =>
      (entry.recalls ?? []).some((source) => entry.sessionOrdinal - source >= 5),
    );
    expect(delayed.length).toBeGreaterThanOrEqual(10);
  });

  // зачем: «не каждая сессия это фразы» (владелец) — карта обязана быть
  // разнотипной, иначе она вырождается в то, от чего он отказался.
  it("mixes session kinds instead of shipping phrases only", () => {
    const kinds = new Set(EPISODE_01_SESSION_MAP_V1.map((entry) => entry.kind));
    for (const required of [
      "vocabulary",
      "phrases",
      "irregular_verbs",
      "prepositions",
      "voice",
      "recall",
      "checkpoint",
    ])
      expect(kinds.has(required as never)).toBe(true);
    const phraseShare =
      EPISODE_01_SESSION_MAP_V1.filter((entry) => entry.kind === "phrases")
        .length / EPISODE_01_SESSION_MAP_V1.length;
    expect(phraseShare).toBeLessThan(0.6);
  });

  it("gives every session kind a task family set", () => {
    for (const entry of EPISODE_01_SESSION_MAP_V1)
      expect(SESSION_KIND_FAMILIES[entry.kind].length).toBeGreaterThan(0);
  });

  it("reports what a learner already knows at any point", () => {
    expect(featuresTaughtBySession(1).has("copula_be")).toBe(true);
    expect(featuresTaughtBySession(1).has("past_be")).toBe(false);
    expect(featuresTaughtBySession(56).has("past_be")).toBe(true);
  });
});
