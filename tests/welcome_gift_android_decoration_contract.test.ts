import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");

describe("welcome gift Android decoration", () => {
  test("both animated counters hide the native TextInput decoration", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "components/WelcomeGiftModal.tsx"),
      "utf8",
    );
    const counters = source.match(/<AnimatedTextInput[\s\S]*?\/>/g) ?? [];
    const tileAmount = source.match(/  tileAmount: \{[\s\S]*?\n  \},/)?.[0] ?? "";

    expect(counters).toHaveLength(2);
    counters.forEach((counter) => {
      expect(counter).toContain('underlineColorAndroid="transparent"');
    });
    expect(tileAmount).toMatch(/\bpadding:\s*0/);
  });
});
