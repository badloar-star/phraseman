import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

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
  loadAndValidateBaseline: (rootOrPath: string) => { schemaVersion: number; groups: Array<Record<string, any>> };
  auditAgainstBaseline: (baseline: Record<string, any>, currentGroups: Array<Record<string, any>>) => {
    ok: boolean; added: string[]; removed: string[]; countIncreased: string[]; countDecreased: string[];
  };
  bootstrapBaseline: (targetPath: string, currentGroups: Array<Record<string, any>>) => void;
  updateBaselineShrinkOnly: (targetPath: string, currentGroups: Array<Record<string, any>>) => void;
  publishNoClobber: (temporaryPath: string, targetPath: string) => void;
  writeBootstrapAtomic: (targetPath: string, baseline: Record<string, any>, filesystem?: typeof fs) => void;
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
      ownerName: 'Inner',
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
      ownerName: 'Inner',
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
    expect(tsResult.groups.map((group) => group.ownerName)).toEqual(['renderItem', 'renderItem']);
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

const classification = {
  intendedMode: 'temporary-exception',
  owner: 'text-integrity-migration',
  reason: 'Legacy raw truncation frozen pending semantic migration',
  expiryMilestone: 'text-integrity-residual-closeout',
  exception: { approvedBy: 'text-integrity-design-2026-07-10', scope: 'legacy-baseline-only' },
};

function fixtureGroup(source = '<Text numberOfLines={1}>PRIVATE USER TEXT</Text>') {
  return { ...scanSource(`function Card(){return ${source}}`).groups[0] };
}

function validBaseline(groups = [fixtureGroup()]) {
  return { schemaVersion: 1, groups: groups.map((group) => ({ ...group, ...classification })) };
}

function changedGroup(group: Record<string, any>, changes: Record<string, any>) {
  const changed = { ...group, ...changes };
  return { ...changed, fingerprint: loadCore().fingerprintGroup(changed) };
}

