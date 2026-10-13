// зачем (координатор 12.10, dialogs-011): окно «Энергия закончилась» на брифинге показывает настоящий ответ 'insufficient' при нулевой энергии; dev_energy_fail=1 подменяет его на «отказ»
// и даёт тост «Не получилось начать диалог» (журнал кадра: «confirmSpendOne(ai_dialog) → cancelled (dev_energy_fail)»). Ссылка dialogs-011 не должна содержать dev_energy_fail.
import fs from 'node:fs';
import path from 'node:path';

const steps = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'dev_links_r1_steps.py'), 'utf8');
const briefing = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_briefing.tsx'), 'utf8');

describe('dialogs-011: no-energy window on the briefing', () => {
  it('the link uses real zero energy on Free, without the dev refusal', () => {
    const line = steps.split(/\r?\n/).find((l) => l.startsWith("add('dialogs-011'"));
    expect(line).toBeDefined();
    // перепин 13.10 (№24): dc9b10b85 осознанно добавил dev_dialog_send=ok (сторож prod_write — старт сессии не в прод); смысл прежний — настоящий ноль энергии
    expect(line).toContain("'plus=off&energy=0&dev_dialog_send=ok'");
    expect(line).not.toContain('dev_energy_fail=1'); // параметр ссылки; слово в пометке note допустимо
  });

  it("the briefing opens the NoEnergy modal on 'insufficient' and logs the energy value and the branch", () => {
    expect(briefing).toMatch(/if \(result === 'insufficient'\) \{\s*setNoEnergy\(true\);/);
    expect(briefing).toContain("branch: result === 'cancelled' ? 'toast_start_failed' : result === 'insufficient' ? 'no_energy_modal' : 'open_session'");
    expect(briefing).toContain('energyNow');
  });
});
