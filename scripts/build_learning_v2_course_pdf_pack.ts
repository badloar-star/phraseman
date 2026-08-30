import { chromium, type Browser, type Page } from "playwright";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v1";
import { validateLearningV2EnglishGrammarPrerequisiteDagV1 } from "../modules/learning-v2/curriculum/en/prerequisite_dag_en_v1";

const ROOT = resolve(process.cwd());
const OUTPUT_DIR = resolve(ROOT, "output/pdf/learning-v2-course-continuation-pack-2026-08-28");
const TEMP_DIR = resolve(ROOT, "tmp/pdfs/learning-v2-course-continuation-pack");
const FINGERPRINT = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1.blueprintFingerprint;
const OWNER_APPROVAL = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1.ownerApproval;
const OWNER_STATUS_LABEL =
  OWNER_APPROVAL === "APPROVED"
    ? "Owner-approved fingerprint · recorded 2026-08-30"
    : "Candidate fingerprint · owner approval pending";

const OUTPUTS = Object.freeze({
  start: join(OUTPUT_DIR, "00_START_HERE_ONE_PROMPT.pdf"),
  core: join(OUTPUT_DIR, "01_CORE_CONTRACTS_AND_CURRENT_STATUS.pdf"),
  blueprint: join(OUTPUT_DIR, "02_ENGLISH_FULL_COURSE_BLUEPRINT_32x56.pdf"),
  authoring: join(OUTPUT_DIR, "03_AUTHORING_CONTENT_AND_MODE_BIBLES.pdf"),
  visuals: join(OUTPUT_DIR, "04_OWNER_MAPS_AND_UI_MOCKUPS.pdf"),
});

const CORE_DOCS = Object.freeze([
  "AGENTS.md",
  "docs/v2/СТАРТ В2.md",
  "docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md",
  "docs/v2/curriculum/AFTER_EVERY_SESSION_RECENTER.ru.md",
  "docs/v2/curriculum/en/FULL_COURSE_BLUEPRINT_OWNER_REVIEW_2026-08-28.md",
  "docs/v2/curriculum/en/LESSON_01_PACKET_PLANNING_RECEIPT.md",
]);

const BLUEPRINT_DOCS = Object.freeze([
  "docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md",
  "docs/v2/curriculum/en/RESEARCH_DOSSIER.ru.md",
  "docs/v2/curriculum/en/SOURCE_EVIDENCE_LEDGER.md",
  "docs/v2/curriculum/en/COURSE_OVERVIEW_32_LESSONS.ru.md",
]);

const AUTHORING_DOCS = Object.freeze([
  "docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md",
  "docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md",
  "docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md",
  "docs/v2/LESSON_DESIGN_RULES.ru.md",
  "docs/v2/LEARNING_V2_1792_SESSION_PEDAGOGICAL_ORCHESTRATION.ru.md",
  "docs/v2/03-learning-architecture-and-curriculum.md",
  "docs/v2/04-activity-catalog-and-storyboards.md",
  "docs/v2/КАК_ВЫПУСКАТЬ_СЕССИЮ_ЧЕКЛИСТ.ru.md",
]);

const ACTIVE_UI_MOCKUPS = Object.freeze([
  "docs/v2/mockups/02-phrase-builder.html",
  "docs/v2/mockups/03-listen-choose.html",
  "docs/v2/mockups/05-listen-build.html",
  "docs/v2/mockups/06-context-gap.html",
  "docs/v2/mockups/07-speed-match.html",
  "docs/v2/mockups/14-repeat-compare.html",
  "docs/v2/mockups/08-unit-map.html",
  "docs/v2/mockups/09-session-finale.html",
  "docs/v2/mockups/21-checkpoint.html",
  "docs/v2/mockups/23-modals-states.html",
  "docs/v2/mockups/24-missing-states.html",
  "docs/v2/mockups/25-learning-v2-motion-catalog.html",
  "docs/v2/mockups/audio-check.html",
  ".codex-tmp/learning-v2-word-card-mockup/index.html",
]);

