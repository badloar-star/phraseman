// зачем (R1 dialogs-038, Ядро 12.10): при показе клавиатуры лента диалога докручивается к последней реплике (содержимое не растёт, сжимается область — onContentSizeChange не срабатывал).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/dialogs/DialogueV2SessionScreen.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('диалог: клавиатура и прокрутка ленты', () => {
  it('на показ клавиатуры — scrollToEnd после сжатия области (iOS 120 мс, Android сразу), с журналом', () => {
    const at = src.indexOf("[DIALOGUE-KEYBOARD] show");
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, at + 900);
    expect(block).toContain("const settleMs = Platform.OS === 'ios' ? 120 : 0;");
    expect(block).toContain('scrollRef.current?.scrollToEnd({ animated: true });');
    expect(block).toContain('[DIALOGUE-KEYBOARD] scroll_to_end after show');
    // прежняя прокрутка при росте содержимого осталась
    expect(src).toContain('onContentSizeChange={scrollToEnd}');
  });
});
