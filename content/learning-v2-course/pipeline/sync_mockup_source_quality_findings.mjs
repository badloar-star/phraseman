import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { familyChoreographyIssues, familyChoreographyRequiredForSession, preJudgeChoreographyIssues, preservationLedgerIssues } from "./single_phrase_release.mjs";
import { parsePractice } from "./build_release.mjs";
import { authoringPlanProjectionIssues, strictProjectionContractIssues } from "./prejudge_choreography.mjs";
import { parseSessionHeader } from "./session_header.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";

const COURSE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(COURSE_ROOT, "..", "..");
const { projectLearnerVisiblePromptV1 } = createRequire(import.meta.url)(
  path.resolve(PROJECT_ROOT, "modules/learning-v2/content/learner_visible_text_v1.js"),
);

function embeddedJson(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = html.match(new RegExp(`<script id="${escapedId}" type="application/json">([\\s\\S]*?)<\\/script>`));
  return match ? JSON.parse(match[1]) : null;
}

function replaceEmbeddedJson(html, id, value) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`(<script id="${escapedId}" type="application/json">)([\\s\\S]*?)(<\\/script>)`);
  if (!pattern.test(html)) return null;
  return html.replace(pattern, `$1${JSON.stringify(value)}$3`);
}

function taskNumbersByInteraction(markdown) {
  const numbers = new Map();
  let number = null;
  for (const line of String(markdown ?? "").split(/\r?\n/u)) {
    const heading = /^\*\*(\d+)\s*·/u.exec(line);
    if (heading) number = Number(heading[1]);
    const interaction = /<!--\s*interaction_id:\s*([^;\s]+);/u.exec(line);
    if (interaction && Number.isInteger(number)) numbers.set(interaction[1], number);
  }
  return numbers;
}

function learnerFacingReason(issue) {
  if (issue.reason === "one_token_pseudo_action") {
    return issue.family === "listen_build_dictation"
      ? "нельзя составлять на слух одно слово из одной плитки"
      : "нельзя собирать одно слово из одной плитки";
  }
  if (issue.reason === "word_first_three_distinct_contacts_missing") {
    return `слово «${issue.word}» не прошло три разных знакомства до фразы`;
  }
  if (issue.reason === "word_first_phrase_before_three_contacts") {
    return `фраза со словом «${issue.word}» появилась раньше трёх разных знакомств`;
  }
  if (issue.reason === "adjacent_family_repeat") {
    return "два соседних задания используют один и тот же способ работы";
  }
  if (issue.reason === "target_family_repeat") {
    const target = String(issue.target ?? "").trim();
    // Пустая цель означает сбой извлечения из формата задания, а не
    // доказанный повтор. Карточка владельца не должна превращать отсутствие
    // данных в обвинение занятия: предупреждение показываем только когда
    // можем назвать конкретно повторённый материал.
    return target ? `слово «${target}» повторяется тем же способом вместо новой тренировки` : null;
  }
  return null;
}

function preservationEvidenceFor(root, injected) {
  if (injected) return injected;
  const evidenceRoot = path.join(root, "migration", "single-phrase-2026-10-03");
  const beforePath = path.join(evidenceRoot, "before-source-audit.json");
  const ledgerPath = path.join(evidenceRoot, "preservation-ledger.json");
  if (!fs.existsSync(beforePath) || !fs.existsSync(ledgerPath)) return null;
  return {
    before: JSON.parse(fs.readFileSync(beforePath, "utf8")),
    ledger: JSON.parse(fs.readFileSync(ledgerPath, "utf8")),
  };
}

function preservationFindings({ atomic, key, taskNumbers, evidence }) {
  if (!evidence || !String(key).startsWith("en/")) return [];
  const snapshot = (evidence.before?.sessions ?? [])
    .map((entry) => entry?.snapshot)
    .find((entry) => entry?.courseSessionId === atomic?.courseSessionId);
  if (!snapshot) return [];
  const ledger = evidence.ledger ?? {};
  const rows = (ledger.rows ?? [])
    .filter((row) => row.courseSessionId === atomic.courseSessionId)
    .map(({ courseSessionId: ignored, ...row }) => row);
  const amendments = (ledger.amendments ?? []).filter((item) => item.courseSessionId === atomic.courseSessionId);
  const issues = preservationLedgerIssues({
    sourceInteractions: snapshot.interactionsByLocale?.ru ?? [],
    projectedInteractions: atomic.interactionsByLocale?.ru ?? [],
    projectedAnswers: atomic.answers ?? [],
    ledger: rows,
    amendments,
  });
  return issues
    .filter((issue) => issue.reason === "source_segment_substituted" && issue.sourceSegment)
    .map((issue) => ({
      interactionId: issue.newInteractionId ?? issue.oldInteractionId,
      taskNumber: taskNumbers.get(issue.newInteractionId ?? issue.oldInteractionId) ?? null,
      reason: `в задании исчезла исходная проверяемая часть «${issue.sourceSegment}»`,
    }));
}

