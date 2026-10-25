import fs from 'node:fs';
import path from 'node:path';

// зачем (владелец 25.10, макет account-delete-variant-b): выключатель новых окон удаления в «Пульте» — по умолчанию ВЫКЛ
// (включать только после выкладки сервера 713677ddd), пишется общим писателем remote_config/app.bools.
const html = fs.readFileSync(path.join(process.cwd(), 'admin/v2/legacy.html'), 'utf8');

describe('admin control panel: account delete variant B switch', () => {
  test('row is wired to the shared remote_config bool writer', () => {
    expect(html).toContain('id="cp-bool-account_delete_variant_b_ui_enabled"');
    expect(html).toContain("onchange=\"saveControlPanelBool('account_delete_variant_b_ui_enabled', this.checked)\"");
    expect(html).toContain('id="cp-bool-label-account_delete_variant_b_ui_enabled"');
  });

  test('defaults to off and is loaded with the other control panel toggles', () => {
    const start = html.indexOf('const CP_FEATURE_TOGGLES = [');
    const list = html.slice(start, html.indexOf('];', start));
    expect(list).toMatch(/key: 'account_delete_variant_b_ui_enabled',[^\n]*def: false/);
  });
});
