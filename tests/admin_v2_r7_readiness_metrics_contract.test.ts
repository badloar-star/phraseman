import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const generator = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'pages', 'content-generator.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
const firebase = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');

describe('Admin v2 R7 readiness metrics panel', () => {
  it('shows authoritative labels and honest deployment state with loading, empty and error handling', () => {
    for (const text of ['Готовность контролируемого запуска', 'Deployment не выполнялся', 'Попыток на принятый', 'Новые stages / legacy units', 'QA passed / failed', 'Исправления оператором', 'Задержка p50 / p95', 'Резервы дневного лимита', 'до 100 новых stages, 100 legacy units и 100 jobs', 'а не токены, деньги или выставленная стоимость', 'Остановить запуск или открыть откат']) expect(generator).toContain(text);
    expect(generator).toContain("readiness.state === 'loading'");
    expect(generator).toContain("readiness.state === 'error'");
    expect(generator).toContain('metrics?.isPartial');
    expect(generator).toContain('Выборка неполная');
    expect(generator).toContain('rolloutEligible');
    expect(generator).toContain('unavailable_not_collected');
    expect(generator).toContain('empty-state');
  });

  it('uses the bounded server callable instead of reading Firestore in the browser', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetContentFactoryRolloutMetrics')");
    expect(firebase).toContain('getFactoryRolloutMetrics');
    expect(core).toContain("action === 'load-content-readiness'");
    expect(firebase).not.toContain("collection(db, 'content_factory_stages'");
  });
});
