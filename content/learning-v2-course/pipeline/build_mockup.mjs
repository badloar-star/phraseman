#!/usr/bin/env node
// Макет для владельца: один HTML, в котором можно ПРОЙТИ любую написанную сессию.
//
// зачем (владелец, 03.09): «чтобы пройти любую сессию нужен полноценный макет,
// как делал Codex, и там чтобы каждая сессия, которая написана, была».
// Читает собранный релиз (release/**/learner.json + intro.json + answers.json) —
// то есть проверяет заодно и сборщик: что попало в макет, то попадёт в телефон.
//
// Запуск: node build_mockup.mjs [--out mockup/index.html]
// Черновой просмотр: node build_mockup.mjs --candidate-preview --release C:/temp/learning-v2-candidate/release --out C:/temp/learning-v2-candidate/index.html
//
// Логи: префикс [MOCKUP], каждый ранний выход пишет причину.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { auditSinglePhraseRelease } from "./single_phrase_release.mjs";
import { parseSessionHeader } from "./session_header.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";
import { syncMockupReadiness } from "./sync_mockup_readiness.mjs";
import { sourceReleaseFindings, syncMockupSourceReleaseFindings } from "./sync_mockup_source_release_findings.mjs";
import { sourceQualityFindings } from "./sync_mockup_source_quality_findings.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LOG = (...a) => console.log("[MOCKUP]", ...a);
const WARN = (...a) => console.warn("[MOCKUP][WARN]", ...a);

const USAGE = `Usage: node build_mockup.mjs [--out <file>] [--release <directory>]
       node build_mockup.mjs --candidate-preview --release <directory> --out <file>
       node build_mockup.mjs --help`;

function parseArgs(args) {
  const options = {
    out: path.join(ROOT, "mockup", "index.html"),
    release: path.join(ROOT, "release"),
    candidatePreview: false,
    help: false,
    explicitOut: false,
    explicitRelease: false,
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") {
      options.help = true;
    } else if (arg === "--candidate-preview") {
      options.candidatePreview = true;
    } else if (arg === "--out" || arg === "--release") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${arg}`);
      options[arg.slice(2)] = value;
      options[arg === "--out" ? "explicitOut" : "explicitRelease"] = true;
      index++;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

let cli;
try {
  cli = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`[MOCKUP][ERROR] ${error.message}`);
  console.error(USAGE);
  process.exit(2);
}
if (cli.help) {
  console.log(USAGE);
  process.exit(0);
}

function resolvedFilesystemPath(target) {
  let existingAncestor = path.resolve(target);
  const unresolvedTail = [];
  while (!fs.existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) throw new Error(`cannot_resolve_path:${target}`);
    unresolvedTail.unshift(path.basename(existingAncestor));
    existingAncestor = parent;
  }
  const realAncestor = fs.realpathSync.native
    ? fs.realpathSync.native(existingAncestor)
    : fs.realpathSync(existingAncestor);
  return path.resolve(realAncestor, ...unresolvedTail);
}

function isPathWithin(candidate, protectedRoot) {
  const relative = path.relative(protectedRoot, candidate);
  const comparison = process.platform === "win32" ? relative.toLowerCase() : relative;
  return comparison === "" || (
    comparison !== ".." &&
    !comparison.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

if (cli.candidatePreview) {
  if (!cli.explicitOut) {
    console.error("[MOCKUP][ERROR] candidate_preview_requires_explicit_--out");
    console.error(USAGE);
    process.exit(2);
  }
  if (!cli.explicitRelease) {
    console.error("[MOCKUP][ERROR] candidate_preview_requires_explicit_--release");
    console.error(USAGE);
    process.exit(2);
  }

  const protectedTrees = [
    path.join(ROOT, "mockup"),
    path.join(ROOT, "release"),
    path.resolve(ROOT, "..", "..", "modules", "learning-v2", "content", "factory_native"),
  ].map(resolvedFilesystemPath);
  for (const [flag, requestedPath] of [["--release", cli.release], ["--out", cli.out]]) {
    const resolvedPath = resolvedFilesystemPath(requestedPath);
    const protectedTree = protectedTrees.find((tree) => isPathWithin(resolvedPath, tree));
    if (protectedTree) {
      console.error(`[MOCKUP][ERROR] candidate_preview_protected_path:${flag}:${resolvedPath}:inside=${protectedTree}`);
      process.exit(2);
    }
  }
}
// зачем: 05.09.2026 владелец открывал mockup/index.html и видел 40 сессий,
// пока сборщик клал свежий макет в .codex-tmp/. Место сборки по умолчанию —
// та папка, которую владелец реально открывает.
const OUT = path.resolve(cli.out);
const RELEASE = path.resolve(cli.release);
const CANDIDATE_PREVIEW = cli.candidatePreview;
// Проверенный исходник не должен отображаться через устаревший релиз. Такие
// проекции создаются отдельно только для просмотра в макете и никогда не
// считаются выпуском.
const REVIEWED_SOURCE = path.join(ROOT, "mockup", "reviewed-source");

// The owner keeps this artifact open while source checks change.  Refresh its
// per-card before/after evidence even if the release is correctly blocked
// below, so it never describes an older state of the course.
if (!CANDIDATE_PREVIEW) {
  const readinessSync = await syncMockupReadiness({
    mockupPath: OUT,
    sessionsRoot: path.join(ROOT, "sessions"),
    locales: ["uk"],
  });
  if (readinessSync.updated) LOG(`обновлено доказательство по карточкам: ${readinessSync.cards}`);
  const paritySync = await syncMockupSourceReleaseFindings({ mockupPath: OUT });
  if (paritySync.updated) LOG(`обновлены карточки с расхождениями: ${paritySync.findings}`);
} else {
  LOG("черновой просмотр: сведения о готовности и выпуске не переписываются");
}

const report = auditSinglePhraseRelease(RELEASE);
const releaseAuditHeld = Boolean(
  report.violationCount || report.compositeGapAnswers || report.dictationAudioMismatches ||
  report.answerContractViolations || report.preservationLedgerViolations || report.feedbackLocaleParityViolations,
);
if (releaseAuditHeld) {
  const first = report.issues[0] ?? report.compositeGapIssues[0] ?? report.dictationIssues[0] ??
    report.answerIssues[0] ?? report.preservationIssues[0] ?? report.feedbackLocaleParity[0];
  // Макет — не выпуск. Даже при остановленном выпуске он обязан показать
  // последнюю собранную версию занятия и статус блокировки, иначе владелец
  // сравнивает исправленный исходник с устаревшим экраном.
  WARN(`single_phrase_mockup_hold: ${JSON.stringify(first)}; макет строится только для проверки, выпуск остаётся остановлен`);
} else {
  // This examines the already-built release only.  It must not be presented
  // as an approval of the editable source: source/release parity and the
  // all-source preservation gate run separately and can still block release.
  LOG(`структурная проверка уже собранного варианта: ${report.fileCount} learner, ${report.introFileCount} intro, ${report.interactionCount} practice interactions — PASS (не является допуском исходников к выпуску)`);
}

function curriculumLessonTitles(lang) {
  const file = path.join(ROOT, "curriculum", lang, "ПЛАН_КУРСА.md");
  if (!fs.existsSync(file)) return new Map();
  const titles = new Map();
  const curriculum = fs.readFileSync(file, "utf8");
  const overview = /^## 32 урока\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(curriculum)?.[1] ?? "";
  for (const line of overview.split(/\r?\n/)) {
    const cells = line.split("|").map(cell => cell.trim());
    // Course overview: number, subject, scene, vocabulary, status.
    if (cells.length !== 7 || !/^\d+$/.test(cells[1])) continue;
    const title = cells[2].replace(/[*`]/g, "").replace(/\s*⚠️/g, "").trim();
    titles.set(`l${cells[1].padStart(2, "0")}`, title);
  }
  return titles;
}

const LESSON_TITLE_BY_LOCALE_OVERRIDES = Object.freeze({
  "en/l01": Object.freeze({ uk: "Present be: ствердження + not" }),
});

function lessonTitleByLocale(lang, lesson, ruTitle) {
  return {
    ru: ruTitle,
    ...(LESSON_TITLE_BY_LOCALE_OVERRIDES[`${lang}/${lesson}`] ?? {}),
  };
}

