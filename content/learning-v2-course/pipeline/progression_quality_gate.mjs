import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--sessions-root") out.sessionsRoot = argv[++i];
    else if (argv[i] === "--from") out.from = Number(argv[++i]);
  }
  return out;
}

function ordinal(name) {
  const match = /^s(\d+)$/i.exec(name);
  return match ? Number(match[1]) : null;
}

function newWords(source) {
  return [...source.matchAll(/^new_words:\s*(.+)$/gmi)]
    .map((match) => match[1].trim())
    .filter((value) => value && value !== "—" && value !== "-")
    .map((value) => value.split(/\s+—\s+/u)[0].trim().toLowerCase())
    .filter(Boolean);
}

function containsWord(source, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`, "iu").test(source);
}

function containsLexeme(source, word) {
  if (containsWord(source, word)) return true;
  const plural = /[^aeiou]y$/iu.test(word)
    ? `${word.slice(0, -1)}ies`
    : /(?:s|x|z|ch|sh)$/iu.test(word)
      ? `${word}es`
      : `${word}s`;
  return containsWord(source, plural);
}

function plainText(source) {
  return source
    .replace(/[`*_>#]/gu, " ")
    .replace(/[^\p{L}\p{N}'’-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function learnerFacingSource(source) {
  return source.split(/^##\s+Для\s+(?:сборщика|збирача)\s*$/miu)[0];
}

function correctIntroTarget(block) {
  const match = /^\s*-\s*✅\s*(.+)$/mu.exec(block);
  if (!match) return null;
  return match[1].split(/\s+—\s+/u)[0].trim();
}

function unmark(value) {
  return String(value || "").replace(/[*_`]/gu, "").trim();
}

function introQuestionOffset(block) {
  const answerAt = block.search(/^\s*-\s*✅/mu);
  if (answerAt < 0) return -1;
  const beforeAnswers = block.slice(0, answerAt);
  const questions = [...beforeAnswers.matchAll(/^\s*\*\*(?!\*)(.+?)\*\*\s*$/gmu)];
  return questions.length ? questions.at(-1).index : -1;
}

function finalTaskSource(practiceSource) {
  const match = /^\*\*\d+\s*·\s*(?:Финал|Фінал)[^\n]*\*\*[\s\S]*?(?=^\*\*\d+\s*·|^##\s+Для\s+сборщика|^##\s+Для\s+збирача|(?![\s\S]))/miu.exec(practiceSource);
  return match?.[0] ?? "";
}

function operationSignature(target) {
  const raw = unmark(target);
  const normalized = plainText(raw)
    .replace(/\b(?:this|that)\b/giu, "demsg")
    .replace(/\b(?:these|those)\b/giu, "dempl");
  const kind = /\?/u.test(raw)
    ? "question"
    : /\b(?:please|give me)\b/iu.test(normalized)
      ? "request"
      : "statement";
  const grammar = normalized.split(/\s+/u).filter((token) => [
    "i", "you", "he", "she", "it", "we", "they", "am", "is", "are", "not",
    "a", "an", "the", "give", "me", "please", "demsg", "dempl",
  ].includes(token));
  return `${kind}|${grammar.join(" ")}`;
}

function actionKind(target) {
  const raw = unmark(target);
  const normalized = plainText(raw);
  if (/\?/u.test(raw)) return "question";
  if (/\b(?:please|give me)\b/iu.test(normalized)) return "request";
  return "statement";
}

function practiceBeforeFinal(practiceSource) {
  const finalAt = practiceSource.search(/^\*\*\d+\s*·\s*(?:Финал|Фінал)/miu);
  return finalAt >= 0 ? practiceSource.slice(0, finalAt) : practiceSource;
}

function scoredPracticeTargets(practiceSource) {
  const targets = [];
  for (const pattern of [/→\s*\*\*([^*]+)\*\*/gmu, /🎙\s*\*\*([^*]+)\*\*/gmu]) {
    for (const match of practiceSource.matchAll(pattern)) targets.push(unmark(match[1]));
  }
  for (const match of practiceSource.matchAll(/🔊\s*\*([^*]+)\*\s*→/gmu)) {
    targets.push(unmark(match[1]));
  }
  for (const match of practiceSource.matchAll(/^([^\n]*___[^\n]*?)\s*→\s*\*\*([^*]+)\*\*/gmu)) {
    targets.push(unmark(match[1]).replace("___", unmark(match[2])));
  }
  return targets.filter(Boolean);
}

function targetSignatures(source) {
  const signatures = [];
  for (const match of source.matchAll(/\*\*([^*]+)\*\*/gmu)) {
    for (const sentence of unmark(match[1]).split(/(?<=[.?!])\s+/u)) {
      const signature = operationSignature(sentence);
      if (!signature.endsWith("|")) signatures.push(signature);
    }
  }
  return signatures;
}

function introAlignmentIssues(source, words, id) {
  const findings = [];
  const practiceAt = source.search(/^##\s+Практика(?:\s|\()/miu);
  const beforePractice = practiceAt >= 0 ? source.slice(0, practiceAt) : source;
  const introAt = beforePractice.search(/^##\s*[ИІ]нтро\s*\d+/miu);
  if (introAt < 0) return [`${id}: нет интро, которое готовит текущие новые слова`];
  const introSource = beforePractice.slice(introAt);
  const practiceSource = practiceAt >= 0 ? source.slice(practiceAt) : "";
  const scoredTargets = scoredPracticeTargets(practiceBeforeFinal(practiceSource));
  const scoredSignatures = scoredTargets.map(operationSignature);
  const finalSource = finalTaskSource(practiceSource);
  const finalActions = targetSignatures(finalSource).map((signature) => signature.split("|", 1)[0]);
  if (words.length > 0 && !words.some((word) => containsLexeme(finalSource, word))) {
    findings.push(`${id}: финал не требует ни одного нового слова текущей сессии`);
  }
  for (const word of words) {
    if (!containsWord(introSource, word)) findings.push(`${id}: интро не готовит новое слово ${word}`);
  }
  const blocks = introSource.split(/^##\s*[ИІ]нтро\s*\d+[^\n]*$/gmiu).slice(1);
  if (blocks.length !== 3) findings.push(`${id}: требуется ровно 3 интро, найдено ${blocks.length}`);
  for (let index = 0; index < blocks.length; index += 1) {
    if (!words.some((word) => containsLexeme(blocks[index], word))) {
      findings.push(`${id}: интро ${index + 1} не использует новое слово текущей сессии`);
    }
    const target = correctIntroTarget(blocks[index]);
    if (!target) continue;
    const cleanTarget = unmark(target);
    if (!words.some((word) => containsLexeme(cleanTarget, word))) {
      findings.push(`${id}: интро ${index + 1}: правильный ответ ${target} не использует новое слово текущей сессии`);
    }
    const questionAt = introQuestionOffset(blocks[index]);
    const explanation = questionAt >= 0 ? blocks[index].slice(0, questionAt) : "";
    const targetSentences = cleanTarget.split(/(?<=[.?!])\s+/u).map(plainText).filter(Boolean);
    const normalizedTarget = plainText(cleanTarget);
    const normalizedExplanation = plainText(explanation);
    if (!targetSentences.length || !targetSentences.every((sentence) => normalizedExplanation.includes(sentence))) {
      findings.push(`${id}: интро ${index + 1}: правильный ответ ${target} не разобран над вопросом`);
    }
    const signature = operationSignature(cleanTarget);
    if (!scoredSignatures.includes(signature)) {
      findings.push(`${id}: интро ${index + 1}: операция ${signature} не является правильным target в заданиях 1–16`);
    }
    const requiredAction = actionKind(cleanTarget);
    if (!finalActions.includes(requiredAction)) {
      findings.push(`${id}: интро ${index + 1}: действие ${requiredAction} не требуется в финале`);
    }
  }
  return findings;
}

function spatialMeaningIssues(source, id) {
  const findings = [];
  const lines = source.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^(?:Значения вариантов|Значення варіантів):/iu.test(lines[index])) continue;
    const body = lines[index].replace(/^[^:]+:\s*/u, "");
    for (const item of body.split(/\s+·\s+/u)) {
      const parts = item.split(/\s+—\s+/u);
      if (parts.length < 2) continue;
      const target = parts.shift();
      const meaning = parts.join(" — ");
      if (/\b(?:this|these)\b/iu.test(target) && /(?:^|[^\p{L}])(?:рядом|поруч|вдали|вдалині)(?:$|[^\p{L}])/iu.test(meaning)) {
        findings.push(`${id}:${index + 1}: в localized listen meaning добавлено пространственное слово: ${target} — ${meaning}`);
      }
    }
  }
  return findings;
}

export function progressionIssues(sessionsRoot, from = 25) {
  const findings = [];
  const seenWords = new Map();
  const seenScenes = new Map();
  const priorLearnerSources = [];
  const dirs = fs.readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && ordinal(entry.name) !== null)
    .sort((a, b) => ordinal(a.name) - ordinal(b.name));

  for (const entry of dirs) {
    const n = ordinal(entry.name);
    const file = path.join(sessionsRoot, entry.name, "final.ru.md");
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    const words = newWords(source);
    const scene = /^\*\*Сцена сессии\.\*\*\s*(.+)$/mi.exec(source)?.[1]?.trim().toLowerCase();
    const ukFile = path.join(sessionsRoot, entry.name, "final.uk.md");
    const ukSource = fs.existsSync(ukFile) ? fs.readFileSync(ukFile, "utf8") : null;

    if (n >= from && words.length === 0) findings.push(`${entry.name}: нет новых слов`);
    for (const word of words) {
      if (n >= from && seenWords.has(word)) findings.push(`${entry.name}: повтор new_words ${word} (впервые ${seenWords.get(word)})`);
      else if (!seenWords.has(word)) seenWords.set(word, entry.name);
      if (n >= from) {
        for (const prior of priorLearnerSources) {
          if (containsLexeme(prior.source, word)) findings.push(`${entry.name}: new_words ${word} уже показывалось ученику в ${prior.id}`);
        }
      }
    }
    if (scene) {
      if (n >= from && seenScenes.has(scene)) findings.push(`${entry.name}: дословно повторена сцена ${seenScenes.get(scene)}`);
      else if (!seenScenes.has(scene)) seenScenes.set(scene, entry.name);
    }
    if (n >= from) {
      findings.push(...introAlignmentIssues(source, words, `${entry.name}/final.ru.md`));
      findings.push(...spatialMeaningIssues(source, `${entry.name}/final.ru.md`));
      if (ukSource) {
        findings.push(...introAlignmentIssues(ukSource, words, `${entry.name}/final.uk.md`));
        findings.push(...spatialMeaningIssues(ukSource, `${entry.name}/final.uk.md`));
      }
    }
    priorLearnerSources.push({ id: `${entry.name}/final.ru.md`, source: learnerFacingSource(source) });
    if (ukSource) priorLearnerSources.push({ id: `${entry.name}/final.uk.md`, source: learnerFacingSource(ukSource) });
  }
  return findings;
}

function main() {
  const cli = args(process.argv.slice(2));
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sessionsRoot = path.resolve(cli.sessionsRoot || path.join(here, "..", "sessions", "en", "l03"));
  const findings = progressionIssues(sessionsRoot, Number.isFinite(cli.from) ? cli.from : 25);
  if (findings.length) {
    console.log(`LEARNING V2 PROGRESSION QUALITY GATE: HOLD (${findings.length})`);
    for (const finding of findings) console.log(`- ${finding}`);
    process.exitCode = 1;
  } else {
    console.log("LEARNING V2 PROGRESSION QUALITY GATE: PASS");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
