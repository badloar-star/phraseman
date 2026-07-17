import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('home header shard placement', () => {
  it('puts the shard balance in the old leftmost inbox slot', () => {
    expect(source).not.toContain("import AppMessagesInbox from '../../components/AppMessagesInbox'");
    expect(source).not.toContain('<AppMessagesInbox />');
    const header = source.slice(source.indexOf('{/* ХЕДЕР:'), source.indexOf('{bannersJSX}'));
    const shards = header.indexOf("nav.push('/shards_shop')");
    const profile = header.indexOf('{renderHomeProfileButton()}');
    expect(shards).toBeGreaterThanOrEqual(0);
    expect(profile).toBeGreaterThan(shards);
    expect(header).toContain('<LingmanVideosButton />');
    expect(header).not.toContain('CommunityChatHubButton');
    expect(header).toContain('<NotificationCenterButton isHomeTabActive={isHomeOwner} homeFocusTick={focusTick} />');
  });
});
