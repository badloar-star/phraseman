import ts from 'typescript';

function englishThenBranch(node: ts.Node): ts.IfStatement | null {
  for (let current: ts.Node | undefined = node; current?.parent; current = current.parent) {
    const parent: ts.Node = current.parent;
    if (!ts.isIfStatement(parent) || current !== parent.thenStatement) continue;
    const condition = parent.expression;
    if (ts.isBinaryExpression(condition)
      && condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
      && ts.isIdentifier(condition.left)
      && condition.left.text === 'dialogueTarget'
      && ts.isStringLiteral(condition.right)
      && condition.right.text === 'en') return parent;
  }
  return null;
}

type VoiceFunction = ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration | ts.MethodDeclaration;

function containingFunction(node: ts.Node): VoiceFunction | null {
  for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)
      || ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)) return current;
  }
  return null;
}

/** Reject any English locale literal reachable outside an explicit English-only branch. */
export function assertDialogueEnglishVoiceFallbackGuarded(source: string, file: string): void {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fallbackCount = 0;
  let fallbackFunction: VoiceFunction | null = null;
  let fallbackBranch: ts.IfStatement | null = null;

  function visit(node: ts.Node): void {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text === 'en-US') {
      fallbackCount += 1;
      const branch = englishThenBranch(node);
      if (!branch) {
        throw new Error(`${file} has en-US outside the guarded English playback path`);
      }
      fallbackFunction = containingFunction(node);
      fallbackBranch = branch;
    }
    ts.forEachChild(node, visit);
  }

  visit(tree);
  const body = fallbackFunction?.body ?? null;
  const branch = fallbackBranch as ts.IfStatement | null;
  const statements = body && ts.isBlock(body) ? body.statements : null;
  const branchIndex = statements && branch ? statements.indexOf(branch) : -1;
  const next = statements && branchIndex >= 0 ? statements[branchIndex + 1] : null;
  const strictCall = next && ts.isReturnStatement(next) ? next.expression : null;
  if (fallbackCount !== 1 || !branch || branch.elseStatement || !statements
    || !strictCall || !ts.isCallExpression(strictCall)
    || !ts.isPropertyAccessExpression(strictCall.expression)
    || !ts.isIdentifier(strictCall.expression.expression)
    || strictCall.expression.expression.text !== 'strictDialogueVoice'
    || strictCall.expression.name.text !== 'speakDialogue'
    || strictCall.arguments.length !== 1
    || !ts.isIdentifier(strictCall.arguments[0])
    || strictCall.arguments[0].text !== 'text') {
    throw new Error(`${file} is missing exactly one guarded English fallback or strict non-English playback`);
  }
}
