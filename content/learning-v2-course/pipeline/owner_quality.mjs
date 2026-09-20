import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SHORT_ANSWER_MARKER_RE = /(?:коротк\p{L}*\s+(?:ответ\p{L}*|відповід\p{L}*)|(?:ответ|відповід)\p{L}*\s+коротко)/iu;
const PLACEHOLDER_RE = /\b(?:mock|placeholder|todo|tbd|self[- ]?approved)\b|самоодобр|авто.?pass|заглуш/iu;

// зачем: владелец 2026-09-20 нашёл в готовых сессиях два класса испорченных
// инструкций и потребовал, чтобы такого текста не было. Первый — инструкция
// заранее объявляет диагностическую лишнюю плитку («среди плиток чужая
// скрепка»), то есть выдаёт ответ до попытки. Второй — обещает «соберите без
// подсказок», хотя подсказка стоит в той же строке следом. Правила давно
// записаны в pipeline/prompts/author.md, но ничто их не проверяло: к моменту
// находки накопилось 130 нарушений в 96 сессиях из 155.
const TRAP_ANNOUNCEMENT_RE = /(?:серед|среди)\s+плиток[^.!?]*?(?:чуж\p{L}*|лишн\p{L}*|зайв\p{L}*)|(?:чуж\p{L}*|лишн\p{L}*|зайв\p{L}*)\s+(?:плитка|плитки|скрепка|скріпка|скрепку|слово|сокращение|скорочення)|лишн\p{L}*\s+`|(?:плитка|плитки)\s+(?:лишн\p{L}*|зайв\p{L}*)|`\s*(?:тут|здесь)\s+лишн\p{L}*/iu;
const SUPPORT_LEVEL_RE = /без\s+(?:подсказ\p{L}*|підказ\p{L}*|опор\p{L}*|помощ\p{L}*|допомог\p{L}*)|самостоятельн\p{L}*|самостійн\p{L}*|провер\p{L}*\s+себя|перевір\p{L}*\s+себе/iu;

function practiceTaskHeadings(markdown) {
  const text = String(markdown || "");
  const practice = text.split(/^##\s*(?:Практик|Практич)[^\r\n]*$/mi)[1] ?? text;
  return [...practice.matchAll(/^\*\*(\d+)\s*·\s*([^*\r\n]+?)\s*\*\*/gmu)]
    .map((match) => ({ ordinal: Number(match[1]), heading: match[2].trim() }));
}

/**
 * Инструкция задания описывает действие и смысл фразы, но не устройство теста
 * и не уровень помощи. Возвращает список нарушений для отчёта о готовности.
 */
export function taskInstructionIssues(markdown) {
  const issues = [];
  for (const { ordinal, heading } of practiceTaskHeadings(markdown)) {
    if (TRAP_ANNOUNCEMENT_RE.test(heading)) {
      issues.push(`задание ${ordinal}: инструкция объявляет лишнюю плитку до ответа — «${heading}»`);
    }
    if (SUPPORT_LEVEL_RE.test(heading)) {
      issues.push(`задание ${ordinal}: инструкция комментирует уровень помощи — «${heading}»`);
    }
  }
  return issues;
}

function sessionParts(sessionId) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/i.exec(String(sessionId || ""));
  return match ? { language: match[1].toLowerCase(), lesson: Number(match[2]), session: Number(match[3]) } : null;
}

export function scopedOwnerQualityRequired(sessionId) {
  const scope = sessionParts(sessionId);
  return Boolean(scope && scope.language === "en" && (scope.lesson > 2 || (scope.lesson === 2 && scope.session >= 33)));
}

export function sessionIdFromDirectory(dir) {
  const normalized = path.resolve(dir).replace(/\\/g, "/");
  const match = /\/sessions\/([a-z]{2})\/l(\d{2})\/s(\d{2})(?:\/|$)/i.exec(normalized);
  return match ? `${match[1].toLowerCase()}/l${match[2]}/s${match[3]}` : null;
}

export function sourceSha256(sourcePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
}

export function bindTasteReceiptToSource(receipt, sourcePath) {
  return { ...receipt, sourceSha256: sourceSha256(sourcePath) };
}

