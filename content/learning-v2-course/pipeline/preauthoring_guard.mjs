import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const REPO = path.resolve(ROOT, "../..");
const DESKTOP_CODEX = process.env.PHRASEMAN_CODEX_START_DIR || "C:/Users/badlo/OneDrive/Desktop/Codex";

export const PREAUTHORING_BINDING_SCHEMA_VERSION = "learning_v2_preauthoring_guardian_v2";
export const PREAUTHORING_PREFLIGHT_STATE_SCHEMA_VERSION = "learning_v2_preauthoring_preflight_state_v1";
const PREAUTHORING_PREFLIGHT_STATE_FILE = ".preauthoring-preflight.json";
const PREFLIGHT_RUN_ID_RE = /^preflight:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const HOST_EPOCH_RE = /^host-epoch:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export const PREAUTHORING_HOST_EPOCH_ENV = "PHRASEMAN_PREAUTHORING_HOST_EPOCH";
export const PREAUTHORING_DOCUMENT_ROLE = Object.freeze({
  CURRENT_AUTHORITY: "current_authority",
  SUPPLEMENTAL_RUNTIME: "supplemental_runtime",
  HISTORICAL_CONTEXT: "historical_context",
});

const staticDocuments = [
  path.join(DESKTOP_CODEX, "00_ПРОЧТИ_ПЕРВЫМ.txt"),
  path.join(DESKTOP_CODEX, "00_ГЛАВНОЕ_ТРЕБОВАНИЕ.md"),
  path.join(DESKTOP_CODEX, "НАЧНИ_ОТСЮДА.md"),
  path.join(REPO, "AGENTS.md"),
  path.join(REPO, "docs/v2/СТАРТ В2.md"),
  path.join(REPO, "docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md"),
  path.join(REPO, "docs/v2/curriculum/AFTER_EVERY_SESSION_RECENTER.ru.md"),
  path.join(REPO, "docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md"),
  path.join(REPO, "docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md"),
  path.join(REPO, "docs/v2/curriculum/en/RESEARCH_DOSSIER.ru.md"),
  path.join(REPO, "docs/v2/curriculum/en/SOURCE_EVIDENCE_LEDGER.md"),
  path.join(REPO, "docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md"),
  path.join(REPO, "docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md"),
  path.join(REPO, "docs/v2/LESSON_DESIGN_RULES.ru.md"),
  path.join(REPO, "docs/v2/КАК_ВЫПУСКАТЬ_СЕССИЮ_ЧЕКЛИСТ.ru.md"),
  path.join(ROOT, "ГЛАВНОЕ_ТРЕБОВАНИЕ.md"),
  path.join(ROOT, "КОНСТИТУЦИЯ.md"),
  path.join(ROOT, "МЕТОД_РАБОТЫ.md"),
  path.join(ROOT, "СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md"),
  path.join(ROOT, "КАРТОЧКА_СЛОВА_В_ПРИЛОЖЕНИИ.md"),
  path.join(ROOT, "IMPROVEMENT_LOG.md"),
  path.join(ROOT, "exemplars/en/l01_s01.ru.md"),
  path.join(ROOT, "exemplars/en/l01_s02.ru.md"),
  path.join(ROOT, "exemplars/en/l01_s03.ru.md"),
  path.join(ROOT, "curriculum/en/ПЛАН_КУРСА.md"),
  path.join(ROOT, "judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md"),
  path.join(ROOT, "judgements/owner/2026-09-19_clear_lesson_opening_and_vibe.md"),
];

export const PREAUTHORING_REQUIREMENT_IDS = Object.freeze([
  "desktop_codex_route_read",
  "repo_agents_and_v2_route_read",
  "improvement_log_read",
  "factory_constitution_method_read",
  "three_exemplars_read",
  "all_owner_judgements_read",
  "exact_curriculum_row",
  "cambridge_rule_verified",
  "prior_learner_facing_range_scanned",
  "one_to_five_truly_new_words",
  "new_concrete_situation",
  "honest_grammar_delta_or_review_delta",
  "word_before_phrase",
  "three_intros_use_current_words_and_scene",
  "clear_lesson_opening_and_vibe",
  "three_intro_practice_final_chains",
  "single_coherent_scene",
  "twelve_to_twenty_tasks",
  "only_supported_activity_families",
  "diagnostic_single_answer_distractors",
  "listen_choose_exact_spoken_meaning",
  "choice_specific_feedback",
  "support_fades_to_independent_final",
  "no_future_material",
  "no_ai_voice_nonsense_or_decorative_jokes",
  "locale_native_ru_and_uk",
]);

