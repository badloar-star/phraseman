import { createHash } from 'node:crypto';
import { createDecisionPackZip } from './monthly_decision_pack_zip';
import { buildMonthlyDecisionPackFiles, resolveMonthlyReportingWindow } from './monthly_decision_pack_core';

describe('monthly decision pack zip', () => {
  const files = buildMonthlyDecisionPackFiles({
    window: resolveMonthlyReportingWindow({ timezone: 'UTC', month: '2026-06', asOfMs: Date.parse('2026-07-13T12:00:00Z') }),
    generatedAtMs: Date.parse('2026-07-13T12:00:00Z'),
    sources: [],
  });

  test('is byte deterministic and contains every governed filename', async () => {
    const a = await createDecisionPackZip(files);
    const b = await createDecisionPackZip(files);
    expect(a.equals(b)).toBe(true);
    expect(createHash('sha256').update(a).digest('hex')).toBe(createHash('sha256').update(b).digest('hex'));
    for (const filename of Object.keys(files)) expect(a.includes(Buffer.from(filename))).toBe(true);
  });

  test('rejects oversized uncompressed content before returning a partial archive', async () => {
    const oversized = { ...files, 'notable_changes.json': 'x'.repeat(12 * 1024 * 1024 + 1) };
    await expect(createDecisionPackZip(oversized)).rejects.toThrow('decision_pack_uncompressed_limit');
  });
});
