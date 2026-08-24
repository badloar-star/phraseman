import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

describe('avatar 100 manifest', () => {
  it('builds the approved 100-entry taxonomy exactly', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-manifest-'));
    const out = path.join(tempDir, 'manifest.json');

    execFileSync(
      process.execPath,
      ['scripts/avatar-100/build-manifest.mjs', '--out', out],
      { cwd: path.resolve(__dirname, '..') },
    );

    const manifest = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(manifest.version).toBe(1);
    expect(manifest.entries).toHaveLength(100);
    expect(manifest.entries.map((entry: { assetIndex: number }) => entry.assetIndex))
      .toEqual(Array.from({ length: 100 }, (_, index) => index + 63));
    expect(new Set(manifest.entries.map((entry: { avatarId: string }) => entry.avatarId)).size)
      .toBe(100);

    const subjectCounts = Object.fromEntries(
      ['creature', 'artifact', 'mask', 'abstract'].map((type) => [
        type,
        manifest.entries.filter((entry: { subjectType: string }) => entry.subjectType === type).length,
      ]),
    );
    expect(subjectCounts).toEqual({
      creature: 30,
      artifact: 30,
      mask: 20,
      abstract: 20,
    });
    expect(manifest.entries.some((entry: { subjectType: string }) => entry.subjectType === 'person'))
      .toBe(false);

    for (let houseId = 1; houseId <= 10; houseId += 1) {
      const houseEntries = manifest.entries
        .filter((entry: { houseId: number }) => entry.houseId === houseId);
      expect(houseEntries).toHaveLength(10);
      expect(Object.fromEntries(
        ['creature', 'artifact', 'mask', 'abstract'].map((type) => [
          type,
          houseEntries.filter((entry: { subjectType: string }) => entry.subjectType === type).length,
        ]),
      )).toEqual({ creature: 3, artifact: 3, mask: 2, abstract: 2 });
    }

    expect(manifest.pilotAssetIndexes).toEqual([
      63, 74, 87, 100, 108, 120, 129, 137, 147, 157,
    ]);
  });
});