// ---------- сбор сессий ----------
function collect() {
  if (!fs.existsSync(RELEASE)) { LOG(`ранний выход: нет папки релиза ${RELEASE} — сначала node build_release.mjs`); process.exit(2); }
  const out = [];
  for (const lang of fs.readdirSync(RELEASE)) {
    const langDir = path.join(RELEASE, lang);
    if (!fs.statSync(langDir).isDirectory()) continue;
    const lessonTitles = curriculumLessonTitles(lang);
    for (const lesson of fs.readdirSync(langDir).sort()) {
      const lessonDir = path.join(langDir, lesson);
      if (!fs.statSync(lessonDir).isDirectory()) continue;
      for (const session of fs.readdirSync(lessonDir).sort()) {
        const releasedDir = path.join(lessonDir, session);
        const reviewedDir = path.join(REVIEWED_SOURCE, lang, lesson, session);
        const reviewedReady = ["learner.json", "intro.json"].every((name) => fs.existsSync(path.join(reviewedDir, name)));
        const d = CANDIDATE_PREVIEW ? releasedDir : (reviewedReady ? reviewedDir : releasedDir);
        const learner = path.join(d, "learner.json");
        const intro = path.join(d, "intro.json");
        if (!fs.existsSync(learner) || !fs.existsSync(intro)) { WARN(`${lang}/${lesson}/${session}: нет learner.json или intro.json — пропущена`); continue; }
        const answers = fs.existsSync(path.join(d, "answers.json")) ? JSON.parse(fs.readFileSync(path.join(d, "answers.json"), "utf8")) : [];
        const auxiliary = fs.existsSync(path.join(d, "auxiliary.json"))
          ? JSON.parse(fs.readFileSync(path.join(d, "auxiliary.json"), "utf8"))
          : { entries: [] };
        const learnerByLocale = Object.fromEntries(fs.readdirSync(d).flatMap((name) => {
          const match = /^learner\.([a-z]{2}(?:-[A-Z]{2})?)\.json$/.exec(name);
          return match ? [[match[1], JSON.parse(fs.readFileSync(path.join(d, name), "utf8"))]] : [];
        }));
        // Заголовок и сцена отсутствуют в release JSON. Берём каждую доступную
        // локаль из её мастер-файла, чтобы переключатель языка не оставлял
        // русскую карточку и итоговый экран внутри украинского пути.
        const sourceLocales = [...new Set(["ru", ...Object.keys(learnerByLocale)])];
        const titleByLocale = {};
        const sceneByLocale = {};
        for (const locale of sourceLocales) {
          const sourceFile = path.join(ROOT, "sessions", lang, lesson, session, `final.${locale}.md`);
          if (!fs.existsSync(sourceFile)) continue;
          const header = parseSessionHeader(fs.readFileSync(sourceFile, "utf8"));
          titleByLocale[locale] = header.title.replace(/^[^·]+\s*·\s*/u, "").trim();
          sceneByLocale[locale] = header.scene;
        }
        const title = titleByLocale.ru ?? Object.values(titleByLocale)[0] ?? `${lesson}/${session}`;
        const scene = sceneByLocale.ru ?? Object.values(sceneByLocale)[0] ?? "";
        if (!titleByLocale.ru) WARN(`${lang}/${lesson}/${session}: нет final.ru.md — русский заголовок и сцена будут пустыми`);
        out.push({
          key: `${lang}/${lesson}/${session}`, lang, lesson, session, title, scene, titleByLocale, sceneByLocale,
          // Явно несём источник отображения до интерфейса: зелёный статус
          // означает, что открыта проверенная правка, не старый релиз.
          viewSource: CANDIDATE_PREVIEW ? "candidate" : (reviewedReady ? "reviewed_source" : "release"),
          lessonTitle: lessonTitles.get(lesson) ?? "",
          lessonTitleByLocale: lessonTitleByLocale(lang, lesson, lessonTitles.get(lesson) ?? ""),
          intro: JSON.parse(fs.readFileSync(intro, "utf8")),
          learner: JSON.parse(fs.readFileSync(learner, "utf8")),
          learnerByLocale,
          answers,
          auxiliary,
        });
      }
    }
  }
  return out;
}

const sessions = collect();
if (!sessions.length) { LOG("ранний выход: в релизе нет ни одной сессии"); process.exit(2); }
LOG(`сессий в макете: ${sessions.length} — ${sessions.map((s) => s.key).join(", ")}`);

const locales = [...new Set(sessions.flatMap((s) => Object.keys(s.intro.pages?.[0]?.titleByLocale ?? { ru: 1 })))];
LOG(`локали: ${locales.join(", ")}`);
const sourceQuality = sourceQualityFindings({
  root: ROOT,
  sessionKeys: new Set(sessions.map((session) => session.key)),
});
LOG(`карточек с доказанными дефектами исходных заданий: ${Object.keys(sourceQuality).length}`);
const sourceRelease = sourceReleaseFindings({
  root: ROOT,
  sessionKeys: new Set(sessions.map((session) => session.key)),
  releaseRoot: RELEASE,
});
LOG(`карточек, где открываемый вариант расходится с исходником: ${Object.keys(sourceRelease).length}`);
// A green card is evidence-based, not a calendar/ledger guess: it must open a
// complete reviewed projection and have no outstanding source or projection
// finding.  The preservation ledger remains a global release gate, but it is
// not an adequate per-card receipt of what this UI actually opens.
const reviewedCards = Object.fromEntries(sessions
  .filter(() => !CANDIDATE_PREVIEW)
  .filter((session) => session.viewSource === "reviewed_source")
  .map((session) => [session.key, true]));
// Embed the candidate state in the output so a draft file cannot carry green
// review labels from the normal renderer.
const REVIEWED_SOURCE_MARKER = CANDIDATE_PREVIEW ? "" : "reviewed_source";
const REVIEWED_CARD_CLASS = CANDIDATE_PREVIEW ? "candidate-review-disabled" : "source-fixed";
const REVIEWED_LABEL = CANDIDATE_PREVIEW ? "" : "Показана проверенная правка";
const HOME_DESCRIPTION_BY_LOCALE = CANDIDATE_PREVIEW
  ? {
      ru: "Откройте занятие и проверьте его глазами ученика. Это черновой просмотр: канонический выпуск не изменён.",
      uk: "Відкрийте заняття й перевірте його очима учня. Це чернетковий перегляд: канонічний випуск не змінено.",
    }
  : {
      ru: "Открывайте занятия и проверяйте их глазами ученика. Зелёная карточка открывает уже проверенный исправленный текст; если выпуск отстаёт, это прямо отмечено на карточке.",
      uk: "Відкривайте заняття й перевіряйте їх очима учня. Зелена картка відкриває вже перевірений виправлений текст; якщо випуск відстає, це прямо позначено на картці.",
    };

