import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function styleBlock(source: string, name: string): string {
  const start = source.indexOf(`  ${name}: {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("\n  },", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function animatedStyleBlock(source: string, name: string): string {
  const start = source.indexOf(`const ${name} = useAnimatedStyle`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("\n  const ", start + 1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("motion hybrid overlay integrity", () => {
  test("action toast gives its transformed wrapper an explicit bounded width", () => {
    const source = read("components/ActionToast.tsx");
    expect(source).toContain(
      "<Reanimated.View style={[styles.toastMotion, cardStyle]}>",
    );
    expect(styleBlock(source, "toastMotion")).toContain("width: '100%'");
    expect(styleBlock(source, "toastMotion")).toContain("maxWidth: 560");
  });

  test("achievement toast keeps viewport geometry off its transformed node", () => {
    const source = read("components/AchievementToast.tsx");
    const anchor = styleBlock(source, "containerAnchor");
    const motion = styleBlock(source, "containerMotion");

    expect(source).toContain("s.containerAnchor");
    expect(source).toContain("s.containerMotion");
    expect(anchor).toMatch(/position:\s*'absolute'/);
    expect(anchor).toMatch(/left:\s*14/);
    expect(anchor).toMatch(/right:\s*14/);
    expect(anchor).not.toMatch(/\b(?:opacity|transform):/);
    expect(motion).not.toMatch(/\b(?:position|left|right|bottom):/);
  });

  test("offline hybrid banner keeps viewport geometry off its transformed node", () => {
    const source = read("components/OfflineBanner.tsx");
    const anchor = styleBlock(source, "hybridAnchor");
    const motion = styleBlock(source, "hybridMotion");

    expect(source).toContain("styles.hybridAnchor");
    expect(source).toContain("styles.hybridMotion");
    expect(anchor).toMatch(/position:\s*'absolute'/);
    expect(anchor).toMatch(/left:\s*12/);
    expect(anchor).toMatch(/right:\s*12/);
    expect(anchor).not.toMatch(/\b(?:opacity|transform):/);
    expect(motion).not.toMatch(/\b(?:position|left|right|top):/);
  });

  test("toast entrance uses the sub-300ms shared toast token", () => {
    const tokens = read("constants/motionHybrid.ts");
    const actionToast = read("components/ActionToast.tsx");

    expect(tokens).toMatch(/TOAST\s*=\s*\{[\s\S]*?enterMs:\s*LUM\.contentMs/);
    expect(actionToast).toContain("duration: TOAST.enterMs");
  });

  test.each([
    "components/AchievementToast.tsx",
    "components/OfflineBanner.tsx",
    "components/PromoBanner.tsx",
    "components/SaveProgressBanner.tsx",
    "components/RankChangeBanner.tsx",
    "components/CoachToast.tsx",
    "components/InGameToast.tsx",
    "components/MedalToast.tsx",
  ])("%s uses toast timing instead of modal resolve timing", (file) => {
    const source = read(file);
    expect(source).toContain("TOAST.enterMs");
    expect(source).not.toMatch(/duration:\s*LUM\.resolveMs/);
    expect(source).not.toMatch(/withDelay\(LUM\.resolveMs(?:\s*[+*])/);
  });

  test("onboarding welcome hero collapses to its final frame under Reduce Motion", () => {
    const source = read("components/OnboardingWelcomeSheet.tsx");
    expect(source).toContain("useReduceMotion");
    expect(source).toMatch(
      /function HybridHero[\s\S]*?const reduceMotion = useReduceMotion\(\)/,
    );
    expect(source).toMatch(
      /if \(reduceMotion\) \{[\s\S]{0,180}?opacity\.value = 1;[\s\S]{0,120}?y\.value = 0;/,
    );
  });

  test.each([
    "components/modal_fx/HybridAlertShell.tsx",
    "components/arena/ArenaModeSheet.tsx",
    "components/arena/ArenaRankHybrid.tsx",
    "components/LevelSpinRewardModal.tsx",
    "components/RewardModalBackdrop.tsx",
    "app/LeagueResultModal.tsx",
  ])("%s does not accelerate hybrid exits with ease-in", (file) => {
    expect(read(file)).not.toMatch(/\bR?Easing\.in\(/);
  });

  test("league result hybrid animates only composite properties", () => {
    const source = read("components/league/LeagueResultHybrid.tsx");
    const medallion = animatedStyleBlock(source, "medallionStyle");
    const trail = animatedStyleBlock(source, "trailStyle");
    const progress = animatedStyleBlock(source, "progressBarStyle");

    expect(medallion).not.toMatch(/\btop:/);
    expect(trail).not.toMatch(/\b(?:top|height):/);
    expect(progress).not.toMatch(/\bwidth:/);
    expect(medallion).toContain("translateY");
    expect(trail).toContain("scaleY");
    expect(progress).toContain("scaleX");
  });
});
