// зачем (Макеты 43b9b135b, 12.10): onboarding-009 (greet=Alex), community-020 (плашка DEV и «Нашёл ошибку?» не в кадрах при overlays=off); рабочий флажок Шпиля остаётся в любой сборке.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('вопросы Макетов 12.10', () => {
  it('onboarding-009: приветствие читает dev greet= и при прямом открытии шага (без входа)', () => {
    const src = read('components/CleanOnboarding.tsx');
    expect(src).toContain('const name = greetName ?? getDevGreetName() ?? firstNameOf(peekLinkedAuthFromCurrentUser()?.displayName);');
  });

  it('community-020: плашка DEV «Вместе» скрыта при overlays=off', () => {
    const src = read('app/(tabs)/friends.tsx');
    expect(src).toContain('{ENABLE_DEV_TOOLS && !isDevOverlaysOff() && (');
    expect(src).toContain("import { isDevOverlaysOff } from '../dev_overlays_off';");
  });

  it('«Нашёл ошибку?» скрыт при overlays=off, но не флажок Шпиля с собственным транспортом (submitOverride)', () => {
    const src = read('components/ReportErrorButton.tsx');
    expect(src).toContain('if (!props.submitOverride && isDevOverlaysOff()) {');
    expect(src).toContain("import { isDevOverlaysOff } from '../app/dev_overlays_off';");
    const gate = src.indexOf('function ReportErrorButtonGate');
    expect(gate).toBeGreaterThan(-1);
    // шпилёвский флажок монтируется с submitOverride и variant icon-flag — гейт его не прячет ни стором, ни overlays=off
    const spire = read('modules/spire/SpireTaskReportButton.tsx');
    expect(spire).toContain('variant="icon-flag"');
    expect(spire).toContain('submitOverride={async');
    const step = read('components/spire/SpireStepScreen.tsx');
    expect(step).toContain('testID={`spire-task-report-${runner.displayTaskIndex}`}');
  });
});
