#!/usr/bin/env node

/*
 * Гейт «экспорты vs прод» — шаг F плана унификации
 * (docs/merge-reports/CODEX-HANDOFF-UNIFICATION-20260721.md §4).
 *
 * зачем: прод собран частичными деплоями из 4-5 worktree, поэтому в нём живут
 * функции, исходников которых в текущем дереве НЕТ. Полный
 * `firebase deploy --only functions` предложит удалить каждую такую функцию —
 * то есть снести живой прод. Этот гейт падает раньше, чем CLI дойдёт до удаления.
 *
 * Требование плана: ноль живых функций без исходников, кроме осознанно удалённых.
 *
 * Использование:
 *   node scripts/functions_source_coverage_gate.mjs              # живой список из прода
 *   node scripts/functions_source_coverage_gate.mjs --offline    # только кэш, без сети
 *   node scripts/functions_source_coverage_gate.mjs --refresh    # обновить кэш из прода
 *   node scripts/functions_source_coverage_gate.mjs --json       # машинный вывод
 *
 * Код возврата: 0 — сирот нет (деплой безопасен), 1 — найдены сироты, 2 — гейт не смог проверить.
 */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ID = "phraseman-ea0b3";

// Сборка основного codebase. main из functions/package.json — lib/functions/src/index.js.
const BUILT_INDEX = resolve(REPO_ROOT, "functions/lib/functions/src/index.js");
// Второй codebase (firebase.json → codebase "english-test"), собирать не нужно — plain JS.
const ENGLISH_TEST_INDEX = resolve(
  REPO_ROOT,
  "functions-english-test/index.js",
);
/*
 * Третий codebase (firebase.json → codebase "max"): боевые функции MAX
 * переехали туда 2026-08-23, чтобы старт не грузил все 240 функций основного
 * бандла (370 МБ → 78 МБ, 2.2 с → 0.44 с).
 *
 * зачем сторожу про него знать: без этого он считает 12 функций MAX
 * «потерянными» и ругается на КАЖДОМ запуске. Сторож, который кричит всегда,
 * перестают читать — и он пропустит настоящую пропажу.
 *
 * rootDir ".." в его tsconfig (нужен, чтобы компилировать общие исходники без
 * дублирования) кладёт сборку в lib/functions-max/index.js.
 */
const MAX_INDEX = resolve(REPO_ROOT, "functions-max/lib/functions-max/index.js");
/* Четвёртый codebase "content": контент-фабрика Learning V2 (2026-08-23).
   Тянула в память авторские сессии курса — 236 МБ из 380 МБ основного бандла. */
const CONTENT_INDEX = resolve(REPO_ROOT, "functions-content/lib/functions-content/index.js");
const LIVE_CACHE = resolve(REPO_ROOT, ".codex-tmp/live-functions-list.json");

/*
 * Осознанно удалённая функциональность — решение владельца, п.3.2 плана.
 * Эти функции ещё живут в проде, но исходники восстанавливать НЕ нужно:
 * старые клиенты доживают, новые их не зовут. Список фиксируется здесь,
 * чтобы «осознанно удалено» никогда не путалось с «потеряли исходники».
 */
const INTENTIONALLY_REMOVED = new Set([
  // leagueChat — удалён коммитом e6351db4e, чаты не восстанавливать
  "leagueChatAuthorizeRoom",
  "leagueChatDeleteMessage",
  "leagueChatReportMessage",
  "leagueChatSendMessage",
]);

