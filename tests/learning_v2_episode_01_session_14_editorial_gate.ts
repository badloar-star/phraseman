import assert from "node:assert/strict";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import { EDITORIAL_INTRO_BODIES_11_TO_15_V3 } from "../modules/learning-v2/content/source/episode_01_editorial_intro_bodies_11_15_v3";
import { EPISODE_01_SESSION_14_EDITORIAL_COPY_V1 } from "../modules/learning-v2/content/source/episode_01_session_14_editorial_copy_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

const LOCALES = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const source = AUTHORED_EPISODE_01_SESSIONS[13];

assert.equal(source?.requiredSessionOrdinal, 14);
assert.equal(source.phrases.length, 15);
assert.deepEqual(
  source.phrases.slice(0, 5).map((phrase) => phrase.english),
  [
    "I am at home.",
    "You are in class.",
    "I am at work.",
    "You are in the park.",
    "I am on the bus.",
  ],
  "the rapid word path must contact five distinct place blocks before reuse",
);
assert.equal(
  EDITORIAL_INTRO_BODIES_11_TO_15_V3[14]?.length,
  3,
  "session 14 must use three explicit editorial intro bodies",
);
assert.equal(
  Object.keys(EPISODE_01_SESSION_14_EDITORIAL_COPY_V1).length,
  15,
  "all fifteen phrases need explicit editorial copy",
);

for (const page of source.introPages) {
  for (const locale of LOCALES) {
    const body = page.body[locale];
    assert.ok(body.length >= 300, `${page.kind}.${locale} intro is too thin`);
    assert.ok(
      (body.match(/[.!?](?:\s|$)/gu) ?? []).length >= 4,
      `${page.kind}.${locale} must be a causal paragraph`,
    );
    assert.doesNotMatch(
      body,
      /\bсесси\w*|\bзанятт\w*|\bsesión\b|\bsessão\b|\bsesi\b|\boturum\b|\bsesj\w*/iu,
      `${page.kind}.${locale} must not mention course machinery`,
    );
  }
}

const expectedMeanings: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "I am at home.": {
    ru: "Я дома.",
    uk: "Я вдома.",
    es: "Estoy en casa.",
    "pt-BR": "Estou em casa.",
    vi: "Tôi đang ở nhà.",
    id: "Saya di rumah.",
    tr: "Evdeyim.",
    pl: "Jestem w domu.",
  },
  "You are in class.": {
    ru: "Ты на занятии.",
    uk: "Ти на занятті.",
    es: "Estás en clase.",
    "pt-BR": "Você está na aula.",
    vi: "Bạn đang ở trong lớp.",
    id: "Kamu sedang mengikuti kelas.",
    tr: "Derstesin.",
    pl: "Jesteś na zajęciach.",
  },
  "I am at work.": {
    ru: "Я на работе.",
    uk: "Я на роботі.",
    es: "Estoy en el trabajo.",
    "pt-BR": "Estou no trabalho.",
    vi: "Tôi đang ở chỗ làm.",
    id: "Saya sedang di tempat kerja.",
    tr: "İşteyim.",
    pl: "Jestem w pracy.",
  },
  "You are in the park.": {
    ru: "Ты в парке.",
    uk: "Ти в парку.",
    es: "Estás dentro del parque.",
    "pt-BR": "Você está dentro do parque.",
    vi: "Bạn đang ở trong công viên.",
    id: "Kamu berada di dalam taman.",
    tr: "Parkın içindesin.",
    pl: "Jesteś w parku.",
  },
  "I am on the bus.": {
    ru: "Я еду в автобусе.",
    uk: "Я їду автобусом.",
    es: "Voy en el autobús.",
    "pt-BR": "Estou no ônibus, em viagem.",
    vi: "Tôi đang đi xe buýt.",
    id: "Saya sedang naik bus.",
    tr: "Otobüsteyim, yolculuk ediyorum.",
    pl: "Jadę autobusem.",
  },
};

for (const [english, meanings] of Object.entries(expectedMeanings)) {
  const phrase = source.phrases.find(
    (candidate) => candidate.english === english,
  );
  assert.ok(phrase, `missing phrase ${english}`);
  for (const locale of LOCALES) {
    assert.equal(phrase.localizedDetails?.[locale]?.meaning, meanings[locale]);
  }
}

for (const locale of LOCALES) {
  const explanations = source.phrases.map(
    (phrase) => phrase.localizedDetails?.[locale]?.explanation ?? "",
  );
  assert.equal(
    new Set(explanations).size,
    15,
    `session 14 copy repeats for ${locale}`,
  );
  assert.ok(explanations.every((text) => text.length >= 80));
}

const shard = buildSessionShardFromSource(source);
const children = buildSessionChildBodiesFromShard(
  shard,
  "ru",
  "lesson-01:session:14",
);
const practiceCards = shard.cards.filter((card) => card.taskSlot >= 4);
const interactions = children.learner.interactions;
assert.equal(
  interactions.length,
  17,
  "rapid session 14 needs seventeen practice contacts",
);
assert.deepEqual(
  interactions.map((entry) => entry.family),
  [
    "listen_choose",
    "listen_choose",
    "listen_choose",
    "listen_choose",
    "speed_match",
    "speed_match",
    "speed_match",
    "speed_match",
    "phrase_builder",
    "phrase_builder",
    "phrase_builder",
    "phrase_builder",
    "context_gap_grammar",
    "context_gap_grammar",
    "context_gap_grammar",
    "context_gap_grammar",
    "phrase_builder",
  ],
);

const targetTask = (target: string, family: string) => {
  const index = practiceCards.findIndex(
    (card) => card.family === family && card.contentItem.target.text === target,
  );
  assert.notEqual(index, -1, `missing ${family} for ${target}`);
  return interactions[index]!;
};

assert.deepEqual(
  targetTask("I am at home.", "context_gap_grammar").responseOptions.map(
    (option) => option.text,
  ),
  ["at", "in", "on"],
);
assert.deepEqual(
  targetTask("You are in class.", "speed_match").responseOptions.map(
    (option) => option.text,
  ),
  ["You are in class.", "You are at class.", "You are on class."],
);
assert.deepEqual(
  targetTask("I am at work.", "phrase_builder").responseOptions.map(
    (option) => option.text,
  ),
  ["I", "am", "at", "work", "to", "on"],
);
assert.deepEqual(
  targetTask("I am on the bus.", "phrase_builder").responseOptions.map(
    (option) => option.text,
  ),
  ["I", "am", "on", "the", "bus", "in", "at"],
);

const feedback = children.auxiliary.entries.flatMap((entry) =>
  Object.values(entry.responseFeedbackById ?? {}),
);
assert.ok(feedback.length >= 30, "all visible traps need localized feedback");
for (const localized of feedback) {
  for (const locale of LOCALES) {
    assert.ok(localized[locale].length >= 80, `thin trap feedback ${locale}`);
    assert.doesNotMatch(
      localized[locale],
      /тема близкая|похоже по грамматической роли/iu,
    );
  }
}

console.log("Learning V2 session 14 editorial gate: PASS");
