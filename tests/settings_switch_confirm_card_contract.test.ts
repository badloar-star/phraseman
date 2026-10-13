// зачем (auth-gap-012, образец accounts-gaps-states.html switch = общее окно `.or-alert`): «Сменить аккаунт?» выглядит как
// GlassAlertCard — заголовок по центру, текст --sec по центру, кнопки-пилюли 44 в ряд; модал ОДИН на обе стадии (iOS), testID робота целы.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/settings.tsx'), 'utf8').replace(/\r\n/g, '\n');
const start = src.indexOf('testID="settings-switch-confirm-card"');
const card = src.slice(start, src.indexOf('</Modal>', start));

describe('Настройки: окно «Сменить аккаунт?» в виде общего окна', () => {
  it('один <Modal> на подтверждение и стирание — без второго модала', () => {
    expect(src).toContain("visible={switchAccountStage === 'confirm' || switchAccountStage === 'wiping'}");
    expect(start).toBeGreaterThan(0);
    expect(card).not.toContain('<Modal');
    expect(card).not.toContain('GlassAlertDialog');
    expect(card).not.toContain('ThemedConfirmModal');
  });

  it('карточка: плашка окна r25 с тенью, без кромки; заголовок 23/29 по центру', () => {
    expect(card).toContain('backgroundColor: glass.opaqueSheet,');
    expect(card).toContain('boxShadow: plateBoxShadow(glass),');
    expect(card).toContain('borderRadius: 25,');
    expect(card).not.toMatch(/borderWidth/);
    expect(card).toContain("fontSize: 23, lineHeight: 29, fontWeight: '800', textAlign: 'center'");
  });

  it('абзацы одного цвета --sec по центру, через 9', () => {
    const paragraphs = card.match(/color: glass\.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 9/g) ?? [];
    expect(paragraphs.length).toBe(3);
    expect(card).not.toContain('color: t.accentText, fontSize: f.body, lineHeight: 22');
  });

  it('кнопки — пилюли 44 в ряд; ghost «Отмена» и главная «Продолжить» с акцентом; testID робота сохранены', () => {
    expect(card).toContain("<View style={{ flexDirection: 'row', gap: 9, marginTop: 18 }}>");
    expect(card).toContain('testID="settings-switch-cancel"');
    expect(card).toContain('testID="settings-switch-continue"');
    expect(card).toContain('testID="settings-switch-plus-notice"');
    expect(card).toContain('backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass)');
    expect(card).toContain('backgroundColor: glass.accent, boxShadow: actionBoxShadow(glass)');
    expect(card).toContain('<ThemeAccentFill glass={glass} radius={22} />');
    expect((card.match(/minHeight: 44, borderRadius: 22/g) ?? []).length).toBe(2);
    expect(card).toContain("onPress={() => { doHaptic(); setSwitchAccountStage('idle'); }}");
  });
});
