import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { ownerTasteReceiptIssues, scopedOwnerQualityRequired, sessionIdFromDirectory, shortAnswerConstructionFacts, taskInstructionIssues } from "./owner_quality.mjs";

const COURSE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function introCorrectAnswers(markdown) {
  return [1, 2, 3].map((intro) => {
    const marker = new RegExp(`^##\\s*[ИІ]нтро\\s*${intro}[^\\n]*$`, "mi").exec(markdown);
    if (!marker) return null;
    const tail = markdown.slice(marker.index + marker[0].length);
    const boundary = /^##\s*(?:[ИІ]нтро\s*\d+|Практика)\b[^\n]*$/mi.exec(tail);
    const section = tail.slice(0, boundary?.index ?? tail.length);
    return /-\s+✅\s+\*\*([^*]+)\*\*/u.exec(section)?.[1]?.replace(/\s+/gu, " ").trim() ?? null;
  });
}

function normalizedEvidenceText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\r\n?/gu, "\n")
    .replace(/\[([^\]]+)\]\([^\s)]+\)/gu, "$1")
    .replace(/[`*_#]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function explicitNaturalQuotes(value) {
  const text = String(value ?? "");
  const quotes = [];
  for (const pattern of [/«([^»]+)»/gu, /“([^”]+)”/gu, /"([^"\n]+)"/gu]) {
    for (const match of text.matchAll(pattern)) quotes.push(match[1]);
  }
  return quotes;
}

function meaningfulEvidenceQuote(value) {
  const normalized = normalizedEvidenceText(value);
  const lexicalTokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  return normalized.length >= 12 && lexicalTokens.length >= 2;
}

function sourceTextMap(sourceTexts) {
  if (!Array.isArray(sourceTexts)) return sourceTexts ?? {};
  return Object.fromEntries(sourceTexts.map((source, index) => [index === 0 ? "ru" : index === 1 ? "uk" : `source${index}`, source]));
}

function meaningfulAnalysis(value) {
  const normalized = normalizedEvidenceText(value);
  return normalized.length >= 20 && (normalized.match(/[\p{L}\p{N}]+/gu) ?? []).length >= 3;
}

function canonicalEvidenceItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const fieldPath = String(item.fieldPath ?? "").trim().toLowerCase();
  const quote = normalizedEvidenceText(item.quote).toLocaleLowerCase("und");
  const analysis = normalizedEvidenceText(item.analysis).toLocaleLowerCase("und");
  const coverage = Array.isArray(item.coverage)
    ? [...new Set(item.coverage.map((value) => String(value).trim().toLocaleLowerCase("und")).filter(Boolean))].sort()
    : [];
  if (!fieldPath || !quote || !analysis || !coverage.length) return null;
  return { fieldPath, quote, analysis, coverage };
}

function canonicalEvidenceSet(receipt) {
  if (!Array.isArray(receipt?.evidence) || !receipt.evidence.length) return null;
  const items = receipt.evidence.map(canonicalEvidenceItem);
  if (items.some((item) => item === null)) return null;
  return JSON.stringify(items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

function canonicalSourceHashSet(receipt) {
  const fields = ["sourceSha256", "exactRuSha256", "practiceAtomicSha256"];
  const values = Object.fromEntries(fields.map((field) => [field, String(receipt?.[field] ?? "").toLowerCase()]));
  if (!/^[a-f0-9]{64}$/u.test(values.sourceSha256) || !/^[a-f0-9]{64}$/u.test(values.exactRuSha256)) return null;
  const declaredLocales = receipt?.localeHashes && typeof receipt.localeHashes === "object" && !Array.isArray(receipt.localeHashes)
    ? receipt.localeHashes
    : { uk: receipt?.exactUkSha256 };
  const localeHashes = Object.fromEntries(Object.entries(declaredLocales)
    .map(([locale, value]) => [locale, String(value ?? "").toLowerCase()])
    .sort(([left], [right]) => left.localeCompare(right)));
  if (!Object.keys(localeHashes).length || Object.values(localeHashes).some((value) => !/^[a-f0-9]{64}$/u.test(value))) return null;
  values.localeHashes = localeHashes;
  return JSON.stringify(values);
}

function normalizedSourceHeadings(source) {
  return new Set(String(source ?? "").split(/\r?\n/gu)
    .filter((line) => /^\s{0,3}#{1,6}\s+\S/u.test(line))
    .map((line) => normalizedEvidenceText(line))
    .filter(Boolean));
}

function supplementalQuoteIssues(receipt, label, sourceTexts) {
  const issues = [];
  const normalizedSources = Object.values(sourceTextMap(sourceTexts)).map(normalizedEvidenceText).filter(Boolean);
  const resolves = (value) => {
    const normalized = normalizedEvidenceText(value);
    return Boolean(normalized) && normalizedSources.some((source) => source.includes(normalized));
  };
  const check = (value, field) => {
    if (!String(value ?? "").trim()) return issues.push(`${label}: ${field} пуст`);
    if (resolves(value)) return;
    const quoted = explicitNaturalQuotes(value);
    if (quoted.length && quoted.every(resolves)) return;
    issues.push(`${label}: ${field} не найден в текущих final.ru.md/final.uk.md`);
  };
  const walk = (value, field = "") => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${field}[${index}]`));
    for (const [key, child] of Object.entries(value)) {
      const childField = field ? `${field}.${key}` : key;
      if (!field && key === "evidence") continue;
      if (key === "evidence" || key === "examples" || key === "best_lines") {
        if (Array.isArray(child)) child.forEach((item, index) => typeof item === "string" ? check(item, `${childField}[${index}]`) : walk(item, `${childField}[${index}]`));
        continue;
      }
      if (/quote$/iu.test(key)) check(child, childField);
      else walk(child, childField);
    }
  };
  walk(receipt);
  return issues;
}