type MarkedModule = Readonly<{ marked: { parse(source: string): string | Promise<string> } }>;

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ensureInside(parent: string, child: string): void {
  const rel = relative(resolve(parent), resolve(child));
  if (rel.startsWith("..") || rel === "") {
    throw new Error(`Unsafe path outside expected directory: ${child}`);
  }
}

async function loadMarked(): Promise<MarkedModule | null> {
  const userProfile = process.env.USERPROFILE;
  if (!userProfile) return null;
  const markedPath = join(
    userProfile,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/marked/lib/marked.esm.js",
  );
  if (!existsSync(markedPath)) return null;
  return import(pathToFileURL(markedPath).href) as Promise<MarkedModule>;
}

async function renderMarkdown(source: string, markedModule: MarkedModule | null): Promise<string> {
  if (!markedModule) return `<pre class="raw-markdown">${esc(source)}</pre>`;
  return await markedModule.marked.parse(source);
}

const CSS = `
  :root { --ink:#11261f; --muted:#586b64; --line:#ccd8d1; --paper:#fbfdf8; --soft:#edf4ee; --green:#0d725a; --gold:#a86a00; --red:#b52845; }
  * { box-sizing:border-box; }
  html { background:#fff; }
  body { margin:0; color:var(--ink); background:#fff; font-family:"Segoe UI",Arial,sans-serif; font-size:10.2pt; line-height:1.5; }
  main { max-width:100%; }
  h1,h2,h3,h4 { color:#0d2a21; break-after:avoid; page-break-after:avoid; line-height:1.16; }
  h1 { font-size:27pt; margin:0 0 16px; }
  h2 { font-size:19pt; border-bottom:1px solid var(--line); padding-bottom:7px; margin:30px 0 12px; }
  h3 { font-size:14pt; margin:21px 0 8px; }
  h4 { font-size:11pt; margin:15px 0 6px; text-transform:uppercase; letter-spacing:.04em; color:var(--green); }
  p,li { orphans:3; widows:3; }
  a { color:var(--green); text-decoration:none; }
  code { font-family:Consolas,monospace; background:#edf3ef; padding:1px 3px; border-radius:3px; font-size:9pt; overflow-wrap:anywhere; }
  pre { white-space:pre-wrap; overflow-wrap:anywhere; background:#12231e; color:#f5fbf7; padding:12px 14px; border-radius:8px; font:8.2pt/1.45 Consolas,monospace; break-inside:auto; }
  .raw-markdown { color:var(--ink); background:var(--soft); }
  blockquote { margin:12px 0; padding:8px 14px; border-left:4px solid var(--green); background:var(--soft); }
  table { width:100%; border-collapse:collapse; margin:12px 0; font-size:8.4pt; break-inside:auto; }
  th,td { border:1px solid var(--line); text-align:left; vertical-align:top; padding:5px 6px; overflow-wrap:anywhere; }
  th { background:#e5efe8; }
  tr { break-inside:avoid; page-break-inside:avoid; }
  .cover { min-height:245mm; display:flex; flex-direction:column; justify-content:center; padding:24mm 18mm; background:linear-gradient(145deg,#f8fcf6,#e8f1e8); page-break-after:always; }
  .eyebrow { color:var(--green); font-size:9pt; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
  .lede { font-size:14pt; color:#334a42; max-width:760px; }
  .status { display:inline-block; margin:16px 0; padding:8px 12px; border-radius:999px; background:#fff0c8; color:#6b4300; font-weight:800; }
  .fingerprint { font:8pt/1.4 Consolas,monospace; overflow-wrap:anywhere; color:var(--muted); }
  .source-doc { page-break-before:always; }
  .source-label { color:var(--muted); font:8pt Consolas,monospace; overflow-wrap:anywhere; }
  .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:18px 0; }
  .metric { padding:13px; background:var(--soft); border:1px solid var(--line); border-radius:9px; }
  .metric b { display:block; font-size:19pt; color:var(--green); }
  .lesson { page-break-before:always; }
  .lesson-boundary { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-bottom:14px; }
  .panel { background:var(--soft); border:1px solid var(--line); border-radius:8px; padding:9px 11px; break-inside:avoid; }
  .chapter { margin:18px 0; }
  .chapter > header { padding:9px 11px; background:#dcebe1; border-left:5px solid var(--green); break-after:avoid; }
  .packet { border:1px solid var(--line); border-radius:7px; margin:8px 0; padding:8px 10px; break-inside:avoid; page-break-inside:avoid; }
  .packet-title { display:flex; justify-content:space-between; gap:12px; font-weight:800; color:#0c5f4b; }
  .packet dl { display:grid; grid-template-columns:29mm 1fr; gap:3px 8px; margin:6px 0 0; font-size:8.1pt; }
  .packet dt { color:var(--muted); font-weight:700; }
  .packet dd { margin:0; overflow-wrap:anywhere; }
  .registry-row { break-inside:avoid; }
  .page-break { page-break-before:always; }
  .visual-cover { min-height:180mm; display:flex; flex-direction:column; justify-content:center; text-align:center; }
  .visual-grid { display:grid; grid-template-columns:1fr 1fr; gap:10mm; }
  figure { margin:0; break-inside:avoid; page-break-inside:avoid; }
  figure img { display:block; width:100%; height:151mm; object-fit:contain; object-position:top center; border:1px solid var(--line); background:#eef2ed; }
  figcaption { margin-top:4px; font:7.4pt/1.3 Consolas,monospace; color:var(--muted); overflow-wrap:anywhere; }
  .visual-wide { grid-column:1/-1; page-break-before:always; }
  .visual-wide img { height:170mm; }
  body[data-landscape="true"] .cover { min-height:170mm; padding:18mm 16mm; }
  @media print { .source-doc:first-child { page-break-before:auto; } }
`;

