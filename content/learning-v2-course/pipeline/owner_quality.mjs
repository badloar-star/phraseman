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

export function sourceBytesSha256(sourceBytes) {
  return crypto.createHash("sha256").update(sourceBytes).digest("hex");
}

export function bindTasteReceiptToSource(receipt, sourcePath, { expectedSourceSha256 = null, sourceBytes = null } = {}) {
  const capturedSha256 = sourceBytes === null ? sourceSha256(sourcePath) : sourceBytesSha256(sourceBytes);
  if (expectedSourceSha256 && capturedSha256 !== expectedSourceSha256) {
    throw new Error(`source_digest_mismatch:expected=${expectedSourceSha256}:captured=${capturedSha256}`);
  }
  const liveSha256 = sourceSha256(sourcePath);
  const expectedLiveSha256 = expectedSourceSha256 ?? capturedSha256;
  if (liveSha256 !== expectedLiveSha256) {
    throw new Error(`source_digest_changed:expected=${expectedLiveSha256}:live=${liveSha256}`);
  }
  return { ...receipt, sourceSha256: capturedSha256 };
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
  return beShortAnswerShape(value) !== null;
}

function questionHeadsForFinite(finite) {
  return {
    "i am": ["are you"],
    "you are": ["am i"],
    "he is": ["is he"],
    "she is": ["is she"],
    "it is": ["is it"],
    "we are": ["are we"],
    "they are": ["are they"],
    "there is": ["is there"],
    "there are": ["are there"],
  }[finite] ?? [];
}

