import { createDialogueV2LatencyTrace } from './dialogue_v2_latency_trace';

describe('Dialogue V2 latency trace privacy', () => {
  it('maps thrown provider details to an allowlisted code', async () => {
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const privateMessage = 'provider request failed for learner@example.com';
    const trace = createDialogueV2LatencyTrace({ scenarioId: 'social_01' }, () => 1_000);

    try {
      await expect(trace.span('model_config', async () => {
        throw Object.assign(new Error(privateMessage), { code: 'PRIVATE_PROVIDER_CODE' });
      })).rejects.toThrow(privateMessage);

      expect(consoleLog).toHaveBeenCalledWith(
        '[DLG-V2-LATENCY]',
        expect.stringContaining('"error":"unknown"'),
      );
      expect(JSON.stringify(consoleLog.mock.calls)).not.toContain(privateMessage);
      expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('PRIVATE_PROVIDER_CODE');
    } finally {
      consoleLog.mockRestore();
    }
  });
});