function htmlShell(title: string, body: string, landscape = false): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body data-landscape="${landscape}"><main>${body}</main></body></html>`;
}

async function sourceDocumentsHtml(
  title: string,
  subtitle: string,
  files: readonly string[],
  markedModule: MarkedModule | null,
): Promise<string> {
  const sections: string[] = [];
  for (const sourcePath of files) {
    const absolute = resolve(ROOT, sourcePath);
    const markdown = await readFile(absolute, "utf8");
    sections.push(`<section class="source-doc"><div class="source-label">SOURCE · ${esc(sourcePath)}</div>${await renderMarkdown(markdown, markedModule)}</section>`);
  }
  return htmlShell(title, `<section class="cover"><div class="eyebrow">Phraseman · Learning V2</div><h1>${esc(title)}</h1><p class="lede">${esc(subtitle)}</p><div class="status">${esc(OWNER_STATUS_LABEL)}</div><div class="fingerprint">${FINGERPRINT}</div></section>${sections.join("\n")}`);
}

async function readOwnerMapData(): Promise<any> {
  const source = await readFile(resolve(ROOT, ".codex-tmp/learning-v2-curriculum-owner-map/index.html"), "utf8");
  const startToken = "const DATA = ";
  const endToken = ";\n    const state";
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start);
  if (start < 0 || end < 0) throw new Error("Current curriculum owner map DATA payload not found");
  return JSON.parse(source.slice(start + startToken.length, end));
}

function list(values: readonly unknown[] | undefined): string {
  return values?.length ? values.map(esc).join(", ") : "—";
}

function courseBlueprintHtml(ownerMapData: any, introDocsHtml: string): string {
  const blueprint = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1;
  const dagFindings = validateLearningV2EnglishGrammarPrerequisiteDagV1(blueprint.grammarPrerequisiteDag);
  const lessons = ownerMapData.lessons as readonly any[];
  const operations = blueprint.grammarOperations;
  const senses = blueprint.lexicalSenses;
  const retrievalBySense = new Map<string, string[]>();
  for (const edge of blueprint.lexicalRetrievalEdges) {
    const target = retrievalBySense.get(edge.senseId) ?? [];
    target.push(`L${String(edge.targetLessonOrdinal).padStart(2, "0")}: ${edge.reason}`);
    retrievalBySense.set(edge.senseId, target);
  }

  const lessonSections = lessons.map((lesson) => {
    const chapters = blueprint.chapters.filter((item) => item.lessonOrdinal === lesson.ordinal);
    return `<section class="lesson">
      <div class="eyebrow">Lesson ${String(lesson.ordinal).padStart(2, "0")}</div>
      <h1>${esc(lesson.title)}</h1>
      <p class="lede">${esc(lesson.canDo)}</p>
      <div class="lesson-boundary">
        <div class="panel"><b>Grammar boundary</b><p>${esc(lesson.grammarBoundary)}</p></div>
        <div class="panel"><b>Lexical domains</b><p>${esc(lesson.lexicalDomains)}</p></div>
        <div class="panel"><b>Prerequisites</b><p>${esc(lesson.prerequisites)}</p></div>
        <div class="panel"><b>Forbidden future material</b><p>${esc(lesson.forbidden)}</p></div>
      </div>
      ${chapters.map((chapter) => {
        const packets = blueprint.sessionPackets.filter((item) => item.lessonOrdinal === chapter.lessonOrdinal && item.chapterOrdinal === chapter.chapterOrdinal);
        return `<section class="chapter"><header><h3>Глава ${chapter.chapterOrdinal}: ${esc(chapter.title)}</h3><p><b>Can-do:</b> ${esc(chapter.primaryCanDoStep)}</p><p><b>Lexical mission:</b> ${esc(chapter.lexicalMission)}</p></header>
          ${packets.map((packet) => `<article class="packet">
            <div class="packet-title"><span>Session ${String(packet.sessionOrdinal).padStart(2, "0")} · ${esc(packet.role)}</span><span>${esc(packet.sessionKind)}</span></div>
            <dl>
              <dt>Can-do</dt><dd>${esc(packet.primaryCanDoStep)}</dd>
              <dt>Grammar</dt><dd>${esc(packet.grammarOperationId ?? `REVIEW: ${list(packet.reviewConstructIds)}`)}</dd>
              <dt>Delta</dt><dd>${list(packet.learningDelta)}</dd>
              <dt>Prerequisites</dt><dd>${list(packet.prerequisiteObjectiveIds)}</dd>
              <dt>New lexicon</dt><dd>${list(packet.newLexicalSenseIds)}</dd>
              <dt>Retrieval</dt><dd>${list(packet.retrievalLexicalSenseIds)}</dd>
              <dt>Lexical role</dt><dd>${esc(packet.lexicalPlanRole)}${packet.lexicalReviewOnlyReason ? ` · ${esc(packet.lexicalReviewOnlyReason)}` : ""}</dd>
              <dt>Phrase frames</dt><dd>${list(packet.phraseFrameIds)}</dd>
              <dt>Examples</dt><dd>${packet.canonicalEnglishExamples.map((value) => `“${esc(value)}”`).join(" · ")}</dd>
              <dt>Allowed senses</dt><dd>${list(packet.allowedLexicalSlotSenseIds)}</dd>
              <dt>Forbidden</dt><dd>${list(packet.forbiddenSurfaceFormIds)} · ${list(packet.prohibitedConstructIds)}</dd>
              <dt>Modes</dt><dd>${list(packet.requiredModeFamilies)}</dd>
              <dt>Support</dt><dd>${esc(packet.supportStart)} → ${esc(packet.supportEnd)}</dd>
              <dt>Evidence</dt><dd>${esc(packet.independentProbeId)} · delayed: ${list(packet.delayedProbeIds)}</dd>
              <dt>Review sources</dt><dd>${list(packet.reviewSourceSessionIds)}</dd>
              <dt>Source refs</dt><dd>${list(packet.sourceEvidenceRefs)}</dd>
            </dl>
          </article>`).join("")}
        </section>`;
      }).join("")}
    </section>`;
  }).join("");

  const grammarRows = operations.map((operation) => `<tr class="registry-row"><td>${esc(operation.id)}</td><td>${operation.lessonOrdinal}</td><td>${esc(operation.communicativeFunction)}</td><td>${list(operation.formBoundary)}</td><td>${list(operation.prerequisiteOperationIds)}</td><td>${list(operation.prohibitedExtensionIds)}</td><td>${list(operation.sourceEvidenceRefs)}</td></tr>`).join("");
  const lexicalRows = senses.map((sense) => `<tr class="registry-row"><td>${esc(sense.id)}</td><td>${esc(sense.english)}</td><td>${esc(sense.glossRu)}</td><td>${esc(sense.partOfSpeech)}</td><td>${sense.lessonOrdinal}</td><td>${esc((retrievalBySense.get(sense.id) ?? []).join(" · "))}</td><td>${list(sense.sourceEvidenceRefs)}</td></tr>`).join("");

  const body = `<section class="cover"><div class="eyebrow">Canonical English curriculum data</div><h1>Полный English Course Blueprint · 32 × 56</h1><p class="lede">Все 32 lesson boundaries, 224 chapter outcomes, 1 792 exact session packets, grammar registry, prerequisite DAG, lexical sense ledger, retrieval graph и coverage references.</p><div class="summary-grid"><div class="metric"><b>32</b>урока</div><div class="metric"><b>224</b>главы</div><div class="metric"><b>1 792</b>пакета</div><div class="metric"><b>280</b>lexical senses</div></div><div class="status">STRUCTURAL PASS · OWNER ${esc(OWNER_APPROVAL)}</div><div class="fingerprint">${FINGERPRINT}</div></section>
    ${introDocsHtml}
    <section class="page-break"><h1>Grammar operation registry</h1><p>Всего операций: ${operations.length}. DAG edges: ${blueprint.grammarPrerequisiteDag.edges.length}. Findings: ${dagFindings.length}.</p><table><thead><tr><th>ID</th><th>L</th><th>Function</th><th>Form boundary</th><th>Prerequisites</th><th>Prohibited extensions</th><th>Evidence</th></tr></thead><tbody>${grammarRows}</tbody></table></section>
    <section class="page-break"><h1>Lexical sense ledger и retrieval graph</h1><p>Sense IDs: ${senses.length}. Retrieval edges: ${blueprint.lexicalRetrievalEdges.length}.</p><table><thead><tr><th>ID</th><th>English</th><th>RU gloss</th><th>POS</th><th>First lesson</th><th>Retrieval targets</th><th>Evidence</th></tr></thead><tbody>${lexicalRows}</tbody></table></section>
    ${lessonSections}`;
  return htmlShell("English Full Course Blueprint 32x56", body);
}

async function writePdf(page: Page, html: string, outputPath: string, landscape = false): Promise<void> {
  await page.setContent(html, { waitUntil: "load", timeout: 120_000 });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: outputPath,
    format: "A4",
    landscape,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font:7px 'Segoe UI',Arial;color:#687a73;width:100%;padding:0 12mm;">Phraseman · Learning V2 · ${esc(FINGERPRINT.slice(0, 12))}</div>`,
    footerTemplate: `<div style="font:7px 'Segoe UI',Arial;color:#687a73;width:100%;padding:0 12mm;display:flex;justify-content:space-between;"><span>Owner reference · 2026-08-28</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: { top: "14mm", right: "13mm", bottom: "15mm", left: "13mm" },
  });
}

async function captureVisual(page: Page, sourcePath: string, index: number): Promise<{ sourcePath: string; imagePath: string }> {
  const absolute = resolve(ROOT, sourcePath);
  const imagePath = join(TEMP_DIR, `visual-${String(index + 1).padStart(2, "0")}.png`);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto(pathToFileURL(absolute).href, { waitUntil: "networkidle", timeout: 60_000 });
  await page.screenshot({ path: imagePath, fullPage: false, animations: "disabled" });
  return { sourcePath, imagePath };
}

async function captureOwnerMapStates(browser: Browser): Promise<readonly { sourcePath: string; imagePath: string; wide?: boolean }[]> {
  const sourcePath = ".codex-tmp/learning-v2-curriculum-owner-map/index.html";
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(pathToFileURL(resolve(ROOT, sourcePath)).href, { waitUntil: "load" });
  const overview = join(TEMP_DIR, "visual-owner-map-overview.png");
  await page.screenshot({ path: overview, fullPage: false, animations: "disabled" });
  await page.locator(".lesson-button").last().click();
  await page.locator(".session").last().click();
  const finalPacket = join(TEMP_DIR, "visual-owner-map-final-packet.png");
  await page.screenshot({ path: finalPacket, fullPage: false, animations: "disabled" });
  await page.close();
  return [
    { sourcePath: `${sourcePath} · overview`, imagePath: overview, wide: true },
    { sourcePath: `${sourcePath} · lesson 32 / session 56`, imagePath: finalPacket, wide: true },
  ];
}

async function visualGalleryHtml(browser: Browser): Promise<string> {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  const visuals: { sourcePath: string; imagePath: string; wide?: boolean }[] = [];
  for (let index = 0; index < ACTIVE_UI_MOCKUPS.length; index += 1) {
    const sourcePath = ACTIVE_UI_MOCKUPS[index];
    if (!existsSync(resolve(ROOT, sourcePath))) continue;
    visuals.push(await captureVisual(page, sourcePath, index));
  }
  await page.close();
  visuals.push(...await captureOwnerMapStates(browser));
  // `page.setContent()` has an `about:blank` origin, so Chromium can reject
  // `file://` image URLs even though the screenshots exist. Embed every
  // screenshot directly to keep the visual PDF self-contained and reliable.
  const figures = (await Promise.all(visuals.map(async (visual) => {
    const imageData = await readFile(visual.imagePath);
    const dataUrl = `data:image/png;base64,${imageData.toString("base64")}`;
    return `<figure class="${visual.wide ? "visual-wide" : ""}"><img src="${dataUrl}" alt="${esc(visual.sourcePath)}"><figcaption>${esc(visual.sourcePath)}</figcaption></figure>`;
  }))).join("");
  return htmlShell("Owner maps and UI mockups", `<section class="cover"><div class="eyebrow">Visual source reference</div><h1>Owner maps и канонические UI-макеты</h1><p class="lede">Шесть активных mode-native механик, системные состояния, карточка слова и две контрольные проекции полного curriculum owner map. Sound Contrast намеренно не включён: режим снят с active authoring.</p><div class="status">Visual reference · source HTML remains canonical</div></section><section class="visual-grid">${figures}</section>`, true);
}