/*
 * Функции без исходников, которые владелец решил НЕ восстанавливать (2026-07-25).
 * Гейт считает их отдельно и деплой из-за них не блокирует — но любое НОВОЕ имя,
 * не попавшее в этот список, гейт всё так же остановит. Поэтому список точный,
 * а не по префиксам: иначе будущая настоящая потеря проскочит незамеченной.
 *
 * зачем: эти функции написаны в ветке admin-language-factory (отколовшейся
 * 2026-07-10) и выложены на прод частичным деплоем — в основной линии их не было
 * НИКОГДА, это не потеря, а незавершённое слияние. Интерфейса к ним нет нигде:
 * проверено по единственной живой админке (admin/v2/legacy.html), и по
 * новой admin/v2 — 2 из 94. Звать их некому.
 *
 * Владелец возвращается на СТАРУЮ админку, новая будет удалена, поэтому шаг D
 * плана унификации (порт фич в новую админку) отменён целиком.
 *
 * Исключение — adminPreviewVoiceResearchMutation / adminApplyVoiceResearchMutation:
 * их зовёт раздел «Опросы за осколки» в старой админке. Владелец решил старую
 * админку не трогать, раздел остаётся нерабочим осознанно.
 *
 * Карта источников (если раздел понадобится) —
 * docs/merge-reports/ORPHANED_FUNCTIONS_RECOVERY_MAP.md.
 */
const ACCEPTED_UNMERGED = new Set([
  "adminApplyAlertsConfig",
  "adminApplyCommunityMutation",
  "adminApplyCompassChange",
  "adminApplyContentMutation",
  "adminApplyLegacyPlusMigration",
  "adminApplyManualAccess",
  "adminApplyMoneyMutation",
  "adminApplySafetyModerationMutation",
  "adminApplyVipSurveyCampaign",
  "adminApplyVoiceResearchMutation",
  "adminApproveCommunityMutation",
  "adminApproveCompassChange",
  "adminApproveContentMutation",
  "adminApproveEmailCampaign",
  "adminApproveMoneyMutation",
  "adminApprovePushCampaign",
  "adminApproveSafetyModerationMutation",
  "adminCancelEmailCampaign",
  "adminCancelPushJob",
  "adminCreateEmailCampaign",
  "adminCreatePushJob",
  "adminEmailCampaignCreated",
  "adminEmailCampaignsCron",
  "adminExportAppHealth",
  "adminExportCacheEntries",
  "adminExportEmailContacts",
  "adminGenerateProductBrief",
  "adminGetAlertsWorkspace",
  "adminGetAppHealthDetail",
  "adminGetCommunityOperationDetail",
  "adminGetCommunityOperationsWorkspace",
  "adminGetCompassWorkspace",
  "adminGetContentOperationDetail",
  "adminGetContentOperationsWorkspace",
  "adminGetDiagnosticsArchiveDetail",
  "adminGetLandingExperimentReport",
  "adminGetMoneyOperationDetail",
  "adminGetMoneyOperationsWorkspace",
  "adminGetPlusControlWorkspace",
  "adminGetSafetyModerationSensitiveDetail",
  "adminGetSafetyModerationWorkspace",
  "adminGetVipSurveyWorkspace",
  "adminGetVoiceResearchWorkspace",
  "adminListAppActivity",
  "adminListAppHealth",
  "adminListBetaTesters",
  "adminListCacheEntries",
  "adminListDiagnosticsArchive",
  "adminListEmailCampaigns",
  "adminListEmailContacts",
  "adminListPushJobs",
  "adminListSafetyModerationApprovals",
  "adminListSafetyModerationHistory",
  "adminListVipSurveyResponses",
  "adminMutateProductItem",
  "adminPreviewAlertTest",
  "adminPreviewAlertsConfig",
  "adminPreviewCacheReset",
  "adminPreviewCommunityMutation",
  "adminPreviewCompassChange",
  "adminPreviewContentMutation",
  "adminPreviewEmailCampaign",
  "adminPreviewLegacyPlusMigration",
  "adminPreviewManualAccess",
  "adminPreviewMoneyMutation",
  "adminPreviewPushAudience",
  "adminPreviewSafetyModerationMutation",
  "adminPreviewVipSurveyCampaign",
  "adminPreviewVoiceResearchMutation",
  "adminPublishContentPack",
  "adminQueueAlertTest",
  "adminRequestCommunityApproval",
  "adminRequestCompassApproval",
  "adminRequestContentApproval",
  "adminRequestEmailCampaignApproval",
  "adminRequestMoneyApproval",
  "adminRequestPushApproval",
  "adminRequestSafetyModerationApproval",
  "adminResetCacheEntry",
  "adminResumeCommunityBulk",
  "adminResumeSafetyModerationBulk",
  "adminRollbackContentPack",
  "adminUpdateBetaTester",
  "adminWebsiteInboxList",
  "adminWebsiteInboxMarkRead",
  "adminYoutubeAnalytics",
  "agentManagerRecommendCriticalDigest",
  "agentOfficeTelegramPublishRecommendation",
  "getActiveLanguageCatalog",
  "getPublishedCourseRelease",
  "getPublishedCourseSurfaceBundle",
  "getPublishedCourseSurfaceEntry",
  "getPublishedLessonArtifact",
  "supportReplyDispatchSweeperCron",
]);