function normalizedRepeatTarget(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim().replace(/\s+/gu, " ");
}

// A historical repeat may be shown as fixed only when the ledger names this
// exact two-row preservation exception.  This is deliberately not a blanket
// "allow repeats" switch: a changed ID, wording, source segment, family, or a
// third occurrence leaves the warning visible.
function approvedHistoricalRepeatException(issue, interactions, ledger) {
  if (issue?.reason !== "target_family_repeat" || !ledger || ledger.schemaVersion !== "learning_v2_single_phrase_preservation_ledger_v2") return false;
  const ids = [issue.previousInteractionId, issue.interactionId].sort();
  const target = normalizedRepeatTarget(issue.target);
  const match = (ledger.protectedHistoricalRepeatExceptions ?? []).find((entry) =>
    entry?.reasonCode === "target_family_repeat" && entry?.normalizedTarget === target &&
    Array.isArray(entry?.occurrences) && entry.occurrences.length === 2 &&
    entry.occurrences.map((item) => item?.newInteractionId).sort().every((id, index) => id === ids[index]));
  if (!match) return false;
  const rows = ledger.rows ?? [];
  return match.occurrences.every((occurrence) => {
    const row = rows.find((candidate) => candidate.courseSessionId === match.courseSessionId && candidate.oldInteractionId === occurrence.oldInteractionId && candidate.segmentIndex === occurrence.segmentIndex && candidate.newInteractionId === occurrence.newInteractionId);
    const item = interactions.find((candidate) => candidate.interactionId === occurrence.newInteractionId);
    const targetPhrase = item?.modePayload?.targetPhrase ?? "";
    return row?.sourceFamily === "scripted_repeat_compare" && row?.sourceSegment === row?.newTargetSegment &&
      row?.correctText === row?.audioTranscript && normalizedRepeatTarget(row?.correctText) === target &&
      item?.family === "scripted_repeat_compare" && normalizedRepeatTarget(targetPhrase) === target;
  });
}

function inanimateSpeakerFindings(interactions, taskNumbers) {
  // A location can establish context, but it cannot be the intelligible actor
  // of a learner-facing request.  Keep this rule deliberately narrow: it
  // rejects the recurring Russian construction "у [места] спрашивают", not
  // every passive sentence or every mention of a place.
  const inanimateSpeaker = /(?:^|\s)у\s+(?:кулера|стойки|кассы|двери|окна|стола|входа|выхода|лифта|карты|витрины|экрана)\s+(?:спрашивают|уверяют|говорят|отвечают|объясняют|сообщают|просят)(?:$|[\s,.!?:;])/iu;
  return interactions
    .filter((interaction) => {
      const texts = [
        interaction?.prompt,
        interaction?.accessibilityLabel,
        interaction?.modePayload?.localizedScene?.ru,
      ];
      return texts.some((text) => inanimateSpeaker.test(String(text ?? "")));
    })
    .map((interaction) => ({
      interactionId: interaction.interactionId,
      taskNumber: taskNumbers.get(interaction.interactionId) ?? null,
      reason: "в сцене действие приписано месту, а не названному человеку",
    }));
}

function wrongFamilyPayloadFindings(interactions, taskNumbers) {
  // Feedback belongs to the interaction family that can actually surface it.
  // A conversion from a choice task to a builder/repeat must not retain the
  // old choice packet: its response IDs can no longer name visible learner
  // options, so an apparently harmless residue becomes wrong feedback.
  const forbiddenFields = {
    phrase_builder: ["choiceFeedback"],
    listen_build_dictation: ["choiceFeedback"],
    scripted_repeat_compare: ["choiceFeedback", "localizedMeaningChoices", "transcriptRevealPolicy", "isWordCard", "wordCard"],
  };
  return interactions.flatMap((interaction) => {
    const payload = interaction?.modePayload ?? {};
    const leaked = (forbiddenFields[interaction?.family] ?? [])
      .some((field) => Object.hasOwn(payload, field));
    return leaked ? [{
      interactionId: interaction.interactionId,
      taskNumber: taskNumbers.get(interaction.interactionId) ?? null,
      reason: "у задания остались поля от другого способа работы; пояснения могут относиться не к тем вариантам",
    }] : [];
  });
}

