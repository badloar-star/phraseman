import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'audit_borderless_surfaces.mjs');

type LedgerEntry = {
  id: string;
  file: string;
  category: string;
  suggestedCategory: string;
  tone: string | null;
  reason: string;
  status: string;
  scanState: string;
  history: Array<{ action: string }>;
};

function runAudit(root: string, scanOutput: string, ledger: string, extraArgs: string[] = []): void {
  execFileSync(
    process.execPath,
    [
      SCRIPT,
      '--root',
      root,
      '--scan-output',
      scanOutput,
      '--ledger',
      ledger,
      '--reconcile',
      ...extraArgs,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
}

describe('borderless surface audit', () => {
  it('finds production borders and excludes admin, dev, lab, and tester paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-border-audit-'));
    const appDir = path.join(tmp, 'app');
    const componentsDir = path.join(tmp, 'components');
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(componentsDir, { recursive: true });

    fs.writeFileSync(
      path.join(appDir, 'home.tsx'),
      `const styles = StyleSheet.create({
        card: {
          borderWidth: 1,
          borderColor: t.border,
        },
      });
      const devOnly = <View testID="home-dev-toggle" style={{ borderWidth: 1 }} />;`,
    );
    fs.writeFileSync(
      path.join(appDir, '_admin_lab.tsx'),
      `const styles = { card: { borderWidth: 1 } };`,
    );
    fs.writeFileSync(
      path.join(appDir, 'personal_plan_dev.tsx'),
      `const styles = { card: { borderWidth: 1 } };`,
    );
    fs.writeFileSync(
      path.join(componentsDir, 'PreviewAdminModal.tsx'),
      `const styles = { card: { borderWidth: 1 } };`,
    );
    fs.writeFileSync(
      path.join(componentsDir, 'Input.tsx'),
      `const styles = { input: { borderWidth: focused ? 2 : 0, borderColor: t.accent } };`,
    );
    fs.writeFileSync(
      path.join(componentsDir, 'DeepCard.tsx'),
      `function DeepCard() {
        ${Array.from({ length: 30 }, (_, index) => `const filler${index} = ${index};`).join('\n')}
        return <View style={{ borderWidth: 1 }} />;
      }`,
    );

    const scanOutput = path.join(tmp, 'latest-scan.json');
    const ledger = path.join(tmp, 'ledger.json');
    runAudit(tmp, scanOutput, ledger);

    const report = JSON.parse(fs.readFileSync(ledger, 'utf8')) as { entries: LedgerEntry[] };
    expect(report.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'app/home.tsx',
          category: 'UNREVIEWED',
          anchor: { kind: 'style', value: 'card' },
        }),
        expect.objectContaining({
          file: 'components/Input.tsx',
          suggestedCategory: 'KEEP_STATE',
        }),
        expect.objectContaining({
          file: 'components/DeepCard.tsx',
          anchor: { kind: 'component', value: 'DeepCard' },
        }),
      ]),
    );
    expect(report.entries.some((entry) => entry.file.includes('_admin_'))).toBe(false);
    expect(report.entries.some((entry) => entry.file.includes('_dev.'))).toBe(false);
    expect(report.entries.some((entry) => entry.file.includes('AdminModal'))).toBe(false);
    expect(report.entries.some((entry) => entry.id.includes('home-dev-toggle'))).toBe(false);
  });

  it('preserves reviewed fields across line movement and retains missing entries', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-border-reconcile-'));
    const appDir = path.join(tmp, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    const sourcePath = path.join(appDir, 'home.tsx');
    const scanOutput = path.join(tmp, 'latest-scan.json');
    const ledgerPath = path.join(tmp, 'ledger.json');
    const cardSource = `
      <View testID="home-stats-card" style={{ borderWidth: 1, borderColor: t.border }} />
    `;
    fs.writeFileSync(sourcePath, cardSource);

    runAudit(tmp, scanOutput, ledgerPath);
    const firstLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as {
      entries: LedgerEntry[];
    };
    const reviewed = firstLedger.entries[0];
    reviewed.category = 'MIGRATE';
    reviewed.tone = 'card';
    reviewed.reason = 'Ordinary stats card';
    reviewed.status = 'pending';
    reviewed.history = [{ action: 'reviewed' }];
    fs.writeFileSync(ledgerPath, `${JSON.stringify(firstLedger, null, 2)}\n`);

    fs.writeFileSync(sourcePath, `\n\n\n${cardSource}`);
    runAudit(tmp, scanOutput, ledgerPath);
    const movedLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as {
      entries: LedgerEntry[];
    };
    expect(movedLedger.entries[0]).toEqual(
      expect.objectContaining({
        id: reviewed.id,
        category: 'MIGRATE',
        tone: 'card',
        reason: 'Ordinary stats card',
        status: 'pending',
        scanState: 'present',
        history: [{ action: 'reviewed' }],
      }),
    );

    fs.writeFileSync(sourcePath, '<View testID="home-stats-card" />');
    runAudit(tmp, scanOutput, ledgerPath);
    const missingLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as {
      entries: LedgerEntry[];
    };
    expect(missingLedger.entries[0]).toEqual(
      expect.objectContaining({
        id: reviewed.id,
        category: 'MIGRATE',
        status: 'pending',
        scanState: 'missing',
      }),
    );
  });

  it('strict mode rejects a missing pending migration and accepts an explicitly migrated one', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-border-strict-'));
    const appDir = path.join(tmp, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    const sourcePath = path.join(appDir, 'home.tsx');
    const scanOutput = path.join(tmp, 'latest-scan.json');
    const ledgerPath = path.join(tmp, 'ledger.json');
    fs.writeFileSync(
      sourcePath,
      '<View testID="home-stats-card" style={{ borderWidth: 1, borderColor: t.border }} />',
    );
    runAudit(tmp, scanOutput, ledgerPath);

    const reviewedLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as {
      entries: LedgerEntry[];
    };
    reviewedLedger.entries[0].category = 'MIGRATE';
    reviewedLedger.entries[0].tone = 'card';
    reviewedLedger.entries[0].reason = 'Ordinary stats card';
    fs.writeFileSync(ledgerPath, `${JSON.stringify(reviewedLedger, null, 2)}\n`);
    fs.writeFileSync(sourcePath, '<View testID="home-stats-card" />');

    expect(() => runAudit(tmp, scanOutput, ledgerPath, ['--strict'])).toThrow();

    const pendingLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as {
      entries: LedgerEntry[];
    };
    pendingLedger.entries[0].status = 'migrated';
    pendingLedger.entries[0].history.push({ action: 'migrated' });
    fs.writeFileSync(ledgerPath, `${JSON.stringify(pendingLedger, null, 2)}\n`);

    expect(() => runAudit(tmp, scanOutput, ledgerPath, ['--strict'])).not.toThrow();
  });

  it('marks reconciliation ambiguous instead of guessing between matching anchors', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-border-ambiguous-'));
    const appDir = path.join(tmp, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    const sourcePath = path.join(appDir, 'home.tsx');
    const scanOutput = path.join(tmp, 'latest-scan.json');
    const ledgerPath = path.join(tmp, 'ledger.json');
    fs.writeFileSync(
      sourcePath,
      `<View testID="shared-card" style={{ borderWidth: 1 }} />
       <View testID="shared-card" style={{ borderWidth: 2 }} />`,
    );
    runAudit(tmp, scanOutput, ledgerPath);

    fs.writeFileSync(sourcePath, '<View testID="shared-card" style={{ borderWidth: 3 }} />');
    runAudit(tmp, scanOutput, ledgerPath);
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as { entries: LedgerEntry[] };

    expect(ledger.entries.filter((entry) => entry.scanState === 'ambiguous')).toHaveLength(2);
    expect(() => runAudit(tmp, scanOutput, ledgerPath, ['--strict'])).toThrow();
  });

  it('refuses to write audit artifacts outside the supplied root', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-border-path-'));
    fs.mkdirSync(path.join(tmp, 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'app', 'home.tsx'), 'const card = { borderWidth: 1 };');
    const outside = path.join(os.tmpdir(), `outside-border-scan-${Date.now()}.json`);
    const ledgerPath = path.join(tmp, 'ledger.json');

    expect(() => runAudit(tmp, outside, ledgerPath)).toThrow();
    expect(fs.existsSync(outside)).toBe(false);
  });

  it('keeps duplicate declaration IDs stable across an unchanged rescan', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-border-idempotent-'));
    const appDir = path.join(tmp, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(
      path.join(appDir, 'home.tsx'),
      `<View testID="shared-card" style={{ borderWidth: 1 }} />
       <View testID="shared-card" style={{ borderWidth: 1 }} />`,
    );
    const scanOutput = path.join(tmp, 'latest-scan.json');
    const ledgerPath = path.join(tmp, 'ledger.json');

    runAudit(tmp, scanOutput, ledgerPath);
    const first = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as { entries: LedgerEntry[] };
    runAudit(tmp, scanOutput, ledgerPath);
    const second = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as { entries: LedgerEntry[] };

    expect(second.entries.map((entry) => entry.id)).toEqual(first.entries.map((entry) => entry.id));
    expect(second.entries).toHaveLength(2);
    expect(second.entries.every((entry) => entry.scanState === 'present')).toBe(true);
  });

  it('does not transfer an earlier duplicate ID to a later border after removal', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-border-duplicate-removal-'));
    const appDir = path.join(tmp, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    const sourcePath = path.join(appDir, 'settings.tsx');
    const scanOutput = path.join(tmp, 'latest-scan.json');
    const ledgerPath = path.join(tmp, 'ledger.json');
    fs.writeFileSync(
      sourcePath,
      `function SettingsScreen() {
        const first = <View style={{ backgroundColor: red, borderWidth: 1, padding: 10 }} />;
        const second = <View style={{ backgroundColor: blue, borderWidth: 1, padding: 20 }} />;
        return <>{first}{second}</>;
      }`,
    );
    runAudit(tmp, scanOutput, ledgerPath);
    const firstLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as { entries: LedgerEntry[] };
    const secondEntry = firstLedger.entries.find((entry) => entry.id.endsWith(':2'));
    expect(secondEntry).toBeDefined();

    fs.writeFileSync(
      sourcePath,
      `function SettingsScreen() {
        const first = <View style={{ backgroundColor: red, borderWidth: 0, padding: 10 }} />;
        const second = <View style={{ backgroundColor: blue, borderWidth: 1, padding: 20 }} />;
        return <>{first}{second}</>;
      }`,
    );
    runAudit(tmp, scanOutput, ledgerPath);
    const nextLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) as { entries: LedgerEntry[] };

    expect(nextLedger.entries.find((entry) => entry.id === secondEntry?.id)?.scanState).toBe('present');
    expect(nextLedger.entries.filter((entry) => entry.scanState === 'missing')).toHaveLength(1);
    expect(nextLedger.entries).toHaveLength(2);
  });
});
