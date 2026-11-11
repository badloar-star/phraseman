import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';

const sourcePath = path.join(__dirname, '..', 'app', 'lingman_videos.tsx');

function loadCatalogStatements(): readonly ts.Statement[] {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const file = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.ArrowFunction | undefined;
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'loadCatalog' && node.initializer && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === 'useCallback' && ts.isArrowFunction(node.initializer.arguments[0])) callback = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!callback || !ts.isBlock(callback.body)) throw new Error('LingmanVideosScreen loadCatalog callback was not found');
  return callback.body.statements;
}

describe('Lingman video catalog retry exhaustion', () => {
  it('clears the error retry dependency for every accepted load after guards and sequence allocation', () => {
    const texts = loadCatalogStatements().map((statement) => statement.getText());
    const screenGuard = texts.findIndex((text) => text.startsWith('if (!screenRuntimeActiveRef.current)'));
    const accountScopeGuard = texts.findIndex((text) => text.startsWith('if (tokenScope && renderAccountScope'));
    const sequence = texts.findIndex((text) => text.startsWith('const seq = ++loadSeqRef.current'));
    const reset = texts.findIndex((text) => text === "setIssue('none');");
    const fetchBoundary = texts.findIndex((text) => text.startsWith('try {'));
    expect(screenGuard).toBeGreaterThanOrEqual(0);
    expect(accountScopeGuard).toBeGreaterThan(screenGuard);
    expect(sequence).toBeGreaterThan(accountScopeGuard);
    expect(reset).toBeGreaterThan(sequence);
    expect(reset).toBeLessThan(fetchBoundary);
  });
});
