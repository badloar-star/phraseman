import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const exists = (relativePath: string): boolean =>
  fs.existsSync(path.join(ROOT, relativePath));

describe("Personal Plan restoration contract", () => {
  test("restores the executable Personal Plan route capsule", () => {
    for (const relativePath of [
      "app/personal_plan.tsx",
      "app/personal_plan_setup.tsx",
      "app/personal_plan_exercise.tsx",
      "app/personal_plan_quiz.tsx",
      "app/personal_plan_complete.tsx",
      "app/personal_plan_task_done.tsx",
      "app/personal_plan_state.ts",
      "app/personal_plan_catalog.ts",
      "app/personal_plan_progress.ts",
    ]) {
      expect(exists(relativePath)).toBe(true);
    }
  });

  test("places Route between Lessons and Dialogs only for grandfathered saved plans", () => {
    const lessons = read("app/(tabs)/lessons.tsx");
    const lessonsTab = lessons.indexOf("label={s.tabs.lessons}");
    const routeTab = lessons.search(/ru:\s*["']Маршрут["']/);
    const dialogsTab = lessons.search(/ru:\s*["']Диалоги["']/);

    expect(lessonsTab).toBeGreaterThanOrEqual(0);
    expect(routeTab).toBeGreaterThan(lessonsTab);
    expect(dialogsTab).toBeGreaterThan(routeTab);
    expect(lessons).toMatch(/useFeatureAccess\(['"]personal_plan['"]\)/);
    expect(lessons).toMatch(/readAnyPersonalPlanState\(\)/);
    expect(lessons).toContain("resolvePersonalPlanSunsetAccess");
    expect(lessons).toContain("personalPlanSunsetTabVisible");
    expect(lessons).not.toContain('router.push("/personal_plan_setup" as any)');
  });

  test("registers the production routes and premium feature gate", () => {
    const layout = read("app/_layout.tsx");
    const featureGates = read("app/feature_gates.ts");
    const remoteFlags = read("app/remote_flags.ts");

    for (const route of [
      "personal_plan",
      "personal_plan_quiz",
      "personal_plan_complete",
      "personal_plan_thank_you",
      "personal_plan_task_done",
      "personal_plan_exercise_transition",
      "personal_plan_stats_screen",
      "personal_plan_theory",
    ]) {
      expect(layout).toContain(`name="${route}"`);
    }
    expect(featureGates).toMatch(
      /personal_plan:\s*['"]gate_personal_plan_premium['"]/,
    );
    expect(remoteFlags).toMatch(/gate_personal_plan_premium:\s*true/);
  });

  test("allows production plan deep links while keeping developer routes store-closed", () => {
    const nativeIntent = read("app/+native-intent.tsx");
    expect(nativeIntent).toMatch(
      /IS_STORE_RELEASE[\s\S]{0,180}personal_plan_\(\?:runtime_\)\?dev/,
    );
    expect(nativeIntent).not.toContain("personal_plan(?:_[^/?#]+)?");
  });

  test("activates a queued plan after purchase without replacing onboarding behavior", () => {
    const purchase = read("app/paywall_purchase.ts");
    expect(purchase).toMatch(
      /import[\s\S]{0,160}activatePendingPersonalPlanAfterPremium/,
    );
    expect(purchase).toMatch(
      /context === ['"]personal_plan['"][\s\S]{0,500}activatePendingPersonalPlanAfterPremium\(\)/,
    );
    expect(purchase).toMatch(
      /context === ['"]personal_plan['"] && source !== ['"]onboarding_plan['"][\s\S]{0,500}personalPlanPostPremiumRoute/,
    );
    expect(read("app/personal_plan_post_premium.ts")).toContain(
      "'/lessons_list'",
    );
  });

  test("keeps plan audio remote-first with the five required Gavan local fallbacks", () => {
    const audioModules = read(
      "app/personal_plan_runtime_audio_asset_modules.ts",
    );
    const executableAudioLines = audioModules
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    const audioTargets = [
      ...executableAudioLines.matchAll(
        /require\(['"]\.\.\/(assets\/audio\/personal-plans-runtime\/[^'"]+)['"]\)/g,
      ),
    ].map((match) => match[1]);
    expect(audioTargets).toHaveLength(5);
    expect(
      audioTargets.every((target) =>
        target.includes("/gavan-d001-listen-audio/gavan-d1-phrase-"),
      ),
    ).toBe(true);
    expect(audioTargets.filter((target) => !exists(target))).toEqual([]);

    const easIgnore = read(".easignore").split(/\r?\n/);
    expect(easIgnore).toContain("assets/audio/personal-plans-runtime/*");
    for (const requiredDirectory of [
      "!assets/audio/personal-plans-runtime/gavan",
      "!assets/audio/personal-plans-runtime/gavan/runtime",
      "!assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio",
    ]) {
      expect(easIgnore).toContain(requiredDirectory);
    }
    for (const target of audioTargets) {
      expect(easIgnore).toContain(`!${target}`);
    }

    const remoteMap = read("app/plan_audio_url_map.generated.ts");
    expect(
      (remoteMap.match(/https:\/\/firebasestorage\.googleapis\.com\//g) ?? [])
        .length,
    ).toBe(2_730);
  });

  test("ships every statically required plan image", () => {
    const visuals = read("app/personal_plan_task_visuals.ts");
    const targets = [
      ...visuals.matchAll(/require\(['"]\.\.\/(assets\/images\/[^'"]+)['"]\)/g),
    ].map((match) => match[1]);
    expect(targets.length).toBeGreaterThan(0);
    expect([...new Set(targets)].filter((target) => !exists(target))).toEqual(
      [],
    );
  });

  test("does not reintroduce a standalone debit or a direct shard balance write", () => {
    const planFiles = fs
      .readdirSync(path.join(ROOT, "app"))
      .filter((name) => /^personal_plan.*\.(?:ts|tsx)$/.test(name));
    const sources = planFiles.map((name) => read(`app/${name}`));
    const source = sources.join("\n");

    expect(source).not.toMatch(/FieldValue\.increment\s*\(\s*-/);
    expect(source).not.toMatch(/\b(?:debit|spendShards(?:Idempotent)?)\s*\(/);
    for (const fileSource of sources) {
      expect(fileSource).not.toMatch(
        /(?:set|update|setDoc|updateDoc)\s*\([^)]{0,400}\bshards\s*:/s,
      );
    }
  });

  test("preserves the day-reward API without bypassing the current zero-reward economy policy", () => {
    const reward = read("app/personal_plan_day_reward.ts");
    expect(reward).toContain("awardPlanDayCompletionReward");
    expect(reward).not.toContain("from './shards_system'");
    expect(reward).toMatch(/return \{ awarded: false, shards: 0 \}/);
  });
});
