import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const exists = (relativePath: string): boolean =>
  fs.existsSync(path.join(ROOT, relativePath));
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const OLD_DAILY_MODULE = ["daily", "tasks"].join("_");
const OLD_DAILY_ROUTE = `/${OLD_DAILY_MODULE}_screen`;
const OLD_SHARD_CALLABLE = ["dailyTasks", "AllShardsClaim"].join("");
const OLD_ADMIN_HANDLER = ["reset", "DailyTasks"].join("");

const RETIRED_OWNED_FILES = [
  `app/${OLD_DAILY_MODULE}.ts`,
  `app/${OLD_DAILY_MODULE}_es_locale.ts`,
  `app/${OLD_DAILY_MODULE}_screen.tsx`,
  `app/${OLD_DAILY_MODULE}_screen_cache.ts`,
  `app/${OLD_DAILY_MODULE}_screen_persist.ts`,
  "app/daily_task_navigation.ts",
  "app/daily_task_lesson_destination.ts",
  "app/daily_task_progress_ui.ts",
  "app/daily_task_background_art.ts",
  "app/daily_task_achievement_icons.ts",
  "components/DailyTaskRewardToast.tsx",
  "components/DailyTasksFirstVisitModal.tsx",
  `functions/src/${OLD_DAILY_MODULE}_shards.ts`,
] as const;

function collectSourceFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  return fs
    .readdirSync(absoluteRoot, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(absoluteRoot, entry.name);
      if (entry.isDirectory())
        return collectSourceFiles(path.relative(ROOT, child));
      return /\.[cm]?[jt]sx?$/.test(entry.name) ? [child] : [];
    });
}

describe("retired Daily Tasks full-removal boundary", () => {
  test("old user-facing product, route, trackers and dedicated reward callable cannot return", () => {
    for (const relativePath of RETIRED_OWNED_FILES) {
      expect(exists(relativePath)).toBe(false);
    }
    expect(collectSourceFiles("components/daily-tasks")).toEqual([]);

    const runtimeSources = ["app", "components"]
      .flatMap(collectSourceFiles)
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");
    const retiredImport = new RegExp(
      `(?:from\\s*|import\\s*\\()(['\"])\\.?\\.?/[^'\"]*${OLD_DAILY_MODULE}\\1`,
    );
    expect(runtimeSources).not.toMatch(retiredImport);
    expect(runtimeSources).not.toContain(OLD_DAILY_ROUTE);

    const functionsIndex = read("functions/src/index.ts");
    const functionsPackage = read("functions/package.json");
    const expoConfig = read("app.json");
    expect(functionsIndex).not.toContain(OLD_SHARD_CALLABLE);
    expect(functionsIndex).not.toContain(`./${OLD_DAILY_MODULE}_shards`);
    expect(functionsPackage).not.toContain(OLD_SHARD_CALLABLE);
    expect(expoConfig).not.toContain("assets/images/daily_task");
  });

  test("live Home and admin surfaces expose no old entry or reset operation", () => {
    const home = read("app/(tabs)/home.tsx");
    const achievementsScreen = read("app/achievements_screen.tsx");
    expect(home).not.toContain(OLD_DAILY_ROUTE);
    expect(home).not.toContain("home-activity-daily");
    expect(achievementsScreen).toContain("return !a.retired;");

    const admin = read("admin/v2/legacy.html");
    expect(admin).not.toContain(OLD_ADMIN_HANDLER);
    expect(admin).not.toMatch(/reset\s*:\s*['"]daily_tasks['"]/);
    expect(admin).not.toMatch(/data-action\s*=\s*['"]daily-reset['"]/);
  });

  test("Personal Plans remain a live product until Learning V2 replaces them", () => {
    for (const relativePath of [
      "app/personal_plan.tsx",
      "app/personal_plan_state.ts",
      "app/personal_plan_catalog.ts",
      "app/personal_plan_exercise.tsx",
    ]) {
      expect(exists(relativePath)).toBe(true);
    }
    const layout = read("app/_layout.tsx");
    expect(layout).toContain('name="personal_plan"');
    expect(layout).toContain('name="personal_plan_complete"');
  });

  test("Daily Phrase, surveys and boons stay independently reachable and rewarded", () => {
    const home = read("app/(tabs)/home.tsx");
    const layout = read("app/_layout.tsx");
    const functionsIndex = read("functions/src/index.ts");
    const surveyCard = read("components/SurveyTaskCard.tsx");

    expect(exists("components/DailyPhraseCard.tsx")).toBe(true);
    expect(home).toContain("DailyPhraseCard");
    expect(functionsIndex).toContain("dailyPhraseSetSaved");

    expect(exists("app/survey_screen.tsx")).toBe(true);
    expect(exists("components/SurveyTaskCard.tsx")).toBe(true);
    expect(layout).toContain('name="survey_screen"');
    expect(functionsIndex).toContain("submitShardSurvey");
    expect(functionsIndex).toContain("getActiveShardSurvey");
    expect(surveyCard).not.toContain("daily-tasks/DailyTaskCard");

    expect(exists("app/boons/boon_engine.ts")).toBe(true);
    expect(layout).toContain("<ComebackBoonHost />");
    expect(layout).toContain("<BoonActivatedHost />");
  });

  test("future Compass and its evidence pipeline survive the retirement", () => {
    for (const relativePath of [
      "app/weekly_review_briefing.ts",
      "app/weekly_review_snapshot.ts",
      "app/weekly_review_types.ts",
    ]) {
      expect(exists(relativePath)).toBe(true);
    }
    const overlays = read("components/overlay_arbiter_core.ts");
    expect(overlays).toContain("'compassBriefing'");
  });
});
