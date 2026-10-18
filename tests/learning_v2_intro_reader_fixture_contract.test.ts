import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "..", "app", "learning-v2", "intro-reader-fixture.tsx"),
  "utf8",
);

test("Reader A device fixture is deterministic, theme-selectable and dev-only", () => {
  // зачем (разбор красных 18.10, Ревизор 3.81; решение владельца 25.08 в самом экране): `!DEV_MODE && …` было мёртвым кодом (DEV_MODE всегда true) и пропускало фикстуру в стор по диплинку;
  // гейт — только ENABLE_DEV_TOOLS (гасится IS_STORE_RELEASE) с Redirect на главную. Контракт сторожит именно этот гейт, старую форму не возвращать.
  expect(source).toContain('if (!ENABLE_DEV_TOOLS) return <Redirect href="/" />;');
  expect(source).not.toContain("if (!DEV_MODE && !ENABLE_DEV_TOOLS)"); // комментарий в экране упоминает старую форму — проверяем условие, а не слова
  expect(source).toContain("isSelectableThemeMode(params.theme)");
  expect(source).toContain("setPreviewThemeMode(requestedTheme)");
  expect(source).toContain('testID="learning-v2-intro-fixture"');
  expect(source).toContain("choiceIndex === 2");
  expect(source).toContain('semantic: "targetCorrect"');
  expect(source).toContain('semantic: "targetWrong"');
  expect(source).not.toMatch(/fetch\(|httpsCallable|AsyncStorage|firebase/u);
});
