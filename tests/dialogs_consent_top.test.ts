// зачем (владелец 22.10: верх листа «Включить AI-диалоги?» — вариант «в» «живой мини-диалог»; координатор: за флагом DIALOGS_SCENE_V2_ENABLED, логику согласия не трогать):
// сторож — флаг решает ТОЛЬКО иллюстрацию, обработчики/тексты/кнопки листа прежние, верх не ловит касания и не содержит букв-заглушек, подложка у сцены и листа общая.
import { readFileSync } from 'fs';

const read = (rel: string): string => readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');

describe('Лист согласия на AI-диалоги: верх «живой мини-диалог»', () => {
  const modal = read('components/AiDialogConsentModal.tsx');
  const top = read('components/dialogs/scene/DialogsConsentTop.tsx');
  const stage = read('components/dialogs/scene/DialogsSceneStage.tsx');

  it('флаг выбирает только иллюстрацию: при выключенном — прежние пузыри без обёртки', () => {
    expect(modal).toMatch(/illustration=\{DIALOGS_SCENE_V2_ENABLED\s*\n\s*\? <DialogsConsentTop><DialogueConsentChatReplay key=\{replayKey\} lang=\{lang\} variant=\{replayKey\} \/><\/DialogsConsentTop>\s*\n\s*: <DialogueConsentChatReplay key=\{replayKey\} lang=\{lang\} variant=\{replayKey\} \/>\}/);
  });
  it('логика согласия не тронута: обработчики, превью и показ один раз как были', () => {
    expect(modal).toMatch(/onAccept=\{previewOnly \? closePreview : onAccept\}/);
    expect(modal).toMatch(/onDecline=\{previewOnly \? closePreview : onDecline\}/);
    expect(modal).toMatch(/const previewOnly = !visible;/);
    expect(modal).toMatch(/const modalVisible = visible \|\| \(devReplay && active && replay\.visible\);/);
    expect(modal).not.toMatch(/setAiDialogConsent|recordAiDialogConsent/);
  });
  it('верх: герой в углу 70×70 не ловит касания, отступ справа 92 под героя, подложка общая со сценой', () => {
    expect(top).toMatch(/pointerEvents="none" style=\{s\.corner\}/);
    expect(top).toMatch(/const CORNER = 70;/);
    expect(top).toMatch(/paddingRight: 92/);
    expect(top).toMatch(/resolveDialogsSceneArt\('consent'/);
    expect(top).toMatch(/<DialogsSceneBackdrop colors=\{colors\} idPrefix="dlgConsent" \/>/);
    expect(stage).toMatch(/<DialogsSceneBackdrop colors=\{c\} idPrefix="dlgScene" \/>/);
  });
  it('без букв-заглушек, обводок и сжатия шрифта', () => {
    expect(top).not.toMatch(/<Text/);
    expect(top).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
  });
});