function authoringPlanFindings(directory, atomic) {
  const file = path.join(directory, "preauthoring.json");
  if (!fs.existsSync(file)) return [];
  let guardian;
  try { guardian = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return [{ interactionId: null, taskNumber: null, reason: "не читается утверждённый план занятия" }]; }
  return authoringPlanProjectionIssues({ guardian, atomicSource: atomic })
    .filter((issue) => issue.startsWith("authoring_plan_"))
    .map((issue) => {
      if (issue.startsWith("authoring_plan_task_count:")) {
        const [, locale, planned, actual] = issue.split(":");
        return { interactionId: null, taskNumber: 17, reason: `план обещает ${planned.replace("planned=", "")} заданий, а в ${locale.toUpperCase()}-версии ${actual.replace("actual=", "")}` };
      }
      if (issue.startsWith("authoring_plan_final_shape:")) {
        const [, locale, expected, actual] = issue.split(":");
        return { interactionId: null, taskNumber: 17, reason: `финал в ${locale.toUpperCase()}-версии: ${expected.replace("expected_one_i17", "нужно одно задание 17")}, найдено ${actual.replace("actual=", "")}` };
      }
      return { interactionId: null, taskNumber: 17, reason: "финал раскрывает ответ до самостоятельной попытки" };
    });
}

function sourceProjectionFindings({ key, directory, atomic }) {
  const markdownByLocale = Object.fromEntries(["ru", "uk"].flatMap((locale) => {
    const file = path.join(directory, `final.${locale}.md`);
    return fs.existsSync(file) ? [[locale, fs.readFileSync(file, "utf8")]] : [];
  }));
  // This diagnostic compares a bilingual source projection.  A missing locale
  // is rejected by the release gate; keep focused owner-quality checks from
  // inventing an unnumbered task warning when there is nothing to compare.
  if (!markdownByLocale.ru || !markdownByLocale.uk) return [];
  // The release gate deliberately stops at the *first* incompatible row: that
  // is appropriate for refusing a build, but it hid the rest of the broken
  // rows from the owner card.  The card is an audit surface, so enumerate
  // every visible Russian task whose order, identity, prompt, or runtime
  // family disagrees with the checked atomic projection.  This does not relax
  // the release gate; it only makes every repair target visible.
  const tasks = parsePractice(markdownByLocale.ru);
  const interactions = atomic?.interactionsByLocale?.ru;
  const runtimeFamily = (family) => family === "word_card" ? "listen_choose" : family;
  const sessionId = String(atomic?.courseSessionId ?? "");
  if (Array.isArray(interactions) && sessionId) {
    const structural = Array.from({ length: Math.max(tasks.length, interactions.length) }, (_, index) => {
      const task = tasks[index];
      const interaction = interactions[index];
      if (!task) return {
        interactionId: `source_projection:${index}`,
        taskNumber: index + 1,
        reason: "в плеере есть дополнительный шаг, которого нет в тексте занятия",
      };
      if (!interaction) return {
        interactionId: `source_projection:${index}`,
        taskNumber: task.ordinal,
        reason: "исходный текст задания не совпадает с проверенным вариантом",
      };
      const expectedId = task.interactionId || `${sessionId}:i${String(task.ordinal).padStart(2, "0")}`;
      const expectedLearnerPrompt = projectLearnerVisiblePromptV1({
        title: task.title,
        family: task.family,
        correctText: task.options.find((option) => option.correct)?.text ?? task.target ?? task.card?.word ?? interaction.modePayload?.wordCard?.word ?? "",
        isWordCard: Boolean(task.card) || Boolean(interaction.modePayload?.isWordCard),
      });
      const differs = task.ordinal !== index + 1 || expectedLearnerPrompt !== interaction.prompt ||
        expectedId !== interaction.interactionId || runtimeFamily(task.family) !== interaction.family;
      return differs ? {
        interactionId: `source_projection:${index}`,
        taskNumber: task.ordinal,
        reason: "исходный текст задания не совпадает с проверенным вариантом",
      } : null;
    }).filter(Boolean);
    if (structural.length) return structural;
  }
  return strictProjectionContractIssues({
    sessionIdentity: key,
    atomicSource: atomic,
    markdownByLocale,
  }).issues
    .filter((issue) => typeof issue === "string" && (issue.startsWith("atomic_markdown_parity:") || issue.startsWith("atomic_markdown_learner_parity:")))
    .map((issue) => {
      const position = /:index=(\d+):/u.exec(issue)?.[1];
      return {
        interactionId: `source_projection:${position ?? "unknown"}`,
        taskNumber: position === undefined ? null : Number(position) + 1,
        reason: "исходный текст задания не совпадает с проверенным вариантом",
      };
    });
}

