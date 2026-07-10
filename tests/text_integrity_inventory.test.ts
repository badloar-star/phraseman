import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { Linter } = require('eslint');
const corePath = path.join(__dirname, '..', 'scripts', 'text-integrity', 'inventory-core.cjs');

type InventoryCore = {
  canonicalGroup: (input: Record<string, unknown>) => Record<string, unknown>;
  collectProductionFiles: (root: string) => string[];
  fingerprintGroup: (group: Record<string, unknown>) => string;
  scanTextIntegrity: (root: string, relativeFiles: string[]) => {
    files: number;
    unsafeSites: number;
    unsafeGroups: number;
    groups: Array<Record<string, any>>;
  };
  structuralIdentityFromEslint: (
    node: Record<string, unknown>,
    options: { filename: string; sourceCode: Record<string, unknown> },
  ) => Array<Record<string, unknown>>;
};

function loadCore(): InventoryCore {
  return require(corePath) as InventoryCore;
}

function withTempProject(run: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-text-integrity-'));
  try {
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeFixture(root: string, relativeFile: string, source: string): void {
  const target = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source, 'utf8');
}

function scanSource(source: string, relativeFile = 'components/Fixture.tsx') {
  const core = loadCore();
  let result: ReturnType<InventoryCore['scanTextIntegrity']> | undefined;
  withTempProject((root) => {
    writeFixture(root, relativeFile, source);
    result = core.scanTextIntegrity(root, [relativeFile]);
  });
  return result!;
}

describe('text-integrity AST inventory', () => {
  test('exports the deterministic CommonJS API', () => {
    const core = loadCore();
    for (const name of [
      'canonicalGroup',
      'collectProductionFiles',
      'fingerprintGroup',
      'scanTextIntegrity',
      'structuralIdentityFromEslint',
    ] as const) {
      expect(typeof core[name]).toBe('function');
    }
  });

  test('detects all unsafe props on native, animated, wrapper, and forwarding tags', () => {
    const result = scanSource(`
      const Label = (props) => <Text numberOfLines={props.numberOfLines} {...props} />;
      function Screen() {
        return <View>
          <Text numberOfLines={1}>native</Text>
          <Animated.Text ellipsizeMode="tail">animated</Animated.Text>
          <Label numberOfLines={2} ellipsizeMode={'middle'} allowFontScaling={ false }>wrapper</Label>
          <Text allowFontScaling={true}>safe</Text>
        </View>;
      }
    `);

    expect(result.unsafeSites).toBe(6);
    expect(result.groups.map((group) => group.prop).sort()).toEqual([
      'allowFontScaling',
      'ellipsizeMode',
      'ellipsizeMode',
      'numberOfLines',
      'numberOfLines',
      'numberOfLines',
    ]);
    expect(result.groups.find((group) => group.prop === 'allowFontScaling')?.value).toBe('false');
    expect(result.groups.some((group) => group.tag === 'Label')).toBe(true);
    expect(result.groups.some((group) => group.tag === 'Animated.Text')).toBe(true);
  });

  test('does not flag absent or true allowFontScaling', () => {
    const result = scanSource(`
      export function Safe() {
        return <><Text allowFontScaling={ true } /><Text allowFontScaling /><Text /></>;
      }
    `);
    expect(result).toMatchObject({ unsafeSites: 0, unsafeGroups: 0, groups: [] });
  });

  test('groups indistinguishable siblings and keeps identity stable across reorder and removal', () => {
    const duplicate = '<Text numberOfLines={1}>private phrase</Text>';
    const before = scanSource(`function Card(){return <View>${duplicate}<Icon />${duplicate}</View>}`);
    const reordered = scanSource(`function Card(){return <View>${duplicate}${duplicate}<Icon color="red" /></View>}`);
    const removed = scanSource(`function Card(){return <View><Icon />${duplicate}</View>}`);

    expect(before).toMatchObject({ unsafeSites: 2, unsafeGroups: 1 });
    expect(before.groups[0].count).toBe(2);
    expect(reordered.groups[0].fingerprint).toBe(before.groups[0].fingerprint);
    expect(reordered.groups[0].count).toBe(2);
    expect(removed.groups[0].fingerprint).toBe(before.groups[0].fingerprint);
    expect(removed.groups[0].count).toBe(1);
    expect(before.groups[0].lineHints).toHaveLength(2);
  });

  test('identity ignores text, unrelated props, whitespace, and sibling order but includes stable testID', () => {
    const first = scanSource(`function Card(){return <Text testID="title" style={{color:'red'}} numberOfLines = { 2 }>TOP SECRET</Text>}`);
    const second = scanSource(`function Card(){ return <Text numberOfLines={2} style={styles.changed} testID="title">DIFFERENT SECRET</Text>; }`);
    const withoutTestId = scanSource(`function Card(){return <Text numberOfLines={2}>TOP SECRET</Text>}`);

    expect(second.groups[0].fingerprint).toBe(first.groups[0].fingerprint);
    expect(withoutTestId.groups[0].fingerprint).not.toBe(first.groups[0].fingerprint);
    const serialized = JSON.stringify(first.groups);
    expect(serialized).not.toContain('TOP SECRET');
    expect(serialized).not.toContain('color');
    expect(serialized).not.toContain('style');
  });

  test('uses nearest named component owner and tag-only ancestor path', () => {
    const result = scanSource(`
      function Outer() {
        function Inner() {
          return <Panel><Row><Text ellipsizeMode={'tail'} /></Row></Panel>;
        }
        return <Inner />;
      }
    `);
    expect(result.groups[0]).toMatchObject({
      owner: 'Inner',
      ancestorPath: ['Panel', 'Row', 'Text'],
      tag: 'Text',
    });
  });

  test('TypeScript and ESLint adapters derive the same real identities and fingerprints', () => {
    const source = `
      function Outer() {
        const Inner = () => <Panel>
          <Text style={{ color: 'red' }} numberOfLines={2}>secret one</Text>
          <Text numberOfLines={2}>secret two</Text>
        </Panel>;
        return <Inner />;
      }
    `;
    const core = loadCore();
    const tsResult = scanSource(source, 'components/nested/Fixture.tsx');
    const eslintIdentities: Array<Record<string, unknown>> = [];
    const linter = new Linter({ configType: 'eslintrc' });
    linter.defineRule('capture-text-integrity', {
      create(context: Record<string, any>) {
        return {
          JSXOpeningElement(node: Record<string, unknown>) {
            eslintIdentities.push(...core.structuralIdentityFromEslint(node, {
              filename: 'components\\nested\\Fixture.tsx',
              sourceCode: context.getSourceCode(),
            }));
          },
        };
      },
    });
    const messages = linter.verify(source, {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      rules: { 'capture-text-integrity': 'error' },
    });

    expect(messages).toEqual([]);
    expect(eslintIdentities).toHaveLength(2);
    const eslintGroups = eslintIdentities.map((identity) => ({
      ...core.canonicalGroup(identity),
      fingerprint: core.fingerprintGroup(identity),
    }));
    expect(eslintGroups.map((group) => group.fingerprint)).toEqual(
      tsResult.groups.flatMap((group) => Array(group.count).fill(group.fingerprint)),
    );
    expect(eslintGroups[0]).toMatchObject({
      file: 'components/nested/Fixture.tsx',
      owner: 'Inner',
      ancestorPath: ['Panel', 'Text'],
    });
  });

  test('rejects malformed TSX without exposing source text in the error', () => {
    const privateText = 'PRIVATE USER PHRASE';
    let thrown: unknown;
    try {
      scanSource(`function Broken(){return <View><Text numberOfLines={1}>${privateText}</View>}`,
        'components\\Broken.tsx');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(String(thrown)).toMatch(/^Error: Text integrity parse error: components\/Broken\.tsx TS\d+ \d+:\d+$/);
    expect(String(thrown)).not.toContain(privateText);
    expect(JSON.stringify(thrown)).not.toContain(privateText);
  });

  test('owner ancestry separates same-named nested renderers and stays in real TS/ESLint parity', () => {
    const source = `
      function A() {
        const renderItem = () => <Text numberOfLines={1}>private A</Text>;
        return <List renderItem={renderItem} />;
      }
      function B() {
        const renderItem = () => <Text numberOfLines={1}>private B</Text>;
        return <List renderItem={renderItem} />;
      }
    `;
    const core = loadCore();
    const tsResult = scanSource(source, 'components/OwnerFixture.tsx');
    const eslintIdentities: Array<Record<string, any>> = [];
    const linter = new Linter({ configType: 'eslintrc' });
    linter.defineRule('capture-owner-ancestry', {
      create(context: Record<string, any>) {
        return {
          JSXOpeningElement(node: Record<string, unknown>) {
            eslintIdentities.push(...core.structuralIdentityFromEslint(node, {
              filename: 'components\\OwnerFixture.tsx',
              sourceCode: context.getSourceCode(),
            }));
          },
        };
      },
    });
    expect(linter.verify(source, {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      rules: { 'capture-owner-ancestry': 'error' },
    })).toEqual([]);

    expect(tsResult).toMatchObject({ unsafeSites: 2, unsafeGroups: 2 });
    expect(tsResult.groups.map((group) => group.owner)).toEqual(['renderItem', 'renderItem']);
    expect(tsResult.groups.map((group) => group.ownerPath).sort()).toEqual(['A>renderItem', 'B>renderItem']);
    expect(new Set(tsResult.groups.map((group) => group.fingerprint))).toHaveProperty('size', 2);
    expect(eslintIdentities.map((identity) => identity.ownerPath).sort()).toEqual(['A>renderItem', 'B>renderItem']);
    expect(eslintIdentities.map((identity) => core.fingerprintGroup(identity)).sort()).toEqual(
      tsResult.groups.map((group) => group.fingerprint).sort(),
    );
  });

  test('collectProductionFiles includes only production ts/tsx and skips heavy or generated paths', () => {
    const core = loadCore();
    withTempProject((root) => {
      for (const file of [
        'app/a.tsx',
        'components/b.ts',
        'constants/c.js',
        'hooks/value.gen.ts',
        'lib/keep.ts',
        'modules/nested/keep.tsx',
        'modules/dist/skip.ts',
        'app/build/skip.tsx',
        'components/reports/skip.ts',
        'app/.claude-cache/skip.ts',
        'components/.superpowers/skip.tsx',
        'constants/.codex-extra/skip.ts',
        'hooks/lingman-generated/skip.ts',
        'lib/subscription-recovery/skip.tsx',
        'modules/.artifacts/skip.ts',
        'app/.logs/skip.ts',
        'components/docs/reports/skip.ts',
        'constants/maestro-results/skip.ts',
        'hooks/android/.gradle/skip.ts',
        'lib/android/app/build/skip.ts',
        'modules/builds/skip.ts',
        'app/exports/skip.ts',
        'components/qa-artifacts/skip.ts',
        'constants/temp/skip.ts',
        'hooks/report/skip.ts',
        'node_modules/pkg/index.ts',
        'tests/not-production.tsx',
        'app/docs/keep.ts',
        'components/lingman_tools/keep.ts',
      ]) writeFixture(root, file, 'export {};');

      expect(core.collectProductionFiles(root)).toEqual([
        'app/a.tsx',
        'app/docs/keep.ts',
        'components/b.ts',
        'components/lingman_tools/keep.ts',
        'lib/keep.ts',
        'modules/nested/keep.tsx',
      ]);
    });
  });
});