function structuredEvidenceIssues(receipt, label, sourceTexts, expectedRole, requiredLocales = []) {
  const issues = [];
  const sources = Object.fromEntries(Object.entries(sourceTextMap(sourceTexts)).map(([locale, source]) => [locale, normalizedEvidenceText(source)]));
  const sourceHeadings = Object.fromEntries(Object.entries(sourceTextMap(sourceTexts)).map(([locale, source]) => [locale, normalizedSourceHeadings(source)]));
  if (!Array.isArray(receipt?.evidence) || receipt.evidence.length === 0) return [`${label}: нет evidence`];
  const validLocales = new Set();
  receipt.evidence.forEach((item, index) => {
    const field = `evidence[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      issues.push(`${label}: ${field} должен быть объектом с fieldPath, quote, analysis, coverage`);
      return;
    }
    const fieldPath = String(item.fieldPath ?? "").trim();
    const pathMatch = /^final\.([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)\.md$/u.exec(fieldPath);
    const locale = pathMatch?.[1];
    const sourceAvailable = Boolean(locale && Object.prototype.hasOwnProperty.call(sources, locale));
    if (!pathMatch || !sourceAvailable) issues.push(`${label}: ${field}.fieldPath должен указывать на текущий final.<locale>.md`);
    if (!meaningfulEvidenceQuote(item.quote)) issues.push(`${label}: ${field}.quote слишком короток для meaningful evidence`);
    else if (!sourceAvailable || !sources[locale].includes(normalizedEvidenceText(item.quote))) issues.push(`${label}: ${field}.fieldPath ${fieldPath}: quote не найден`);
    else if (sourceHeadings[locale]?.has(normalizedEvidenceText(item.quote))) issues.push(`${label}: ${field}.quote нельзя брать только из заголовка`);
    if (!meaningfulAnalysis(item.analysis)) issues.push(`${label}: ${field}.analysis отсутствует или не содержателен`);
    const coverage = Array.isArray(item.coverage) ? item.coverage.map((value) => String(value).trim()).filter(Boolean) : [];
    if (!coverage.length) issues.push(`${label}: ${field}.coverage должен быть непустым массивом`);
    else if (!coverage.includes(expectedRole)) issues.push(`${label}: ${field}.coverage должен включать ${expectedRole}`);
    if (requiredLocales.includes(locale) && !coverage.includes(locale)) issues.push(`${label}: ${field}.coverage должен включать локаль ${locale}`);
    const valid = pathMatch && sourceAvailable
      && meaningfulEvidenceQuote(item.quote)
      && sources[locale].includes(normalizedEvidenceText(item.quote))
      && !sourceHeadings[locale]?.has(normalizedEvidenceText(item.quote))
      && meaningfulAnalysis(item.analysis)
      && coverage.includes(expectedRole)
      && (!requiredLocales.includes(locale) || coverage.includes(locale));
    if (valid) validLocales.add(locale);
  });
  for (const locale of requiredLocales) if (!validLocales.has(locale)) issues.push(`${label}: нет evidence для final.${locale}.md`);
  return issues;
}

function reviewerIdentity(reviewer) {
  let identity = reviewer;
  if (typeof reviewer === "string") {
    const match = /^learning-v2-reviewer-v1\|reviewerId=([^|]+)\|sessionId=([a-z]{2}\/l\d{2}\/s\d{2})\|role=(judge_[a-z_]+)$/iu.exec(reviewer);
    identity = match ? { schemaVersion: "learning_v2_reviewer_identity_v1", reviewerId: match[1], sessionId: match[2], role: match[3] } : null;
  }
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return null;
  return identity;
}

function reviewerIdentityIssues(reviewer, label, sessionId, expectedRole) {
  const identity = reviewerIdentity(reviewer);
  if (!identity) return [`${label}: reviewer identity неструктурирован или неканоничен`];
  const issues = [];
  if (identity.schemaVersion !== "learning_v2_reviewer_identity_v1") issues.push(`${label}: reviewer identity schema неверна`);
  if (!String(identity.reviewerId ?? "").trim()) issues.push(`${label}: reviewer identity не содержит reviewerId`);
  if (identity.sessionId !== sessionId) issues.push(`${label}: reviewer identity sessionId должен быть ${sessionId}`);
  if (identity.role !== expectedRole) issues.push(`${label}: reviewer identity role должен быть ${expectedRole}`);
  return issues;
}

function duplicateReviewerIdentityIssues(receipts) {
  const rolesByReviewerId = new Map();
  for (const { label, receipt } of receipts) {
    const identity = reviewerIdentity(receipt?.reviewer);
    const reviewerId = String(identity?.reviewerId ?? "").normalize("NFKC").trim().toLocaleLowerCase("und");
    if (!reviewerId) continue;
    const labels = rolesByReviewerId.get(reviewerId) ?? [];
    labels.push(label);
    rolesByReviewerId.set(reviewerId, labels);
  }
  return [...rolesByReviewerId.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([reviewerId, labels]) => `reviewerId ${reviewerId} повторяется в независимых проверках: ${labels.join(", ")}`);
}

export function judgeReceiptContractIssues(receipt, label, sourceTexts, sessionId, expectedRole, { requiredEvidenceLocales = [] } = {}) {
  const issues = [
    ...structuredEvidenceIssues(receipt, label, sourceTexts, expectedRole, requiredEvidenceLocales),
    ...supplementalQuoteIssues(receipt, label, sourceTexts),
  ];
  if (receipt?.sessionId !== sessionId) issues.push(`${label}: sessionId должен быть ${sessionId}`);
  if (receipt?.session !== undefined && receipt.session !== sessionId) issues.push(`${label}: legacy session противоречит sessionId`);
  if (receipt?.role !== expectedRole) issues.push(`${label}: role должен быть ${expectedRole}`);
  issues.push(...reviewerIdentityIssues(receipt?.reviewer, label, sessionId, expectedRole));
  return [...new Set(issues)];
}

function crossSessionEvidenceIssues({ dir, receiptName, label, receipt }) {
  const currentSet = canonicalEvidenceSet(receipt);
  if (!currentSet) return [];
  const normalizedDir = path.resolve(dir).replace(/\\/gu, "/");
  const match = /^(.*\/sessions\/([a-z]{2}))\/l\d{2}\/s\d{2}$/iu.exec(normalizedDir);
  if (!match) return [];
  const languageRoot = match[1];
  const currentSourceHashes = canonicalSourceHashSet(receipt);
  if (!currentSourceHashes) return [];
  const issues = [];
  for (const lessonName of fs.readdirSync(languageRoot).filter((name) => /^l\d{2}$/iu.test(name))) {
    const lessonDir = path.join(languageRoot, lessonName);
    for (const sessionName of fs.readdirSync(lessonDir).filter((name) => /^s\d{2}$/iu.test(name))) {
      const otherDir = path.join(lessonDir, sessionName);
      if (path.resolve(otherDir) === path.resolve(dir)) continue;
      const otherReceiptPath = path.join(otherDir, receiptName);
      if (!fs.existsSync(otherReceiptPath)) continue;
      try {
        const otherReceipt = JSON.parse(fs.readFileSync(otherReceiptPath, "utf8"));
        const otherSourceHashes = canonicalSourceHashSet(otherReceipt);
        if (!otherSourceHashes || otherSourceHashes === currentSourceHashes) continue;
        if (canonicalEvidenceSet(otherReceipt) === currentSet) {
          const otherSessionId = sessionIdFromDirectory(otherDir) ?? `${match[2]}/${lessonName}/${sessionName}`;
          issues.push(`${label}: полный набор evidence дублирует ${otherSessionId} с другим source hash`);
        }
      } catch {
        issues.push(`${label}: не удалось проверить дублированное evidence в ${lessonName}/${sessionName}`);
      }
    }
  }
  return [...new Set(issues)];
}

export const CANONICAL_BINDING_SCHEMA_VERSION = "learning_v2_canonical_source_binding_v1";
export const LEGACY_BINDING_LEDGER_SCHEMA_VERSION = "learning_v2_legacy_binding_ledger_v1";
export const LEGACY_BINDING_LEDGER_PATH = path.join(COURSE_ROOT, "migration", "canonical-binding-v1", "legacy-admission-ledger.json");

function legacyLedgerAdmission({ dir, sessionId, locales, releaseRoot, ledgerPath, bindingRecordNames }) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/iu.exec(String(sessionId || ""));
  if (!match) return { admitted: false, reason: "legacy ledger: invalid session identity" };
  const courseSessionId = `${match[1].toLowerCase()}:lesson-${match[2]}:session-${match[3]}`;
  const releaseDir = path.join(releaseRoot, match[1].toLowerCase(), `l${match[2]}`, `s${match[3]}`);
  const releaseFiles = ["intro.json", "learner.json", "answers.json", ...locales.map((locale) => `learner.${locale}.json`)];
  const sourceFiles = ["final.ru.md", "practice.atomic.json", ...locales.map((locale) => `final.${locale}.md`)];
  const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  try {
    if (!fs.existsSync(ledgerPath)) return { admitted: false, reason: "legacy ledger: repository ledger missing" };
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
    if (ledger?.schemaVersion !== LEGACY_BINDING_LEDGER_SCHEMA_VERSION || !ledger.entries || typeof ledger.entries !== "object") {
      return { admitted: false, reason: "legacy ledger: unsupported schema" };
    }
    const entry = ledger.entries[sessionId];
    if (!entry) return { admitted: false, reason: `legacy ledger: ${sessionId} not allowlisted` };
    if (entry.sessionId !== sessionId || entry.courseSessionId !== courseSessionId) {
      return { admitted: false, reason: "legacy ledger: session identity mismatch" };
    }
    for (const name of sourceFiles) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) return { admitted: false, reason: `legacy ledger: source ${name} missing` };
      if (entry.sourceDigests?.[name] !== digest(file)) return { admitted: false, reason: `legacy ledger: source ${name} digest mismatch` };
    }
    for (const name of bindingRecordNames) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) return { admitted: false, reason: `legacy ledger: evidence ${name} missing` };
      if (entry.evidenceDigests?.[name] !== digest(file)) return { admitted: false, reason: `legacy ledger: evidence ${name} digest mismatch` };
    }
    for (const name of releaseFiles) {
      const file = path.join(releaseDir, name);
      const pinned = entry.releaseChildren?.[name];
      if (!fs.existsSync(file) || !pinned) return { admitted: false, reason: `legacy ledger: release child ${name} missing` };
      if (pinned.sha256 !== digest(file)) return { admitted: false, reason: `legacy ledger: release child ${name} digest mismatch` };
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      const expectedSchema = name === "intro.json" ? "learning_v2_course_session_intro_child_v1"
        : name === "answers.json" ? "json_array_v1"
          : "learning_v2_course_session_learner_child_v1";
      if (pinned.schemaVersion !== expectedSchema || pinned.courseSessionId !== courseSessionId) {
        return { admitted: false, reason: `legacy ledger: release child ${name} pinned schema or identity mismatch` };
      }
      if (name === "answers.json" ? !Array.isArray(value) : value?.schemaVersion !== expectedSchema || value?.courseSessionId !== courseSessionId) {
        return { admitted: false, reason: `legacy ledger: release child ${name} schema or identity mismatch` };
      }
    }
    return { admitted: true, reason: null };
  } catch (error) {
    return { admitted: false, reason: `legacy ledger: unreadable artifact (${error.message})` };
  }
}

export function currentCurriculumRow(sessionId) {
  const match = /^([a-z]{2})\/l(\d+)\/s(\d+)$/iu.exec(String(sessionId || ""));
  if (!match) return null;
  const [, language, lessonRaw, sessionRaw] = match;
  const plan = path.join(COURSE_ROOT, "curriculum", language.toLowerCase(), "ПЛАН_КУРСА.md");
  if (!fs.existsSync(plan)) return null;
  const text = fs.readFileSync(plan, "utf8");
  const lesson = Number(lessonRaw);
  const session = Number(sessionRaw);
  const section = text.split(/(?=^## Урок \d+(?:\s|$))/mu)
    .find((part) => new RegExp(`^## Урок ${lesson}(?:\\s|$)`, "mu").test(part)) ?? "";
  return new RegExp(`^\\|\\s*${session}\\s*\\|.*$`, "mu").exec(section)?.[0]?.trim() ?? null;
}

export const REQUIRED_JUDGES = ["judge_learner", "judge_pedagogy", "judge_nonsense", "judge_reader"];

export function progressionJudgeRequired(sessionId) {
  const match = /^en\/l(\d+)\/s(\d+)$/i.exec(String(sessionId || ""));
  if (!match) return false;
  const lesson = Number(match[1]);
  const session = Number(match[2]);
  return lesson > 3 || (lesson === 3 && session >= 25);
}

export function detailedProgressionEvidenceRequired(sessionId) {
  const match = /^en\/l(\d+)\/s(\d+)$/i.exec(String(sessionId || ""));
  if (!match) return false;
  const lesson = Number(match[1]);
  const session = Number(match[2]);
  return lesson > 3 || (lesson === 3 && session >= 43);
}

export function requiredJudgesForSession(sessionId) {
  const roles = scopedOwnerQualityRequired(sessionId) ? [...REQUIRED_JUDGES, "judge_taste"] : [...REQUIRED_JUDGES];
  if (progressionJudgeRequired(sessionId)) roles.push("judge_progression");
  return roles;
}

export function judgeIssues(verdicts, sessionId = null) {
  return requiredJudgesForSession(sessionId).filter((role) => verdicts?.[role]?.verdict !== "PASS");
}

// Read-only: a filename or an old status cannot establish that a session passed.
export function sessionReadiness(dir, locales = ["uk"], {
  releaseRoot = path.join(COURSE_ROOT, "release"),
  legacyLedgerPath = LEGACY_BINDING_LEDGER_PATH,
  sessionId: explicitSessionId = null,
  statusRequired = true,
} = {}) {
  const issues = [];
  const master = path.join(dir, "final.ru.md");
  if (!fs.existsSync(master)) return { ready: false, issues: ["нет final.ru.md"] };
  const masterTime = fs.statSync(master).mtimeMs;
  const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const atomicPath = path.join(dir, "practice.atomic.json");
  const localePaths = Object.fromEntries(locales.map((locale) => [locale, path.join(dir, `final.${locale}.md`)]));
  const exactHashes = {
    ru: digest(master),
    atomic: fs.existsSync(atomicPath) ? digest(atomicPath) : null,
    locales: Object.fromEntries(Object.entries(localePaths).filter(([, file]) => fs.existsSync(file)).map(([locale, file]) => [locale, digest(file)])),
  };
  const currentSourceTexts = {
    ru: fs.readFileSync(master, "utf8"),
    ...Object.fromEntries(Object.entries(localePaths).filter(([, file]) => fs.existsSync(file)).map(([locale, file]) => [locale, fs.readFileSync(file, "utf8")])),
  };
  const sessionId = explicitSessionId ?? sessionIdFromDirectory(dir);
  const receiptContractIssues = (receipt, label, expectedRole, receiptName, requiredEvidenceLocales = []) => [
    ...judgeReceiptContractIssues(receipt, label, currentSourceTexts, sessionId, expectedRole, { requiredEvidenceLocales }),
    ...crossSessionEvidenceIssues({ dir, receiptName, label, receipt }),
  ];
  const bindingRecordNames = [
    ...requiredJudgesForSession(sessionId).map((role) => `final.${role}.json`),
    ...(statusRequired ? ["status.json"] : []),
    ...(locales.length ? ["locales.judge.json"] : []),
  ];
  const bindingRecords = bindingRecordNames.flatMap((name) => {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) return [];
    try { return [{ name, value: JSON.parse(fs.readFileSync(file, "utf8")) }]; } catch { return []; }
  });
  const declaredVersions = bindingRecords.map(({ value }) => value?.bindingSchemaVersion).filter(Boolean);
  const hasTripleBinding = bindingRecords.some(({ value }) => value?.exactRuSha256 || value?.exactUkSha256);
  const legacyAdmission = legacyLedgerAdmission({ dir, sessionId, locales, releaseRoot, ledgerPath: legacyLedgerPath, bindingRecordNames });
  const strictBinding = hasTripleBinding || declaredVersions.length > 0;
  const legacyGrandfathered = !strictBinding && legacyAdmission.admitted === true;
  for (const version of declaredVersions) {
    if (version !== CANONICAL_BINDING_SCHEMA_VERSION) issues.push(`binding schema version unsupported: ${version}`);
  }
  if (!strictBinding && !legacyGrandfathered) issues.push(legacyAdmission.reason || "legacy ledger admission unavailable");
  if (!exactHashes.atomic) issues.push("нет practice.atomic.json для hash-bound readiness");
  const json = (name, minimumTime = masterTime) => {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) { issues.push(`нет ${name}`); return null; }
    if (fs.statSync(file).mtimeMs < minimumTime) issues.push(`${name} старше проверяемого текста`);
    try {
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("expected object");
      return value;
    }
    catch { issues.push(`${name} нечитаем`); return null; }
  };
  const exactBinding = (receipt, label, field, expected, { legacyOptional = false } = {}) => {
    const value = field.split(".").reduce((current, key) => current?.[key], receipt);
    if (!String(value || "").trim()) {
      if (!(legacyOptional && legacyGrandfathered)) issues.push(`${label}: нет ${field}`);
    }
    else if (String(value).toLowerCase() !== expected) issues.push(`${label}: ${field} не совпадает с актуальным файлом`);
  };
  const exactLocaleBinding = (receipt, label, locale, expected) => {
    if (receipt?.localeHashes && typeof receipt.localeHashes === "object" && !Array.isArray(receipt.localeHashes)) {
      exactBinding(receipt, label, `localeHashes.${locale}`, expected);
      return;
    }
    if (locale === "uk") {
      exactBinding(receipt, label, "exactUkSha256", expected, { legacyOptional: true });
      return;
    }
    issues.push(`${label}: нет localeHashes.${locale}`);
  };
  const reviewerReceipts = [];
  if (fs.existsSync(path.join(dir, "ЗАБРАКОВАНА.txt"))) issues.push("сессия забракована");
  // зачем: инструкция не должна выдавать ловушку и не должна обещать «без
  // подсказок» рядом с подсказкой (владелец, 2026-09-20). Проверяем мастер
  // всегда — правило действует на весь курс, а не только на поздние сессии.
  issues.push(...taskInstructionIssues(fs.readFileSync(master, "utf8")));
  for (const role of requiredJudgesForSession(sessionId).filter((role) => role !== "judge_taste")) {
    const verdict = json(`final.${role}.json`);
    if (verdict?.verdict !== "PASS") issues.push(`${role}: ${verdict?.verdict ?? "нет PASS"}`);
    if (verdict) {
      reviewerReceipts.push({ label: role, receipt: verdict });
      issues.push(...receiptContractIssues(verdict, role, role, `final.${role}.json`));
      exactBinding(verdict, role, "sourceSha256", exactHashes.ru);
      exactBinding(verdict, role, "exactRuSha256", exactHashes.ru, { legacyOptional: true });
      for (const locale of locales) if (exactHashes.locales[locale]) exactLocaleBinding(verdict, role, locale, exactHashes.locales[locale]);
      if (exactHashes.atomic) exactBinding(verdict, role, "practiceAtomicSha256", exactHashes.atomic);
    }
    if (role === "judge_progression" && verdict) {
      const actualSha = crypto.createHash("sha256").update(fs.readFileSync(master)).digest("hex");
      if (String(verdict.sourceSha256 || "").toLowerCase() !== actualSha) issues.push("judge_progression: SHA-256 не совпадает с актуальными байтами final.ru.md");
      if (!verdict.comparedThrough) issues.push("judge_progression: нет границы сравнения");
      if (!Array.isArray(verdict.newWords) || verdict.newWords.length === 0) issues.push("judge_progression: не подтверждены новые слова");
      if (verdict.sceneNovel !== true) issues.push("judge_progression: новая ситуация не подтверждена");
      if (!verdict.grammarProgression) issues.push("judge_progression: grammar progression не проверена");
      if (verdict.introPracticeAligned !== true) issues.push("judge_progression: интро не готовят текущую практику");
      if (verdict.curriculumExactMatch !== true) issues.push("judge_progression: не подтверждено точное соответствие строке плана курса");
      if (!String(verdict.curriculumRow || "").trim()) issues.push("judge_progression: не приведена точная строка плана курса");
      const activeCurriculumRow = currentCurriculumRow(sessionId);
      if (!activeCurriculumRow) issues.push("judge_progression: текущая строка плана не найдена");
      else if (String(verdict.curriculumRow || "").trim() !== activeCurriculumRow) issues.push("judge_progression: строка плана не совпадает с текущей");
      const curriculum = verdict.curriculumEvidence;
      if (!curriculum || typeof curriculum !== "object" || Array.isArray(curriculum)) {
        issues.push("judge_progression: нет curriculumEvidence по грамматике, словам и ситуации");
      } else {
        if (!String(curriculum.grammar || "").trim()) issues.push("judge_progression: плановая грамматика не сверена");
        if (!String(curriculum.situation || "").trim()) issues.push("judge_progression: плановая ситуация не сверена");
        const declaredWords = (verdict.newWords || []).map((word) => String(word).toLowerCase()).sort();
        const evidenceWords = Array.isArray(curriculum.newWords) ? curriculum.newWords.map((word) => String(word).toLowerCase()).sort() : [];
        if (!evidenceWords.length || JSON.stringify(evidenceWords) !== JSON.stringify(declaredWords)) issues.push("judge_progression: новые слова в curriculumEvidence не совпадают с проверенным списком");
      }
      if (detailedProgressionEvidenceRequired(sessionId)) {
        const alignment = verdict.introAlignment;
        if (!Array.isArray(alignment) || alignment.length !== 3) {
          issues.push("judge_progression: нужны три постраничные цепочки introAlignment");
        } else {
          const declared = new Set(verdict.newWords.map((word) => String(word).toLowerCase()));
          const authoredIntroAnswers = introCorrectAnswers(fs.readFileSync(master, "utf8"));
          for (let index = 0; index < alignment.length; index += 1) {
            const item = alignment[index] || {};
            const prefix = `judge_progression: интро ${index + 1}`;
            if (item.intro !== index + 1) issues.push(`${prefix}: неверный номер evidence`);
            if (!Array.isArray(item.newWords) || item.newWords.length === 0 || item.newWords.some((word) => !declared.has(String(word).toLowerCase()))) issues.push(`${prefix}: новые слова не подтверждены`);
            if (!item.sceneEvidence || !item.correctAnswer || !item.practiceTarget || !item.finalEvidence) issues.push(`${prefix}: неполная цепочка scene/answer/practice/final`);
            if (authoredIntroAnswers[index] && String(item.correctAnswer).replace(/\s+/gu, " ").trim() !== authoredIntroAnswers[index]) issues.push(`${prefix}: correctAnswer не совпадает с актуальным верным вариантом интро`);
            if (!Number.isInteger(item.practiceTask) || item.practiceTask < 1 || item.practiceTask > 16) issues.push(`${prefix}: practiceTask должен быть 1–16`);
            if (item.sameOperation !== true) issues.push(`${prefix}: связь операции с финалом не подтверждена`);
          }
        }
        if (!Array.isArray(verdict.foreignIntroExamples) || verdict.foreignIntroExamples.length !== 0) issues.push("judge_progression: есть чужие универсальные примеры или нет пустого foreignIntroExamples");
      }
    }
  }
  issues.push(...shortAnswerConstructionFacts(fs.readFileSync(master, "utf8"), sessionId).map((fact) => `ru: ${fact}`));
  issues.push(...ownerTasteReceiptIssues({
    sessionId,
    sourcePath: master,
    receiptPath: path.join(dir, "final.judge_taste.json"),
  }));
  const tasteReceipt = scopedOwnerQualityRequired(sessionId) ? json("final.judge_taste.json") : null;
  if (tasteReceipt) {
    reviewerReceipts.push({ label: "judge_taste", receipt: tasteReceipt });
    issues.push(...receiptContractIssues(tasteReceipt, "judge_taste", "judge_taste", "final.judge_taste.json"));
    exactBinding(tasteReceipt, "judge_taste", "sourceSha256", exactHashes.ru);
    exactBinding(tasteReceipt, "judge_taste", "exactRuSha256", exactHashes.ru, { legacyOptional: true });
    for (const locale of locales) if (exactHashes.locales[locale]) exactLocaleBinding(tasteReceipt, "judge_taste", locale, exactHashes.locales[locale]);
    if (exactHashes.atomic) exactBinding(tasteReceipt, "judge_taste", "practiceAtomicSha256", exactHashes.atomic);
  }
  const status = statusRequired ? json("status.json") : null;
  if (status && (status.converged !== true || status.needsHumanReview !== false)) issues.push("status.json не подтверждает принятие");
  if (status && (status.needsHumanReview || status.converged === false || status.blockedBy || status.blocked?.length || status.brokenTasks?.length || status.buildProblems?.length)) issues.push("status.json содержит незакрытые проблемы");
  if (status) {
    exactBinding(status, "status.json", "sourceSha256", exactHashes.ru);
    exactBinding(status, "status.json", "exactRuSha256", exactHashes.ru, { legacyOptional: true });
    exactBinding(status, "status.json", "localeHashes.ru", exactHashes.ru);
    for (const locale of locales) if (exactHashes.locales[locale]) exactBinding(status, "status.json", `localeHashes.${locale}`, exactHashes.locales[locale]);
    if (exactHashes.atomic) exactBinding(status, "status.json", "practiceAtomicSha256", exactHashes.atomic);
  }
  let localeTime = masterTime;
  for (const locale of locales) {
    const file = path.join(dir, `final.${locale}.md`);
    if (!fs.existsSync(file)) { issues.push(`нет final.${locale}.md`); continue; }
    const localeText = fs.readFileSync(file, "utf8");
    issues.push(...shortAnswerConstructionFacts(localeText, sessionId).map((fact) => `${locale}: ${fact}`));
    issues.push(...taskInstructionIssues(localeText).map((issue) => `${locale}: ${issue}`));
    const time = fs.statSync(file).mtimeMs;
    if (time < masterTime) issues.push(`final.${locale}.md старше мастера`);
    localeTime = Math.max(localeTime, time);
  }
  if (locales.length) {
    const verdict = json("locales.judge.json", localeTime);
    for (const locale of locales) if (verdict?.locales?.[locale]?.verdict !== "PASS") issues.push(`локаль ${locale}: нет PASS`);
    if (verdict) {
      reviewerReceipts.push({ label: "locales.judge.json", receipt: verdict });
      issues.push(...receiptContractIssues(verdict, "locales.judge.json", "judge_locales", "locales.judge.json", ["ru", ...locales]));
      exactBinding(verdict, "locales.judge.json", "sourceSha256", exactHashes.ru);
      exactBinding(verdict, "locales.judge.json", "exactRuSha256", exactHashes.ru, { legacyOptional: true });
      exactBinding(verdict, "locales.judge.json", "localeHashes.ru", exactHashes.ru);
      for (const locale of locales) if (exactHashes.locales[locale]) exactBinding(verdict, "locales.judge.json", `localeHashes.${locale}`, exactHashes.locales[locale]);
      if (exactHashes.atomic) exactBinding(verdict, "locales.judge.json", "practiceAtomicSha256", exactHashes.atomic);
    }
  }
  issues.push(...duplicateReviewerIdentityIssues(reviewerReceipts));
  return { ready: issues.length === 0, issues };
}
