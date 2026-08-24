import fs from "fs";
import path from "path";
import ts from "typescript";

const ROOT = path.join(__dirname, "..");

function walkTsx(relativeDir: string, out: string[] = []): string[] {
  const absoluteDir = path.join(ROOT, relativeDir);
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) walkTsx(relativePath, out);
    else if (entry.name.endsWith(".tsx")) out.push(relativePath);
  }
  return out;
}

function attributeNames(element: ts.JsxOpeningElement): Set<string> {
  return new Set(
    element.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => attribute.name.getText()),
  );
}

describe("hybrid button layout contract", () => {
  test("direct text buttons style the animated content layer explicitly", () => {
    const offenders: string[] = [];

    for (const relativePath of [...walkTsx("app"), ...walkTsx("components")]) {
      const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
      const file = ts.createSourceFile(
        relativePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      const visit = (node: ts.Node): void => {
        if (
          ts.isJsxElement(node) &&
          node.openingElement.tagName.getText(file) === "PressableHybrid"
        ) {
          const directElementNames = node.children
            .filter(ts.isJsxElement)
            .map((child) => child.openingElement.tagName.getText(file));
          const hasDirectText = directElementNames.some(
            (name) => name === "Text" || name === "FlowText",
          );
          const attributes = attributeNames(node.openingElement);

          if (hasDirectText && !attributes.has("contentStyle")) {
            const { line } = file.getLineAndCharacterOfPosition(
              node.getStart(file),
            );
            offenders.push(`${relativePath}:${line + 1}`);
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(file);
    }

    expect(offenders).toEqual([]);
  });

  test("Season Pass claim actions share width, face height, and edge reservation", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "components/SeasonRewardInfoModal.tsx"),
      "utf8",
    );
    const later =
      source.match(
        /<PressableHybrid[\s\S]*?testID="season-reward-info-later"[\s\S]*?>/,
      )?.[0] ?? "";
    const claim =
      source.match(
        /<DuoPressable[\s\S]*?testID="season-reward-info-claim"[\s\S]*?>/,
      )?.[0] ?? "";

    expect(source).toContain("PRESS.edgeHeight.compact");
    expect(later).toMatch(
      /style=\{\{\s*flex:\s*1,\s*paddingBottom:\s*PRESS\.edgeHeight\.compact/,
    );
    expect(later).toMatch(
      /contentStyle=\{\{[\s\S]*?minHeight:\s*ds\.buttonHeight/,
    );
    expect(later).toMatch(/contentStyle=\{\{[\s\S]*?alignItems:\s*'center'/);
    expect(later).toMatch(
      /contentStyle=\{\{[\s\S]*?justifyContent:\s*'center'/,
    );

    expect(claim).toContain("wrapStyle={{ flex: 1 }}");
    expect(claim).toContain("edgeHeight={PRESS.edgeHeight.compact}");
    expect(claim).toMatch(/style=\{\{[\s\S]*?minHeight:\s*ds\.buttonHeight/);
    expect(claim).not.toMatch(/style=\{\{[\s\S]*?\bflex:\s*1/);
  });

  test("flashcard completion actions reserve the same keycap edge depth", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/flashcards_swipe.tsx"),
      "utf8",
    );
    const start = source.indexOf("<View style={[styles.doneButtons");
    const end = source.indexOf("</View>", start);
    const actions = source.slice(start, end);

    expect(actions).toContain("edgeHeight={PRESS.edgeHeight.default}");
    expect(actions).toContain("paddingBottom: PRESS.edgeHeight.default");
  });
});
