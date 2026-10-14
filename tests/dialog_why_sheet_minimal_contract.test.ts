// зачем (владелец 14.10, «минимум ненужных элементов», MOCKUP_REQUIREMENTS §1; Макеты dialogs #20/#21):
// в шторке «Почему так» V2 нет меток «Разбор»/«Перевод» и нет счётчика «Осталось бесплатных разборов»;
// остаток показывает только пустой лимит (текст exhaustedText + «Открыть Plus»). Сработал — возвращать лишнее нельзя, спроси владельца.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('шторка «Почему так»: только нужное', () => {
  const sheet = read('components/dialogs/DialogWhySheet.tsx');

  it('меток «Разбор» и «Перевод» нет, разбор и перевод различает тон текста', () => {
    expect(sheet).not.toContain('explainLabel');
    expect(sheet).not.toContain('styles.kicker');
    expect(sheet).not.toContain("ru: 'Перевод'");
    expect(sheet).toContain('color: glass.secondary, fontSize: f.body, lineHeight: Math.round(f.body * 1.45), marginTop: 16');
  });

  it('V2-счётчика остатка нет ни в шторке, ни в экране, ни в словаре; пустой лимит по-прежнему объясняет exhaustedText и ведёт в Plus', () => {
    expect(sheet).not.toContain('plusGate.leftText');
    expect(sheet).not.toContain('leftText: string');
    expect(read('components/dialogs/DialogueV2SessionScreen.tsx')).not.toContain('whyLeft');
    expect(read('app/dialogue_v2_session_coaching_labels.ts')).not.toContain('whyLeft');
    expect(sheet).toContain('{plusGate.exhaustedText}');
    expect(sheet).toContain('plusGate.onOpenPlus');
  });
});
