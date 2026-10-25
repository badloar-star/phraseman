import fs from 'node:fs';
import path from 'node:path';

// зачем («Перевести» по тапу в свободном разговоре, 25.10): выключатель в «Пульте» — по умолчанию ВЫКЛ (вызов перевода есть
// только на новом сервере), пишется общим писателем remote_config/app.bools (ревизия + причина), без отдельной записи в Firestore.
const html = fs.readFileSync(path.join(process.cwd(), 'admin/v2/legacy.html'), 'utf8');

describe('admin control panel: freeform translate switch', () => {
  test('row is wired to the shared remote_config bool writer', () => {
    expect(html).toContain('id="cp-bool-dialogue_freeform_translate_enabled"');
    expect(html).toContain("onchange=\"saveControlPanelBool('dialogue_freeform_translate_enabled', this.checked)\"");
    expect(html).toContain('id="cp-bool-label-dialogue_freeform_translate_enabled"');
  });

  test('defaults to off and is loaded with the other control panel toggles', () => {
    const start = html.indexOf('const CP_FEATURE_TOGGLES = [');
    const list = html.slice(start, html.indexOf('];', start));
    expect(list).toMatch(/key: 'dialogue_freeform_translate_enabled',[^\n]*def: false/);
  });
});