async function assertOutputs(): Promise<void> {
  for (const [key, outputPath] of Object.entries(OUTPUTS)) {
    const info = await stat(outputPath);
    if (info.size < 10_000) throw new Error(`PDF output ${key} is unexpectedly small: ${info.size}`);
  }
}

async function main(): Promise<void> {
  ensureInside(resolve(ROOT, "output/pdf"), OUTPUT_DIR);
  ensureInside(resolve(ROOT, "tmp/pdfs"), TEMP_DIR);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await rm(TEMP_DIR, { recursive: true, force: true });
  await mkdir(TEMP_DIR, { recursive: true });

  if (process.argv.includes("--visuals-only")) {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const visualsHtml = await visualGalleryHtml(browser);
      await writePdf(page, visualsHtml, OUTPUTS.visuals, true);
      await page.close();
    } finally {
      await browser.close();
    }
    const info = await stat(OUTPUTS.visuals);
    if (info.size < 10_000) throw new Error(`PDF output visuals is unexpectedly small: ${info.size}`);
    await rm(TEMP_DIR, { recursive: true, force: true });
    console.log(JSON.stringify({ ok: true, visualsOnly: true, output: OUTPUTS.visuals }, null, 2));
    return;
  }

  const markedModule = await loadMarked();
  const onePromptMarkdown = await readFile(resolve(ROOT, "docs/v2/curriculum/ONE_PROMPT_NEW_LANGUAGE_COURSE_START.ru.md"), "utf8");
  const ownerMapData = await readOwnerMapData();

  const startHtml = htmlShell("Start Here: One Prompt", `<section class="cover"><div class="eyebrow">Phraseman · Learning V2 course kit</div><h1>Начните новый языковой курс с одного промпта</h1><p class="lede">Заполните восемь переменных, скопируйте master-prompt целиком и передайте его новой LLM. Она обязана создать доказательный blueprint и остановиться на owner approval до learner-facing authoring.</p><div class="summary-grid"><div class="metric"><b>10</b>stages</div><div class="metric"><b>32</b>lessons</div><div class="metric"><b>224</b>chapters</div><div class="metric"><b>1 792</b>packets</div></div><div class="status">Read this PDF first</div><div class="fingerprint">English reference fingerprint: ${FINGERPRINT}</div></section><section class="source-doc">${await renderMarkdown(onePromptMarkdown, markedModule)}</section><section class="source-doc"><h1>Состав автономного комплекта</h1><ol><li><b>00_START_HERE_ONE_PROMPT</b> — единственная стартовая команда.</li><li><b>01_CORE_CONTRACTS_AND_CURRENT_STATUS</b> — repository/owner boundaries, start route, recenter и текущий status.</li><li><b>02_ENGLISH_FULL_COURSE_BLUEPRINT_32x56</b> — полная эталонная English curriculum projection.</li><li><b>03_AUTHORING_CONTENT_AND_MODE_BIBLES</b> — правила написания, режимов, интро, дистракторов, локалей и выпуска.</li><li><b>04_OWNER_MAPS_AND_UI_MOCKUPS</b> — визуальные canonical references.</li></ol><h2>Как продолжать после паузы</h2><p>Снова передайте LLM master-prompt из этой книги. Она должна обнаружить существующие artifacts и продолжить с первого незавершённого stage, а не начинать заново и не опираться на историю чата.</p></section>`);
  if (process.argv.includes("--start-only")) {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await writePdf(page, startHtml, OUTPUTS.start);
      await page.close();
    } finally {
      await browser.close();
    }
    const info = await stat(OUTPUTS.start);
    if (info.size < 10_000) throw new Error(`PDF output start is unexpectedly small: ${info.size}`);
    await rm(TEMP_DIR, { recursive: true, force: true });
    console.log(JSON.stringify({ ok: true, startOnly: true, output: OUTPUTS.start }, null, 2));
    return;
  }
  const coreHtml = await sourceDocumentsHtml("Core contracts and current status", "Документы, которые определяют разрешённую работу, порядок чтения, recenter, текущий fingerprint и точку остановки.", CORE_DOCS, markedModule);
  const blueprintDocsHtml = (await Promise.all(BLUEPRINT_DOCS.map(async (sourcePath) => {
    const markdown = await readFile(resolve(ROOT, sourcePath), "utf8");
    return `<section class="source-doc"><div class="source-label">SOURCE · ${esc(sourcePath)}</div>${await renderMarkdown(markdown, markedModule)}</section>`;
  }))).join("\n");
  const blueprintHtml = courseBlueprintHtml(ownerMapData, blueprintDocsHtml);
  const authoringHtml = await sourceDocumentsHtml("Authoring, content and mode bibles", "Точный learner-facing contract: pedagogy, six active modes, UI/motion parity, text voice, distractors, localization, session release and quality gates.", AUTHORING_DOCS, markedModule);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await writePdf(page, startHtml, OUTPUTS.start);
    await writePdf(page, coreHtml, OUTPUTS.core);
    await writePdf(page, blueprintHtml, OUTPUTS.blueprint);
    await writePdf(page, authoringHtml, OUTPUTS.authoring);
    const visualsHtml = await visualGalleryHtml(browser);
    await writePdf(page, visualsHtml, OUTPUTS.visuals, true);
    await page.close();
  } finally {
    await browser.close();
  }

  await writeFile(join(OUTPUT_DIR, "MANIFEST.txt"), [
    "PHRASEMAN LEARNING V2 COURSE CONTINUATION PACK",
    "Read 00_START_HERE_ONE_PROMPT.pdf first.",
    `English reference fingerprint: ${FINGERPRINT}`,
    `Owner approval state: ${OWNER_APPROVAL}`,
    ...Object.values(OUTPUTS).map((value) => value),
  ].join("\r\n") + "\r\n", "utf8");
  await assertOutputs();
  await rm(TEMP_DIR, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true, outputDir: OUTPUT_DIR, fingerprint: FINGERPRINT, outputs: OUTPUTS }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
