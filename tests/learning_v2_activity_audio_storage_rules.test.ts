import fs from "node:fs";
import path from "node:path";

const rules = fs.readFileSync(
  path.join(process.cwd(), "storage.rules"),
  "utf8",
);

describe("Learning V2 voice-audio Storage boundary", () => {
  it("allows only authenticated exact-object reads and denies list/write", () => {
    const match = rules.match(
      /match \/learning-v2\/voice-audio\/\{allPaths=\*\*\} \{([\s\S]*?)\n\s*\}/u,
    );
    expect(match?.[1]).toContain("allow get: if request.auth != null;");
    expect(match?.[1]).toContain("allow list: if false;");
    expect(match?.[1]).toContain("allow write: if false;");
    expect(match?.[1]).not.toContain("allow read:");
    expect(match?.[1]).not.toContain("if true");
  });

  it("keeps the default deny after the exact Learning V2 rule", () => {
    const exactIndex = rules.indexOf("match /learning-v2/voice-audio/");
    const denyIndex = rules.lastIndexOf("match /{allPaths=**}");
    expect(exactIndex).toBeGreaterThan(0);
    expect(denyIndex).toBeGreaterThan(exactIndex);
    expect(rules.slice(denyIndex)).toContain("allow read, write: if false;");
  });
});
