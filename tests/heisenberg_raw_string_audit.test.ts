import fs from 'node:fs';
import path from 'node:path';

import { analyzeSourceText, buildRawStringAuditReport } from '../scripts/heisenberg_raw_string_audit';

const ROOT = path.join(__dirname, '..');
const GENERATED_AT = '2026-07-04T00:00:00.000Z';

describe('heisenberg raw string audit: analyzeSourceText (synthetic snippets)', () => {
  it('flags JSX text containing Cyrillic as raw-cyrillic-literal', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `
        function Sample() {
          return <Text>Не разрешать</Text>;
        }
      `,
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'raw-cyrillic-literal',
        severity: 'blocker-candidate',
        context: 'jsx-text',
      }),
    );
  });

  it('flags Alert.alert("Привет") as a raw-cyrillic-literal finding', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `
        function onPress() {
          Alert.alert('Привет');
        }
      `,
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'raw-cyrillic-literal',
        severity: 'blocker-candidate',
        context: 'alert-arg',
        sample: 'Привет',
      }),
    );
  });

  it('does not flag literals passed through triLang(...)', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `
        function Sample() {
          return <Text>{triLang('а', 'б', 'в')}</Text>;
        }
      `,
    );

    expect(findings).toHaveLength(0);
  });

  it('does not flag strings inside a locale-container object literal ({ ru, uk })', () => {
    const findings = analyzeSourceText(
      'app/sample_data.ts',
      `
        const copy = {
          title: {
            ru: 'привет',
            uk: 'привіт',
          },
        };
      `,
    );

    expect(findings).toHaveLength(0);
  });

  it('flags <Text>{\'Save changes now\'}</Text> as latin-sentence-literal warning', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `
        function Sample() {
          return <Text>{'Save changes now'}</Text>;
        }
      `,
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'latin-sentence-literal',
        severity: 'warning',
        context: 'jsx-expression-child',
        sample: 'Save changes now',
      }),
    );
  });

  it('does not flag short, non-sentence, or code-like literals', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `
        function Sample() {
          return (
            <View testID="onboarding-legal-checkbox" style={{ color: '#FF00FF' }}>
              <Text>{'OK'}</Text>
              <Text>{'https://example.com/path'}</Text>
              <Text>{someIdentifierValue}</Text>
            </View>
          );
        }
      `,
    );

    expect(findings).toHaveLength(0);
  });

  it('flags a toast-like call with a raw Cyrillic argument', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `
        function onSave() {
          showToast('Сохранено');
        }
      `,
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'raw-cyrillic-literal',
        context: 'toast-arg',
        sample: 'Сохранено',
      }),
    );
  });

  it('flags a raw user-visible JSX attribute', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `function Sample() { return <Button accessibilityLabel="Закрыть окно" />; }`,
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'raw-cyrillic-literal',
        context: 'jsx-attribute',
        sample: 'Закрыть окно',
      }),
    );
  });

  it('flags raw copy embedded in a user-visible template attribute', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      'function Sample({ count }: { count: number }) { return <Button accessibilityLabel={`Баланс: ${count} жемчужин`} />; }',
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        kind: 'raw-cyrillic-literal',
        context: 'jsx-attribute',
        sample: 'Баланс: жемчужин',
      }),
    );
  });

  it('does not flag a JSX attribute localized with triLang', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `function Sample() { return <Button accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити' })} />; }`,
    );

    expect(findings).toEqual([]);
  });

  it('flags a static configuration field rendered as UI copy', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `const card = { title: 'Начни заниматься', body: 'Всего несколько минут в день' };`,
    );

    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ context: 'object-copy', sample: 'Начни заниматься' }),
      expect.objectContaining({ context: 'object-copy', sample: 'Всего несколько минут в день' }),
    ]));
  });

  it('does not flag locale-keyed static configuration', () => {
    const findings = analyzeSourceText(
      'components/Sample.tsx',
      `const card = { title: { ru: 'Начни заниматься', uk: 'Почніть займатися' } };`,
    );

    expect(findings).toEqual([]);
  });
});

describe('heisenberg raw string audit: full repo scan (integration)', () => {
  it('finds no raw user-facing literals in components/CleanOnboarding.tsx', () => {
    const cleanOnboardingPath = path.join(ROOT, 'components', 'CleanOnboarding.tsx');
    expect(fs.existsSync(cleanOnboardingPath)).toBe(true);

    const report = buildRawStringAuditReport(ROOT, GENERATED_AT, []);

    const cleanOnboardingFindings = report.findings.filter(
      (finding) => finding.file === 'components/CleanOnboarding.tsx' && finding.kind === 'raw-cyrillic-literal',
    );

    expect(cleanOnboardingFindings).toEqual([]);
    expect(report.totalFindings).toBeGreaterThanOrEqual(1);
    expect(report.readOnly).toBe(true);
    expect(report.sourceMutationApplied).toBe(false);
    expect(report.scannedDirs).toEqual(['app', 'components']);
  });

  it('never touches source files while scanning (read-only)', () => {
    const cleanOnboardingPath = path.join(ROOT, 'components', 'CleanOnboarding.tsx');
    const before = fs.readFileSync(cleanOnboardingPath, 'utf8');

    buildRawStringAuditReport(ROOT, GENERATED_AT, []);

    const after = fs.readFileSync(cleanOnboardingPath, 'utf8');
    expect(after).toBe(before);
  });
});