const args = new Set(process.argv.slice(2));
const OFFLINE = args.has("--offline");
const REFRESH = args.has("--refresh");
const AS_JSON = args.has("--json");

function fail(message) {
  console.error(`\n[functions-gate] ГЕЙТ НЕ СМОГ ПРОВЕРИТЬ: ${message}`);
  console.error(
    "[functions-gate] Полный деплой функций ЗАПРЕЩЁН, пока проверка не прошла.\n",
  );
  process.exit(2);
}

/** Имена, которые реально экспортирует собранный основной codebase. */
function readBuiltExports() {
  if (!existsSync(BUILT_INDEX)) {
    fail(`нет сборки ${BUILT_INDEX}. Сначала: cd functions && npm run build`);
  }
  try {
    // require, а не парсинг текста: index.js собирает экспорты через
    // Object.defineProperty и спред tombstone-объектов — регуляркой это не поймать.
    return Object.keys(require(BUILT_INDEX));
  } catch (error) {
    fail(
      `сборка не загружается (${error.message}). Пересоберите: cd functions && npm run build`,
    );
  }
  return [];
}

/** Второй codebase — plain JS, читаем exports.X текстом, сборки у него нет. */
/** Codebase "max": собранный index (tsc), читаем реальные экспорты. */
function readCodebaseExports(indexPath, label, buildHint) {
  if (!existsSync(indexPath)) {
    console.warn(
      `[gate] нет сборки ${indexPath} — функции ${label} будут считаться непокрытыми.
` +
      `       Собрать: ${buildHint}`,
    );
    return [];
  }
  try {
    return Object.keys(require(indexPath));
  } catch (error) {
    console.warn(`[gate] не читается ${indexPath}: ${error.message}`);
    return [];
  }
}

function readMaxCodebaseExports() {
  if (!existsSync(MAX_INDEX)) {
    console.warn(
      `[gate] нет сборки ${MAX_INDEX} — функции MAX будут считаться непокрытыми.
` +
      `       Собрать: npm --prefix functions-max run build`,
    );
    return [];
  }
  try {
    return Object.keys(require(MAX_INDEX));
  } catch (error) {
    console.warn(`[gate] не читается ${MAX_INDEX}: ${error.message}`);
    return [];
  }
}