export const PREAUTHORING_REQUIREMENT_SOURCES = Object.freeze({
  desktop_codex_route_read: { source: "DesktopCodex/НАЧНИ_ОТСЮДА.md", needle: "Ровно эти файлы, целиком, не по диагонали" },
  repo_agents_and_v2_route_read: { source: "repo/AGENTS.md", needle: "После compaction, restart, handoff и перед каждой новой сессией" },
  improvement_log_read: { source: "factory/IMPROVEMENT_LOG.md", needle: "Before work on a bounded lesson or batch, read this file" },
  factory_constitution_method_read: { source: "factory/МЕТОД_РАБОТЫ.md", needle: "Правило = текст в промпте + машинная проверка" },
  three_exemplars_read: { source: "factory/exemplars/en/l01_s01.ru.md", needle: "ЗОЛОТОЙ ЭТАЛОН №1" },
  all_owner_judgements_read: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "Каждая нумерованная learner-facing сессия" },
  exact_curriculum_row: { source: "factory/curriculum/en/ПЛАН_КУРСА.md", needle: null },
  cambridge_rule_verified: { source: "factory/СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md", needle: "Перед написанием сессии" },
  prior_learner_facing_range_scanned: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "сравнивает текущие байты со всеми предыдущими" },
  one_to_five_truly_new_words: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "1–5 действительно новых" },
  new_concrete_situation: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "новую конкретную ситуацию" },
  honest_grammar_delta_or_review_delta: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "измеримым learning delta" },
  word_before_phrase: { source: "factory/СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md", needle: "слово → перевод → фраза" },
  three_intros_use_current_words_and_scene: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "Все три интро используют новые слова" },
  clear_lesson_opening_and_vibe: { source: "factory/judgements/owner/2026-09-19_clear_lesson_opening_and_vibe.md", needle: "начало каждой сессии должно ощущаться как начало" },
  three_intro_practice_final_chains: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "затем появляется как реальный practice target" },
  single_coherent_scene: { source: "factory/КОНСТИТУЦИЯ.md", needle: "одна сквозная ситуация" },
  twelve_to_twenty_tasks: { source: "DesktopCodex/НАЧНИ_ОТСЮДА.md", needle: "Заданий 12–20" },
  only_supported_activity_families: { source: "repo/docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md", needle: "Единственные шесть активных режимов" },
  diagnostic_single_answer_distractors: { source: "repo/docs/v2/СТАРТ В2.md", needle: "Строгий контракт дистракторов" },
  listen_choose_exact_spoken_meaning: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "передаёт только смысл услышанной" },
  choice_specific_feedback: { source: "repo/docs/v2/СТАРТ В2.md", needle: "Feedback обязан назвать выбранный вариант" },
  support_fades_to_independent_final: { source: "repo/docs/v2/СТАРТ В2.md", needle: "поддержка убывает к retrieval/transfer/independent check" },
  no_future_material: { source: "repo/docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md", needle: "будущие слова не показываются" },
  no_ai_voice_nonsense_or_decorative_jokes: { source: "factory/ГЛАВНОЕ_ТРЕБОВАНИЕ.md", needle: "БЕЗ КАПЛИ БРЕДА" },
  locale_native_ru_and_uk: { source: "repo/docs/v2/СТАРТ В2.md", needle: "все восемь локалей самостоятельны" },
});

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const keyFor = (file) => file.replaceAll("\\", "/")
  .replace(DESKTOP_CODEX.replaceAll("\\", "/"), "DesktopCodex")
  .replace(ROOT.replaceAll("\\", "/"), "factory")
  .replace(REPO.replaceAll("\\", "/"), "repo");

const fileForManifestKey = (name) => name.startsWith("DesktopCodex/")
  ? path.join(DESKTOP_CODEX, name.slice("DesktopCodex/".length))
  : name.startsWith("factory/")
    ? path.join(ROOT, name.slice("factory/".length))
    : path.join(REPO, name.slice("repo/".length));

const blueprintAuthorityDocumentKeys = Object.freeze([
  "repo/docs/v2/СТАРТ В2.md",
  "repo/docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md",
  "factory/judgements/owner/2026-10-14_english_blueprint_d956_approval.md",
]);

export const preauthoringDocumentRole = (name) => {
  if (name === "repo/docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md") {
    return PREAUTHORING_DOCUMENT_ROLE.HISTORICAL_CONTEXT;
  }
  if (name.startsWith("repo/docs/v2/") || name === "factory/IMPROVEMENT_LOG.md") {
    return PREAUTHORING_DOCUMENT_ROLE.SUPPLEMENTAL_RUNTIME;
  }
  return PREAUTHORING_DOCUMENT_ROLE.CURRENT_AUTHORITY;
};

