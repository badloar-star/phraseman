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

});
