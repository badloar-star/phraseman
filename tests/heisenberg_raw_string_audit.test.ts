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
});

describe('heisenberg raw string audit: full repo scan (integration)', () => {
  it('finds at least one raw-cyrillic-literal in components/CleanOnboarding.tsx', () => {
    const cleanOnboardingPath = path.join(ROOT, 'components', 'CleanOnboarding.tsx');
    expect(fs.existsSync(cleanOnboardingPath)).toBe(true);

    const report = buildRawStringAuditReport(ROOT, GENERATED_AT, []);

    const cleanOnboardingFindings = report.findings.filter(
      (finding) => finding.file === 'components/CleanOnboarding.tsx' && finding.kind === 'raw-cyrillic-literal',
    );

    expect(cleanOnboardingFindings.length).toBeGreaterThanOrEqual(1);
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
