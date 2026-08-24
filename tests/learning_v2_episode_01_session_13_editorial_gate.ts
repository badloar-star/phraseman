import assert from "node:assert/strict";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { EDITORIAL_INTRO_BODIES_11_TO_15_V3 } from "../modules/learning-v2/content/source/episode_01_editorial_intro_bodies_11_15_v3";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

const LOCALES = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const source = AUTHORED_EPISODE_01_SESSIONS[12];

assert.equal(source?.requiredSessionOrdinal, 13);
assert.ok(
  source.phrases.every((phrase) =>
    phrase.features.includes("contraction_youre"),
  ),
  "every session 13 phrase must practice the one newly introduced contraction",
);
assert.equal(
  EDITORIAL_INTRO_BODIES_11_TO_15_V3[13]?.length,
  3,
  "session 13 must use three explicit editorial intro bodies",
);

for (const page of source.introPages) {
  for (const locale of LOCALES) {
    const body = page.body[locale];
    assert.ok(
      body.length >= 300,
      `${page.kind}.${locale} must keep the approved intro depth`,
    );
    assert.ok(
      (body.match(/[.!?](?:\s|$)/gu) ?? []).length >= 4,
      `${page.kind}.${locale} must be a causal paragraph, not a note`,
    );
    assert.doesNotMatch(
      body,
      /\bсесси\w*|\bзанятт\w*|\bsesión\b|\bsessão\b|\bsesi\b|\boturum\b|\bsesj\w*/iu,
      `${page.kind}.${locale} must teach language without course machinery`,
    );
  }
}

const expectedMeanings: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "You’re tired.": {
    ru: "Ты устал.",
    uk: "Ти втомився.",
    es: "Estás cansado.",
    "pt-BR": "Você está cansado.",
    vi: "Bạn mệt.",
    id: "Kamu lelah.",
    tr: "Yorgunsun.",
    pl: "Jesteś zmęczony.",
  },
  "You’re cold.": {
    ru: "Тебе холодно.",
    uk: "Тобі холодно.",
    es: "Tienes frío.",
    "pt-BR": "Você está com frio.",
    vi: "Bạn thấy lạnh.",
    id: "Kamu kedinginan.",
    tr: "Üşüyorsun.",
    pl: "Jest ci zimno.",
  },
  "You’re warm.": {
    ru: "Тебе тепло.",
    uk: "Тобі тепло.",
    es: "Tienes calor.",
    "pt-BR": "Você está com calor.",
    vi: "Bạn thấy ấm.",
    id: "Kamu merasa hangat.",
    tr: "İçin sıcak.",
    pl: "Jest ci ciepło.",
  },
  "You’re at home.": {
    ru: "Ты дома.",
    uk: "Ти вдома.",
    es: "Estás en casa.",
    "pt-BR": "Você está em casa.",
    vi: "Bạn đang ở nhà.",
    id: "Kamu di rumah.",
    tr: "Evdesin.",
    pl: "Jesteś w domu.",
  },
};

for (const [english, byLocale] of Object.entries(expectedMeanings)) {
  const phrase = source.phrases.find((entry) => entry.english === english);
  assert.ok(phrase, `missing phrase ${english}`);
  for (const locale of LOCALES) {
    assert.equal(
      phrase.localizedDetails?.[locale]?.meaning,
      byLocale[locale],
      `${english}.${locale}`,
    );
  }
}

for (const locale of LOCALES) {
  const explanations = source.phrases.map(
    (phrase) => phrase.localizedDetails?.[locale]?.explanation ?? "",
  );
  assert.equal(
    new Set(explanations).size,
    15,
    `all phrase explanations must be individually authored for ${locale}`,
  );
  explanations.forEach((text) => {
    assert.ok(
      text.length >= 80,
      `phrase explanation is too thin for ${locale}`,
    );
    assert.doesNotMatch(
      text,
      /Эту фразу говорят|Цю фразу кажуть|Esta frase se usa|Esta frase aparece|Kalimat ini dipakai|Bu cümle gerçek/u,
    );
  });
}

const shard = buildSessionShardFromSource(source);
const children = buildSessionChildBodiesFromShard(
  shard,
  "ru",
  "lesson-01:session:13",
);
const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
assert.deepEqual(
  children.learner.interactions.map((entry) => entry.family),
  [
    "listen_choose",
    "phrase_builder",
    "context_gap_grammar",
    "listen_choose",
    "phrase_builder",
    "context_gap_grammar",
    "speed_match",
    "phrase_builder",
    "listen_build_dictation",
    "context_gap_grammar",
    "listen_build_dictation",
    "phrase_builder",
  ],
);

const taskByTarget = (target: string) => {
  const index = practiceCards.findIndex(
    (card) => card.contentItem.target.text === target,
  );
  assert.notEqual(index, -1, `missing task ${target}`);
  return {
    card: practiceCards[index]!,
    interaction: children.learner.interactions[index]!,
  };
};

assert.deepEqual(
  taskByTarget("You’re tired.").interaction.responseOptions.map(
    (option) => option.text,
  ),
  ["You’re", "tired", "Your", "You"],
);
assert.deepEqual(
  taskByTarget("You’re happy.").interaction.responseOptions.map(
    (option) => option.text,
  ),
  ["You’re", "Your", "You"],
);
assert.deepEqual(
  taskByTarget("You’re at home.").interaction.responseOptions.map(
    (option) => option.text,
  ),
  ["You’re at home.", "Your at home.", "You at home."],
);

for (const interaction of children.learner.interactions) {
  const card = practiceCards.find(
    (entry) =>
      entry.cardId === interaction.interactionId.replace(/^interaction-/u, ""),
  );
  const target = card?.contentItem.target.text ?? "";
  const success = card?.successMessageByLocale.ru ?? "";
  assert.equal(
    success.split(target).length - 1,
    1,
    `success must show ${target} exactly once`,
  );
}

const allRuFeedback = children.auxiliary.entries.flatMap((entry) =>
  Object.values(entry.responseFeedbackById ?? {}).map(
    (localized) => localized.ru,
  ),
);
assert.ok(
  allRuFeedback.length >= 20,
  "every visible wrong option needs feedback",
);
assert.ok(
  allRuFeedback.every(
    (text) => !text.includes("тема близкая, но изменившееся слово"),
  ),
  "session 13 semantic feedback must explain the exact competing meaning",
);
assert.ok(
  allRuFeedback.every(
    (text) => !text.includes("похоже по грамматической роли"),
  ),
  "session 13 form feedback must explain your or the missing be form",
);
assert.ok(
  allRuFeedback.some((text) => text.includes("притяжательн")),
  "your feedback must name the possessive trap",
);
assert.ok(
  allRuFeedback.some((text) => text.includes("связк")),
  "you feedback must name the missing link verb",
);

console.log("Learning V2 session 13 editorial gate: PASS");