function readEnglishTestExports() {
  if (!existsSync(ENGLISH_TEST_INDEX)) return [];
  const source = readFileSync(ENGLISH_TEST_INDEX, "utf8");
  return [...source.matchAll(/^exports\.([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
}

/** Список живых функций прода: из сети или из кэша. */
function readLiveFunctions() {
  if (!OFFLINE) {
    try {
      const raw = execFileSync(
        "firebase",
        ["functions:list", "--project", PROJECT_ID, "--json"],
        {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          timeout: 180_000,
          shell: true,
        },
      );
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.result))
        throw new Error("неожиданный формат ответа firebase");
      mkdirSync(dirname(LIVE_CACHE), { recursive: true });
      writeFileSync(LIVE_CACHE, raw, "utf8");
      return {
        names: parsed.result.map((f) => f.id),
        source: "прод (live)",
        stamp: new Date().toISOString(),
      };
    } catch (error) {
      if (REFRESH)
        fail(`не удалось получить список из прода: ${error.message}`);
      console.warn(
        `[functions-gate] прод недоступен (${error.message.split("\n")[0]}), падаю на кэш`,
      );
    }
  }

  // Кэш: свой свежий, иначе снимок, оставшийся от прошлых сессий.
  const fallback = resolve(REPO_ROOT, ".codex-tmp/admin2-functions-list.json");
  const cachePath = existsSync(LIVE_CACHE) ? LIVE_CACHE : fallback;
  if (!existsSync(cachePath)) {
    fail("нет ни доступа к проду, ни кэша списка функций");
  }
  try {
    // BOM: снимок от firebase CLI под Windows приходит с ﻿.
    const parsed = JSON.parse(
      readFileSync(cachePath, "utf8").replace(/^﻿/, ""),
    );
    const stamp = existsSync(cachePath)
      ? new Date(require("node:fs").statSync(cachePath).mtime).toISOString()
      : "неизвестно";
    return {
      names: parsed.result.map((f) => f.id),
      source: `кэш ${cachePath}`,
      stamp,
    };
  } catch (error) {
    fail(`кэш нечитаем (${error.message})`);
  }
  return { names: [], source: "", stamp: "" };
}

const builtNames = readBuiltExports();
const englishTestNames = readEnglishTestExports();
const maxNames = readMaxCodebaseExports();
const contentNames = readCodebaseExports(
  CONTENT_INDEX,
  "content",
  "npm --prefix functions-content run build",
);
const covered = new Set([...builtNames, ...englishTestNames, ...maxNames, ...contentNames]);
const live = readLiveFunctions();

const allMissing = live.names.filter((name) => !covered.has(name));
const intentional = allMissing.filter((name) =>
  INTENTIONALLY_REMOVED.has(name),
);
const accepted = allMissing.filter(
  (name) => !INTENTIONALLY_REMOVED.has(name) && ACCEPTED_UNMERGED.has(name),
);
// зачем: блокируем деплой только на НЕОЖИДАННЫХ пропажах. Всё, что владелец уже
// разобрал (удалено намеренно / принято как несведённое), учитывается отдельно.
const orphans = allMissing.filter(
  (name) => !INTENTIONALLY_REMOVED.has(name) && !ACCEPTED_UNMERGED.has(name),
);

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        liveCount: live.names.length,
        coveredCount: covered.size,
        orphanCount: orphans.length,
        orphans,
        intentionallyRemoved: intentional,
        source: live.source,
      },
      null,
      2,
    ),
  );
  process.exit(orphans.length === 0 ? 0 : 1);
}

console.log("\n=== Гейт «экспорты vs прод» ===");
console.log(`Источник списка живых функций: ${live.source}`);
console.log(`Живых функций в проде:          ${live.names.length}`);
console.log(
  `Покрыто исходниками:            ${covered.size} (основной codebase ${builtNames.length} + english-test ${englishTestNames.length} + max ${maxNames.length} + content ${contentNames.length})`,
);
console.log(`Осознанно удалено (чаты):       ${intentional.length}`);
console.log(
  `Принято как несведённое:        ${accepted.length} (решение владельца 2026-07-25)`,
);
console.log(`НЕОЖИДАННЫХ сирот:              ${orphans.length}`);

if (orphans.length === 0) {
  console.log("\n✅ Неожиданных пропаж нет. Полный деплой функций безопасен.");
  console.log(
    `   ⚠️  ${accepted.length} несведённых функций останутся на проде как есть.\n`,
  );
  process.exit(0);
}

console.log("\n🔴 НАЙДЕНЫ ЖИВЫЕ ФУНКЦИИ БЕЗ ИСХОДНИКОВ:\n");
for (const name of orphans) console.log(`   ${name}`);

console.log(`
Что это значит: \`firebase deploy --only functions\` предложит УДАЛИТЬ эти
${orphans.length} функций из прода, потому что в дереве нет их кода.

Что делать:
  1. Восстановить исходники из снапшот-веток (см. шаг D плана унификации):
     git grep -l "<имя функции>" prod-snapshot/all-development-integration-20260721 -- functions
  2. До этого деплоить ТОЛЬКО явными списками:
     firebase deploy --only functions:имя1,functions:имя2
`);
process.exit(1);