function actorClarityReason(rule) {
  if (/internal_(?:course|task|editorial)|grammar_metaphor/u.test(rule)) return "в тексте остался внутренний термин вместо объяснения ученику";
  if (/ring_as_marital_proof/u.test(rule)) return "семейное положение выведено по кольцу, а не по надёжному факту";
  if (/(?:unnamed|unspecified|actorless|place_as)/u.test(rule)) return "не назван человек, который говорит, спрашивает или является предметом фразы";
  if (/third_person_cue/u.test(rule)) return "подсказка меняет лицо фразы и не даёт однозначно понять, что сказать";
  return "сценарий не прошёл проверку ясности для ученика";
}

function taskNumberAtLine(markdown, line) {
  if (!Number.isInteger(line) || line < 1) return null;
  const preceding = markdown.split(/\r?\n/u).slice(0, line).reverse()
    .find((value) => /^\*\*(\d+)\s*·/u.test(value));
  const match = preceding && /^\*\*(\d+)\s*·/u.exec(preceding);
  return match ? Number(match[1]) : null;
}

// Run the existing actor-clarity gate once and turn its factual findings into
// owner-card evidence.  The mockup must not advertise a checked repair while
// the source itself still contains an unnamed speaker, an internal label, or
// a cue that makes the grammatical person ambiguous.
export function actorClarityFindings({ root = COURSE_ROOT, sessionKeys, run = spawnSync }) {
  const script = path.join(root, "pipeline", "audit_actor_clarity.mjs");
  if (!fs.existsSync(script)) return {};
  const audit = run(process.execPath, [script, "--scope", "en"], { cwd: root, encoding: "utf8" });
  if (audit.error || audit.status === 0) return {};
  const grouped = {};
  // The audit deliberately writes HOLD findings to stderr so a caller cannot
  // mistake them for a successful result.  They are still evidence for the
  // owner card and must be parsed here.
  for (const line of `${String(audit.stdout ?? "")}\n${String(audit.stderr ?? "")}`.split(/\r?\n/u)) {
    if (!line.startsWith("{")) continue;
    let issue;
    try { issue = JSON.parse(line); } catch { continue; }
    const match = /^sessions\/(en\/l\d{2}\/s\d{2})\/final\.(ru|uk)\.md$/u.exec(String(issue?.file ?? ""));
    if (!match || !sessionKeys.has(match[1])) continue;
    const [key, locale] = [match[1], match[2]];
    const markdownFile = path.join(root, "sessions", ...key.split("/"), `final.${locale}.md`);
    const markdown = fs.existsSync(markdownFile) ? fs.readFileSync(markdownFile, "utf8") : "";
    const taskNumber = taskNumberAtLine(markdown, issue.line);
    const item = {
      interactionId: `actor_clarity:${issue.rule}:${issue.line ?? "source"}`,
      taskNumber,
      reason: actorClarityReason(String(issue.rule ?? "")),
    };
    const rows = grouped[key] ?? [];
    if (!rows.some((row) => row.taskNumber === item.taskNumber && row.reason === item.reason)) rows.push(item);
    grouped[key] = rows;
  }
  return grouped;
}

/**
 * Evidence for yellow owner cards.  The source is the Russian master because
 * it defines the task numbering shown in the owner mockup; locale review is a
 * separate gate and is never silently substituted here.
 */
