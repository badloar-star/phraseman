import fs from 'node:fs';
import path from 'node:path';

// зачем (владелец 25.10): выключатель кнопки «Не могу говорить» в «Пульте» — по умолчанию ВЫКЛ,
// пишется общим писателем remote_config/app.bools (ревизия + причина), без отдельной записи в Firestore.
const html = fs.readFileSync(path.join(process.cwd(), 'admin/v2/legacy.html'), 'utf8');

describe('admin control panel: «Не могу говорить» switch', () => {
  test('row is wired to the shared remote_config bool writer', () => {
    expect(html).toContain('id="cp-bool-learning_cant_speak_enabled"');
    expect(html).toContain("onchange=\"saveControlPanelBool('learning_cant_speak_enabled', this.checked)\"");
    expect(html).toContain('id="cp-bool-label-learning_cant_speak_enabled"');
  });

  test('defaults to off and is loaded with the other control panel toggles', () => {
    const list = html.slice(html.indexOf('const CP_FEATURE_TOGGLES = ['), html.indexOf('];', html.indexOf('const CP_FEATURE_TOGGLES = [')));
    expect(list).toMatch(/key: 'learning_cant_speak_enabled',[^\n]*def: false/);
  });
});
