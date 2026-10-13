// зачем (координатор 13.10, кадры cards-059 и итог D1; Сверка не шлёт настоящие жалобы и не ведёт живой диалог): dev-подмены только в __DEV__,
// без сети и без начислений: жалоба на демо-набор сразу идёт путём успеха, итог диалога рисует «+N монет» без записи в копилку и без отметки сессии.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const state = read('app/dev_dialog_state.ts');
const fixtures = read('app/dev_state_fixtures.ts');
const hook = read('hooks/useDialogueV2CoinReward.ts');
const modal = read('components/ReportPackModal.tsx');
const report = read('app/user_report.ts');

describe('dev-подмены: награда итога диалога и жалоба на демо-набор', () => {
  it('флаг награды живёт в dev-состоянии и в стор-сборке всегда выключен', () => {
    expect(state).toContain('coinsAward: boolean;');
    expect(state).toContain('export function isDevDialogCoinsAward(): boolean {\n  return devDialogAvailable() && state.coinsAward;\n}');
    expect(state).toMatch(/function devDialogAvailable\(\): boolean \{\s*return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;/);
  });

  it('ссылка dev_dialog_coins=award|off разбирается и выставляет флаг', () => {
    expect(fixtures).toContain("dialogCoins?: 'award' | 'off';");
    expect(fixtures).toContain("request.dialogCoins = pick('dev_dialog_coins', ['award', 'off'] as const);");
    expect(fixtures).toContain("setDevDialogState({ coinsAward: request.dialogCoins === 'award' })");
  });

  it('хук награды: dev-ветка ставит awarded ДО отметки сессии и копилки, ничего не пишет и пишет в журнал dev=skip_award', () => {
    const dev = hook.indexOf('if (isDevDialogCoinsAward()) {');
    const mark = hook.indexOf('markDialogueV2CoinsAwarded(owner, sessionId, amount)');
    const credit = hook.indexOf('practiceRunes.onCorrectAnswer(');
    expect(dev).toBeGreaterThan(-1);
    expect(dev).toBeLessThan(mark);
    expect(dev).toBeLessThan(credit);
    const branch = hook.slice(dev, hook.indexOf('}\n', dev + 40));
    expect(branch).toContain("setReward({ coins: amount, status: 'awarded' });");
    expect(branch).toContain('dev=skip_award');
    expect(branch).not.toContain('markDialogueV2CoinsAwarded');
    expect(branch).not.toContain('onCorrectAnswer');
  });

  it('жалоба на демо-набор не зовёт сеть (путь успеха уже в submitPackReport), журнал шторки помечает dev=skip_network', () => {
    expect(report).toContain('const devPackReport = devCommunityReportOutcome(params.packId);\n  if (devPackReport) return devPackReport;');
    expect(modal).toContain('const devSkipNetwork = isDevCommunityPackId(packId);');
    expect(modal).toContain("' dev=skip_network'");
  });
});
