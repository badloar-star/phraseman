import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  collectAcceptedPrefixPrerequisiteCoverage,
  parseBlueprintAuthoringContract,
  runEnglishBlueprintIntegrityGate,
} from "./authoring_admission.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "../..");
const session = "en:lesson-01:session-16";
const allowedAdjectives = new Set([
  "tall", "short", "young", "old", "kind", "funny", "smart", "strong", "quiet", "loud",
  "friendly", "helpful", "small", "big", "clean", "dirty", "open", "closed", "easy",
  "difficult", "important"
]);
const targetPhrases = [
  "I am kind.", "I am tall.", "He is short.", "She is friendly.", "He is smart.",
  "It is open.", "She is quiet.", "I am helpful.", "He is funny.", "It is clean.",
  "She is young.", "I am strong.", "He is old.", "It is easy.", "She is kind.",
  "It is important.", "I am smart."
];
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const atomic = () => JSON.parse(read("sessions/en/l01/s16/practice.atomic.json"));
const localeInteractions = (data, locale) => data.interactionsByLocale[locale];
const answersById = (data) => new Map(data.answers.map((item) => [item.interactionId, item.correctText]));
const targetFor = (interaction, answer) => {
  const payload = interaction.modePayload ?? {};
  if (interaction.family === "listen_choose") return payload.referenceAudio.transcript;
  if (interaction.family === "listen_build_dictation") return payload.hiddenTargetPhrase;
  if (interaction.family === "phrase_builder") return payload.targetPhrase;
  if (interaction.family === "context_gap_grammar") return payload.gappedTargetPhrase.replace("___", answer);
  return answer;
};

