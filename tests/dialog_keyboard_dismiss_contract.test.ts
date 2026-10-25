// зачем (жалоба владельца 25.10 «в диалогах нельзя смахнуть клавиатуру вниз, если я хочу убрать её»): оба экрана Диалогов прячут
// клавиатуру смахиванием ленты (iOS — interactive, Android — on-drag) и тапом мимо поля; журнал [DIALOG-KB] пишет показ, скрытие и чем скрыто.
import { readSource } from './helpers/read_source';

const session = readSource('components/dialogs/DialogueV2SessionScreen.tsx');
const freeform = readSource('components/dialogs/DialogueV2FreeformScreen.tsx');
const hook = readSource('components/dialogs/use_dialog_keyboard_log.ts');

describe('Диалоги: клавиатура убирается смахиванием и тапом мимо поля', () => {
  it.each([['сценарий', session], ['свободный разговор', freeform]])('%s: смахивание ленты прячет клавиатуру', (_name, src) => {
    expect(src).toContain("keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}");
    expect(src).toContain('keyboardShouldPersistTaps="handled"');
    expect(src).toContain("onScrollBeginDrag={() => markKeyboardCause('drag')}");
  });

  it('сценарий: слой ленты больше не выключен до конца диалога — тап мимо поля прячет клавиатуру, после конца ведёт к итогу', () => {
    expect(session).not.toContain("disabled={bottom !== 'ended' || !onOpenSummary}");
    expect(session).toContain("if (bottom === 'ended' && onOpenSummary) { onOpenSummary(); return; }");
    expect(session).toContain("markKeyboardCause('tap');\n              Keyboard.dismiss();");
  });

  it('[DIALOG-KB]: показ, скрытие и чем скрыто', () => {
    expect(hook).toContain("console.log(LOG, 'show'");
    expect(hook).toContain("console.log(LOG, 'hide', JSON.stringify({ screen, by: causeRef.current");
    expect(session).toContain("useDialogKeyboardLog('scenario')");
    expect(freeform).toContain("useDialogKeyboardLog('freeform')");
  });
});
