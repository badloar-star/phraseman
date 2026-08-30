import fs from "fs";
import path from "path";

const showcasePath = path.join(__dirname, "..", "showcase", "index.html");

describe("avatar HTML showcase", () => {
  it("loads the 42 retained hosted showcase pairs", () => {
    expect(fs.existsSync(showcasePath)).toBe(true);
    const source = fs.existsSync(showcasePath)
      ? fs.readFileSync(showcasePath, "utf8")
      : "";

    expect(source).toContain("https://phraseman-ea0b3.web.app/avatars");
    expect(source).toMatch(
      /fetch\(["']\.\.\/constants\/custom_avatars\.ts["']\)/,
    );
    expect(source).toMatch(/avatar\.collection === ["']showcase-v1["']/);
    expect(source).toContain("42 пары аватаров");
    expect(source).toContain("Ожидалось 42 пары");
    expect(source).not.toContain("../avatar-");
    expect(source).not.toContain("62 + entry.number");
  });
});
