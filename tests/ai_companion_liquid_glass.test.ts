import fs from 'fs';
import path from 'path';

describe('free conversation Liquid Glass surface', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'), 'utf8');

  it('uses the approved product-facing header without a companion label or quota', () => {
    expect(source).toContain("ru: 'Свободный разговор'");
    expect(source).not.toContain("ru: 'Компас'");
    expect(source).not.toContain("ru: 'Свободный диалог'");
    expect(source).not.toContain("10/10");
  });

  it('keeps the real conversation controls inside safe keyboard-aware glass surfaces', () => {
    expect(source).toContain('<SafeAreaView style={{ flex: 1 }}>');
    expect(source).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(source).toContain('glassFill(t.bgCard, 0.62)');
    expect(source).toContain('borderRadius: 20');
    expect(source).toContain('Что можно спросить');
    expect(source).toContain('onSubmitEditing={() => send(input)}');
  });
});
