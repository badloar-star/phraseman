import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

type LedgerEntry = {
  id: string;
  file: string;
  category: string;
  status: string;
  scanState: string;
  reason?: string;
};

function readLedger(): { entries: LedgerEntry[] } {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'docs', 'reports', 'borderless_surface_inventory.json'), 'utf8'),
  ) as { entries: LedgerEntry[] };
}

describe('borderless production surface guard', () => {
  it('has no unreviewed, ambiguous, or pending migration rows', () => {
    const ledger = readLedger();
    const failures = ledger.entries.filter((entry) =>
      entry.category === 'UNREVIEWED' ||
      entry.scanState === 'ambiguous' ||
      (entry.category === 'MIGRATE' && entry.status !== 'migrated')
    );

    expect(failures).toEqual([]);
  });

  it('keeps every remaining border documented as semantic, structural, art, or special', () => {
    const ledger = readLedger();
    const failures = ledger.entries.filter((entry) =>
      /^(KEEP_|REVIEW_SPECIAL)/.test(entry.category) && !entry.reason?.trim()
    );

    expect(failures).toEqual([]);
  });

  it('records migrated decorative borders as missing from the fresh scan', () => {
    const ledger = readLedger();
    const failures = ledger.entries.filter((entry) =>
      entry.category === 'MIGRATE' &&
      (entry.status !== 'migrated' || entry.scanState !== 'missing')
    );

    expect(failures).toEqual([]);
  });
});