describe('text-integrity classified baseline', () => {
  test('roundtrip preserves distinct structural ownerName and migration owner with real TS/ESLint parity', () => withTempProject((root) => {
    const source = `function Card(){const renderItem=()=> <Text numberOfLines={1}>private</Text>; return <List renderItem={renderItem}/>}`;
    const tsGroup = scanSource(source).groups[0];
    const eslintIdentities: Array<Record<string, any>> = [];
    const linter = new Linter({ configType: 'eslintrc' });
    linter.defineRule('capture-owner-schema', {
      create(context: Record<string, any>) {
        return { JSXOpeningElement(node: Record<string, unknown>) {
          eslintIdentities.push(...loadCore().structuralIdentityFromEslint(node, {
            filename: 'components/Fixture.tsx', sourceCode: context.getSourceCode(),
          }));
        } };
      },
    });
    expect(linter.verify(source, {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      rules: { 'capture-owner-schema': 'error' },
    })).toEqual([]);
    expect(eslintIdentities).toHaveLength(1);
    expect(eslintIdentities[0]).toMatchObject({ ownerName: 'renderItem', ownerPath: 'Card>renderItem' });
    expect(loadCore().fingerprintGroup(eslintIdentities[0])).toBe(tsGroup.fingerprint);

    const target = path.join(root, 'baseline.json');
    loadCore().bootstrapBaseline(target, [tsGroup]);
    expect(loadCore().loadAndValidateBaseline(target).groups[0]).toMatchObject({
      ownerName: 'renderItem', ownerPath: 'Card>renderItem', owner: 'text-integrity-migration',
    });
  }));

  test('exports baseline enforcement API', () => {
    const core = loadCore();
    for (const name of ['loadAndValidateBaseline', 'auditAgainstBaseline', 'bootstrapBaseline', 'updateBaselineShrinkOnly', 'publishNoClobber'] as const) {
      expect(typeof core[name]).toBe('function');
    }
  });

  test('exact equality passes and line hint drift is diagnostic-only', () => {
    const core = loadCore();
    const group = fixtureGroup();
    expect(core.auditAgainstBaseline(validBaseline([group]), [{ ...group, lineHints: [999] }])).toEqual({
      ok: true, added: [], removed: [], countIncreased: [], countDecreased: [],
    });
  });

  test.each([
    ['added', (group: any) => [group, changedGroup(group, { prop: 'ellipsizeMode' })], 'added'],
    ['removed', () => [], 'removed'],
    ['count increase', (group: any) => [{ ...group, count: group.count + 1, lineHints: [...group.lineHints, 3] }], 'countIncreased'],
    ['count decrease', (group: any) => [{ ...group, count: group.count - 1, lineHints: group.lineHints.slice(0, -1) }], 'countDecreased'],
  ])('%s drift fails closed', (_label, mutate, bucket) => {
    const core = loadCore();
    const group = { ...fixtureGroup(), count: 2, lineHints: [1, 2] };
    const audit = core.auditAgainstBaseline(validBaseline([group]), mutate(group));
    expect(audit.ok).toBe(false);
    expect((audit as any)[bucket]).toHaveLength(1);
  });

  test('bootstrap refuses an existing target', () => withTempProject((root) => {
    const target = path.join(root, 'baseline.json');
    fs.writeFileSync(target, 'sentinel', 'utf8');
    expect(() => loadCore().bootstrapBaseline(target, [fixtureGroup()])).toThrow(/exists/i);
    expect(fs.readFileSync(target, 'utf8')).toBe('sentinel');
  }));

  test('no-clobber publication loses a race safely and preserves winner bytes', () => withTempProject((root) => {
    const temporary = path.join(root, 'candidate.tmp');
    const target = path.join(root, 'baseline.json');
    fs.writeFileSync(temporary, 'candidate', 'utf8');
    fs.writeFileSync(target, 'race-winner', 'utf8');
    expect(() => loadCore().publishNoClobber(temporary, target)).toThrow();
    expect(fs.readFileSync(target, 'utf8')).toBe('race-winner');
    expect(fs.existsSync(temporary)).toBe(false);
  }));

  test('bootstrap temp write failure leaves no target or temp sibling', () => withTempProject((root) => {
    const target = path.join(root, 'baseline.json');
    const failingFs = Object.create(fs) as typeof fs;
    failingFs.writeFileSync = ((file: fs.PathOrFileDescriptor, data: any) => {
      fs.writeFileSync(file, String(data).slice(0, 12), 'utf8');
      throw new Error('simulated write failure');
    }) as typeof fs.writeFileSync;
    expect(() => loadCore().writeBootstrapAtomic(target, validBaseline(), failingFs)).toThrow(/simulated write failure/);
    expect(fs.existsSync(target)).toBe(false);
    expect(fs.readdirSync(root).filter((name) => name.startsWith('baseline.json.tmp-'))).toEqual([]);
  }));

  test.each([
    ['new group', (group: any) => [group, changedGroup(group, { prop: 'ellipsizeMode' })]],
    ['count increase', (group: any) => [{ ...group, count: group.count + 1, lineHints: [...group.lineHints, 2] }]],
  ])('shrink update refuses %s without changing bytes', (_label, mutate) => withTempProject((root) => {
    const target = path.join(root, 'baseline.json');
    const group = fixtureGroup();
    fs.writeFileSync(target, `${JSON.stringify(validBaseline([group]), null, 2)}\n`, 'utf8');
    const before = fs.readFileSync(target);
    expect(() => loadCore().updateBaselineShrinkOnly(target, mutate(group))).toThrow();
    expect(fs.readFileSync(target).equals(before)).toBe(true);
  }));

  test('shrink update removes groups, decreases counts, refreshes hints, and preserves metadata', () => withTempProject((root) => {
    const target = path.join(root, 'baseline.json');
    const keep = { ...fixtureGroup(), count: 3, lineHints: [1, 2, 3] };
    const remove = changedGroup(keep, { file: 'components/Removed.tsx' });
    fs.writeFileSync(target, `${JSON.stringify(validBaseline([keep, remove]), null, 2)}\n`, 'utf8');
    loadCore().updateBaselineShrinkOnly(target, [{ ...keep, count: 2, lineHints: [20, 30] }]);
    const updated = loadCore().loadAndValidateBaseline(target);
    expect(updated.groups).toHaveLength(1);
    expect(updated.groups[0]).toMatchObject({ count: 2, lineHints: [20, 30], ...classification });
  }));

  test.each([
    ['schema version', (b: any) => { b.schemaVersion = 2; }],
    ['unknown root field', (b: any) => { b.extra = true; }],
    ['missing field', (b: any) => { delete b.groups[0].owner; }],
    ['unknown group field', (b: any) => { b.groups[0].secret = 'PRIVATE'; }],
    ['duplicate fingerprint', (b: any) => { b.groups.push({ ...b.groups[0] }); }],
    ['invalid count', (b: any) => { b.groups[0].count = 0; }],
    ['malformed line hints', (b: any) => { b.groups[0].lineHints = [0, 'x']; }],
    ['empty metadata', (b: any) => { b.groups[0].reason = ''; }],
    ['invalid intended mode', (b: any) => { b.groups[0].intendedMode = 'reviewed'; }],
    ['temporary exception missing approval', (b: any) => { delete b.groups[0].exception; }],
    ['exception on non-temporary mode', (b: any) => { b.groups[0].intendedMode = 'flow'; }],
  ])('schema rejects %s without leaking raw values', (_label, mutate) => withTempProject((root) => {
    const target = path.join(root, 'baseline.json');
    const baseline = validBaseline();
    mutate(baseline);
    fs.writeFileSync(target, JSON.stringify(baseline), 'utf8');
    let message = '';
    try { loadCore().loadAndValidateBaseline(target); } catch (error) { message = String(error); }
    expect(message).toMatch(/baseline/i);
    expect(message).not.toContain('PRIVATE');
  }));

  test.each([
    ['file', 'components/PRIVATE.tsx'], ['ownerName', 'PRIVATE'], ['ownerPath', 'PRIVATE>owner'],
    ['ancestorPath', ['PRIVATE']], ['tag', 'PRIVATE'], ['kind', 'PRIVATE'], ['prop', 'PRIVATE'],
    ['value', 'PRIVATE'], ['testID', 'PRIVATE'],
  ])('schema rejects stale fingerprint after %s tampering without leaking values', (field, value) => withTempProject((root) => {
    const target = path.join(root, 'baseline.json');
    const baseline = validBaseline();
    (baseline.groups[0] as Record<string, any>)[field] = value;
    fs.writeFileSync(target, JSON.stringify(baseline), 'utf8');
    expect(() => loadCore().loadAndValidateBaseline(target)).toThrow(/fingerprint/i);
    try { loadCore().loadAndValidateBaseline(target); } catch (error) { expect(String(error)).not.toContain('PRIVATE'); }
  }));

  test.each([
    ['stale fingerprint', (g: any) => [{ ...g, ownerName: 'PRIVATE' }]],
    ['duplicate fingerprint', (g: any) => [g, { ...g }]],
    ['invalid count', (g: any) => [{ ...g, count: 0 }]],
    ['invalid lineHints', (g: any) => [{ ...g, lineHints: [0] }]],
  ])('audit and update reject malformed currentGroups: %s', (_label, mutate) => withTempProject((root) => {
    const group = fixtureGroup();
    const malformed = mutate(group);
    const target = path.join(root, 'baseline.json');
    fs.writeFileSync(target, `${JSON.stringify(validBaseline([group]), null, 2)}\n`, 'utf8');
    const before = fs.readFileSync(target);
    expect(() => loadCore().auditAgainstBaseline(validBaseline([group]), malformed)).toThrow();
    expect(() => loadCore().updateBaselineShrinkOnly(target, malformed)).toThrow();
    expect(fs.readFileSync(target).equals(before)).toBe(true);
  }));

  test('default CLI fails on a new group and writes nothing', () => withTempProject((root) => {
    const group = fixtureGroup();
    writeFixture(root, 'config/text-integrity-baseline.json', `${JSON.stringify(validBaseline([group]), null, 2)}\n`);
    writeFixture(root, 'components/Fixture.tsx', 'function Different(){return <Text numberOfLines={2}>NEW PRIVATE TEXT</Text>}');
    const before = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'config/text-integrity-baseline.json'))).digest('hex');
    const cli = path.join(__dirname, '..', 'scripts', 'text-integrity', 'inventory.mjs');
    const result = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8' });
    const after = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'config/text-integrity-baseline.json'))).digest('hex');
    expect(result.status).not.toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ added: 1, removed: 1 });
    expect(result.stdout).not.toContain('NEW PRIVATE TEXT');
    expect(after).toBe(before);
  }));

  test('default CLI emits a privacy-safe JSON summary for an invalid baseline', () => withTempProject((root) => {
    writeFixture(root, 'config/text-integrity-baseline.json', '{"PRIVATE USER TEXT":');
    writeFixture(root, 'components/Fixture.tsx', 'function Card(){return <Text numberOfLines={1}>PRIVATE USER TEXT</Text>}');
    const cli = path.join(__dirname, '..', 'scripts', 'text-integrity', 'inventory.mjs');
    const result = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ files: 1, unsafeSites: 1, unsafeGroups: 1, baselineValid: false, errorCategory: 'schema-invalid' });
    expect(`${result.stdout}${result.stderr}`).not.toContain('PRIVATE USER TEXT');
  }));

  test('update policy refusal reports a valid baseline distinctly', () => withTempProject((root) => {
    const group = fixtureGroup();
    writeFixture(root, 'config/text-integrity-baseline.json', `${JSON.stringify(validBaseline([group]), null, 2)}\n`);
    writeFixture(root, 'components/Fixture.tsx', 'function Different(){return <Text numberOfLines={2}>PRIVATE</Text>}');
    const cli = path.join(__dirname, '..', 'scripts', 'text-integrity', 'inventory.mjs');
    const result = spawnSync(process.execPath, [cli, '--update-baseline'], { cwd: root, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ baselineValid: true, updateRefused: true, errorCategory: 'update-refused' });
    expect(`${result.stdout}${result.stderr}`).not.toContain('PRIVATE');
  }));

  test('package exposes exact audit/update scripts and no bootstrap script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    expect(pkg.scripts['text-integrity:audit']).toBe('node scripts/text-integrity/inventory.mjs');
    expect(pkg.scripts['text-integrity:update-baseline']).toBe('node scripts/text-integrity/inventory.mjs --update-baseline');
    expect(Object.keys(pkg.scripts).some((name) => name.includes('bootstrap-baseline'))).toBe(false);
  });
});
