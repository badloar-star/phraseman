import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const REPO = path.resolve(ROOT, "../..");
const DESKTOP_CODEX = process.env.PHRASEMAN_CODEX_START_DIR || "C:/Users/badlo/OneDrive/Desktop/Codex";

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
  path.join(ROOT, "exemplars/en/l01_s01.ru.md"),
  path.join(ROOT, "exemplars/en/l01_s02.ru.md"),
  path.join(ROOT, "exemplars/en/l01_s03.ru.md"),
  path.join(ROOT, "curriculum/en/ПЛАН_КУРСА.md"),
];

export const PREAUTHORING_REQUIREMENT_IDS = Object.freeze([
  "desktop_codex_route_read",
  "repo_agents_and_v2_route_read",
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
  "previous_required_range_release_ready",
]);

export const PREAUTHORING_REQUIREMENT_SOURCES = Object.freeze({
  desktop_codex_route_read: { source: "DesktopCodex/НАЧНИ_ОТСЮДА.md", needle: "Ровно эти файлы, целиком, не по диагонали" },
  repo_agents_and_v2_route_read: { source: "repo/AGENTS.md", needle: "После compaction, restart, handoff и перед каждой новой сессией" },
  factory_constitution_method_read: { source: "factory/МЕТОД_РАБОТЫ.md", needle: "Правило = текст в промпте + машинная проверка" },
  three_exemplars_read: { source: "factory/exemplars/en/l01_s01.ru.md", needle: "ЗОЛОТОЙ ЭТАЛОН №1" },
  all_owner_judgements_read: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "Каждая нумерованная learner-facing сессия" },
  exact_curriculum_row: { source: "factory/curriculum/en/ПЛАН_КУРСА.md", needle: null },
  cambridge_rule_verified: { source: "factory/СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md", needle: "Перед написанием сессии" },
  prior_learner_facing_range_scanned: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "сравнивает текущие байты со всеми предыдущими" },
  one_to_five_truly_new_words: { source: "repo/docs/v2/СТАРТ В2.md", needle: "1–5 действительно новых" },
  new_concrete_situation: { source: "repo/docs/v2/СТАРТ В2.md", needle: "новую конкретную ситуацию" },
  honest_grammar_delta_or_review_delta: { source: "repo/docs/v2/СТАРТ В2.md", needle: "измеримым learning delta" },
  word_before_phrase: { source: "factory/СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md", needle: "слово → перевод → фраза" },
  three_intros_use_current_words_and_scene: { source: "factory/judgements/owner/2026-09-19_every_session_progression_and_exact_audio_meaning.md", needle: "Все три интро используют новые слова" },
  clear_lesson_opening_and_vibe: { source: "factory/judgements/owner/2026-09-19_clear_lesson_opening_and_vibe.md", needle: "начало каждой сессии должно ощущаться как начало" },
  three_intro_practice_final_chains: { source: "repo/docs/v2/СТАРТ В2.md", needle: "Для каждой из трёх страниц" },
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
  previous_required_range_release_ready: { source: "repo/docs/v2/СТАРТ В2.md", needle: "не может собираться, показываться как готовая" },
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
  for (const file of [...staticDocuments, ...ownerDocuments]) {
    if (!fs.existsSync(file)) throw new Error(`нет обязательного документа: ${file}`);
    manifest[keyFor(file)] = sha256(file);
  }
  return manifest;
}

export function preauthoringReceiptIssues(receipt, { session, curriculumRow, previousSession, expectedNewWords = null, priorRangeReady = true, priorRangeIssues = [] }) {
  const issues = [];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return ["нет читаемой PREAUTHORING-квитанции"];
  if (receipt.verdict !== "PASS") issues.push(`PREAUTHORING verdict=${receipt.verdict || "нет"}`);
  const issuedAt = Date.parse(receipt.issuedAt);
  if (!Number.isFinite(issuedAt)) issues.push("PREAUTHORING: issuedAt не является корректным временем свежего вердикта");
  else if (issuedAt > Date.now() + 5 * 60_000) issues.push("PREAUTHORING: issuedAt находится в будущем");
  if (receipt.guardian !== "independent-preauthoring-guardian") issues.push("PREAUTHORING: PASS выдан не независимым guardian");
  if (receipt.authorMustNotSelfIssue !== true) issues.push("PREAUTHORING: не подтверждено, что автор не выдал PASS самому себе");
  if (receipt.session !== session) issues.push("PREAUTHORING-квитанция выпущена для другой сессии");
  if (String(receipt.curriculumRow || "").trim() !== String(curriculumRow || "").trim()) issues.push("PREAUTHORING: строка плана не совпадает с текущей");
  if (receipt.priorLearnerFacingScan?.through !== previousSession) issues.push("PREAUTHORING: не подтверждён полный learner-facing поиск до предыдущей сессии");
  if (String(receipt.priorLearnerFacingScan?.evidence || "").trim().length < 30) issues.push("PREAUTHORING: нет содержательного доказательства полного learner-facing поиска");
  if (!Array.isArray(receipt.priorLearnerFacingScan?.conflicts) || receipt.priorLearnerFacingScan.conflicts.length !== 0) issues.push("PREAUTHORING: предыдущий learner-facing диапазон содержит конфликт или conflicts не проверены");
  const expectedPriorHashes = priorLearnerFacingManifest(previousSession);
  if (JSON.stringify(receipt.priorLearnerFacingScan?.hashes || {}) !== JSON.stringify(expectedPriorHashes)) issues.push("PREAUTHORING: хэши предыдущего learner-facing диапазона отсутствуют или устарели");
  if (!priorRangeReady) issues.push(`PREAUTHORING: предыдущий обязательный диапазон не готов к релизу: ${priorRangeIssues.join("; ")}`);
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
  const actual = receipt.documentHashes;
  const reviews = receipt.documentReview;
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) issues.push("PREAUTHORING: нет хэшей обязательных документов");
  else {
    for (const [name, hash] of Object.entries(expected)) {
      if (actual[name] !== hash) issues.push(`PREAUTHORING: документ не перечитан или изменился: ${name}`);
      const review = reviews?.[name];
      const bytes = fs.readFileSync(fileForManifestKey(name), "utf8");
      if (!review || review.sha256 !== hash || String(review.applied || "").trim().length < 20 || String(review.quote || "").trim().length < 24 || !bytes.includes(review.quote)) issues.push(`PREAUTHORING: нет отдельного проверяемого доказательства чтения: ${name}`);
    }
    for (const name of Object.keys(actual)) if (!(name in expected)) issues.push(`PREAUTHORING: неизвестный документ в квитанции: ${name}`);
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
  }
  return issues;
}

export function requirePreauthoringReceipt(dir, expected) {
  const file = path.join(dir, "preauthoring.json");
  if (!fs.existsSync(file)) return { ready: false, file, issues: ["нет preauthoring.json — автору запрещено начинать"] };
  try {
    const receipt = JSON.parse(fs.readFileSync(file, "utf8"));
    const issues = preauthoringReceiptIssues(receipt, expected);
    return { ready: issues.length === 0, file, issues, receipt };
  } catch (error) {
    return { ready: false, file, issues: [`preauthoring.json нечитаем: ${error.message}`] };
  }
}
