// зачем: конвертер — последнее звено между написанной сессией и публикацией.
// Шард пишет автор, пакет принимает сервер, и до сих пор между ними ничего не
// было: курс невозможно было выложить, приложение отвечало NOT FOUND.
//
// Тест гоняет конвертер на НАСТОЯЩЕЙ сессии 1, а не на выдуманной, — иначе он
// доказывал бы только то, что код не падает на удобных данных.
import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_01_SOURCE);

describe("session package children built from an authored shard", () => {
  it("produces all five children the release package requires", () => {
    const children = buildSessionChildBodiesFromShard(shard, "ru", "lesson-01:session:01");
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
    const children = buildSessionChildBodiesFromShard(shard, "ru", "lesson-01:session:01");
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
    const children = buildSessionChildBodiesFromShard(shard, "ru", "lesson-01:session:01");
    const learnerRaw = JSON.stringify(children.learner);
    expect(learnerRaw).toContain("absent_by_exact_schema");
    // Ни один правильный ответ из шарда не должен встретиться в тексте ученика.
    const answers = shard.cards
      .map((card) => card.contentItem.contentItemId)
      .filter((id) => id.length > 8);
    for (const answer of answers) expect(learnerRaw).not.toContain(answer);
  });

  it("carries every practice card into the learner child", () => {
    const children = buildSessionChildBodiesFromShard(shard, "ru", "lesson-01:session:01");
    const practiceCount = shard.cards.filter((card) => card.taskSlot >= 4).length;
    expect(
      (children.learner as { interactions: readonly unknown[] }).interactions,
    ).toHaveLength(practiceCount);
  });

  // зачем: раньше responseOptions всегда был пустым. Экран показывал название
  // механики, но человеку нечего было выбирать и не из чего было собирать
  // фразу. Этот тест проверяет настоящий путь source -> shard -> learner child
  // для всех семи обязательных семейств, а не отдельную демонстрационную DTO.
  it("materializes playable family-specific tasks for every practice card", () => {
    const seenFamilies = new Set<string>();
    const instructionByFamily: Readonly<Record<string, string>> = {
      listen_choose: "Послушайте и выберите то, что услышали.",
      phrase_builder: "Соберите фразу из слов.",
      speed_match: "Быстро подберите правильное слово.",
      sound_contrast: "Различите похожие по звучанию слова.",
      context_gap_grammar: "Поставьте нужную форму по смыслу.",
      listen_build_dictation: "Послушайте и восстановите фразу.",
      scripted_repeat_compare: "Повторите вслух и сравните с образцом.",
    };

    for (const source of AUTHORED_EPISODE_01_SESSIONS) {
      const sourceShard = buildSessionShardFromSource(source);
      const children = buildSessionChildBodiesFromShard(
        sourceShard,
        "ru",
        `lesson-01:session:${String(source.requiredSessionOrdinal).padStart(2, "0")}`,
      );
      const interactions = (children.learner as {
        interactions: readonly {
          interactionId: string;
          family: string;
          inputMode: string;
          prompt: string;
          responseOptions: readonly { responseId: string; text: string }[];
        }[];
      }).interactions;

      for (const interaction of interactions) {
        const card = sourceShard.cards.find(
          (candidate) => candidate.cardId === interaction.interactionId,
        );
        expect(card).toBeDefined();
        const target = card!.contentItem.target.text;
        const meaning = card!.contentItem.learnerMeanings.find(
          (entry) => entry.locale === "ru",
        )!.value;
        const optionTexts = interaction.responseOptions.map((option) => option.text);
        expect(new Set(interaction.responseOptions.map((option) => option.responseId)).size)
          .toBe(interaction.responseOptions.length);
        expect(interaction.prompt).toContain(instructionByFamily[interaction.family]);
        seenFamilies.add(interaction.family);

        if (interaction.inputMode === "ordered_tokens") {
          expect(optionTexts.length).toBeGreaterThan(0);
          expect(optionTexts.length).toBeLessThanOrEqual(8);
          expect(optionTexts.join(" ")).toBe(
            target.replace(/[?.!,]/gu, "").split(/\s+/u).filter(Boolean).join(" "),
          );
          expect(interaction.prompt).toContain(meaning);
        } else if (interaction.family === "listen_choose") {
          expect(optionTexts).toHaveLength(3);
          expect(optionTexts).toContain(meaning);
          expect(interaction.prompt).not.toContain(target);
        } else if (interaction.family === "context_gap_grammar") {
          expect(interaction.prompt).toContain("____");
          expect(optionTexts).toHaveLength(3);
        } else if (
          interaction.family === "sound_contrast" ||
          interaction.family === "speed_match"
        ) {
          expect(optionTexts).toHaveLength(3);
          expect(optionTexts).toContain(target);
        } else if (interaction.inputMode === "scripted_speech") {
          expect(interaction.prompt).toContain(target);
          expect(optionTexts).toHaveLength(0);
        }
      }
    }

    expect([...seenFamilies].sort()).toEqual([
      "context_gap_grammar",
      "listen_build_dictation",
      "listen_choose",
      "phrase_builder",
      "scripted_repeat_compare",
      "sound_contrast",
      "speed_match",
    ]);
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
      buildSessionChildBodiesFromShard(broken as never, "ru", "lesson-01:session:01"),
    ).toThrow(/session_package_unsupported_family/);
  });
});