function normalizeAnswer(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isWellFormedBeShortAnswer(value) {
  const answer = normalizeAnswer(value);
  return /^(?:yes (?:i am|you are|he is|she is|it is|we are|they are)|no (?:i am not|i'm not|you are not|you aren't|you're not|he is not|he isn't|he's not|she is not|she isn't|she's not|it is not|it isn't|it's not|we are not|we aren't|we're not|they are not|they aren't|they're not))$/.test(answer);
}

function parseIntroOptions(block) {
  const options = [];
  for (const match of block.matchAll(/^\s*-\s*(✅|❌)\s*(.+)$/gmu)) {
    let text = match[2].trim();
    const feedback = /\s+—\s+\*/u.exec(text);
    if (feedback) text = text.slice(0, feedback.index).trim();
    text = text.replace(/^\*\*|\*\*$/g, "").trim();
    if (text) options.push({ text, correct: match[1] === "✅" });
  }
  return options;
}

function choiceLine(block) {
  const match = /([^\r\n]*_{2,}[^\r\n]*?)\s*→\s*\*\*([^*]+)\*\*((?:\s*·\s*[^\r\n]+)+)/u.exec(block);
  if (!match) return null;
  return {
    stem: match[1].trim(),
    correct: match[2].trim(),
    wrong: match[3].split("·").map((value) => value.trim()).filter(Boolean),
  };
}

function reconstruct(stem, option) {
  return stem.replace(/_{2,}/u, String(option).trim()).replace(/\s+([,.?!])/gu, "$1").replace(/\s+/g, " ").trim();
}

function constructionFact(location, correct, wrong) {
  return `КОРОТКИЙ ОТВЕТ БЕЗ ОШИБКИ КОНСТРУКЦИИ: ${location}: при верном «${correct}» грамматически собраны также ${wrong.map((value) => `«${value}»`).join(", ")} — для проверки формы сохраняй лицо и полярность, а ловушки строй на связке или порядке слов`;
}

function modeMap(markdown) {
  const block = /^modes:\s*([\s\S]*?)(?:\n\s*\n|$)/mi.exec(markdown)?.[1] ?? "";
  return new Map([...block.matchAll(/(\d+)\s*=\s*([a-z_]+)/g)].map((match) => [Number(match[1]), match[2]]));
}

export function shortAnswerConstructionFacts(markdown, sessionId) {
  if (!scopedOwnerQualityRequired(sessionId)) return [];
  const text = String(markdown || "");
  const facts = [];

  const introRe = /^##\s*[ИІ]нтро\s*(\d+)[^\r\n]*\r?\n([\s\S]*?)(?=^##\s*[ИІ]нтро\s*\d+|^##\s*Практик|(?![\s\S]))/gimu;
  for (const match of text.matchAll(introRe)) {
    const block = match[2];
    if (!SHORT_ANSWER_MARKER_RE.test(block)) continue;
    const options = parseIntroOptions(block);
    const correct = options.find((option) => option.correct)?.text;
    if (!correct || !isWellFormedBeShortAnswer(correct)) continue;
    const grammaticalWrong = options.filter((option) => !option.correct && isWellFormedBeShortAnswer(option.text)).map((option) => option.text);
    if (grammaticalWrong.length) facts.push(constructionFact(`интро ${match[1]}`, correct, grammaticalWrong));
  }

  const modes = modeMap(text);
  const practice = text.split(/^##\s*Практик[^\r\n]*$/mi)[1] ?? "";
  const taskRe = /^\*\*(\d+)\s*·\s*([^*\r\n]+)\*\*\r?\n([\s\S]*?)(?=^\*\*\d+\s*·|^---\s*$|^##\s|(?![\s\S]))/gmu;
  for (const match of practice.matchAll(taskRe)) {
    const ordinal = Number(match[1]);
    const block = `${match[2]}\n${match[3]}`;
    if (modes.get(ordinal) !== "context_gap_grammar" || !SHORT_ANSWER_MARKER_RE.test(block)) continue;
    const choice = choiceLine(block);
    if (!choice) continue;
    const correct = reconstruct(choice.stem, choice.correct);
    if (!isWellFormedBeShortAnswer(correct)) continue;
    const grammaticalWrong = choice.wrong.map((option) => reconstruct(choice.stem, option)).filter(isWellFormedBeShortAnswer);
    if (grammaticalWrong.length) facts.push(constructionFact(`задание ${ordinal}`, correct, grammaticalWrong));
  }

  return facts;
}

function meaningful(value, minimum = 20) {
  return typeof value === "string" && value.trim().length >= minimum && !PLACEHOLDER_RE.test(value);
}

function arrayOfMeaningfulStrings(value, minimum = 12) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => meaningful(item, minimum));
}

function receiptValues(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) receiptValues(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) receiptValues(item, out);
  return out;
}

function normalizeCitation(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/[‘’]/g, "'")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function citesCurrentSource(example, source) {
  const wholeExample = normalizeCitation(example);
  const normalizedSource = normalizeCitation(source);
  if (wholeExample.length >= 8 && normalizedSource.includes(wholeExample)) return true;
  const candidates = [
    ...String(example).matchAll(/«([^»]+)»/g),
    ...String(example).matchAll(/“([^”]+)”/g),
    ...String(example).matchAll(/`([^`]+)`/g),
    ...String(example).matchAll(/"([^"]+)"/g),
  ].map((match) => match[1]);
  if (!candidates.length) candidates.push(String(example).split(/\s+—\s+/u)[0]);
  return candidates.some((candidate) => {
    const normalized = normalizeCitation(candidate);
    return normalized.length >= 8 && normalizedSource.includes(normalized);
  });
}

export function ownerTasteReceiptIssues({ sessionId, sourcePath, receiptPath }) {
  if (!scopedOwnerQualityRequired(sessionId)) return [];
  const issues = [];
  if (!fs.existsSync(sourcePath)) return ["нет final.ru.md для проверки judge_taste"];
  if (!fs.existsSync(receiptPath)) return ["нет final.judge_taste.json"];

  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new Error("expected object");
  } catch {
    return ["final.judge_taste.json нечитаем"];
  }

  const source = fs.readFileSync(sourcePath, "utf8");
  const actualSha = sourceSha256(sourcePath);
  if (String(receipt.sourceSha256 || "").toLowerCase() !== actualSha) issues.push("final.judge_taste.json SHA-256 не совпадает с актуальными байтами final.ru.md");
  if (receipt.verdict !== "PASS") issues.push(`judge_taste: ${receipt.verdict ?? "нет PASS"}`);
  if (!new Set(["equal", "better"]).has(receipt.pairwise)) issues.push("judge_taste: pairwise должен быть equal или better");
  if (!meaningful(receipt.pairwise_reason, 40)) issues.push("judge_taste: нет содержательного pairwise_reason");
  if (!Number.isInteger(receipt.voice?.score) || receipt.voice.score < 1 || receipt.voice.score > 5 || !arrayOfMeaningfulStrings(receipt.voice?.evidence)) issues.push("judge_taste: нет содержательной оценки голоса с примерами");
  if (receipt.humor?.present !== true || receipt.humor?.on_topic !== true || !arrayOfMeaningfulStrings(receipt.humor?.examples) || !Array.isArray(receipt.humor?.misfires) || receipt.humor.misfires.length !== 0) issues.push("judge_taste: юмор не подтверждён примерами без неудачных шуток");
  else if (!receipt.humor.examples.every((example) => citesCurrentSource(example, source))) issues.push("judge_taste: примеры юмора не являются цитатами актуального final.ru.md");
  if (receipt.best_lines !== undefined && (!Array.isArray(receipt.best_lines) || receipt.best_lines.some((line) => {
    if (typeof line !== "string") return true;
    const quote = normalizeCitation(line);
    return quote.length < 8 || !normalizeCitation(source).includes(quote);
  }))) issues.push("judge_taste: best_lines содержит строку не из актуального final.ru.md");
  if (!Array.isArray(receipt.ai_text_or_nonsense) || receipt.ai_text_or_nonsense.length !== 0) issues.push("judge_taste: есть ИИ-текст/бред или поле не проверено");
  if (!Array.isArray(receipt.must_fix) || receipt.must_fix.length !== 0) issues.push("judge_taste: остались обязательные правки");
  if (!meaningful(receipt.verdict_reason, 20)) issues.push("judge_taste: нет содержательного verdict_reason");
  if (receiptValues(receipt).some((value) => PLACEHOLDER_RE.test(value))) issues.push("judge_taste: найдено самоодобрение или placeholder вместо независимого отчёта");
  return [...new Set(issues)];
}
