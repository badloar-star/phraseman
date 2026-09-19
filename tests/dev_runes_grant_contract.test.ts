import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (relativePath: string): string => readFileSync(join(root, relativePath), 'utf8');

describe('DEV Hub real 5,000-rune grant', () => {
  test('is the first tool and routes one press through the server-confirmed rune projection', () => {
    const registry = read('components/dev/devToolRegistry.ts');
    const sheet = read('components/dev/DevHubSheet.tsx');
    const client = read('app/dev_runes_grant.ts');

    expect(registry).toContain("| 'grant-dev-runes'");
    expect(registry.indexOf("id: 'dev-runes-grant'")).toBeGreaterThan(-1);
    expect(registry.indexOf("id: 'dev-runes-grant'")).toBeLessThan(registry.indexOf("id: 'update-modal-preview'"));
    expect(registry).toContain("title: 'Добавить 5 000 рун'");
    expect(registry).toContain("action: 'grant-dev-runes'");
    expect(registry).toContain("testID: 'dev-grant-runes-5000'");

    expect(sheet).toContain("case 'grant-dev-runes':");
    expect(sheet).toContain('await grantRunesOnServerForDev(accountToken)');
    expect(sheet).toContain('const grantRunesInFlightRef = useRef(false);');
    expect(sheet).toContain('const devHubMountedRef = useRef(true);');
    expect(sheet).toContain('devHubMountedRef.current = true;');
    expect(sheet).toContain('if (devHubMountedRef.current) setBusy(false);');
    expect(sheet).toContain('if (busy || grantRunesInFlightRef.current');
    expect(sheet).toContain('grantRunesInFlightRef.current = true;');
    expect(sheet).toContain('grantRunesInFlightRef.current = false;');
    expect(sheet).toContain("(section.id === 'subscription' || section.id === 'dev-runes-grant')");
    expect(sheet).toMatch(/\}, \[account, [^\]]*busy,/);
    expect(client).toContain('export const DEV_RUNES_GRANT_AMOUNT = 5_000');
    expect(client).toContain("'devRunesGrant'");
    expect(client).toContain('createdAtMs');
    expect(client).toContain('mergeLevelSpinServerStars(token,');
    expect(client).toContain('isCurrentAccountGeneration(token, stableId)');
    expect(client).not.toMatch(/AsyncStorage|setItem\(|users\s*\.\s*doc|FieldValue|increment\(/);
  });

  test('server fixes the amount, fails closed, and uses only the unified append-only rune ledger', () => {
    const server = read('functions/src/dev_runes_grant.ts');
    const index = read('functions/src/index.ts');

    expect(server).toContain('export const DEV_RUNES_GRANT_AMOUNT = 5_000');
    expect(server).not.toMatch(/request\.data[^\n]*amount|rawAmount/);
    expect(server).toContain("const DEV_GRANT_FLAG = 'dev_shards_grant_enabled'");
    expect(server).toContain('isDevRunesGrantEnabled(configSnap.data())');
    expect(server).toContain("throw new HttpsError('permission-denied', 'dev_runes_grant_disabled')");
    expect(server).toContain('resolveStableUidForAuth(');
    expect(server).toContain('prepareStarOperations(');
    expect(server).toContain('commitStarOperations(');
    expect(server).toContain("reason: 'admin_grant'");
    expect(server).toContain("sourceKind: 'dev_runes_grant'");
    expect(server).toContain('earnedAtMs: createdAtMs');
    expect(server).not.toMatch(/\.update\([^)]*stars|\.set\([^)]*stars|FieldValue|increment\(/);
    expect(index).toContain('exports.devRunesGrant = devRunesGrant;');
  });
});