// ---------- HTML ----------
const html = `<!doctype html>
<html lang="ru" data-learning-v2-mockup="v1">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#eef2e9">
<title>Learning V2 · Пройти урок</title>
<style>
:root{
  color-scheme:light;
  --bg:#eef2e9; --surface:#fbfdf7; --surface-2:#e7ede4; --sunken:#dde5da;
  --text:#12231d; --muted:#5d6b65; --accent:#17715a; --target:#0b8264;
  --danger:#c0413f; --gold:#b77813;
  --shadow-sm:0 2px 8px rgba(20,44,34,.06);
  --shadow:0 12px 36px rgba(20,44,34,.10);
  --shadow-lg:0 24px 70px rgba(20,44,34,.16);
  --r-sm:12px; --r:18px; --r-lg:26px;
  --ease:cubic-bezier(.23,1,.32,1);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  --z-sticky:20; --z-overlay:40;
}
*{box-sizing:border-box}
html,body{margin:0}
body{min-height:100vh;background:radial-gradient(circle at 50% -25%,#fff 0,#eef2e9 46%,#dde7dc 100%);color:var(--text);-webkit-font-smoothing:antialiased}
button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}
button:disabled{cursor:default}

.topbar{position:sticky;top:0;z-index:var(--z-sticky);display:flex;align-items:center;gap:14px;
  height:60px;padding:0 max(18px,calc((100vw - 900px)/2));
  background:rgba(251,253,247,.82);backdrop-filter:blur(20px);box-shadow:0 1px 0 rgba(18,35,29,.07)}
.brand{font-weight:800;letter-spacing:-.02em;font-size:15px}
.brand span{display:block;font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);margin-top:1px}
.build-stamp{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.02em;white-space:nowrap}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.pill{background:var(--surface-2);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600;color:var(--muted)}
select.pill{-webkit-appearance:none;appearance:none;padding-right:30px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235d6b65' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 12px center;color:var(--text)}

.shell{width:min(100%,900px);margin:0 auto;padding:26px 20px 90px}

/* ---- дом ---- */
.hero{padding:18px 4px 26px}
.hero h1{margin:0 0 8px;font-size:clamp(26px,4.6vw,38px);letter-spacing:-.035em;line-height:1.08;text-wrap:balance}
.hero p{margin:0;color:var(--muted);font-size:15px;max-width:62ch;line-height:1.5}
.lesson-title{margin:26px 4px 12px;font-size:13px;font-weight:700;letter-spacing:.04em;color:var(--muted)}
.cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(268px,1fr))}
.card{position:relative;text-align:left;padding:18px 18px 16px;border-radius:var(--r);
  background:var(--surface);box-shadow:var(--shadow-sm);
  transition:transform .32s var(--ease),box-shadow .32s var(--ease)}
.card.needs-repair{background:#fff4c9;box-shadow:inset 0 0 0 2px #d99a11,var(--shadow-sm)}
.card.${REVIEWED_CARD_CLASS}{background:#e4f5eb;box-shadow:inset 0 0 0 2px #16835f,var(--shadow-sm)}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.card:active{transform:translateY(-1px) scale(.995)}
.card h3{margin:0 0 6px;font-size:16px;letter-spacing:-.02em;line-height:1.25}
.card .scene{margin:0;font-size:13px;color:var(--muted);line-height:1.45;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .meta{margin-top:12px;display:flex;gap:8px;align-items:center}
.chip{font-size:11px;font-weight:700;letter-spacing:.02em;padding:4px 9px;border-radius:999px;
  background:var(--surface-2);color:var(--muted)}
.chip.k{background:rgba(11,130,100,.11);color:var(--target)}
.chip.fixed{background:#bce8d1;color:#075b40}
.chip.pending{background:#ffe9a6;color:#775200}
.fix-summary{margin:10px 0 0;font-size:12px;line-height:1.42;color:#775200;font-weight:700}

/* ---- прохождение ---- */
.progress{display:flex;gap:4px;margin:0 0 22px}
.progress i{height:4px;flex:1;border-radius:2px;background:var(--sunken);transition:background .3s var(--ease)}
.progress i.done{background:var(--target)}
.progress i.now{background:var(--accent)}

.panel{background:var(--surface);border-radius:var(--r-lg);padding:26px;box-shadow:var(--shadow);
  animation:rise .42s var(--ease) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.kind{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.panel h2{margin:0 0 14px;font-size:clamp(20px,3.4vw,26px);letter-spacing:-.03em;line-height:1.18;text-wrap:balance}
.body{font-size:16px;line-height:1.62;color:var(--text);max-width:64ch;text-wrap:pretty}
/* целевой язык внутри объяснения — цветом, а не кавычками (владелец 03.09) */
.tl{color:var(--target);font-weight:600;white-space:nowrap}
.body p{margin:0 0 13px}
.body p:last-child{margin-bottom:0}
.question{margin:24px 0 14px;font-size:16px;font-weight:650;line-height:1.4}
.task-prompt{margin:0 0 18px;font-size:17px;font-weight:650;letter-spacing:-.01em;line-height:1.35}
.scene-line{margin:0 0 16px;font-size:14px;color:var(--muted);line-height:1.5}

.opts{display:grid;gap:9px}
.opt{position:relative;text-align:left;padding:15px 17px;border-radius:var(--r);
  background:var(--surface-2);font-size:16px;font-weight:550;
  transition:transform .2s var(--ease),background .2s var(--ease),box-shadow .2s var(--ease)}
.opt:not(:disabled):hover{background:var(--sunken);transform:translateX(2px)}
.opt:not(:disabled):active{transform:scale(.985)}
.opt.right{background:rgba(11,130,100,.14);color:var(--target);font-weight:700}
.opt.wrong{background:rgba(192,65,63,.11);color:var(--danger)}
.opt.dim{opacity:.5}

/* разбор ответа — НЕ похож на кнопку варианта: без фона-плашки, с чертой слева
   по тону и иконкой (владелец 03.09 принял «Верно.» за четвёртый вариант) */
.fb{margin-top:14px;padding:4px 0 0 14px;font-size:14.5px;line-height:1.5;color:var(--muted);
  box-shadow:inset 3px 0 0 var(--sunken);animation:rise .3s var(--ease) both}
.fb::before{content:"→ ";font-weight:700}
.fb.ok{color:var(--target);box-shadow:inset 3px 0 0 var(--target)}
.fb.ok::before{content:"✓ "}
.fb.no{color:#8f3230;box-shadow:inset 3px 0 0 var(--danger)}
.fb.no::before{content:"✗ "}

/* плитки */
.slot{min-height:56px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;
  padding:12px;border-radius:var(--r);background:var(--sunken);margin-bottom:14px}
.slot:empty::after{content:attr(data-hint);color:var(--muted);font-size:14px}
.tiles{display:flex;flex-wrap:wrap;gap:8px}
.tile{padding:11px 15px;border-radius:14px;background:var(--surface-2);font-size:16px;font-weight:600;
  box-shadow:var(--shadow-sm);transition:transform .2s var(--ease),opacity .2s var(--ease)}
.tile:not(:disabled):hover{transform:translateY(-2px)}
.tile:not(:disabled):active{transform:scale(.95)}
.tile.used{opacity:.28;pointer-events:none}
.slot .tile{background:var(--surface);box-shadow:none}

/* пары */
.pairs{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.pair{padding:14px;border-radius:var(--r);background:var(--surface-2);font-size:15px;font-weight:600;text-align:center;
  transition:transform .2s var(--ease),background .2s var(--ease)}
.pair.sel{background:rgba(23,113,90,.16);color:var(--accent)}
.pair.gone{opacity:.25;pointer-events:none}
.pair:not(:disabled):active{transform:scale(.96)}

/* аудио и голос */
.play{display:inline-flex;align-items:center;gap:9px;padding:13px 20px;border-radius:999px;
  background:var(--accent);color:#fff;font-weight:650;font-size:15px;box-shadow:var(--shadow-sm);
  transition:transform .22s var(--ease),box-shadow .22s var(--ease)}
.play:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.play:active{transform:scale(.96)}
.target-phrase{font-size:clamp(22px,4vw,30px);font-weight:700;letter-spacing:-.02em;margin:18px 0;color:var(--target)}
.card-word{font-size:clamp(26px,5vw,36px);font-weight:800;letter-spacing:-.03em;color:var(--target);margin:6px 0 10px}
.card-def{font-size:16px;line-height:1.55;color:var(--text);max-width:52ch}

.actions{display:flex;gap:10px;margin-top:22px;align-items:center}
.btn{padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;
  transition:transform .22s var(--ease),box-shadow .22s var(--ease),opacity .2s}
.btn.primary{background:var(--accent);color:#fff;box-shadow:var(--shadow-sm)}
.btn.primary:not(:disabled):hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.btn.primary:not(:disabled):active{transform:scale(.97)}
.btn.primary:disabled{opacity:.4}
.btn.ghost{background:var(--surface-2);color:var(--muted)}
.btn.ghost:hover{background:var(--sunken)}
.spacer{margin-left:auto}

/* финал */
.done-wrap{text-align:center;padding:40px 20px}
.done-mark{font-size:56px;line-height:1;margin-bottom:16px;animation:pop .6s var(--ease) both}
@keyframes pop{0%{opacity:0;transform:scale(.6)}60%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
.done-wrap h2{margin:0 0 10px;font-size:28px;letter-spacing:-.03em}
.done-wrap p{margin:0 0 24px;color:var(--muted);font-size:16px}
.stats{display:flex;gap:26px;justify-content:center;margin-bottom:28px}
.stat b{display:block;font-size:26px;letter-spacing:-.02em}
.stat span{font-size:12px;color:var(--muted);font-weight:600}

@media (max-width:560px){
  .shell{padding:18px 14px 80px}
  .panel{padding:20px 18px;border-radius:var(--r)}
  .pairs{grid-template-columns:1fr 1fr}
}
@media (prefers-reduced-motion:reduce){
  *{animation-duration:.01ms!important;transition-duration:.01ms!important}
}
</style>
</head>
<body>
<div class="topbar">
  <div class="brand">Learning V2<span id="brandSubtitle">Пройти урок</span></div>
  <div class="topbar-right">
    <span class="build-stamp" id="buildStamp"></span>
    <select class="pill" id="locale" aria-label="Язык объяснений"></select>
    <button class="pill" id="home" hidden>К списку</button>
  </div>
</div>
<div class="shell" id="app">
  <noscript><div class="panel"><h2>Не выполняется JavaScript</h2><p class="body">Макет интерактивный: включите JavaScript или откройте файл в обычном браузере (Chrome, Edge).</p></div></noscript>
  <div class="panel" id="boot"><h2>Загрузка…</h2><p class="body" id="boot-msg">Если этот текст остался — скрипт не выполнился. Откройте файл двойным кликом в Chrome или Edge.</p></div>
</div>

<script id="data" type="application/json">${JSON.stringify(sessions).replace(/</g, "\\u003c")}</script>
<script id="source-quality-findings" type="application/json">${JSON.stringify(sourceQuality).replace(/</g, "\\u003c")}</script>
<script id="source-release-findings" type="application/json">${JSON.stringify(sourceRelease).replace(/</g, "\\u003c")}</script>
<script id="reviewed-cards" type="application/json">${JSON.stringify(reviewedCards).replace(/</g, "\\u003c")}</script>
<script id="preview-state" type="application/json">${JSON.stringify({ candidate: CANDIDATE_PREVIEW }).replace(/</g, "\\u003c")}</script>
<script>
// зачем: макет открывали и видели пустой экран без единой ошибки в консоли.
// Любой сбой запуска обязан быть виден НА СТРАНИЦЕ, а не только в консоли.
window.addEventListener("error", (e) => {
  const box = document.getElementById("boot-msg");
  if (box) box.textContent = "Ошибка: " + (e.message || e.error?.message || "неизвестная") + " · " + (e.filename || "") + ":" + (e.lineno || "?");
  console.error("[mockup] ошибка запуска:", e.message, e.error);
});
const DATA = JSON.parse(document.getElementById("data").textContent);
const SOURCE_QUALITY = JSON.parse(document.getElementById("source-quality-findings")?.textContent || "{}");
const SOURCE_RELEASE = JSON.parse(document.getElementById("source-release-findings")?.textContent || "{}");
const REVIEWED_CARDS = JSON.parse(document.getElementById("reviewed-cards")?.textContent || "{}");
const PREVIEW_STATE = JSON.parse(document.getElementById("preview-state")?.textContent || "{}");
const REVIEWED_SOURCE_MARKER = ${JSON.stringify(REVIEWED_SOURCE_MARKER)};
const REVIEWED_CARD_CLASS = ${JSON.stringify(REVIEWED_CARD_CLASS)};
const REVIEWED_LABEL = ${JSON.stringify(REVIEWED_LABEL)};
const HOME_DESCRIPTION_BY_LOCALE = ${JSON.stringify(HOME_DESCRIPTION_BY_LOCALE)};
const LOCALES = ${JSON.stringify(locales)};
const LOC_NAME = {ru:"Русский",uk:"Українська",es:"Español","pt-BR":"Português",vi:"Tiếng Việt",id:"Bahasa",tr:"Türkçe",pl:"Polski"};
const BUILT_AT = ${JSON.stringify(new Date().toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}))};
// зачем: показать свежесть макета с одного взгляда — владелец час смотрел на старую сборку
const S = { locale: localStorage.getItem("mockup.locale") || "ru", session: null, step: 0, answered: false, ok: null, picked: null, assembled: [], tileFeedback: null, pairSel: null, pairFeedback: null, pairsDone: [], audioAttempt: null, right: 0, wrong: 0, unverified: 0 };
const UI = {
  brandSubtitle:{ru:"Пройти урок",uk:"Пройти урок"}, explanationLanguage:{ru:"Язык объяснений",uk:"Мова пояснень"}, home:{ru:"К списку",uk:"До списку"},
  preparedLessons:{ru:"Пройдите любой подготовленный урок",uk:"Пройдіть будь-який підготовлений урок"}, lesson:{ru:"Урок",uk:"Урок"}, activity:{ru:"Занятие",uk:"Заняття"}, tasks:{ru:"заданий",uk:"завдань"},
  back:{ru:"Назад",uk:"Назад"}, next:{ru:"Дальше",uk:"Далі"}, understood:{ru:"Понятно",uk:"Зрозуміло"}, task:{ru:"Задание",uk:"Завдання"}, check:{ru:"Проверить",uk:"Перевірити"}, retry:{ru:"Попробовать ещё раз",uk:"Спробувати ще раз"},
  newWord:{ru:"Новое слово",uk:"Нове слово"}, listenChoose:{ru:"Послушайте и выберите",uk:"Послухайте й виберіть"}, gap:{ru:"Вставьте слово",uk:"Вставте слово"}, sound:{ru:"Различите звуки",uk:"Розрізніть звуки"}, build:{ru:"Соберите фразу",uk:"Складіть фразу"}, listenBuild:{ru:"Послушайте и соберите",uk:"Послухайте й складіть"}, pairs:{ru:"Соедините пары",uk:"З'єднайте пари"}, speak:{ru:"Скажите вслух",uk:"Скажіть уголос"},
  listen:{ru:"Прослушать",uk:"Прослухати"}, listenSample:{ru:"Прослушать образец",uk:"Прослухати зразок"}, audioSynthetic:{ru:"Звучит синтезированный образец; он не заменяет проверенную запись произношения.",uk:"Звучить синтезований зразок; він не замінює перевірений запис вимови."}, audioFallback:{ru:"Аудио недоступно. Текст для чтения:",uk:"Аудіо недоступне. Текст для читання:"},
  missingExplanation:{ru:"Для выбранного ответа нет проверенного объяснения. Нельзя перейти дальше, пока задание не исправлено.",uk:"Для вибраної відповіді немає перевіреного пояснення. Не можна перейти далі, доки завдання не виправлено."},
  missingTileExplanation:{ru:"Для этой лишней плитки нет полного объяснения.",uk:"Для цієї зайвої плитки немає повного пояснення."}, builderWrong:{ru:"Фраза не совпадает с заданием. Соберите её ещё раз.",uk:"Фраза не збігається із завданням. Складіть її ще раз."}, tileHint:{ru:"Нажимайте плитки, чтобы собрать фразу",uk:"Натискайте плитки, щоб скласти фразу"},
  allPairs:{ru:"Все пары соединены.",uk:"Усі пари з'єднано."}, speakUnavailable:{ru:"Запись голоса и автоматическая проверка сейчас недоступны. Произнесите фразу вслух; результат не будет оценён автоматически.",uk:"Запис голосу й автоматична перевірка зараз недоступні. Вимовте фразу вголос; результат не буде оцінено автоматично."}, markSpoken:{ru:"Я произнёс(ла) фразу",uk:"Я вимовив(ла) фразу"}, unverified:{ru:"Выполнено без автоматической проверки.",uk:"Виконано без автоматичної перевірки."},
  completed:{ru:"Урок пройден",uk:"Урок пройдено"}, correctActions:{ru:"верных действий",uk:"правильних дій"}, errors:{ru:"ошибок",uk:"помилок"}, checkedActions:{ru:"проверено действий",uk:"перевірено дій"}, unverifiedActions:{ru:"без автоматической проверки",uk:"без автоматичної перевірки"}, lessonsList:{ru:"К списку уроков",uk:"До списку уроків"},
  candidateBadge:{ru:"ЧЕРНОВИК · НЕ ПРОВЕРЕНО · НЕ ВЫПУСК",uk:"ЧЕРНЕТКА · НЕ ПЕРЕВІРЕНО · НЕ ВИПУСК"},
  candidateSummary:{ru:"Канонический выпуск не изменён. Это черновой просмотр текущего исходника; его нельзя считать проверенным или выпущенным.",uk:"Канонічний випуск не змінено. Це чернетковий перегляд поточного вихідного тексту; його не можна вважати перевіреним або випущеним."},
  missingIntroExplanation:{ru:"Проверенный разбор для этого ответа отсутствует.",uk:"Перевірений розбір для цієї відповіді відсутній."},
  missingContrastAudio:{ru:"У задания на различение звуков нет двух аудиообразцов.",uk:"У завданні на розрізнення звуків немає двох аудіозразків."},
  missingOptions:{ru:"У задания нет вариантов ответа — сборщик не нашёл их в тексте.",uk:"У завданні немає варіантів відповіді — збирач не знайшов їх у тексті."},
  missingBuilderExplanation:{ru:"У задания нет полного авторского объяснения. Нельзя продолжить, пока задание не исправлено.",uk:"У завданні немає повного авторського пояснення. Не можна продовжити, доки завдання не виправлено."},
  missingTiles:{ru:"У задания нет плиток — сборщик не нашёл целевую фразу.",uk:"У завданні немає плиток — збирач не знайшов цільову фразу."},
  missingPairsExplanation:{ru:"У задания нет полного авторского разбора пар. Нельзя продолжить, пока задание не исправлено.",uk:"У завданні немає повного авторського розбору пар. Не можна продовжити, доки завдання не виправлено."},
  missingPhraseExplanation:{ru:"У задания нет полного авторского разбора фразы. Нельзя продолжить, пока задание не исправлено.",uk:"У завданні немає повного авторського розбору фрази. Не можна продовжити, доки завдання не виправлено."},
  renderFailure:{ru:"Сбой отрисовки",uk:"Помилка відтворення"},
};
const ui = (key) => UI[key]?.[S.locale] ?? UI[key]?.ru ?? key;
function activityCountLabel(count) {
  if (S.locale === "uk") return count + " " + (count === 1 ? "заняття" : count >= 2 && count <= 4 ? "заняття" : "занять");
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun = mod10 === 1 && mod100 !== 11 ? "занятие" :
    mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "занятия" : "занятий";
  return count + " " + noun;
}
function applyUiChrome() {
  document.documentElement.lang = S.locale;
  document.getElementById("brandSubtitle").textContent = ui("brandSubtitle");
  sel.setAttribute("aria-label", ui("explanationLanguage"));
  homeBtn.textContent = ui("home");
  document.getElementById("buildStamp").textContent = activityCountLabel(DATA.length) + " · " + BUILT_AT;
}
const learnerForSession = (s, locale = S.locale) => s.learnerByLocale?.[locale] ?? s.learner;

const app = document.getElementById("app");
const sel = document.getElementById("locale");
const homeBtn = document.getElementById("home");
LOCALES.forEach(l => { const o = document.createElement("option"); o.value = l; o.textContent = LOC_NAME[l] || l; sel.append(o); });
sel.value = S.locale;
sel.onchange = () => { S.locale = sel.value; localStorage.setItem("mockup.locale", S.locale); render(); };
homeBtn.onclick = () => { S.session = null; render(); };

const h = (tag, attrs, kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e[k.toLowerCase()] = v;
    else if (v !== null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of [].concat(kids || [])) if (kid) e.append(kid);
  return e;
};
const loc = (byLocale) => !byLocale ? "" : (byLocale[S.locale] ?? byLocale.ru ?? Object.values(byLocale)[0] ?? "");
const activeLocaleValue = (value) => value && typeof value === "object" && !Array.isArray(value) && !("text" in value) && ("ru" in value || "uk" in value)
  ? (value[S.locale] ?? value.ru ?? Object.values(value)[0])
  : value;
// Служебное слово «сессия» не должно попадать в интерфейс ученика даже если
// оно осталось в заголовке исходного файла. Номер занятия сохраняется.
const displayTitle = (value) => String(value ?? "").replace(/(^|[^\p{L}])сессия(?=$|[^\p{L}])/giu, "$1Занятие");
const esc = (s) => String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
// зачем: целевой язык размечен в тексте обратными кавычками — красим его
// акцентом, чтобы английское сразу отличалось от объяснения на своём языке
const MARK = String.fromCharCode(1); // служебный символ-заглушка, в текстах не встречается
const tl = (s) => {
  let out = esc(s);
  // 1) явная разметка автора
  const BT = String.fromCharCode(96); // обратная кавычка: в шаблоне генератора её нельзя писать буквально
  // зачем: размеченные куски прячем в плейсхолдеры, чтобы второй проход
  // (латиница без разметки) не покрасил их повторно и не дал вложенные теги
  const kept = [];
  out = out.replace(new RegExp(BT + "([^" + BT + "]+)" + BT, "g"), (m, inner) => {
    kept.push(inner);
    return MARK + (kept.length - 1) + MARK;
  });
  // 2) латиница без разметки внутри кириллического текста (разборы ошибок
  //    пишут «Am выпало», «Not не заменяет») — красим, если рядом кириллица
  //    и фрагмент ещё не покрашен
  if (/[А-Яа-яЁё]/.test(out)) {
    const Q = String.fromCharCode(34), AP = String.fromCharCode(39);
    // дефис только последним символом класса — иначе «—–-"» читается как диапазон
    const BOUND = "\\\\s(«„>—–" + Q + AP + "-";
    const AFTER = "\\\\s.,!?:;)»<—–" + Q + AP + "-";
    const W = "[A-Za-z][A-Za-z" + AP + "]*";
    const LAT = new RegExp("(^|[" + BOUND + "])(" + W + "(?:\\\\s+" + W + "){0,4})(?=[" + AFTER + "]|$)", "g");
    out = out.replace(LAT, (m, pre, word) => /^(span|class|tl|amp|lt|gt)$/i.test(word) ? m : pre + '<span class="tl">' + word + '</span>');
  }
  return out.replace(new RegExp(MARK + "(\\\\d+)" + MARK, "g"), (m, i) => '<span class="tl">' + kept[+i] + '</span>');
};
const speak = (text) => {
  try {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = .85;
    speechSynthesis.speak(u);
    return true;
  } catch (e) { console.warn("[mockup] речь недоступна:", e.message); return false; }
};
function audioControl(transcript, labelKey = "listen") {
  const attempted = S.audioAttempt?.transcript === transcript ? S.audioAttempt : null;
  return h("div", {class:"audio-control"}, [
    h("button", {class:"play", onClick:() => { S.audioAttempt = {transcript, available:speak(transcript)}; render(); }}, [document.createTextNode("▶  " + ui(labelKey))]),
    h("div", {class:"scene-line", text:ui("audioSynthetic")}),
    attempted && !attempted.available ? h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("audioFallback") + " " + transcript}) : null,
  ]);
}
const shuffle = (arr, seed) => {
  let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const shuffleChoices = (arr, seed) => {
  const a = shuffle(arr, seed);
  // Автор хранит правильный вариант первым для ревью. Даже редкая identity-
  // перестановка не должна превращать это в подсказку ученику.
  if (a.length > 1 && a[0] === arr[0]) a.push(a.shift());
  return a;
};
const sanitizeLearnerPrompt = (value) => String(value || "")
  .trim()
  .replace(/\s*(?:[,;]|—|-)\s*(?:среди|серед)\s+(?:плиток|слів)(?=\s|$)[^.!?]*$/iu, "")
  .replace(/\s*(?:[,;]|—|-)\s*(?:(?:одна|две|дві)\s+)?(?:лишн|чуж|зайв)[^.!?]*(?:плитк|скрепк|скріпк|слов|форм)[^.!?]*$/iu, "")
  .replace(/\s*(?:[,;]|—|-)\s*(?:с|із|зі)\s+[^.!?]*(?:лишн|чуж|зайв)[^.!?]*(?:плитк|скрепк|скріпк|слов|форм)[^.!?]*$/iu, "")
  .replace(/\s*(?:[,;]|—|-)\s*(?:есть|є)\s+[^.!?]*(?:лишн|чуж|зайв)[^.!?]*(?:плитк|слов|вопрос|питан)[^.!?]*$/iu, "")
  .replace(/\s*\([^)]*(?:лишн|чуж|зайв)[^)]*(?:плитк|скрепк|скріпк|слов|форм)[^)]*\)\s*$/iu, "")
  .replace(/\s*(?:[,;]|—|-)\s*(?:among the tiles|with (?:an?|one|two) extra tiles?|there (?:is|are) extra tiles?)\b[^.!?]*$/iu, "")
  .replace(/^(?:проверьте\s+себя|проверь\s+себя|перевірте\s+себе|перевір\s+себе|check\s+yourself|comprueba|compruébalo|verifique|confira|sprawdź\s+się)\s*[:—-]?\s*/iu, "")
  .replace(/(^|[\s(])(соберите|собери|складіть|склади)\s+без\s+(?:подсказк[иу]|підказк[иу]|опоры|опори)(?=\s|$)/giu, "$1$2 фразу")
  .replace(/\s+(?:без\s+(?:подсказк[иу]|підказк[иу]|опоры|опори)|самостоятельно|самостійно|without\s+(?:a\s+)?hints?|on\s+your\s+own|sin\s+(?:pistas?|ayuda)|sem\s+(?:dicas?|ajuda)|bez\s+podpowiedzi|samodzielnie)(?=\s*(?:[—,:;-]|$))/giu, "")
  .replace(/^[а-яіїє]/u, (letter) => letter.toLocaleUpperCase())
  .replace(/[,:;]\s*$/u, "")
  .trim();
const avoidAlignedPairs = (left, right) => {
  if (left.length < 2 || left.length !== right.length) return right;
  const candidate = right.slice();
  for (let shift = 0; shift < candidate.length; shift++) {
    if (candidate.every((item, row) => item.id !== left[row].id)) return candidate;
    candidate.push(candidate.shift());
  }
  const rightById = new Map(right.map(item => [item.id, item]));
  if (rightById.size === right.length && left.every(item => rightById.has(item.id))) {
    return left.map((_, row) => rightById.get(left[(row + 1) % left.length].id));
  }
  return right;
};

function resetStep() { S.answered = false; S.ok = null; S.picked = null; S.assembled = []; S.tileFeedback = null; S.pairSel = null; S.pairFeedback = null; S.pairsDone = []; S.audioAttempt = null; }

// ---------- экраны ----------
function renderHome() {
  homeBtn.hidden = true;
  app.replaceChildren(
    h("div", {class:"hero"}, [
      h("h1", {text:ui("preparedLessons")}),
      h("p", {text:loc(HOME_DESCRIPTION_BY_LOCALE)}),
    ]),
    ...groupByLesson(),
  );
}
function groupByLesson() {
  const out = [];
  const byLesson = {};
  for (const s of DATA) (byLesson[s.lesson] ??= []).push(s);
  for (const [lesson, list] of Object.entries(byLesson)) {
    const lessonTitle = loc(list[0].lessonTitleByLocale) || list[0].lessonTitle;
    out.push(h("div", {class:"lesson-title", text:ui("lesson") + " " + lesson.replace(/^l0?/, "") + (lessonTitle ? " · " + lessonTitle : "")}));
    out.push(h("div", {class:"cards"}, list.map(s => {
      const findings = SOURCE_QUALITY[s.key] || [];
      const releaseFindings = SOURCE_RELEASE[s.key] || [];
      const isCandidate = Boolean(PREVIEW_STATE.candidate) || s.viewSource === "candidate";
      const sourceFixed = !isCandidate && Boolean(REVIEWED_CARDS[s.key]) && !findings.length;
      // A reviewed projection is useful evidence, but it cannot turn the whole
      // card green while the version that would be released still differs.
      const needsRepair = findings.length || releaseFindings.length;
      const numbers = findings.map(item => item.taskNumber).filter(Number.isInteger);
      const hasUnnumberedFinding = findings.some(item => !Number.isInteger(item.taskNumber));
      const findingTarget = hasUnnumberedFinding
        ? (numbers.length ? "вводный текст и задания " + numbers.join(", ") : "вводный текст")
        : "задания " + (numbers.length ? numbers.join(", ") : "без номера");
      const summary = isCandidate
        ? ui("candidateSummary")
        : sourceFixed && releaseFindings.length
        ? "Выпуск ещё содержит старый текст; здесь открывается проверенная правка. Нажмите «Показать изменения», чтобы увидеть точную замену."
        : findings.length
        ? "Нужно исправить " + findingTarget + ": " + [...new Set(findings.map(item => item.reason))].join("; ")
        : releaseFindings[0] || "";
      return h("button", {class:"card" + (isCandidate ? " needs-repair candidate" : needsRepair ? " needs-repair" : sourceFixed ? " " + REVIEWED_CARD_CLASS : ""), onClick:() => { S.session = s; S.step = 0; S.right = 0; S.wrong = 0; resetStep(); render(); }}, [
        h("h3", {text:displayTitle(loc(s.titleByLocale) || s.title)}),
        h("p", {class:"scene", text:loc(s.sceneByLocale) || s.scene}),
        h("div", {class:"meta"}, [
          h("span", {class:"chip k", text:ui("activity") + " " + s.session.replace(/^s0?/, "")}),
          h("span", {class:"chip", text:learnerForSession(s).interactions.length + " " + ui("tasks")}),
           isCandidate ? h("span", {class:"chip pending", text:ui("candidateBadge")}) : null,
           sourceFixed ? h("span", {class:"chip fixed", text:s.viewSource === REVIEWED_SOURCE_MARKER ? REVIEWED_LABEL : "Исходник исправлен"}) : null,
           releaseFindings.length ? h("span", {class:"chip pending", text:"Выпуск надо синхронизировать"}) : null,
        ]),
        isCandidate || findings.length || releaseFindings.length ? h("p", {class:"fix-summary", text:summary}) : null,
      ]);
    })));
  }
  return out;
}

function renderSession() {
  homeBtn.hidden = false;
  const s = S.session;
  const learner = learnerForSession(s);
  const total = 3 + learner.interactions.length;
  if (S.step >= total) return renderDone();

  const bar = h("div", {class:"progress"}, Array.from({length:total}, (_, i) =>
    h("i", {class: i < S.step ? "done" : i === S.step ? "now" : ""})));

  const panel = S.step < 3 ? renderIntro(s.intro.pages[S.step], s.auxiliary) : renderTask(learner.interactions[S.step - 3]);
  app.replaceChildren(bar, panel);
}

function renderIntro(page, auxiliary) {
  // зачем (владелец, 03.09): правильный ответ шёл первым на каждой странице —
  // можно было угадывать, не читая. Тасуем устойчиво (порядок один и тот же
  // при перерисовке), верный ответ помним по исходному индексу 0.
  const raw = loc(page.question.choicesByLocale) || [];
  const choices = shuffleChoices(raw.map((c, i) => ({...c, correct: i === 0})), page.pageId + S.locale);
  const body = loc(page.bodyByLocale).split(/\\n\\n+/).filter(Boolean);
  const panel = h("div", {class:"panel"}, [
    h("h2", {text:loc(page.titleByLocale)}),
    h("div", {class:"body"}, body.map(p => h("p", {html:tl(p)}))),
    h("div", {class:"question", html:tl(loc(page.question.promptByLocale))}),
    h("div", {class:"opts"}, choices.map((c, i) => h("button", {
      class:"opt" + (S.answered ? (c.correct ? " right" : (S.picked === c.responseId ? " wrong" : " dim")) : ""),
      disabled: S.answered,
      onClick: () => { S.answered = true; S.picked = c.responseId; S.ok = c.correct; render(); },
    }, [document.createTextNode(c.text)]))),
  ]);
  if (S.answered) {
    const auxiliaryEntry = (auxiliary?.entries || []).find((entry) => entry.interactionId === page.question.interactionId);
    const selectedFeedback = loc(auxiliaryEntry?.responseFeedbackById?.[S.picked]);
    const selectedAnalysis = activeLocaleValue(auxiliaryEntry?.responseAnalysisById?.[S.picked]);
    const selectedDiagnostic = auxiliaryEntry?.responseDiagnosticsById?.[S.picked];
    const analysisRequired = Boolean(auxiliaryEntry?.responseAnalysisById);
    const analysisComplete = !analysisRequired || completeTextAnalysisV1(selectedAnalysis);
    const diagnosticRequired = !S.ok && Boolean(auxiliaryEntry?.responseDiagnosticsById);
    const diagnosticComplete = !diagnosticRequired || Boolean(
      selectedDiagnostic?.errorType &&
      loc(selectedDiagnostic.whyTemptingByLocale) &&
      loc(selectedDiagnostic.whyWrongHereByLocale) &&
      loc(selectedDiagnostic.minimalContrastByLocale) &&
      loc(selectedDiagnostic.acceptabilityBoundaryByLocale),
    );
    panel.append(h("div", {
      class:"fb " + (selectedFeedback && analysisComplete && diagnosticComplete ? (S.ok ? "ok" : "no") : "no"),
      role:"status",
      "aria-live":"polite",
      "aria-atomic":"true",
      text:selectedFeedback && analysisComplete && diagnosticComplete
        ? selectedFeedback
        : ui("missingIntroExplanation"),
    }));
    if (selectedFeedback && analysisComplete && diagnosticComplete && selectedAnalysis) {
      panel.append(renderTextAnalysisV1(selectedAnalysis));
      if (selectedDiagnostic) panel.append(h("div", {
        class:"explanation",
        html:tl(loc(selectedDiagnostic.minimalContrastByLocale)),
      }));
    }
  }
  const selectedAuxiliaryEntry = S.answered
    ? (auxiliary?.entries || []).find((entry) => entry.interactionId === page.question.interactionId)
    : null;
  const selectedFeedback = loc(selectedAuxiliaryEntry?.responseFeedbackById?.[S.picked]);
  const selectedAnalysisComplete = !selectedAuxiliaryEntry?.responseAnalysisById ||
    completeTextAnalysisV1(activeLocaleValue(selectedAuxiliaryEntry.responseAnalysisById[S.picked]));
  const selectedDiagnostic = selectedAuxiliaryEntry?.responseDiagnosticsById?.[S.picked];
  const selectedDiagnosticComplete = S.ok || !selectedAuxiliaryEntry?.responseDiagnosticsById || Boolean(
    selectedDiagnostic?.errorType &&
    loc(selectedDiagnostic.whyTemptingByLocale) &&
    loc(selectedDiagnostic.whyWrongHereByLocale) &&
    loc(selectedDiagnostic.minimalContrastByLocale) &&
    loc(selectedDiagnostic.acceptabilityBoundaryByLocale),
  );
  panel.append(nextRow(S.answered && Boolean(selectedFeedback) && selectedAnalysisComplete && selectedDiagnosticComplete));
  return panel;
}

function nextRow(canNext = S.answered, label = "Дальше") {
  return h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:ui("back")}),
    h("button", {class:"btn primary spacer", disabled:!canNext, onClick:() => { S.step++; resetStep(); render(); }, text:label === "Дальше" ? ui("next") : label}),
  ]);
}

function renderTask(it) {
  const p = it.modePayload || {};
  const taskNumber = Math.max(1, S.step - 2);
  const panel = h("div", {class:"panel"}, [
    h("div", {class:"kind", text:ui("task") + " " + taskNumber + " · " + familyName(it.family, p)}),
    h("div", {class:"task-prompt", html:tl(sanitizeLearnerPrompt(it.prompt))}),
  ]);
  if (p.isWordCard) { renderCard(panel, it, p); return panel; }
  const R = {
    listen_choose: renderChoice, context_gap_grammar: renderChoice, sound_contrast: renderChoice,
    phrase_builder: renderBuilder, listen_build_dictation: renderBuilder,
    speed_match: renderPairs, scripted_repeat_compare: renderSpeak,
  }[it.family];
  if (R) R(panel, it, p);
  else { WARNBOX(panel, "Неизвестная механика: " + it.family); }
  return panel;
}
function WARNBOX(panel, msg) { panel.append(h("div", {class:"fb no", text:msg})); panel.append(nextRow(true)); }
const familyName = (f, p) => p?.isWordCard ? ui("newWord") : ({listen_choose:ui("listenChoose"), context_gap_grammar:ui("gap"), sound_contrast:ui("sound"), phrase_builder:ui("build"), listen_build_dictation:ui("listenBuild"), speed_match:ui("pairs"), scripted_repeat_compare:ui("speak")})[f] || f;

function completeTextAnalysisV1(analysis) {
  return Boolean(
    analysis && typeof analysis.text === "string" && analysis.text &&
    loc(analysis.meaningByLocale) && loc(analysis.explanationByLocale) &&
    Array.isArray(analysis.units) && analysis.units.length &&
    analysis.units.every((unit) =>
      Number.isInteger(unit?.start) && Number.isInteger(unit?.end) && unit.start >= 0 && unit.end > unit.start &&
      analysis.text.slice(unit.start, unit.end) === unit.text &&
      typeof unit.lemma === "string" && unit.lemma &&
      loc(unit.partOfSpeechLabelByLocale) && loc(unit.meaningByLocale) && loc(unit.functionByLocale)),
  );
}

function renderTextAnalysisV1(analysis) {
  return h("div", {class:"explanation"}, [
    h("div", {class:"target-phrase", text:analysis.text}),
    h("div", {class:"scene-line", html:tl(loc(analysis.meaningByLocale))}),
    h("div", {class:"scene-line", html:tl(loc(analysis.explanationByLocale))}),
    h("div", {class:"explanation-units"}, analysis.units.map((unit) => h("div", {
      class:"scene-line",
      html:tl(unit.text + " — " + loc(unit.partOfSpeechLabelByLocale) + ": " + loc(unit.meaningByLocale) + ". " + loc(unit.functionByLocale)),
    }))),
  ]);
}

function renderCard(panel, it, p) {
  const w = p.wordCard || {};
  panel.append(h("div", {class:"card-word", text:w.word || ""}));
  panel.append(audioControl(w.word || ""));
  panel.append(h("div", {class:"card-def", style:"margin-top:16px", html:tl(loc(w.definitionByLocale))}));
  S.answered = true;
  panel.append(nextRow(true, ui("understood")));
}

function renderChoice(panel, it, p) {
  if (it.family === "sound_contrast") {
    const contrastAudio = [p.audioA?.transcript, p.audioB?.transcript];
    if (contrastAudio.some(audio => !audio)) return WARNBOX(panel, ui("missingContrastAudio"));
    panel.append(h("div", {class:"actions sound-contrast-audio"}, contrastAudio.map((audio, index) => h("button", {
      class:"play",
      onClick:() => speak(audio),
      "aria-label":"Прослушать вариант " + (index ? "B" : "A"),
    }, [document.createTextNode("▶  " + ui("listen") + " " + (index ? "B" : "A"))]))));
  } else {
    const audio = p.referenceAudio?.transcript;
    if (audio) panel.append(audioControl(audio));
  }
  if (p.gappedTargetPhrase) panel.append(h("div", {class:"target-phrase", text:p.gappedTargetPhrase}));
  if (p.localizedScene && loc(p.localizedScene)) panel.append(h("div", {class:"scene-line", html:tl(sanitizeLearnerPrompt(loc(p.localizedScene)))}));
  const opts = shuffleChoices(it.responseOptions, it.interactionId + S.locale);
  if (!opts.length) return WARNBOX(panel, ui("missingOptions"));
  const correctId = correctIdOf(it);
  const visibleChoiceText = (option) => {
    if (it.family !== "listen_choose") return option.text;
    const authored = (p.localizedMeaningChoices || []).find(choice => choice.responseId === option.responseId);
    return authored?.meaningByLocale ? (loc(authored.meaningByLocale) || option.text) : option.text;
  };
  panel.append(h("div", {class:"opts", style:"margin-top:16px"}, opts.map(o => h("button", {
    class:"opt" + (S.answered ? (o.responseId === correctId ? " right" : (S.picked === o.responseId ? " wrong" : " dim")) : ""),
    disabled:S.answered,
    onClick:() => { S.answered = true; S.picked = o.responseId; S.ok = o.responseId === correctId; S.ok ? S.right++ : S.wrong++; render(); },
  }, [document.createTextNode(visibleChoiceText(o))]))));
  if (S.answered) {
    const fb = (p.choiceFeedback || []).find(f => f.responseId === S.picked);
    const feedback = loc(fb?.feedbackByLocale);
    const analysisRequired = Boolean(fb && Object.prototype.hasOwnProperty.call(fb, "analysisV1"));
    const analysisComplete = !analysisRequired || completeTextAnalysisV1(fb.analysisV1);
    const feedbackIsComplete = Boolean(
      fb && typeof fb.correct === "boolean" && fb.correct === S.ok && feedback && analysisComplete,
    );
    panel.append(h("div", {
      class:"fb " + (feedbackIsComplete && S.ok ? "ok" : "no"),
      role:"status",
      "aria-live":"polite",
      "aria-atomic":"true",
      html: feedbackIsComplete
        ? tl(feedback)
        : ui("missingExplanation"),
    }));
    if (feedbackIsComplete && fb.analysisV1) panel.append(renderTextAnalysisV1(fb.analysisV1));
    panel.append(nextRow(feedbackIsComplete));
    return;
  }
  panel.append(nextRow());
}
function correctIdOf(it) {
  const a = S.session.answers.find(x => x.interactionId === it.interactionId);
  if (a?.correctResponseId) return a.correctResponseId;
  return it.responseOptions[0]?.responseId;
}

function renderBuilder(panel, it, p) {
  const target = p.targetPhrase || p.hiddenTargetPhrase || "";
  const ordered = p.orderedTokens || [];
  const explanationPresent = Object.prototype.hasOwnProperty.call(p, "explanationV1");
  const explanation = p.explanationV1;
  const localized = (value) => Boolean(loc(value));
  const completeExplanation = Boolean(
    explanation && localized(explanation.completionFeedbackByLocale) && completeTextAnalysisV1(explanation.phrase),
  );
  const failClosed = (message) => {
    panel.append(h("div", {class:"fb no", text:message}));
    panel.append(nextRow(false));
  };
  if (explanationPresent && !completeExplanation) {
    failClosed(ui("missingBuilderExplanation"));
    return;
  }
  if (p.referenceAudio?.transcript) panel.append(audioControl(p.referenceAudio.transcript));
  else if (p.localizedMeaning && loc(p.localizedMeaning)) panel.append(h("div", {class:"scene-line", text:loc(p.localizedMeaning)}));
  if (!ordered.length) return WARNBOX(panel, ui("missingTiles"));

  const slot = h("div", {class:"slot", "data-hint":ui("tileHint")},
    S.assembled.map((tile, i) => h("button", {class:"tile", disabled:S.answered, onClick:() => { S.assembled.splice(i, 1); S.tileFeedback = null; render(); }, text:tile.text})));
  panel.append(h("div", {style:"margin-top:16px"}, [slot]));

  // Tile identity is independent from its visible text: two physical extra
  // tiles may display the same word but require different explanations.
  const feedbackByTileId = new Map((p.slotFeedback || []).map((row) => [row.responseId, row]));
  const all = shuffle([
    ...ordered.map((text, index) => ({ tileId:it.interactionId + ":tile:t" + (index + 1), text, kind:"target" })),
    ...(p.authoredDistractorTokens || []).map((text, index) => ({ tileId:it.interactionId + ":tile:d" + (index + 1), text, kind:"distractor" })),
  ], it.interactionId);
  const used = new Set(S.assembled.map((tile) => tile.tileId));
  panel.append(h("div", {class:"tiles"}, all.map((tile) => {
    const isUsed = used.has(tile.tileId);
    return h("button", {class:"tile" + (isUsed ? " used" : ""), disabled:S.answered || isUsed,
      onClick:() => { S.assembled.push(tile); S.tileFeedback = tile.kind === "distractor" ? feedbackByTileId.get(tile.tileId) || {missing:true} : null; render(); }, text:tile.text});
  })));
  if (S.tileFeedback) {
    const slotFeedback = loc(S.tileFeedback.feedbackByLocale);
    const analysisRequired = Object.prototype.hasOwnProperty.call(S.tileFeedback, "analysisV1");
    const analysisComplete = !analysisRequired || completeTextAnalysisV1(S.tileFeedback.analysisV1);
    panel.append(h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:slotFeedback && analysisComplete ? slotFeedback : ui("missingTileExplanation")}));
    if (slotFeedback && analysisComplete && S.tileFeedback.analysisV1) panel.append(renderTextAnalysisV1(S.tileFeedback.analysisV1));
  }

  const ready = S.assembled.length === ordered.length;
  if (S.answered) {
    if (S.ok && completeExplanation) {
      const phrase = explanation.phrase;
      panel.append(h("div", {class:"explanation"}, [
        h("div", {class:"fb ok", role:"status", "aria-live":"polite", "aria-atomic":"true", html:tl(loc(explanation.completionFeedbackByLocale))}),
        renderTextAnalysisV1(phrase),
      ]));
    } else if (!S.ok) {
      panel.append(h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("builderWrong")}));
    } else {
      panel.append(h("div", {class:"fb ok", role:"status", "aria-live":"polite", "aria-atomic":"true", text:loc({ru:"Верно.",uk:"Правильно."})}));
    }
  }
  panel.append(h("div", {class:"actions"}, [
    h("button", {class:"btn ghost", disabled:S.step === 0, onClick:() => { if (S.step > 0) { S.step--; resetStep(); render(); } }, text:ui("back")}),
    S.answered
      ? (S.ok
        ? h("button", {class:"btn primary spacer", onClick:() => { S.step++; resetStep(); render(); }, text:ui("next")})
        : h("button", {class:"btn primary spacer", onClick:() => { S.answered = false; S.ok = null; S.assembled = []; S.tileFeedback = null; render(); }, text:ui("retry")}))
      : h("button", {class:"btn primary spacer", disabled:!ready, onClick:() => {
          const got = S.assembled.map((tile) => tile.text).join(" ").replace(/[.?!]$/, "").toLowerCase();
          const want = ordered.join(" ").replace(/[.?!]$/, "").toLowerCase();
          S.answered = true; S.ok = got === want; S.ok ? S.right++ : S.wrong++; render();
        }, text:ui("check")}),
  ]));
}

function renderPairs(panel, it, p) {
  const grid = p.pairGrid || [];
  if (!grid.length) return WARNBOX(panel, "Нет пар для соединения.");
  const analysisPresent = grid.some((row) => Object.prototype.hasOwnProperty.call(row, "analysisV1"));
  const localized = (value) => Boolean(loc(value));
  const completeAnalysis = (analysis) => Boolean(
    analysis && typeof analysis.lemma === "string" && analysis.lemma &&
    localized(analysis.partOfSpeechLabelByLocale) && localized(analysis.meaningByLocale) &&
    localized(analysis.functionByLocale) && localized(analysis.matchExplanationByLocale) &&
    (!Object.prototype.hasOwnProperty.call(analysis, "phrase") || completeTextAnalysisV1(analysis.phrase)),
  );
  if (analysisPresent && !grid.every((row) => completeAnalysis(row.analysisV1))) {
    panel.append(h("div", {class:"fb no", text:ui("missingPairsExplanation")}));
    panel.append(nextRow(false));
    return;
  }
  const analysisById = new Map(grid.map((row) => [row.pairId, row.analysisV1]));
  const left = shuffle(grid.map(g => ({id:g.pairId, text:g.target})), it.interactionId + "L");
  const right = avoidAlignedPairs(
    left,
    shuffle(grid.map(g => ({id:g.pairId, text:loc(g.meaningByLocale)})), it.interactionId + "R"),
  );
  const cell = (item, side) => h("button", {
    class:"pair" + (S.pairsDone.includes(item.id) ? " gone" : (S.pairSel?.id === item.id && S.pairSel.side === side ? " sel" : "")),
    disabled:S.pairsDone.includes(item.id),
    onClick:() => {
      if (!S.pairSel) { S.pairSel = {...item, side}; return render(); }
      if (S.pairSel.side === side) { S.pairSel = {...item, side}; return render(); }
      const selected = S.pairSel;
      const leftItem = side === "L" ? item : selected;
      const rightItem = side === "R" ? item : selected;
      const correct = selected.id === item.id;
      S.pairFeedback = {correct, leftId:leftItem.id, rightId:rightItem.id};
      if (correct) { S.pairsDone.push(item.id); S.right++; } else { S.wrong++; }
      S.pairSel = null;
      if (S.pairsDone.length === grid.length) S.answered = true;
      render();
    }, text:item.text});
  panel.append(h("div", {class:"pairs", style:"margin-top:16px"}, [
    h("div", {style:"display:grid;gap:9px"}, left.map(i => cell(i, "L"))),
    h("div", {style:"display:grid;gap:9px"}, right.map(i => cell(i, "R"))),
  ]));
  if (S.pairFeedback && analysisPresent) {
    const pairIds = S.pairFeedback.correct
      ? [S.pairFeedback.leftId]
      : [S.pairFeedback.leftId, S.pairFeedback.rightId];
    panel.append(h("div", {class:"explanation", role:"status", "aria-live":"polite", "aria-atomic":"true"}, pairIds.map((pairId) => {
      const analysis = analysisById.get(pairId);
      return h("div", {class:"speed-analysis"}, [
        h("div", {class:"scene-line", html:tl(
          analysis.lemma + " — " + loc(analysis.partOfSpeechLabelByLocale) + ": " +
          loc(analysis.meaningByLocale) + (/[.!?…]$/u.test(loc(analysis.meaningByLocale)) ? " " : ". ") + loc(analysis.functionByLocale) +
          (S.pairFeedback.correct ? " " + loc(analysis.matchExplanationByLocale) : ""),
        )}),
        analysis.phrase ? renderTextAnalysisV1(analysis.phrase) : null,
      ]);
    })));
  }
  if (S.answered) panel.append(h("div", {class:"fb ok", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("allPairs")}));
  panel.append(nextRow());
}

function renderSpeak(panel, it, p) {
  const phrase = p.targetPhrase || p.referenceAudio?.transcript || "";
  if (!phrase) return WARNBOX(panel, "Нет фразы для произнесения.");
  const analysisPresent = Boolean(p.explanationV1 && Object.prototype.hasOwnProperty.call(p.explanationV1, "phrase"));
  const analysisComplete = !analysisPresent || completeTextAnalysisV1(p.explanationV1.phrase);
  if (!analysisComplete) {
    panel.append(h("div", {class:"fb no", text:ui("missingPhraseExplanation")}));
    panel.append(nextRow(false));
    return;
  }
  panel.append(h("div", {class:"target-phrase", text:phrase}));
  panel.append(audioControl(phrase, "listenSample"));
  panel.append(h("div", {class:"scene-line", style:"margin-top:14px", text:ui("speakUnavailable")}));
  if (analysisPresent) panel.append(renderTextAnalysisV1(p.explanationV1.phrase));
  if (S.answered) {
    panel.append(h("div", {class:"fb no", role:"status", "aria-live":"polite", "aria-atomic":"true", text:ui("unverified")}));
  } else {
    panel.append(h("button", {class:"btn primary", onClick:() => { S.answered = true; S.ok = null; S.unverified++; render(); }, text:ui("markSpoken")}));
  }
  panel.append(nextRow(S.answered));
}

function renderDone() {
  homeBtn.hidden = false;
  const s = S.session;
  const checkedActions = S.right + S.wrong;
  app.replaceChildren(h("div", {class:"panel"}, [
    h("div", {class:"done-wrap"}, [
      h("div", {class:"done-mark", text:"✓"}),
      h("h2", {text:ui("completed")}),
      h("p", {text:loc(s.titleByLocale) || s.title}),
      h("div", {class:"stats"}, [
        h("div", {class:"stat"}, [h("b", {text:String(S.right)}), h("span", {text:ui("correctActions")})]),
        h("div", {class:"stat"}, [h("b", {text:String(S.wrong)}), h("span", {text:ui("errors")})]),
        h("div", {class:"stat"}, [h("b", {text:String(checkedActions)}), h("span", {text:ui("checkedActions")})]),
        h("div", {class:"stat"}, [h("b", {text:String(S.unverified)}), h("span", {text:ui("unverifiedActions")})]),
      ]),
      h("button", {class:"btn primary", onClick:() => { S.session = null; render(); }, text:ui("lessonsList")}),
    ]),
  ]));
}

function render() {
  try {
    applyUiChrome();
    S.session ? renderSession() : renderHome();
    window.scrollTo({top:0, behavior:"instant"});
  } catch (e) {
    console.error("[mockup] сбой отрисовки:", e);
    app.replaceChildren(h("div", {class:"panel"}, [
      h("h2", {text:ui("renderFailure")}),
      h("div", {class:"body", text:String(e && e.message || e)}),
      h("div", {class:"actions"}, [h("button", {class:"btn ghost", onClick:() => { S.session = null; render(); }, text:ui("home")})]),
    ]));
  }
}
render();
</script>
</body>
</html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });

// зачем: некоторые просмотрщики (встроенная панель предпросмотра) блокируют
// инлайновые <script> и показывают пустую страницу без единой ошибки. Рядом
// кладём вариант с внешними файлами — он открывается там, где инлайн запрещён.
const dir = path.dirname(OUT);
const script = /<script>\n([\s\S]*?)<\/script>/.exec(html)[1];
const data = /<script id="data"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
const externalScript = script.replace(
  'JSON.parse(document.getElementById("data").textContent)', "window.__DATA__");
const external = html
  .replace(/<script id="data"[\s\S]*?<\/script>/, '<script src="data.js"></script>')
  .replace(/<script>\n[\s\S]*?<\/script>/, '<script src="app.js"></script>');
await writeMockupFile(path.join(dir, "app.js"), externalScript);
await writeMockupFile(path.join(dir, "data.js"), `window.__DATA__ = ${data};`);
await writeMockupFile(path.join(dir, "external.html"), external);
await writeMockupFile(OUT, html);
LOG(`записан ${OUT} (${(html.length / 1024).toFixed(0)} КБ)`);
LOG(`записан ${path.join(dir, "external.html")} — вариант с внешними файлами (если инлайн заблокирован)`);
const canonicalMockup = path.resolve(ROOT, "mockup", "index.html");
const nativeManifestBuilder = path.resolve(ROOT, "..", "..", "scripts", "build_learning_v2_factory_native_manifest.mjs");
if (!CANDIDATE_PREVIEW && OUT === canonicalMockup && fs.existsSync(nativeManifestBuilder)) {
  const native = spawnSync(process.execPath, [nativeManifestBuilder], { encoding: "utf8" });
  if (native.status !== 0) {
    WARN(`native manifest не собран: ${(native.stderr || native.stdout || "unknown").trim()}`);
    process.exit(1);
  }
  LOG("native manifest обновлён из того же canonical release");
}
LOG("открой index.html двойным кликом в Chrome или Edge — сервер не нужен");
