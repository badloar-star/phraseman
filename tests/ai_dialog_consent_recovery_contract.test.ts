import fs from 'fs';
import path from 'path';

const gateSource = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_consent_gate.tsx'), 'utf8');

describe('AI dialog consent recovery', () => {
  it('gives a declined user a clear path to restore consent in privacy settings', () => {
    expect(gateSource).toContain('Вы выключили AI-диалоги в настройках приватности');
    expect(gateSource).toContain('Открыть настройки приватности');
    expect(gateSource).toContain("router.push('/privacy_settings' as never)");
    expect(gateSource).toContain('accessibilityLabel');
    expect(gateSource).toContain('backgroundColor: t.accent');
    expect(gateSource).toContain('color={t.correctText}');
  });
});
