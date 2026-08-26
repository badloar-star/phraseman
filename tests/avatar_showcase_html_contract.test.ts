import fs from "fs";
import path from "path";

const showcasePath = path.join(__dirname, "..", "showcase", "index.html");

describe("avatar HTML showcase", () => {
  it("loads the hosted 63-pair collection plus one showcase-only Absolute pair", () => {
    expect(fs.existsSync(showcasePath)).toBe(true);
    const source = fs.existsSync(showcasePath)
      ? fs.readFileSync(showcasePath, "utf8")
      : "";

    expect(source).toContain("https://phraseman-ea0b3.web.app/avatars");
    expect(source).toMatch(
      /fetch\(["']\.\.\/constants\/custom_avatars\.ts["']\)/,
    );
    expect(source).toMatch(/avatar\.collection === ["']showcase-v1["']/);
    expect(source).toContain("assetId: 126");
    expect(source).toContain("price: 3000");
    expect(source).toContain("../admin/v2/avatars/custom-idea-126");
    expect(source).toContain("64 пары аватаров");
    expect(source).not.toContain("../avatar-");
    expect(source).not.toContain("62 + entry.number");
  });
});
