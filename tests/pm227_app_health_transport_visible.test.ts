jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/firebase', () => ({ recordError: jest.fn() }));
jest.mock('../app/client_reports', () => ({
  submitClientReport: jest.fn(async () => ({ ok: true, id: 'report_1' })),
}));

// зачем: PM-227-A2 — клиентская половина цепи «ошибка → очередь → транспорт». Вброшенный
// критический сбой обязан уйти в транспорт app_error с полями, которые показывает админка,
// а отказ транспорта — оставить след [APP-HEALTH] вместо немого catch.
async function load() {
  jest.resetModules();
  jest.clearAllMocks();
  const appHealth = await import('../app/app_health');
  const clientReports = await import('../app/client_reports');
  return { appHealth, submit: clientReports.submitClientReport as jest.Mock };
}

describe('PM-227 app health transport', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends an injected critical failure to the app_error transport with admin-visible fields', async () => {
    const { appHealth, submit } = await load();
    await appHealth.logAppCritical('pm227:injected_failure', new Error('PM-227 injected failure'), {
      feature: 'pm227',
      screen: 'probe',
    });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith('app_error', expect.objectContaining({
      context: 'pm227:injected_failure',
      feature: 'pm227',
      screen: 'probe',
      severity: 'critical',
      message: 'PM-227 injected failure',
      errorName: 'Error',
      fingerprint: expect.any(String),
    }));
  });

  it('logs a transport failure instead of swallowing it', async () => {
    const { appHealth, submit } = await load();
    submit.mockRejectedValueOnce(new Error('network down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await appHealth.logAppCritical('pm227:transport_down', new Error('boom'));
    expect(warn).toHaveBeenCalledWith('[APP-HEALTH]', 'transport_failed:pm227:transport_down', 'network down');
  });
});
