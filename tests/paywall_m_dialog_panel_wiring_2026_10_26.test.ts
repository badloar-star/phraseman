// зачем (координатор 26.10, 5 · ВХОД faf515267): панель «Разговор с ИИ» читает только параметры входа dialog_limit (итог лежит на телефоне) и ничего не запрашивает по сети;
// за тем же флагом paywall_m_enabled — отдельной развилки нет, панель выбирается внутри окна М.
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string): string => fs.readFileSync(path.join(path.resolve(__dirname, '..'), relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('пейвол М: подключение панели «Разговор с ИИ»', () => {
  it('экран берёт четыре параметра итога и кладёт их в факты окна М', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    for (const key of ['firstDialogMinutes', 'firstDialogTurns', 'firstDialogWas', 'firstDialogNow']) expect(screen).toContain(key);
    expect(screen).toContain('dialogMinutes: num(dialogMinutesParam), dialogPhrases: num(dialogTurnsParam)');
    // фраза — только парой «было → стало»: одна половина без другой не показывается
    expect(screen).toContain('correctionWas: was && now ? was : null, correctionNow: was && now ? now : null');
  });

  it('окно М показывает панель по виду «dialog» с ключами mc.dialog.*', () => {
    const sheet = read('components/paywall/m/PaywallMSheet.tsx');
    expect(sheet).toContain("panelKind === 'dialog'");
    expect(sheet).toContain("paywallMText(lang, 'mc.dialog.cta')");
    const panels = read('components/paywall/m/PaywallMPanels.tsx');
    for (const key of ['mc.dialog.kicker', 'mc.dialog.title', 'mc.dialog.body', 'mc.dialog.yourPhrase']) expect(panels).toContain(key);
  });

  it('панель не ходит в сеть и не читает хранилище сама', () => {
    const panels = read('components/paywall/m/PaywallMPanels.tsx');
    const block = panels.slice(panels.indexOf('export const PaywallMDialogPanel'), panels.indexOf('const S = StyleSheet.create'));
    expect(block).not.toMatch(/fetch\(|httpsCallable|firestore|AsyncStorage|trackEvent/);
  });
});
