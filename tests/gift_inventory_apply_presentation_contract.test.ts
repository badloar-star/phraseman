import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('gift inventory apply presentation', () => {
  it('requests direct apply presentation for stored single and dual gifts', () => {
    const source = readSource('app/level_gifts_inventory.tsx');
    expect(source.match(/presentationMode="apply"/g)).toHaveLength(2);
  });

  it('labels the inventory action as a preview before the modal confirmation', () => {
    const source = readSource('app/level_gifts_inventory.tsx');
    expect(source).toContain("ru: 'Посмотреть'");
    expect(source).not.toContain("ru: 'Применить'");
  });

  it('previews a stored single gift without applying it until the explicit confirmation', () => {
    const source = readSource('components/LevelGiftModal.tsx');
    expect(source).toContain("presentationMode?: 'open' | 'apply'");
    expect(source).toContain('if (!justOpened) return;');
    expect(source).toContain("const previewingStoredGift = presentationMode === 'apply' && phase === 'box';");
    expect(source).not.toContain("if (!visible || presentationMode !== 'apply' || !gift || phase !== 'box') return;");
    expect(source).toContain("if (previewingStoredGift) {\n                    handleTap(true);");
    expect(source).toContain("onClose(phase === 'reveal');");
    expect(source).toContain("presentationMode === 'apply' && phase === 'box'");
  });

  it('requires a concrete choice before rendering the single-gift apply confirmation', () => {
    const source = readSource('components/LevelGiftModal.tsx');
    const sourceFile = ts.createSourceFile('LevelGiftModal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let choiceConditional: ts.ConditionalExpression | undefined;
    const visit = (node: ts.Node): void => {
      if (ts.isConditionalExpression(node) && node.condition.getText(sourceFile) === 'gift?.choices?.length') {
        choiceConditional = node;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    expect(choiceConditional).toBeDefined();
    expect(choiceConditional!.whenTrue.getText(sourceFile)).toContain('gift.choices.map');
    expect(choiceConditional!.whenTrue.getText(sourceFile)).not.toContain('testID="level-gift-claim"');
    expect(choiceConditional!.whenFalse.getText(sourceFile)).toContain('testID="level-gift-claim"');
    expect(choiceConditional!.whenFalse.getText(sourceFile).match(/handleTap\(true\)/g)).toHaveLength(1);
    expect(source).toContain("if (presentationMode === 'apply' && phase === 'box') {\n      setChoiceBusy(false);\n      return;");
  });

  it('previews both stored dual rewards and applies them only from the explicit confirmation', () => {
    const source = readSource('components/LevelGiftDualModal.tsx');
    expect(source).toContain("presentationMode?: 'open' | 'apply'");
    expect(source).toContain("presentationMode === 'apply' ? new Set<BoxKey>(['f2p', 'prem']) : new Set<BoxKey>()");
    expect(source).not.toContain("useEffect(() => {\n    if (presentationMode !== 'apply' || !visible || !f2pGift || !premGift) return;");
    expect(source).toContain('const handleApplyPreview = (openAvatar = false) => {');
    expect(source).toContain("if (presentationMode === 'apply') {\n      onClose(false);");
    expect(source).toContain("if (presentationMode === 'apply') handleApplyPreview();");
    expect(source).toContain('disabled={claimNowBusy}');
  });

  it('documents optimistic UI as a mandatory project invariant', () => {
    const agents = readSource('AGENTS.md');
    const bible = readSource('docs/OPTIMISTIC_UI_AND_OFFLINE_MUTATIONS.md');
    expect(agents).toContain('### Optimistic UI and offline mutations');
    expect(agents).toContain('docs/OPTIMISTIC_UI_AND_OFFLINE_MUTATIONS.md');
    expect(bible).toContain('No user-visible waiting for ordinary local-first actions');
  });
});