export function sourceQualityFindings({ root = COURSE_ROOT, sessionKeys, preservationEvidence = null }) {
  const out = {};
  const evidence = preservationEvidenceFor(root, preservationEvidence);
  const actorClarity = actorClarityFindings({ root, sessionKeys });
  for (const key of sessionKeys) {
    const [language, lesson, session] = String(key).split("/");
    if (!language || !lesson || !session) continue;
    const directory = path.join(root, "sessions", language, lesson, session);
    const atomicPath = path.join(directory, "practice.atomic.json");
    const markdownPath = path.join(directory, "final.ru.md");
    if (!fs.existsSync(atomicPath) || !fs.existsSync(markdownPath)) continue;
    const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
    const interactions = atomic?.interactionsByLocale?.ru;
    if (!Array.isArray(interactions)) continue;
    const markdown = fs.readFileSync(markdownPath, "utf8");
    const taskNumbers = taskNumbersByInteraction(markdown);
    const choreography = preJudgeChoreographyIssues({
      sessionIdentity: key,
      interactionsByLocale: atomic.interactionsByLocale,
      answers: atomic.answers ?? [],
      newWords: parseSessionHeader(markdown).newWords,
    });
    const strictWordFirst = familyChoreographyRequiredForSession(key);
    const findings = familyChoreographyIssues(interactions, {
      source: key,
      answers: atomic.answers ?? [],
      newWords: parseSessionHeader(markdown).newWords,
    })
      .filter((issue) => !approvedHistoricalRepeatException(issue, interactions, evidence?.ledger))
      .filter((issue) => strictWordFirst || !String(issue.reason).startsWith("word_first_"))
      .map((issue) => ({ issue, reason: learnerFacingReason(issue) }))
      .filter(({ reason }) => reason)
      .map(({ issue, reason }) => ({
        interactionId: issue.interactionId,
        taskNumber: taskNumbers.get(issue.interactionId) ?? null,
        reason,
      }))
      .concat(choreography
        .filter((issue) => issue.locale === "ru" && issue.stage === "source")
        .map((issue) => ({ issue, reason: learnerFacingReason(issue) }))
        .filter(({ reason }) => reason)
        .map(({ issue, reason }) => ({
          interactionId: issue.interactionId,
          taskNumber: taskNumbers.get(issue.interactionId) ?? null,
          reason,
        })))
      .concat(preservationFindings({ atomic, key, taskNumbers, evidence }))
      .concat(inanimateSpeakerFindings(interactions, taskNumbers))
      .concat(wrongFamilyPayloadFindings(interactions, taskNumbers))
      .concat(authoringPlanFindings(directory, atomic))
      .concat(sourceProjectionFindings({ key, directory, atomic }))
      .concat(actorClarity[key] ?? [])
      .filter((finding, index, all) => all.findIndex((other) => other.interactionId === finding.interactionId && other.reason === finding.reason) === index)
      // The aggregate contact diagnostic has no single task of its own.  When
      // the companion phrase diagnostic names that task, show only the latter
      // so every owner-facing warning stays navigable by assignment number.
      .filter((finding, index, all) => {
        const word = /^слово «(.+)» не прошло три разных знакомства/u.exec(finding.reason)?.[1];
        return !word || finding.taskNumber !== null || !all.some((other) => other.taskNumber !== null && other.reason === `фраза со словом «${word}» появилась раньше трёх разных знакомств`);
      })
      .sort((left, right) => (left.taskNumber ?? Infinity) - (right.taskNumber ?? Infinity));
    if (findings.length) out[key] = findings;
  }
  return out;
}

/** Write the same evidence into an already-open owner mockup without rebuilding it. */
export async function syncMockupSourceQualityFindings({ mockupPath, root = COURSE_ROOT }) {
  if (!fs.existsSync(mockupPath)) return { updated: false, reason: "mockup_missing" };
  const html = fs.readFileSync(mockupPath, "utf8");
  const cards = embeddedJson(html, "data");
  if (!Array.isArray(cards)) return { updated: false, reason: "cards_missing" };
  const findings = sourceQualityFindings({ root, sessionKeys: new Set(cards.map((card) => String(card?.key ?? ""))) });
  const next = replaceEmbeddedJson(html, "source-quality-findings", findings);
  if (next === null) return { updated: false, reason: "findings_missing" };
  const updated = await writeMockupFile(mockupPath, next);
  return { updated, findings: Object.keys(findings).length };
}
