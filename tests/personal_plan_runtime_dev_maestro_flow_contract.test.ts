import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const FLOW_PATH = path.join(ROOT, 'maestro', 'flows', 'personal_plans', 'runtime_dev_smoke.yaml');

describe('personal plan runtime dev Maestro flow contract', () => {
  const flow = fs.readFileSync(FLOW_PATH, 'utf8');

  it('targets the Android app and opens the runtime route directly', () => {
    expect(flow).toContain('appId: app.phraseman');
    expect(flow).toContain('openLink: phraseman://personal_plan_runtime_dev');
  });

  it('checks the route identity and first runtime block', () => {
    expect(flow).toContain('assertVisible: "DEV · новый runtime"');
    expect(flow).toContain('assertVisible: "Гавань · день 1"');
    expect(flow).toContain('assertVisible: "Задания дня"');
    expect(flow).toContain('assertVisible: "Выбрать фразу"');
  });

  it('exercises answer, progress to the next block, and scoped reset', () => {
    expect(flow).toContain('id: "plan-runtime-choice-1"');
    expect(flow).toContain('id: "plan-runtime-submit"');
    expect(flow).toContain('assertVisible: "Верно. Идём дальше."');
    expect(flow).toContain('assertVisible: "Вставить слово"');
    expect(flow).toContain('id: "plan-runtime-reset"');
  });

  it('keeps the flow copy clean', () => {
    expect(flow).not.toMatch(/[ÃÂÐÑâ]/);
    expect(flow.toLowerCase()).not.toContain('placeholder');
    expect(flow.toLowerCase()).not.toContain('draft');
    expect(flow.toLowerCase()).not.toContain('черновик');
  });
});
