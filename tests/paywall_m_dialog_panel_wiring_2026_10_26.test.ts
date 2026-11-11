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

  it('renders the dialog facts in the shared screen and has no M sheet', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toContain('paywallCFactCaption(mFlag, paywallMHeadKindForContext(ctx)');
    expect(screen).toContain('>{mFactCaption}</Text>');
    expect(screen).not.toContain('PaywallMSheet');
  });
});
