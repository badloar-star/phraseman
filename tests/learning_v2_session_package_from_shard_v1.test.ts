// зачем: конвертер — последнее звено между написанной сессией и публикацией.
// Шард пишет автор, пакет принимает сервер, и до сих пор между ними ничего не
// было: курс невозможно было выложить, приложение отвечало NOT FOUND.
//
// Тест гоняет конвертер на НАСТОЯЩЕЙ сессии 1, а не на выдуманной, — иначе он
// доказывал бы только то, что код не падает на удобных данных.
import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_01_SOURCE);

describe("session package children built from an authored shard", () => {
  it("produces all five children the release package requires", () => {
    const children = buildSessionChildBodiesFromShard(shard, "ru");
    for (const key of [
      "intro",
      "learner",
      "evaluatorCapsule",
      "evaluatorSidecar",
      "auxiliary",
    ] as const)
      expect(children[key]).toBeTruthy();
  });

  // зачем: слоты 1–3 занимают вопросы интро, практика начинается с четвёртого.
  // Если это разъедется, человек увидит вопрос вступления дважды.
  it("starts practice at slot four and keeps intro questions out of it", () => {
    const children = buildSessionChildBodiesFromShard(shard, "ru");
    const learner = children.learner as {
      interactions: readonly { ordinal: number }[];
      firstPracticeOrdinal: number;
    };
    expect(learner.firstPracticeOrdinal).toBe(4);
    expect(learner.interactions[0]?.ordinal).toBe(4);
    const introSlots = shard.cards
      .filter((card) => card.taskSlot < 4)
      .map((card) => card.cardId);
    const practiceIds = new Set(
      (children.learner as { interactions: readonly { interactionId: string }[] })
        .interactions.map((interaction) => interaction.interactionId),
    );
    for (const introId of introSlots)
      expect(practiceIds.has(introId)).toBe(false);
  });

  // зачем: правильные ответы обязаны остаться на сервере. Если они попадут в
  // learner, любой сможет вытащить их из трафика и «пройти» курс не учась.
  it("never leaks answers into what the learner receives", () => {
    const children = buildSessionChildBodiesFromShard(shard, "ru");
    const learnerRaw = JSON.stringify(children.learner);
    expect(learnerRaw).toContain("absent_by_exact_schema");
    // Ни один правильный ответ из шарда не должен встретиться в тексте ученика.
    const answers = shard.cards
      .map((card) => card.contentItem.contentItemId)
      .filter((id) => id.length > 8);
    for (const answer of answers) expect(learnerRaw).not.toContain(answer);
  });

  it("carries every practice card into the learner child", () => {
    const children = buildSessionChildBodiesFromShard(shard, "ru");
    const practiceCount = shard.cards.filter((card) => card.taskSlot >= 4).length;
    expect(
      (children.learner as { interactions: readonly unknown[] }).interactions,
    ).toHaveLength(practiceCount);
  });

  // зачем: незнакомое семейство заданий не должно молча стать выбором из
  // вариантов — человек получил бы не то упражнение.
  it("refuses an unknown activity family instead of guessing", () => {
    const broken = {
      ...shard,
      cards: shard.cards.map((card, index) =>
        index === 5 ? { ...card, family: "made_up_family" } : card,
      ),
    };
    expect(() =>
      buildSessionChildBodiesFromShard(broken as never, "ru"),
    ).toThrow(/session_package_unsupported_family/);
  });
});
