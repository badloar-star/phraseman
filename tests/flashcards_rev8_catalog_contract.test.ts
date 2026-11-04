import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('rev8 catalog presentation', () => {
  it('uses one shared compact row in all catalog surfaces', () => {
    expect(read('components/packs/PackRow.tsx')).toContain('export const PackCatalogRow');
    expect(read('app/flashcards/MyPacksV2.tsx')).toContain('<PackCatalogRow');
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx')).toContain('<PackCatalogRow');
    expect(read('app/flashcards/VideoPackRow.tsx')).toContain('<PackCatalogRow');
    expect(read('app/flashcards/VideoPackRow.tsx')).toContain('duration={duration}');
  });

  it('keeps the social catalog a vertical full-width list', () => {
    const source = read('app/flashcards/FlashcardsCategoryHub.tsx');
    expect(source).not.toContain("width: '48.5%'");
    expect(source).not.toContain('flexWrap: \'wrap\', gap: 10, paddingTop: 10');
  });

  it('uses the compact create action without the old floating CTA', () => {
    const parent = read('app/flashcards_packs.tsx');
    const hub = read('app/flashcards/FlashcardsCategoryHub.tsx');
    expect(parent.includes('testID="community-scene-create"')).toBe(false);
    expect(parent.includes('testID="flashcards-packs-create"')).toBe(true);
    expect(parent.includes('<CommunityMonthRewardHost')).toBe(true);
    expect(hub.includes("params: { origin: 'community', packLanguage }")).toBe(true);
  });

  it('executes the actual compact plus callback with the selected language', () => {
    const source = read('app/flashcards/FlashcardsCategoryHub.tsx');
    const tree = ts.createSourceFile('hub.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let expression = '';
    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
        const marker = attrs.find((a) => a.name.getText(tree) === 'testID');
        if (marker?.initializer && ts.isStringLiteral(marker.initializer) && marker.initializer.text === 'social-catalog-create') {
          const press = attrs.find((a) => a.name.getText(tree) === 'onPress');
          if (press?.initializer && ts.isJsxExpression(press.initializer) && press.initializer.expression) expression = press.initializer.expression.getText(tree);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    expect(expression).not.toBe('');
    const js = ts.transpileModule(`return (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    const router = { push: jest.fn() };
    const haptic = jest.fn();
    const callback = new Function('router', 'packLanguage', 'hapticTap', js)(router, 'de', haptic) as () => void;
    callback();
    expect(router.push).toHaveBeenCalledWith({ pathname: '/community_pack_create', params: { origin: 'community', packLanguage: 'de' } });
    expect(haptic).toHaveBeenCalledTimes(1);
  });
});