function beShortAnswerShape(value) {
  const answer = normalizeAnswer(value);
  const match = /^(yes|no) (.+)$/u.exec(answer);
  if (!match) return null;
  const polarity = match[1];
  const expanded = match[2]
    .replace(/^i'm not$/u, "i am not")
    .replace(/^you're not$|^you aren't$/u, "you are not")
    .replace(/^he's not$|^he isn't$/u, "he is not")
    .replace(/^she's not$|^she isn't$/u, "she is not")
    .replace(/^it's not$|^it isn't$/u, "it is not")
    .replace(/^we're not$|^we aren't$/u, "we are not")
    .replace(/^they're not$|^they aren't$/u, "they are not")
    .replace(/^there's not$|^there isn't$/u, "there is not")
    .replace(/^there aren't$/u, "there are not");
  const finite = polarity === "no" ? expanded.replace(/ not$/u, "") : expanded;
  const allowed = new Set(["i am", "you are", "he is", "she is", "it is", "we are", "they are", "there is", "there are"]);
  if (!allowed.has(finite) || (polarity === "no" && expanded === finite)) return null;
  const [subject, auxiliary] = finite.split(" ");
  const questionHeads = questionHeadsForFinite(finite);
  return { polarity, subject, auxiliary, finite, questionHeads };
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

function declaredShortCorrectFact(location, correct) {
  return `КОРОТКИЙ ОТВЕТ БЕЗ ОШИБКИ КОНСТРУКЦИИ: ${location}: верный вариант не является коротким ответом — «${correct}»`;
}

function questionLicensingFact(location, correct) {
  return `КОРОТКИЙ ОТВЕТ БЕЗ ОШИБКИ КОНСТРУКЦИИ: ${location}: для «${correct}» нет согласованного английского вопроса на той же странице`;
}

const ENGLISH_BE_QUESTION_RE = /\b(?:am\s+i|are\s+you|is\s+he|is\s+she|is\s+it|are\s+we|are\s+they|is\s+there|are\s+there)\b[^?\r\n]*\?/giu;

function hasLicensingEnglishQuestion(block, correct) {
  const shape = beShortAnswerShape(correct);
  if (!shape) return false;
  return (String(block || "").match(ENGLISH_BE_QUESTION_RE) ?? [])
    .map(normalizeAnswer)
    .some((question) => shape.questionHeads.some((head) => question === head || question.startsWith(`${head} `)));
}

function beYesNoReplyPrefixShape(value) {
  const answer = normalizeAnswer(value)
    .replace(/^(yes|no) i'm(?= |$)/u, "$1 i am")
    .replace(/^(yes|no) you're(?= |$)/u, "$1 you are")
    .replace(/^(yes|no) he's(?= |$)/u, "$1 he is")
    .replace(/^(yes|no) she's(?= |$)/u, "$1 she is")
    .replace(/^(yes|no) it's(?= |$)/u, "$1 it is")
    .replace(/^(yes|no) we're(?= |$)/u, "$1 we are")
    .replace(/^(yes|no) they're(?= |$)/u, "$1 they are")
    .replace(/^(yes|no) there's(?= |$)/u, "$1 there is")
    .replace(/^(no) (you|we|they|there) aren't(?= |$)/u, "$1 $2 are not")
    .replace(/^(no) (he|she|it|there) isn't(?= |$)/u, "$1 $2 is not");
  const match = /^(yes|no) (i am|you are|he is|she is|it is|we are|they are|there is|there are)(?: (not))?(?: (.+))?$/u.exec(answer);
  if (!match || (match[1] === "no") !== Boolean(match[3])) return null;
  return { polarity: match[1], subject: match[2].split(" ")[0], finite: match[2], remainder: match[4] ?? "" };
}

function startsWithBeYesNoReply(value) {
  return beYesNoReplyPrefixShape(value) !== null;
}

function declaresBeYesNoConstruction(block, correct) {
  if (startsWithBeYesNoReply(correct)) return true;
  const taught = [...String(block || "").matchAll(/`([^`\r\n]+)`|\*\*([^*\r\n]+)\*\*/gu)]
    .map((match) => match[1] ?? match[2]);
  return taught.some((value) => isWellFormedBeShortAnswer(value));
}

function isQuestionAlignedFullBeReply(block, shape) {
  if (!shape?.remainder) return false;
  return (String(block || "").match(ENGLISH_BE_QUESTION_RE) ?? [])
    .map(normalizeAnswer)
    .some((question) => questionHeadsForFinite(shape.finite).some((head) => question.startsWith(`${head} `) && question.slice(head.length + 1) === shape.remainder));
}

function feedbackForOption(block, option) {
  const expected = normalizeAnswer(option);
  for (const line of String(block || "").split(/\r?\n/u)) {
    const match = /^\s*-\s*(?:❌\s*)?(.+?)\s+—\s+\*(.+)\*\s*$/u.exec(line);
    if (!match) continue;
    const candidate = match[1].replace(/^\*\*|\*\*$/gu, "").trim();
    if (normalizeAnswer(candidate) === expected) return match[2];
  }
  return "";
}

function isDeterminateShortAnswerDiagnostic(block, correct, correctShape, wrong, wrongShape) {
  if (!wrongShape || !hasLicensingEnglishQuestion(block, correct)) return false;
  const feedback = normalizeAnswer(feedbackForOption(block, wrong));
  if (!feedback) return false;

  const polarityContrast = wrongShape.finite === correctShape.finite
    && wrongShape.polarity !== correctShape.polarity;
  if (polarityContrast) return /\byes\b/u.test(feedback) && /\bno\b/u.test(feedback);

  const existentialNumberContrast = wrongShape.polarity === correctShape.polarity
    && wrongShape.subject === "there"
    && correctShape.subject === "there"
    && wrongShape.finite !== correctShape.finite
    && new Set([wrongShape.finite, correctShape.finite]).size === 2
    && [wrongShape.finite, correctShape.finite].every((finite) => finite === "there is" || finite === "there are");
  return existentialNumberContrast && /\bis\b/u.test(feedback) && /\bare\b/u.test(feedback);
}

function malformedIdentityFacts(location, correct, wrongOptions, block = "") {
  const correctShape = beShortAnswerShape(correct);
  if (!correctShape) return [];
  const grammatical = [];
  const semantic = [];
  const subjects = new Set(["i", "you", "he", "she", "it", "we", "they", "there"]);
  for (const wrong of wrongOptions) {
    const normalized = normalizeAnswer(wrong);
    const wrongPolarity = /^(yes|no)\b/u.exec(normalized)?.[1];
    const wrongSubject = normalized.split(" ").find((token, index) => index > 0 && subjects.has(token));
    const prefixShape = beYesNoReplyPrefixShape(wrong);
    const shortShape = beShortAnswerShape(wrong);
    const grammaticalShape = shortShape ?? (isQuestionAlignedFullBeReply(block, prefixShape) ? prefixShape : null);
    if (grammaticalShape) {
      if (isDeterminateShortAnswerDiagnostic(block, correct, correctShape, wrong, shortShape)) continue;
      if (grammaticalShape.polarity !== correctShape.polarity || grammaticalShape.subject !== correctShape.subject) semantic.push(wrong);
      else grammatical.push(wrong);
      continue;
    }
    if ((wrongPolarity && wrongPolarity !== correctShape.polarity) || (wrongSubject && wrongSubject !== correctShape.subject)) {
      semantic.push(wrong);
    }
  }
  const facts = [];
  if (grammatical.length) facts.push(constructionFact(location, correct, grammatical));
  if (semantic.length) facts.push(`КОРОТКИЙ ОТВЕТ БЕЗ ОШИБКИ КОНСТРУКЦИИ: ${location}: МЕНЯЕТ СМЫСЛ — при верном «${correct}» варианты ${semantic.map((wrong) => `«${wrong}»`).join(", ")} меняют полярность или лицо вместо ошибки конструкции`);
  return facts;
}

function modeMap(markdown) {
  const block = /^modes:\s*([\s\S]*?)(?:\n\s*\n|$)/mi.exec(markdown)?.[1] ?? "";
  return new Map([...block.matchAll(/(\d+)\s*=\s*([a-z_]+)/g)].map((match) => [Number(match[1]), match[2]]));
}

export function shortAnswerConstructionFacts(markdown, sessionId) {
  if (sessionParts(sessionId)?.language !== "en") return [];
  const text = String(markdown || "");
  const facts = [];

  const introRe = /^##\s*[ИІ]нтро\s*(\d+)[^\r\n]*\r?\n([\s\S]*?)(?=^##\s*[ИІ]нтро\s*\d+|^##\s*Практик|(?![\s\S]))/gimu;
  for (const match of text.matchAll(introRe)) {
    const block = match[2];
    if (!SHORT_ANSWER_MARKER_RE.test(block)) continue;
    const options = parseIntroOptions(block);
    const correct = options.find((option) => option.correct)?.text;
    if (!correct) continue;
    if (!declaresBeYesNoConstruction(block, correct)) continue;
    const location = `интро ${match[1]}`;
    if (!isWellFormedBeShortAnswer(correct)) {
      facts.push(declaredShortCorrectFact(location, correct));
      continue;
    }
    if (!hasLicensingEnglishQuestion(block, correct)) facts.push(questionLicensingFact(location, correct));
    facts.push(...malformedIdentityFacts(location, correct, options.filter((option) => !option.correct).map((option) => option.text), block));
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
    const location = `задание ${ordinal}`;
    if (!isWellFormedBeShortAnswer(correct)) {
      facts.push(declaredShortCorrectFact(location, correct));
      continue;
    }
    facts.push(...malformedIdentityFacts(location, correct, choice.wrong.map((option) => reconstruct(choice.stem, option)), block));
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
