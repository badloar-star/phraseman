/**
 * Сторож крючков робота «Моих ошибок» (координатор 13.10, mistakes-panel-014/015/016).
 *
 * зачем: Сверка снимала «Верно/Неверно» тапом по координатам, а «Почему» упиралось в лимит ИИ. testID вариантов и
 * подмена `ai_explain=demo` дают кадры по шагам; признак верного варианта и демо-текст живут только в dev-сборке.
 */
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Мои ошибки»: крючки робота', () => {
  it('варианты практики: testID по номеру, признак верного — только в dev-сборке', () => {
    const kit = read('components/mistakes-panel/PracticeKit.tsx');
    expect(kit).toContain('`${testIDPrefix}-correct`');
    expect(kit).toContain('`${testIDPrefix}-wrong-${index}`');
    expect(kit).toContain('`${testIDPrefix}-${index}`');
    const screen = read('app/mistake_practice_session.tsx');
    expect(screen).toContain('testIDPrefix="mistake-practice-option"');
    expect(screen).toContain('devIsCorrect={__DEV__ && !IS_STORE_RELEASE ?');
  });

  it('ai_explain=demo: текст без сервера и без расхода разбора дня; стор-заглушка экспортирует те же имена', () => {
    const hook = read('app/use_mistake_explain.ts');
    const demoAt = hook.indexOf('const devDemoText = getDevAiExplainDemoText();');
    const callAt = hook.indexOf('await callExplainMistake(buildArgs(\'full\')');
    expect(demoAt).toBeGreaterThan(-1);
    expect(callAt).toBeGreaterThan(demoAt);
    const branch = hook.slice(demoAt, hook.indexOf('if (limitShown)', demoAt));
    expect(branch).toContain('releaseInFlight();');
    expect(branch).not.toContain('shouldConsumeFreeMistakeExplain');
    const stub = read('store_release_stubs/dev_state/dev_paywall_state_stub.ts');
    expect(stub).toContain('export function setDevAiExplainDemo(): boolean { return false; }');
    expect(stub).toContain('export function getDevAiExplainDemoText(): string | null { return null; }');
    expect(read('app/dev_state_fixtures.ts')).toContain("pick('ai_explain', ['limit', 'off', 'demo'] as const)");
  });
});
