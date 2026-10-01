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
    "components/OfflineBanner.tsx",
    "components/PromoBanner.tsx",
    "components/RankChangeBanner.tsx",
    "components/InGameToast.tsx",
    "components/MedalToast.tsx",
  ])("%s uses toast timing instead of modal resolve timing", (file) => {
    const source = read(file);
    expect(source).toContain("TOAST.enterMs");
    expect(source).not.toMatch(/duration:\s*LUM\.resolveMs/);
    expect(source).not.toMatch(/withDelay\(LUM\.resolveMs(?:\s*[+*])/);
  });

  // зачем (PM-049, D09/S51 владельца, 2026-09-24): WelcomeGiftModal удалена
  // целиком — приветственная модалка не должна прерывать первый вход.
  // Reduce Motion этой церемонии сторожить больше нечего.

  test.each([
    "components/modal_fx/HybridAlertShell.tsx",
    "components/RewardModalBackdrop.tsx",
  ])("%s does not accelerate hybrid exits with ease-in", (file) => {
    expect(read(file)).not.toMatch(/\bR?Easing\.in\(/);
  });

});
