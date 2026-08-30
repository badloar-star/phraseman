import fs from 'fs';
import path from 'path';

describe('ai companion history contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'), 'utf8');

  it('keeps infrastructure errors outside the assistant transcript', () => {
    expect(source).toContain('const [lastErrorMessage, setLastErrorMessage]');
    expect(source).toContain('setLastErrorMessage(getPremiumDialogErrorMessage');
    expect(source).not.toMatch(/setMessages\(\(prev\) => \[\s*\.\.\.prev,\s*\{ role: 'assistant', text: getPremiumDialogErrorMessage/s);
  });

  it('renders the latest infrastructure error as a separate system notice', () => {
    expect(source).toContain('testID="ai-companion-system-error"');
    expect(source).toContain('{lastErrorMessage ? (');
  });

  it('records companion quality metadata without transcript content', () => {
    expect(source).toContain("trackEvent('ai_dialog_reply_quality'");
    expect(source).toContain("mode: 'companion'");
    expect(source).not.toContain('ai_dialog_reply_quality_text');
  });
});
