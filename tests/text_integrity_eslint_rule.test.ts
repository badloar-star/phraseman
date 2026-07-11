import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Linter } from 'eslint';

const projectRoot = path.resolve(__dirname, '..');
const rulePath = path.join(projectRoot, 'tools/eslint-rules/no-unsafe-text-truncation.js');
const core = require(path.join(projectRoot, 'scripts/text-integrity/inventory-core.cjs'));

type RuleModule = {
  createNoUnsafeTextTruncationRule: (options: { baselinePath?: string; projectRoot: string }) => any;
};

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function loadRule(): RuleModule & { default?: any; meta: any; create: any } {
  jest.resetModules();
  return require(rulePath);
}

function verify(rule: any, code: string, filename = 'app/fixture.tsx') {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(code, {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: { parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } } },
    plugins: { 'text-integrity': { rules: { 'no-unsafe-text-truncation': rule } } },
    rules: { 'text-integrity/no-unsafe-text-truncation': 'error' },
  }, { filename });
}

function ruleWithBaseline(groups: any[] = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-eslint-baseline-'));
  tempRoots.push(root);
  const baselinePath = path.join(root, 'baseline.json');
  fs.writeFileSync(baselinePath, `${JSON.stringify({ schemaVersion: 1, groups })}\n`);
  return loadRule().createNoUnsafeTextTruncationRule({ baselinePath, projectRoot });
}

function emptyRule() {
  return ruleWithBaseline();
}

function captureIdentity(code: string, filename: string) {
  let identity: any;
  const linter = new Linter({ configType: 'flat' });
  linter.verify(code, {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: { parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } } },
    plugins: { capture: { rules: { identity: { create(context: any) {
      return { JSXOpeningElement(node: any) {
        identity = core.structuralIdentityFromEslint(node, {
          filename: filename.replace(/\\/g, '/'), sourceCode: context.sourceCode,
        })[0];
      } };
    } } } } },
    rules: { 'capture/identity': 'error' },
  }, { filename });
  return identity;
}

function legacyGroup(identity: any, count = 1) {
  return {
    ...identity,
    fingerprint: core.fingerprintGroup(identity),
    count,
    lineHints: Array.from({ length: count }, (_, index) => index + 1),
    intendedMode: 'temporary-exception',
    owner: 'text-integrity-migration',
    reason: 'Legacy raw truncation frozen pending semantic migration',
    expiryMilestone: 'text-integrity-residual-closeout',
    exception: { approvedBy: 'text-integrity-design-2026-07-10', scope: 'legacy-baseline-only' },
  };
}

