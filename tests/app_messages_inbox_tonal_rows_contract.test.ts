import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'components', 'AppMessagesInbox.tsx'), 'utf8');

describe('AppMessagesInbox tonal row surfaces', () => {
  it('keeps message rows as borderless semantic panels', () => {
    expect(SOURCE).toContain('cardStrong:');
    expect(SOURCE).toContain('readCard:');
    expect(SOURCE).toContain('const rowBackgroundColor = messageRead ? chrome.readCard : chrome.cardStrong;');
    expect(SOURCE).not.toContain('const rowBorderColor =');
    expect(SOURCE).not.toContain('borderColor: rowBorderColor');
    expect(SOURCE).toContain('messageRow: {');
    expect(SOURCE).toContain('borderWidth: 0,');
  });
});
