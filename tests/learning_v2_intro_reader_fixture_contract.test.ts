import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "..", "app", "learning-v2", "intro-reader-fixture.tsx"),
  "utf8",
);

test("Reader A device fixture is deterministic, theme-selectable and dev-only", () => {
  expect(source).toContain("!DEV_MODE && !ENABLE_DEV_TOOLS");
  expect(source).toContain("isSelectableThemeMode(params.theme)");
  expect(source).toContain("setPreviewThemeMode(requestedTheme)");
  expect(source).toContain('testID="learning-v2-intro-fixture"');
  expect(source).toContain("choiceIndex === 2");
  expect(source).toContain('semantic: "targetCorrect"');
  expect(source).toContain('semantic: "targetWrong"');
  expect(source).not.toMatch(/fetch\(|httpsCallable|AsyncStorage|firebase/u);
});