describe('text-integrity/no-unsafe-text-truncation', () => {
  test.each([
    ['numberOfLines', '<Text numberOfLines={1}>Private child copy</Text>'],
    ['ellipsizeMode', '<Text ellipsizeMode="tail">Private child copy</Text>'],
    ['allowFontScaling', '<Text allowFontScaling={ false }>Private child copy</Text>'],
    ['numberOfLines', '<ProjectCaption numberOfLines={2}>Private child copy</ProjectCaption>'],
    ['numberOfLines', '<Text numberOfLines={props.numberOfLines}>Private child copy</Text>'],
  ])('reports unsafe %s on native and wrapper tags', (prop, code) => {
    const messages = verify(emptyRule(), code);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain(prop);
  });

  test('allows scaling and semantic primitives without raw forbidden attributes', () => {
    expect(verify(emptyRule(), '<><Text allowFontScaling={true}>Safe</Text><FlowText>Safe</FlowText><AdaptiveLabel>Safe</AdaptiveLabel></>')).toEqual([]);
  });

  test('keeps diagnostics privacy-safe', () => {
    const [message] = verify(emptyRule(), '<Text numberOfLines={PRIVATE_LIMIT} testID="SECRET_TEST_ID">PRIVATE CHILD TEXT</Text>');
    expect(message.message).toMatch(/numberOfLines/);
    expect(message.message).not.toMatch(/PRIVATE|SECRET|CHILD TEXT/);
  });

  test('allows a legacy collision group only up to its committed count', () => {
    const filename = 'app/legacy.tsx';
    const site = '<Text numberOfLines={1}>Legacy</Text>';
    const identity = captureIdentity(site, filename);
    const rule = ruleWithBaseline([legacyGroup(identity, 2)]);
    expect(verify(rule, `<>${site}${site}${site}</>`, filename)).toHaveLength(1);
  });

  test('does not transfer an allowed group to another file', () => {
    const code = '<Text numberOfLines={1}>Legacy</Text>';
    const identity = captureIdentity(code, 'app/legacy.tsx');
    const rule = ruleWithBaseline([legacyGroup(identity)]);
    expect(verify(rule, code, 'components/legacy.tsx')).toHaveLength(1);
  });

  test('normalizes Windows and POSIX filenames to the same project-relative identity', () => {
    const code = '<Text numberOfLines={1}>Legacy</Text>';
    const relative = 'app/nested/legacy.tsx';
    const identity = captureIdentity(code, relative);
    const rule = ruleWithBaseline([legacyGroup(identity)]);
    expect(verify(rule, code, path.join(projectRoot, 'app', 'nested', 'legacy.tsx'))).toEqual([]);
    expect(verify(rule, code, path.join(projectRoot, 'app', 'nested', 'legacy.tsx').replace(/\\/g, '/'))).toEqual([]);
  });

  test('uses the baseline canonical filename for mixed-case Windows aliases', () => {
    const code = '<Text numberOfLines={1}>Legacy</Text>';
    const canonical = 'app/nested/legacy.tsx';
    const identity = captureIdentity(code, canonical);
    const rule = ruleWithBaseline([legacyGroup(identity)]);
    expect(verify(rule, code, 'APP/NESTED/LEGACY.tsx')).toEqual([]);
    expect(verify(rule, code, path.join(projectRoot, 'APP', 'NESTED', 'LEGACY.tsx'))).toEqual([]);
    expect(verify(rule, code, 'COMPONENTS/NESTED/LEGACY.tsx')).toHaveLength(1);
  });

  test('fails closed when the baseline is missing or invalid', () => {
    const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-eslint-missing-'));
    const invalidRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-eslint-invalid-'));
    fs.mkdirSync(path.join(invalidRoot, 'config'));
    fs.writeFileSync(path.join(invalidRoot, 'config/text-integrity-baseline.json'), '{}');
    try {
      expect(() => loadRule().createNoUnsafeTextTruncationRule({ projectRoot: missingRoot })).toThrow(/baseline/i);
      expect(() => loadRule().createNoUnsafeTextTruncationRule({ projectRoot: invalidRoot })).toThrow(/baseline/i);
      expect(() => loadRule().createNoUnsafeTextTruncationRule({ projectRoot, baselinePath: path.join(missingRoot, 'missing.json') })).toThrow(/baseline/i);
      expect(() => loadRule().createNoUnsafeTextTruncationRule({ projectRoot, baselinePath: path.join(invalidRoot, 'config/text-integrity-baseline.json') })).toThrow(/baseline/i);
    } finally {
      fs.rmSync(missingRoot, { recursive: true, force: true });
      fs.rmSync(invalidRoot, { recursive: true, force: true });
    }
  });

  test('reports when a baseline group for the linted file is absent', () => {
    const filename = 'app/legacy.tsx';
    const identity = captureIdentity('<Text numberOfLines={1}>Legacy</Text>', filename);
    const messages = verify(ruleWithBaseline([legacyGroup(identity)]), '<Text>Now semantic</Text>', filename);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toMatch(/baseline.*missing|missing.*baseline/i);
  });

  test('reports when a baseline group count is reduced', () => {
    const filename = 'app/legacy.tsx';
    const site = '<Text numberOfLines={1}>Legacy</Text>';
    const identity = captureIdentity(site, filename);
    const messages = verify(ruleWithBaseline([legacyGroup(identity, 2)]), site, filename);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toMatch(/baseline.*count|count.*baseline/i);
  });

  test('does not offer an autofix', () => {
    const linter = new Linter({ configType: 'flat' });
    const result = linter.verifyAndFix('<Text numberOfLines={1}>Private</Text>', {
      files: ['**/*.{js,jsx,ts,tsx}'],
      languageOptions: { parserOptions: { ecmaVersion: 2022, ecmaFeatures: { jsx: true } } },
      plugins: { local: { rules: { rule: emptyRule() } } },
      rules: { 'local/rule': 'error' },
    }, { filename: 'app/fixture.tsx' });
    expect(result.fixed).toBe(false);
    expect(result.output).toBe('<Text numberOfLines={1}>Private</Text>');
  });

  test('registers the rule only for production TypeScript roots in the actual flat config', async () => {
    const config = require(path.join(projectRoot, 'eslint.config.js'));
    const local = config.find((entry: any) => entry.plugins?.['text-integrity']);
    expect(local.rules['text-integrity/no-unsafe-text-truncation']).toBe('error');
    expect(local.files).toEqual(expect.arrayContaining(['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}']));
    expect(local.files.some((glob: string) => glob.startsWith('tests/'))).toBe(false);
    expect(() => require(path.join(projectRoot, 'eslint.config.js'))).not.toThrow();

    const severity = (filename: string) => {
      const result = spawnSync(process.execPath, [
        path.join(projectRoot, 'node_modules/eslint/bin/eslint.js'), '--print-config', filename,
      ], { cwd: projectRoot, encoding: 'utf8' });
      expect(result.status).toBe(0);
      const resolved = result.stdout.trim() === 'undefined' ? undefined : JSON.parse(result.stdout);
      return resolved?.rules?.['text-integrity/no-unsafe-text-truncation']?.[0];
    };
    expect(severity('app/foo.tsx')).toBe(2);
    expect(severity('components/foo.ts')).toBe(2);
    expect(severity('app/foo.gen.tsx')).toBeUndefined();
    expect(severity('components/foo.gen.ts')).toBeUndefined();
    // Parity with collectProductionFiles: only *.gen.ts(x) is generated-by-name excluded.
    expect(severity('app/collectibles/collectible_image_url_map.generated.ts')).toBe(2);
    expect(severity('constants/generatedThemeIconAssets.ts')).toBe(2);
    expect(severity('tests/foo.tsx')).toBeUndefined();
    expect(severity('dist/foo.tsx')).toBeUndefined();
  });

  test('loads the actual config from a cwd outside the project', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-eslint-outside-'));
    tempRoots.push(outside);
    const script = [
      `const config = require(${JSON.stringify(path.join(projectRoot, 'eslint.config.js'))});`,
      "const local = config.find((entry) => entry.plugins?.['text-integrity']);",
      "if (!local?.rules?.['text-integrity/no-unsafe-text-truncation']) process.exit(2);",
    ].join('');
    const result = spawnSync(process.execPath, ['-e', script], { cwd: outside, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