test("L01/S16 candidate stays within the exact d956 packet shape without asserting admission", () => {
  const ru = read("sessions/en/l01/s16/final.ru.md");
  const uk = read("sessions/en/l01/s16/final.uk.md");
  const data = atomic();

  for (const [label, text] of [["ru", ru], ["uk", uk]]) {
    assert.equal((text.match(/^## Интро /gmu) ?? []).length + (text.match(/^## Інтро /gmu) ?? []).length, 3, `${label}: exactly three intros`);
    assert.equal((text.match(/^\*\*\d+ ·/gmu) ?? []).length, 17, `${label}: exactly seventeen activities`);
    assert.match(text, label === "ru" ? /Интро 1 · Идея/u : /Інтро 1 · Ідея/u, `${label}: concept intro`);
    assert.match(text, label === "ru" ? /Интро 2 · Форма/u : /Інтро 2 · Форма/u, `${label}: form intro`);
    assert.match(text, label === "ru" ? /Интро 3 · Частая ошибка/u : /Інтро 3 · Поширена помилка/u, `${label}: trap intro`);
    assert.equal((text.match(/^\*\*(?:Как сказать|Как описать|Як сказати|Як описати)/gmu) ?? []).length, 3, `${label}: one intro check per page`);
    assert.equal((text.match(/^\s*- ✅ /gmu) ?? []).length, 3, `${label}: one correct intro choice per page`);
    assert.equal((text.match(/^\s*- ❌ /gmu) ?? []).length, 3, `${label}: one contrasting intro choice per page`);
    assert.doesNotMatch(text, /\b(?:You|We|They)\s+are\b/iu, `${label}: forbidden pronoun + are`);
    assert.doesNotMatch(text, /(?:Марк|Mark|Арт[её]м|Artyom|Artem)/iu, `${label}: stale or mismatched actors`);
    assert.doesNotMatch(text, /\/(?:nd|br|eɪv|d|t)\/|\/[ɪæʌɑɔəɛɜʊuːˈˌ]+\//iu, `${label}: unverified phonetic transcription`);
  }

  assert.equal(data.courseSessionId, session);
  assert.deepEqual(Object.keys(data.interactionsByLocale).sort(), ["ru", "uk"]);
  const ruItems = localeInteractions(data, "ru");
  const ukItems = localeInteractions(data, "uk");
  assert.equal(ruItems.length, 17, "RU atomic has 17 interactions");
  assert.equal(ukItems.length, 17, "UK atomic has 17 interactions");
  assert.deepEqual(ruItems.map((item) => item.interactionId), ukItems.map((item) => item.interactionId));
  assert.equal(targetPhrases.length, 17);
  assert.doesNotMatch(JSON.stringify(data), /\b(?:You|We|They)\s+are\b/iu, "atomic source has no forbidden pronoun + are");
  assert.equal(ruItems.at(-1).purpose, "independent_check", "last interaction is the independent probe");
  assert.equal(ruItems.at(-1).family, "phrase_builder", "last probe uses the existing phrase builder mode");
  assert.ok(!ruItems.slice(0, -1).some((item) => item.prompt === ruItems.at(-1).prompt), "last probe does not reuse a training prompt");
  const interaction = (items, suffix) => items.find((item) => item.interactionId.endsWith(suffix));
  const i04 = interaction(ruItems, "i04");
  const i04Uk = interaction(ukItems, "i04");
  const i05 = interaction(ruItems, "i05");
  const i14 = interaction(ruItems, "i14");
  const i05Uk = interaction(ukItems, "i05");
  const i14Uk = interaction(ukItems, "i14");
  const finalUk = ukItems.at(-1);
  assert.deepEqual(i04.modePayload.localizedMeaning, {
    ru: "Мия приветствует гостей и рада их видеть. Опишите её.",
    uk: "Мія вітає гостей і рада їх бачити. Опишіть її."
  }, "i04 uses the exact natural RU/UK scene wording");
  assert.deepEqual(i04Uk.modePayload.localizedMeaning, i04.modePayload.localizedMeaning, "i04 RU and UK scenes stay paired");
  assert.match(ru, /\*\*4 · Составьте карточку о Мие: она приветствует гостей и рада их видеть — «она дружелюбная»\*\*/u,
    "i04 Russian source uses the natural wording");
  assert.match(uk, /\*\*4 · Складіть картку про Мію: вона вітає гостей і рада їх бачити — «вона привітна»\*\*/u,
    "i04 Ukrainian source uses the natural wording");
  assert.deepEqual(i05.modePayload.localizedScene, {
    ru: "Скажите о Лео: «он умный».",
    uk: "Скажіть про Лео: «він розумний»."
  }, "i05 explicitly and uniquely cues the smart meaning in both locales");
  assert.deepEqual(i05Uk.modePayload.localizedScene, i05.modePayload.localizedScene, "i05 RU and UK scenes stay paired");
  assert.deepEqual(i14.modePayload.localizedMeaning, {
    ru: "Передайте смысл «это легко».",
    uk: "Передайте зміст «це легко»."
  }, "i14 explicitly cues the easy meaning in both locales");
  assert.deepEqual(i14Uk.modePayload.localizedMeaning, i14.modePayload.localizedMeaning, "i14 RU and UK scenes stay paired");
  const finalMeaning = ruItems.at(-1).modePayload.localizedMeaning;
  assert.deepEqual(finalMeaning, {
    ru: "Во время викторины вы сами нашли ответы. Скажите, какое качество это показывает: «я умный/умная».",
    uk: "Під час вікторини ви самі знайшли відповіді. Скажіть, яку якість це показує: «я розумний/розумна»."
  }, "final probe uses a concrete changed context in both locales");
  assert.deepEqual(finalUk.modePayload.localizedMeaning, finalMeaning, "final RU and UK scene remain paired");
  for (const item of [ruItems.at(-1), finalUk]) {
    assert.doesNotMatch(item.prompt ?? "", /Самостоятельная проверка|Самостійна перевірка|без примера|без зразка/iu,
      `${item.interactionId}: no internal self-check wording in learner prompt`);
  }
  for (const [label, text] of [["ru", ru], ["uk", uk]]) {
    const finalActivity = text.slice(text.lastIndexOf("**17 ·"));
    assert.doesNotMatch(finalActivity, /Самостоятельная проверка|Самостійна перевірка|без примера|без зразка/iu,
      `${label}: no internal self-check wording in final learner activity`);
  }
  const targetScenesAndFeedback = [i05, i05Uk, i14, i14Uk, ruItems.at(-1), finalUk].flatMap((item) => {
    const payload = item.modePayload ?? {};
    const scenes = Object.values(payload.localizedScene ?? payload.localizedMeaning ?? {});
    const feedback = [...(payload.choiceFeedback ?? []), ...(payload.slotFeedback ?? [])]
      .flatMap((entry) => Object.values(entry.feedbackByLocale ?? {}));
    return [...scenes, ...feedback];
  }).join(" ");
  assert.doesNotMatch(targetScenesAndFeedback, /картк|card|без подсказ|без підказк|один шаг|один крок/iu,
    "i05/i14/i17 scenes and feedback contain no card, hintless-solve, or one-step clue");
  const finalFeedback = Object.values(finalUk.modePayload.slotFeedback[1].feedbackByLocale).join(" ");
  assert.match(finalFeedback, /вікторин|викторин/u, "i17 wrong-tile feedback fits the quiz context");
  for (const [label, text] of [["ru", ru], ["uk", uk]]) {
    const finalActivity = text.slice(text.lastIndexOf("**17 ·"));
    assert.doesNotMatch(finalActivity, /\b(?:I am|He is|She is|It is)\s+[a-z]+\b/u, `${label}: independent probe does not display a model answer`);
  }
  for (const interaction of [ruItems.at(-1), ukItems.at(-1)]) {
    assert.deepEqual(interaction.modePayload.authoredDistractorTokens, ["is", "tall"], `${interaction.interactionId}: final probe includes plausible tile distractors`);
    assert.deepEqual(interaction.modePayload.slotFeedback.map((entry) => entry.responseId), [`${interaction.interactionId}:tile:d1`, `${interaction.interactionId}:tile:d2`]);
  }

  const answers = answersById(data);
  for (const interaction of [...ruItems, ...ukItems]) {
    const answer = answers.get(interaction.interactionId);
    assert.ok(answer, `${interaction.interactionId}: one keyed target answer`);
    assert.doesNotMatch(answer, /\b(?:You|We|They)\s+are\b/iu, `${interaction.interactionId}: forbidden form`);
    if (/\b(?:I|He|She|It)\s+(?:am|is)\b/u.test(answer)) {
      const match = answer.match(/^\s*(?:I am|He is|She is|It is)\s+([a-z]+)[.!?]?\s*$/u);
      assert.ok(match, `${interaction.interactionId}: exactly one affirmative target phrase`);
      assert.ok(allowedAdjectives.has(match[1].toLowerCase()), `${interaction.interactionId}: approved lexical sense ${match[1]}`);
    }
    assert.ok(!/\b(?:You|We|They)\s+are\b/iu.test(interaction.prompt ?? ""), `${interaction.interactionId}: forbidden form in prompt`);

    const payload = interaction.modePayload ?? {};
    const target = targetFor(interaction, answer);
    const targetMatch = target.match(/^\s*(I am|He is|She is|It is)\s+([a-z]+)[.!?]?\s*$/u);
    assert.ok(targetMatch, `${interaction.interactionId}: exactly one affirmative target phrase`);
    assert.ok(allowedAdjectives.has(targetMatch[2].toLowerCase()), `${interaction.interactionId}: approved lexical sense ${targetMatch[2]}`);
    const ordinal = Number(interaction.interactionId.slice(-2)) - 1;
    assert.equal(target, targetPhrases[ordinal], `${interaction.interactionId}: blueprint target phrase`);
    const feedback = [...(payload.choiceFeedback ?? []), ...(payload.slotFeedback ?? [])];
    for (const item of feedback) {
      const texts = item.feedbackByLocale ?? {};
      if (item.correct === true) {
        assert.equal((texts.ru ?? "").trim(), "", `${interaction.interactionId}: no RU explanation after a correct answer`);
        assert.equal((texts.uk ?? "").trim(), "", `${interaction.interactionId}: no UK explanation after a correct answer`);
      } else {
        for (const locale of ["ru", "uk"]) {
          const text = (texts[locale] ?? "").trim();
          assert.ok(text.length > 0, `${interaction.interactionId}: localized correction exists`);
          assert.ok(text.length <= 140, `${interaction.interactionId}: correction is concise`);
          assert.ok((text.match(/[.!?](?:\s|$)/gu) ?? []).length <= 1, `${interaction.interactionId}: at most one correction sentence`);
          assert.doesNotMatch(text, /\b(?:try again|попробуйте ещё раз|спробуйте ще раз|неверно|неправильно|неправильно|відповідає змісту|соответствует смыслу)\b/iu, `${interaction.interactionId}: no generic feedback`);
          assert.doesNotMatch(text, /\b(?:You|We|They)\s+are\b/iu, `${interaction.interactionId}: correction stays in scope`);
        }
      }
    }

    if (["listen_choose", "listen_build_dictation", "sound_contrast"].includes(interaction.family)) {
      const visibleClue = `${interaction.prompt ?? ""} ${payload.localizedScene?.ru ?? ""} ${payload.localizedScene?.uk ?? ""} ${payload.testedPhoneticContrast ?? ""}`;
      assert.ok(!visibleClue.toLocaleLowerCase("en").includes(target.toLocaleLowerCase("en")), `${interaction.interactionId}: listening cue does not reveal target`);
      if (interaction.family === "listen_choose") {
        const options = payload.localizedMeaningChoices.map((option) => option.targetText);
        assert.equal(new Set(options).size, options.length, `${interaction.interactionId}: audio options are distinct`);
        assert.equal(options.filter((option) => option === target).length, 1, `${interaction.interactionId}: exactly one matching audio option`);
      }
    }
  }

  for (let index = 0; index < ruItems.length; index++) {
    const ruItem = ruItems[index];
    const ukItem = ukItems[index];
    assert.equal(answers.get(ruItem.interactionId), answers.get(ukItem.interactionId), `${ruItem.interactionId}: same target in both locales`);
    assert.equal(ruItem.family, ukItem.family, `${ruItem.interactionId}: same activity type`);
    assert.equal(targetFor(ruItem, answers.get(ruItem.interactionId)), targetFor(ukItem, answers.get(ukItem.interactionId)), `${ruItem.interactionId}: same target phrase in both locales`);
    const ruPrompt = (ruItem.prompt ?? "").trim();
    const ukPrompt = (ukItem.prompt ?? "").trim();
    assert.ok(ruPrompt.length > 0 && ukPrompt.length > 0, `${ruItem.interactionId}: localized prompts in both locales`);
    if (ruItem.modePayload.localizedScene) {
      const ruScene = ruItem.modePayload.localizedScene.ru;
      const ukScene = ukItem.modePayload.localizedScene.uk;
      assert.ok(ruScene.length > 0 && ukScene.length > 0, `${ruItem.interactionId}: paired localized scene`);
      assert.equal(/Мия|Мии/u.test(ruScene), /Мія|Мії/u.test(ukScene), `${ruItem.interactionId}: Mira is the same actor in RU/UK`);
      assert.equal(/Лео/u.test(ruScene), /Лео/u.test(ukScene), `${ruItem.interactionId}: Leo is the same actor in RU/UK`);
    }
    for (const name of ["Leo", "Mira", "Nina", "Mark", "Artem", "Artyom"]) {
      assert.equal((ruItem.prompt ?? "").toLowerCase().includes(name.toLowerCase()), (ukItem.prompt ?? "").toLowerCase().includes(name.toLowerCase()), `${ruItem.interactionId}: stable actor ${name}`);
    }
  }

  for (const [label, text, items] of [["ru", ru, ruItems], ["uk", uk, ukItems]]) {
    const markers = [...text.matchAll(/<!-- interaction_id: en:lesson-01:session-16:i\d\d; family: ([a-z_]+) -->/gu)];
    assert.equal(markers.length, 17, `${label}: all 17 source activities have schema markers`);
    assert.deepEqual(markers.map((match) => match[1]), items.map((item) => item.family), `${label}: markdown/atomic activity parity`);
  }
});

test("L01/S16 declares that the checkpoint introduces no new words in the canonical header", () => {
  assert.match(read("sessions/en/l01/s16/final.ru.md"), /^\*\*Новые слова:\*\* —$/mu);
  assert.match(read("sessions/en/l01/s16/final.uk.md"), /^\*\*Нові слова:\*\* —$/mu);
});

test("L01/S16 authoring eligibility is HOLD on the actual accepted prefix", async () => {
  const blueprintGate = runEnglishBlueprintIntegrityGate(repoRoot, "en/l01/s16");
  assert.match(blueprintGate.stdout, /authoring_packet_contracts=1792 authoring_packet_contract_findings=0/u);
  const blueprintContract = parseBlueprintAuthoringContract(blueprintGate, "en/l01/s16");
  assert.equal(blueprintContract.blueprintFingerprint, "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da");
  assert.deepEqual(blueprintContract.semantic.newLexicalSenses, []);
  assert.equal(blueprintContract.acceptedPrefixPackets.length, 15);
  assert.deepEqual(
    blueprintContract.semantic.reviewOperations.map(({ id }) => id),
    [
      "en.grammar.present_be_affirmative.i_am",
      "en.grammar.present_be_affirmative.he_she_it_is",
    ],
  );

  const coverage = await collectAcceptedPrefixPrerequisiteCoverage({
    repoRoot,
    sessionsRoot: path.join(root, "sessions"),
    session: "en/l01/s16",
    blueprintContract,
  });
  assert.equal(coverage.verdict, "HOLD");
  assert.deepEqual(coverage.missingRetrievalSenseIds, [
    "en.tall.adjective.01",
    "en.short.adjective.01",
    "en.young.adjective.01",
    "en.old.adjective.01",
    "en.kind.adjective.01",
    "en.funny.adjective.01",
    "en.smart.adjective.01",
    "en.strong.adjective.01",
    "en.quiet.adjective.01",
    "en.loud.adjective.01",
    "en.friendly.adjective.01",
    "en.helpful.adjective.01",
    "en.small.adjective.01",
    "en.big.adjective.01",
    "en.clean.adjective.01",
    "en.dirty.adjective.01",
    "en.open.adjective.01",
    "en.closed.adjective.01",
    "en.easy.adjective.01",
    "en.difficult.adjective.01",
    "en.important.adjective.01",
  ]);
  assert.deepEqual(coverage.missingReviewOperationIds, [
    "en.grammar.present_be_affirmative.he_she_it_is",
  ]);
  const s01 = coverage.acceptedSessions.find((entry) => entry.session === "en/l01/s01");
  const s09 = coverage.acceptedSessions.find((entry) => entry.session === "en/l01/s09");
  assert.equal(s01.packetVerdict, "PASS");
  assert.deepEqual(s01.provenOperationIds, ["en.grammar.present_be_affirmative.i_am"]);
  assert.equal(s09.packetVerdict, "HOLD");
  assert.deepEqual(s09.provenLexicalSenseIds, []);
  assert.deepEqual(s09.provenOperationIds, []);
});
