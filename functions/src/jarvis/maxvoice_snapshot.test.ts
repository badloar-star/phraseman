import { buildMaxvoiceSnapshot } from './maxvoice_snapshot';

const NOW = Date.UTC(2026, 7, 21, 12);

describe('Jarvis MAX snapshot — one fail-closed adapter', () => {
  test('the owner seal skips the stale source and produces no plan', async () => {
    const fetchMaxvoice = jest.fn(async () => { throw new Error('sealed source is stale'); });
    const result = await buildMaxvoiceSnapshot({ fetchMaxvoice, trigger: 'scheduled', nowMs: NOW });
    expect(fetchMaxvoice).not.toHaveBeenCalled();
    expect(result.decisions).toEqual([]);
  });
});