const lineNumberAt = (text, index) => text.slice(0, index).split(/\r?\n/u).length;
const statusClass = (status) => {
  const normalized = String(status).trim().toUpperCase().replace(/\s+/gu, " ");
  if (normalized.includes("SUPERSEDED")) return "SUPERSEDED";
  if (normalized.includes("PENDING") || normalized.includes("REVIEW REQUIRED") || normalized.includes("HOLD")) return "PENDING";
  if (normalized.includes("APPROVED")) return "APPROVED";
  return normalized;
};

const authorityClaims = ({ name, text }) => {
  const source = String(name || "<без имени>");
  const bytes = String(text || "");
  const claims = [];
  const add = (fingerprint, status, index) => claims.push({
    source,
    line: lineNumberAt(bytes, index),
    fingerprint: fingerprint.toLowerCase(),
    status: String(status).trim(),
  });

  const currentClaim = /(?:Текущий|Current)\s+canonical\s+fingerprint:\s*\r?\n?\s*`([0-9a-f]{64})`[\s\S]{0,300}?(?:Статус|Status):\s*`([^`]+)`/iu.exec(bytes);
  if (currentClaim) add(currentClaim[1], currentClaim[2], currentClaim.index);

  const headerFingerprint = /\*\*Canonical fingerprint:\*\*\s*\r?\n?\s*`([0-9a-f]{64})`/iu.exec(bytes);
  const headerStatus = /\*\*(?:Статус|Status):\*\*\s*`([^`]+)`/iu.exec(bytes);
  if (headerFingerprint && headerStatus) add(headerFingerprint[1], headerStatus[1], headerFingerprint.index);

  if (headerFingerprint) {
    for (const match of bytes.matchAll(/Новый\s+exact\s+fingerprint\s+выше\s+имеет\s*\r?\n?\s*`ownerApproval\s*=\s*([^`]+)`/giu)) {
      add(headerFingerprint[1], match[1], match.index);
    }
  }

  for (const match of bytes.matchAll(/owner\s+review\s+exact\s+fingerprint\s*\r?\n?\s*`([0-9a-f]{64})`[\s\S]{0,180}?До\s+явного\s+approval/giu)) {
    add(match[1], "OWNER REVIEW REQUIRED", match.index);
  }

  return claims.filter((claim, index, all) => all.findIndex((candidate) => (
    candidate.source === claim.source
    && candidate.line === claim.line
    && candidate.fingerprint === claim.fingerprint
    && candidate.status === claim.status
  )) === index);
};

export function preauthoringAuthorityConflictIssues(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return ["PREAUTHORING: обязательные blueprint authority-документы не переданы для перекрёстной проверки"];
  }
  const currentDocuments = documents.filter(
    (document) => document?.role !== PREAUTHORING_DOCUMENT_ROLE.HISTORICAL_CONTEXT,
  );
  if (currentDocuments.length === 0) {
    return ["PREAUTHORING: текущие blueprint authority-документы не переданы для перекрёстной проверки"];
  }
  const claims = currentDocuments.flatMap(authorityClaims);
  const missing = currentDocuments
    .filter((document) => !claims.some((claim) => claim.source === String(document?.name || "<без имени>")))
    .map((document) => String(document?.name || "<без имени>"));
  if (missing.length > 0) {
    return [`PREAUTHORING: обязательный blueprint authority не содержит однозначной пары fingerprint/status: ${missing.join(", ")}`];
  }

  const fingerprints = new Set(claims.map((claim) => claim.fingerprint));
  const statusesByFingerprint = new Map();
  for (const claim of claims) {
    const statuses = statusesByFingerprint.get(claim.fingerprint) || new Set();
    statuses.add(statusClass(claim.status));
    statusesByFingerprint.set(claim.fingerprint, statuses);
  }
  const conflictingStatus = [...statusesByFingerprint.values()].some((statuses) => statuses.size > 1);
  if (fingerprints.size === 1 && !conflictingStatus) return [];

  const evidence = claims
    .map((claim) => `${claim.source}:L${claim.line} fingerprint=${claim.fingerprint} status=${claim.status}`)
    .join("; ");
  return [`PREAUTHORING: конфликт обязательных blueprint authority: ${evidence}. Единого exact fingerprint/status нет; PASS запрещён до явного разрешения конфликта владельцем.`];
}

const mandatoryBlueprintAuthorityConflictIssues = () => preauthoringAuthorityConflictIssues(
  blueprintAuthorityDocumentKeys.map((name) => ({
    name,
    role: preauthoringDocumentRole(name),
    text: fs.readFileSync(fileForManifestKey(name), "utf8"),
  })),
);

export function priorLearnerFacingManifest(previousSession) {
  const match = /^([a-z]{2})\/l(\d+)\/s(\d+)$/i.exec(String(previousSession || ""));
  if (!match) return {};
  const [, lang, lessonRaw, endRaw] = match;
  const lesson = Number(lessonRaw);
  const end = Number(endRaw);
  const manifest = {};
  for (let session = 1; session <= end; session += 1) {
    const dir = path.join(ROOT, "sessions", lang, `l${String(lesson).padStart(2, "0")}`, `s${String(session).padStart(2, "0")}`);
    for (const locale of ["ru", "uk"]) {
      const file = path.join(dir, `final.${locale}.md`);
      if (fs.existsSync(file)) manifest[`${lang}/l${String(lesson).padStart(2, "0")}/s${String(session).padStart(2, "0")}/final.${locale}.md`] = sha256(file);
    }
  }
  return manifest;
}

export function preauthoringDocumentManifest() {
  const ownerDir = path.join(ROOT, "judgements/owner");
  const ownerDocuments = fs.existsSync(ownerDir)
    ? fs.readdirSync(ownerDir).filter((name) => name.endsWith(".md")).sort().map((name) => path.join(ownerDir, name))
    : [];
  const manifest = {};
  for (const file of new Set([...staticDocuments, ...ownerDocuments])) {
    if (!fs.existsSync(file)) throw new Error(`нет обязательного документа: ${file}`);
    manifest[keyFor(file)] = sha256(file);
  }
  return manifest;
}

export function preauthoringDocumentRoles(manifest = preauthoringDocumentManifest()) {
  return Object.fromEntries(Object.keys(manifest).map((name) => [name, preauthoringDocumentRole(name)]));
}

export function trustedPreauthoringHostEpoch(env = process.env) {
  const hostEpoch = String(env?.[PREAUTHORING_HOST_EPOCH_ENV] || "").trim();
  if (!HOST_EPOCH_RE.test(hostEpoch)) {
    return {
      ready: false,
      hostEpoch: null,
      issues: [`PREAUTHORING: trusted host lifecycle epoch отсутствует или недопустим; координатор должен передать ${PREAUTHORING_HOST_EPOCH_ENV}=host-epoch:<uuid> и менять его после compaction, restart и handoff. CODEX_THREAD_ID/CODEX_SESSION_ID не являются lifecycle epoch.`],
    };
  }
  return { ready: true, hostEpoch, issues: [] };
}

const preauthoringRunBindingIssues = (value, expectedSession, expectedHostEpoch) => {
  const issues = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["PREAUTHORING: сохранённое состояние preflight не является объектом"];
  }
  if (value.schemaVersion !== PREAUTHORING_PREFLIGHT_STATE_SCHEMA_VERSION) {
    issues.push(`PREAUTHORING: schemaVersion сохранённого preflight должен быть ${PREAUTHORING_PREFLIGHT_STATE_SCHEMA_VERSION}`);
  }
  if (!/^[a-z]{2}\/l\d{2}\/s\d{2}$/u.test(String(value.session || ""))) {
    issues.push("PREAUTHORING: сохранённый preflight не содержит допустимый session");
  }
  if (value.session !== expectedSession) issues.push("PREAUTHORING: сохранённый preflight выпущен для другой сессии");
  if (!PREFLIGHT_RUN_ID_RE.test(String(value.preflightRunId || ""))) issues.push("PREAUTHORING: сохранённый preflightRunId недопустим");
  if (typeof value.preflightIssuedAt !== "string" || !Number.isFinite(Date.parse(value.preflightIssuedAt))) {
    issues.push("PREAUTHORING: сохранённый preflightIssuedAt недопустим");
  }
  if (!HOST_EPOCH_RE.test(String(value.hostEpoch || ""))) {
    issues.push("PREAUTHORING: сохранённый preflight не содержит допустимый trusted host lifecycle epoch");
  }
  if (!HOST_EPOCH_RE.test(String(expectedHostEpoch || ""))) {
    issues.push("PREAUTHORING: текущий trusted host lifecycle epoch отсутствует или недопустим");
  } else if (value.hostEpoch !== expectedHostEpoch) {
    issues.push("PREAUTHORING: сохранённый preflight выпущен для другого host lifecycle epoch; после compaction, restart или handoff нужен новый preflight");
  }
  return issues;
};

const preauthoringRunBindingPath = (dir) => {
  const root = path.resolve(dir);
  const file = path.resolve(root, PREAUTHORING_PREFLIGHT_STATE_FILE);
  if (path.dirname(file) !== root) throw new Error("PREAUTHORING: путь состояния preflight вышел за каталог сессии");
  return file;
};

const DEFAULT_PREAUTHORING_LOCK_ROOT = path.join(os.tmpdir(), "phraseman-preauthoring-session-locks-v1");

export function acquirePreauthoringSessionLock(session, { lockRoot = DEFAULT_PREAUTHORING_LOCK_ROOT } = {}) {
  const normalizedSession = String(session || "").trim();
  if (!/^[a-z]{2}\/l\d{2}\/s\d{2}$/u.test(normalizedSession)) {
    throw new Error("PREAUTHORING: session lock requires a valid session id");
  }

  const root = path.resolve(lockRoot);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const rootStats = fs.lstatSync(root);
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error("PREAUTHORING: session lock root is not a real directory");
  }

  const key = crypto.createHash("sha256").update(`${REPO}\0${normalizedSession}`).digest("hex");
  const lockPath = path.join(root, `${key}.lock`);
  const createLockDirectory = () => fs.mkdirSync(lockPath, { mode: 0o700 });
  try {
    createLockDirectory();
  } catch (error) {
    if (error?.code === "EEXIST") {
      let stale = false;
      try {
        const lockStats = fs.lstatSync(lockPath);
        const ownerPath = path.join(lockPath, "owner.json");
        const ownerStats = fs.lstatSync(ownerPath);
        const owner = JSON.parse(fs.readFileSync(ownerPath, "utf8"));
        if (!lockStats.isDirectory() || lockStats.isSymbolicLink() || !ownerStats.isFile() || ownerStats.isSymbolicLink() || owner.session !== normalizedSession) {
          throw new Error("unsafe stale lock shape");
        }
        try {
          process.kill(Number(owner.pid), 0);
        } catch (pidError) {
          if (pidError?.code === "ESRCH") stale = true;
        }
      } catch {
        stale = false;
      }
      if (!stale) throw new Error(`PREAUTHORING: session lock is already held for ${normalizedSession}`);
      fs.rmSync(lockPath, { recursive: true, force: true });
      createLockDirectory();
    } else {
      throw error;
    }
  }

  const created = fs.lstatSync(lockPath);
  const ownerFile = path.join(lockPath, "owner.json");
  try {
    fs.writeFileSync(ownerFile, `${JSON.stringify({
      session: normalizedSession,
      pid: process.pid,
      acquiredAt: new Date().toISOString(),
    }, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  } catch (error) {
    fs.rmdirSync(lockPath);
    throw error;
  }

  let released = false;
  return {
    path: lockPath,
    release() {
      if (released) return;
      released = true;
      const current = fs.lstatSync(lockPath);
      if (current.isSymbolicLink() || !current.isDirectory() || current.dev !== created.dev || current.ino !== created.ino) {
        throw new Error("PREAUTHORING: session lock changed identity; refusing unsafe cleanup");
      }
      const owner = fs.lstatSync(ownerFile);
      if (owner.isSymbolicLink() || !owner.isFile() || owner.nlink !== 1) {
        throw new Error("PREAUTHORING: session lock owner is not a regular single-link file");
      }
      fs.unlinkSync(ownerFile);
      fs.rmdirSync(lockPath);
    },
  };
}

export function persistPreauthoringRunBinding(dir, binding) {
  const state = {
    schemaVersion: PREAUTHORING_PREFLIGHT_STATE_SCHEMA_VERSION,
    session: binding?.session,
    preflightRunId: binding?.preflightRunId,
    preflightIssuedAt: binding?.preflightIssuedAt,
    hostEpoch: binding?.hostEpoch,
  };
  const issues = preauthoringRunBindingIssues(state, state.session, state.hostEpoch);
  if (issues.length > 0) throw new Error(issues.join("; "));

  const file = preauthoringRunBindingPath(dir);
  const suffix = `${process.pid}-${crypto.randomUUID()}`;
  const temporary = `${file}.${suffix}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let descriptor = null;
  try {
    try {
      const existing = fs.lstatSync(file);
      if (existing.isSymbolicLink()) throw new Error("PREAUTHORING: live preflight state is a symlink");
      if (!existing.isFile()) throw new Error("PREAUTHORING: live preflight state is not a regular file");
      if (existing.nlink !== 1) throw new Error("PREAUTHORING: live preflight state is a hardlink; single-link file required");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    descriptor = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    // rename over an existing file is the single atomic publication step. Moving
    // live aside first creates a window where a concurrent reader sees no state.
    fs.renameSync(temporary, file);
    const published = fs.lstatSync(file);
    if (published.isSymbolicLink() || !published.isFile() || published.nlink !== 1) {
      throw new Error("PREAUTHORING: published preflight state is not a regular single-link file");
    }
    return file;
  } catch (error) {
    if (descriptor !== null) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
    throw error;
  }
}

const readRegularSingleLinkFile = (file, label) => {
  const before = fs.lstatSync(file);
  if (before.isSymbolicLink()) throw new Error(`${label} is a symlink`);
  if (!before.isFile()) throw new Error(`${label} is not a regular file`);
  if (before.nlink !== 1) throw new Error(`${label} is a hardlink; single-link file required`);

  const descriptor = fs.openSync(file, "r");
  try {
    const opened = fs.fstatSync(descriptor);
    const after = fs.lstatSync(file);
    const sameFile = before.dev === opened.dev
      && before.ino === opened.ino
      && after.dev === opened.dev
      && after.ino === opened.ino;
    if (!opened.isFile() || opened.nlink !== 1 || !after.isFile() || after.nlink !== 1 || !sameFile) {
      throw new Error(`${label} changed identity or is not a regular single-link file`);
    }
    return fs.readFileSync(descriptor, "utf8");
  } finally {
    fs.closeSync(descriptor);
  }
};

export function readPreauthoringRunBinding(dir, expectedSession, expectedHostEpoch) {
  const file = preauthoringRunBindingPath(dir);
  try {
    fs.lstatSync(file);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      return { ready: false, binding: null, issues: [`PREAUTHORING: сохранённое состояние preflight нечитаемо: ${error.message}`] };
    }
    return { ready: false, binding: null, issues: ["PREAUTHORING: нет сохранённого состояния свежего preflight"] };
  }
  try {
    const state = JSON.parse(readRegularSingleLinkFile(file, "preflight state"));
    const issues = preauthoringRunBindingIssues(state, expectedSession, expectedHostEpoch);
    if (issues.length > 0) return { ready: false, binding: null, issues };
    return {
      ready: true,
      binding: {
        session: state.session,
        preflightRunId: state.preflightRunId,
        preflightIssuedAt: state.preflightIssuedAt,
        hostEpoch: state.hostEpoch,
      },
      issues: [],
    };
  } catch (error) {
    return { ready: false, binding: null, issues: [`PREAUTHORING: сохранённое состояние preflight нечитаемо: ${error.message}`] };
  }
}

export function preauthoringReceiptIssues(receipt, {
  session,
  curriculumRow,
  previousSession,
  expectedNewWords = null,
  preflightRunId,
  preflightIssuedAt,
  hostEpoch,
}) {
  const issues = [];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return ["нет читаемой PREAUTHORING-квитанции"];
  try {
    issues.push(...mandatoryBlueprintAuthorityConflictIssues());
  } catch (error) {
    issues.push(`PREAUTHORING: обязательные blueprint authority-документы не удалось проверить: ${error.message}`);
  }
  if (receipt.bindingSchemaVersion !== PREAUTHORING_BINDING_SCHEMA_VERSION) {
    issues.push(`PREAUTHORING: bindingSchemaVersion должен быть ровно ${PREAUTHORING_BINDING_SCHEMA_VERSION}`);
  }
  const expectedPreflightRunId = String(preflightRunId || "").trim();
  const expectedPreflightTime = Date.parse(preflightIssuedAt);
  if (!PREFLIGHT_RUN_ID_RE.test(expectedPreflightRunId)) {
    issues.push("PREAUTHORING: текущий запуск не передал допустимый preflightRunId");
  }
  if (!Number.isFinite(expectedPreflightTime)) {
    issues.push("PREAUTHORING: текущий запуск не передал допустимый preflightIssuedAt");
  }
  if (receipt.preflightRunId !== expectedPreflightRunId) {
    issues.push("PREAUTHORING: preflightRunId не соответствует текущему preflight");
  }
  if (receipt.preflightIssuedAt !== preflightIssuedAt || !Number.isFinite(Date.parse(receipt.preflightIssuedAt))) {
    issues.push("PREAUTHORING: preflightIssuedAt не соответствует текущему preflight");
  }
  const expectedHostEpoch = String(hostEpoch || "").trim();
  if (!HOST_EPOCH_RE.test(expectedHostEpoch)) {
    issues.push("PREAUTHORING: текущий trusted host lifecycle epoch отсутствует или недопустим");
  }
  if (receipt.hostEpoch !== expectedHostEpoch || !HOST_EPOCH_RE.test(String(receipt.hostEpoch || ""))) {
    issues.push("PREAUTHORING: host lifecycle epoch квитанции не соответствует текущему запуску");
  }
  if (receipt.verdict !== "PASS") issues.push(`PREAUTHORING verdict=${receipt.verdict || "нет"}`);
  const issuedAt = Date.parse(receipt.issuedAt);
  if (!Number.isFinite(issuedAt)) issues.push("PREAUTHORING: issuedAt не является корректным временем свежего вердикта");
  else if (issuedAt > Date.now() + 5 * 60_000) issues.push("PREAUTHORING: issuedAt находится в будущем");
  else if (Number.isFinite(expectedPreflightTime) && issuedAt < expectedPreflightTime) issues.push("PREAUTHORING: вердикт выпущен раньше текущего preflight");
  if (receipt.guardian !== "independent-preauthoring-guardian") issues.push("PREAUTHORING: PASS выдан не независимым guardian");
  if (receipt.authorMustNotSelfIssue !== true) issues.push("PREAUTHORING: не подтверждено, что автор не выдал PASS самому себе");
  if (receipt.session !== session) issues.push("PREAUTHORING-квитанция выпущена для другой сессии");
  if (String(receipt.curriculumRow || "").trim() !== String(curriculumRow || "").trim()) issues.push("PREAUTHORING: строка плана не совпадает с текущей");
  if (receipt.priorLearnerFacingScan?.through !== previousSession) issues.push("PREAUTHORING: не подтверждён полный learner-facing поиск до предыдущей сессии");
  if (String(receipt.priorLearnerFacingScan?.evidence || "").trim().length < 30) issues.push("PREAUTHORING: нет содержательного доказательства полного learner-facing поиска");
  if (!Array.isArray(receipt.priorLearnerFacingScan?.conflicts) || receipt.priorLearnerFacingScan.conflicts.length !== 0) issues.push("PREAUTHORING: предыдущий learner-facing диапазон содержит конфликт или conflicts не проверены");
  const expectedPriorHashes = priorLearnerFacingManifest(previousSession);
  if (JSON.stringify(receipt.priorLearnerFacingScan?.hashes || {}) !== JSON.stringify(expectedPriorHashes)) issues.push("PREAUTHORING: хэши предыдущего learner-facing диапазона отсутствуют или устарели");
  const newWords = receipt.newWords;
  if (!Array.isArray(newWords) || newWords.length < 1 || newWords.length > 5 || newWords.some((word) => typeof word !== "string" || !word.trim()) || new Set(newWords.map((word) => word.trim().toLowerCase())).size !== newWords.length) issues.push("PREAUTHORING: не подтверждены 1–5 действительно новых неповторяющихся слов");
  if (Array.isArray(expectedNewWords) && JSON.stringify(newWords?.map((word) => word.trim().toLowerCase()).sort()) !== JSON.stringify(expectedNewWords.map((word) => word.trim().toLowerCase()).sort())) issues.push("PREAUTHORING: newWords не совпадают с точной строкой плана");
  if (!Array.isArray(receipt.retrievalWords) || receipt.retrievalWords.some((word) => typeof word !== "string" || !word.trim())) issues.push("PREAUTHORING: retrievalWords не перечислены отдельно");
  if (String(receipt.cambridgeEvidence || "").trim().length < 30) issues.push("PREAUTHORING: нет содержательного Cambridge evidence");
  if (String(receipt.scene || "").trim().length < 20) issues.push("PREAUTHORING: новая ситуация не зафиксирована содержательно");
  if (!Array.isArray(receipt.introTargets) || receipt.introTargets.length !== 3 || receipt.introTargets.some((item, index) => item?.intro !== index + 1 || String(item?.target || "").trim().length < 8 || String(item?.practiceLink || "").trim().length < 15)) issues.push("PREAUTHORING: не доказаны три текущие intro→practice цели");
  if (!receipt.independentFinal || typeof receipt.independentFinal !== "object" || String(receipt.independentFinal.target || "").trim().length < 8 || String(receipt.independentFinal.independence || "").trim().length < 20) issues.push("PREAUTHORING: independent final не спроектирован и не доказан");
  if (!Array.isArray(receipt.mustFix) || receipt.mustFix.length !== 0) issues.push("PREAUTHORING: остались незакрытые mustFix");
  if (!Array.isArray(receipt.requirementsChecklist)) issues.push("PREAUTHORING: нет полного чек-листа требований");
  else {
    const byId = new Map(receipt.requirementsChecklist.map((item) => [item?.id, item]));
    if (byId.size !== receipt.requirementsChecklist.length) issues.push("PREAUTHORING: чек-лист содержит дубликаты требований");
    for (const id of PREAUTHORING_REQUIREMENT_IDS) {
      const item = byId.get(id);
      const rule = PREAUTHORING_REQUIREMENT_SOURCES[id];
      if (!item) issues.push(`PREAUTHORING: пропущено требование ${id}`);
      else if (item.status !== "PASS" || String(item.evidence || "").trim().length < 30 || !String(item.source || "").trim() || String(item.sourceQuote || "").trim().length < 24) issues.push(`PREAUTHORING: требование ${id} не доказано`);
      else if (item.source !== rule.source || (rule.needle && !item.sourceQuote.includes(rule.needle)) || (id === "exact_curriculum_row" && (!item.sourceQuote.includes(`| ${Number(/s(\d+)$/i.exec(session)?.[1])} |`) || (expectedNewWords || []).some((word) => !item.sourceQuote.toLowerCase().includes(String(word).toLowerCase()))))) issues.push(`PREAUTHORING: требование ${id} связано не со своим правилом`);
    }
    for (const id of byId.keys()) if (!PREAUTHORING_REQUIREMENT_IDS.includes(id)) issues.push(`PREAUTHORING: неизвестное требование ${id}`);
  }
  let expected;
  try { expected = preauthoringDocumentManifest(); }
  catch (error) { issues.push(`PREAUTHORING: ${error.message}`); return issues; }
  const expectedRoles = preauthoringDocumentRoles(expected);
  const actual = receipt.documentHashes;
  const reviews = receipt.documentReview;
  const actualRoles = receipt.documentRoles;
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) issues.push("PREAUTHORING: нет хэшей обязательных документов");
  else {
    for (const [name, hash] of Object.entries(expected)) {
      if (actual[name] !== hash) issues.push(`PREAUTHORING: документ не перечитан или изменился: ${name}`);
      const review = reviews?.[name];
      const bytes = fs.readFileSync(fileForManifestKey(name), "utf8");
      if (actualRoles?.[name] !== expectedRoles[name] || review?.role !== expectedRoles[name]) {
        issues.push(`PREAUTHORING: роль документа не совпадает с кодом: ${name}; требуется ${expectedRoles[name]}`);
      }
      if (!review || review.sha256 !== hash || String(review.applied || "").trim().length < 20 || String(review.quote || "").trim().length < 24 || !bytes.includes(review.quote)) issues.push(`PREAUTHORING: нет отдельного проверяемого доказательства чтения: ${name}`);
    }
    for (const name of Object.keys(actual)) if (!(name in expected)) issues.push(`PREAUTHORING: неизвестный документ в квитанции: ${name}`);
    if (!actualRoles || typeof actualRoles !== "object" || Array.isArray(actualRoles)) issues.push("PREAUTHORING: нет кодовых ролей обязательных документов");
    else for (const name of Object.keys(actualRoles)) if (!(name in expectedRoles)) issues.push(`PREAUTHORING: неизвестная роль документа в квитанции: ${name}`);
  }
  if (Array.isArray(receipt.requirementsChecklist)) {
    for (const item of receipt.requirementsChecklist) {
      if (!expected[item?.source]) continue;
      const bytes = fs.readFileSync(fileForManifestKey(item.source), "utf8");
      if (!bytes.includes(item.sourceQuote)) issues.push(`PREAUTHORING: цитата требования ${item.id} отсутствует в ${item.source}`);
    }
  }
  if (Number.isFinite(issuedAt)) {
    const newestDocument = Math.max(...Object.keys(expected).map((name) => fs.statSync(fileForManifestKey(name)).mtimeMs));
    if (issuedAt < newestDocument) issues.push("PREAUTHORING: вердикт старше одного из обязательных документов");
    if (Number.isFinite(expectedPreflightTime) && expectedPreflightTime < newestDocument) issues.push("PREAUTHORING: preflight старше одного из обязательных документов");
  }
  return issues;
}

export function requirePreauthoringReceipt(dir, expected) {
  const file = path.join(dir, "preauthoring.json");
  try {
    fs.lstatSync(file);
  } catch (error) {
    if (error?.code === "ENOENT") return { ready: false, file, issues: ["нет preauthoring.json — автору запрещено начинать"] };
    return { ready: false, file, issues: [`preauthoring.json нечитаем: ${error.message}`] };
  }
  try {
    const receipt = JSON.parse(readRegularSingleLinkFile(file, "preauthoring receipt"));
    const issues = preauthoringReceiptIssues(receipt, expected);
    return { ready: issues.length === 0, file, issues, receipt };
  } catch (error) {
    return { ready: false, file, issues: [`preauthoring.json нечитаем: ${error.message}`] };
  }
}
