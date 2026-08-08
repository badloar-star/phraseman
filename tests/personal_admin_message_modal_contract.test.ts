import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'PersonalAdminMessageModal.tsx'),
  'utf8',
);

describe('personal admin message modal', () => {
  it('renders the typed localized app-message fields through the shared text helper', () => {
    expect(source).toContain("import { pickAppMessageText, type AppMessageWithState } from '../app/app_messages'");
    expect(source).toContain('const { lang } = useLang()');
    expect(source).toContain('pickAppMessageText(message, lang)');
    expect(source).not.toContain('message?.title');
    expect(source).not.toContain('message?.body');
  });
});
