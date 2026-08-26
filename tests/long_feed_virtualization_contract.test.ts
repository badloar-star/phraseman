import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('long feed responsiveness contract', () => {
  test('unbounded AI conversations use virtualized lists with dynamic UI in the footer', () => {
    const companion = read('app', 'ai_companion_session.tsx');
    const dialog = read('app', 'ai_dialog_session.tsx');

    expect(companion).toContain('const scrollRef = useRef<FlatList<UiMessage>>(null);');
    expect(companion).toContain('data={messages}');
    expect(companion).toContain('renderItem={({ item: m }) => {');
    expect(companion).toContain('ListFooterComponent={sending ? (');
    expect(companion).not.toContain('{messages.map((m, i) => {');

    expect(dialog).toContain('const scrollRef = useRef<FlatList<UiMessage>>(null);');
    expect(dialog).toContain('data={messages}');
    expect(dialog).toContain('renderItem={({ item: m, index: i }) => {');
    expect(dialog).toContain('ListFooterComponent={(sending || Boolean(lastErrorMessage)) ? (');
    expect(dialog).not.toContain('{messages.map((m, i) => {');
  });

  test('team inbox bounds embedded rendering and virtualizes its standalone list', () => {
    const inbox = read('components', 'AppMessagesInbox.tsx');
    const pageSize = inbox.match(/const EMBEDDED_MESSAGE_PAGE_SIZE = (\d+);/);

    expect(pageSize).not.toBeNull();
    expect(Number(pageSize?.[1])).toBeLessThanOrEqual(24);
    expect(inbox).toContain('messages.slice(pageStart, pageStart + EMBEDDED_MESSAGE_PAGE_SIZE)');
    expect(inbox).toContain('data={messages}');
    expect(inbox).toContain('renderItem={({ item: message }) => {');
    expect(inbox).toContain('accessibilityLabel={copy.previousPage}');
    expect(inbox).toContain('accessibilityLabel={copy.nextPage}');
  });

  test('home scroll does not churn timers while a gesture is active', () => {
    const home = read('app', '(tabs)', 'home.tsx');
    const start = home.indexOf('const handleHomeScroll = useCallback');
    const end = home.indexOf('const handleHomeScrollSettled', start);
    const hotPath = home.slice(start, end);

    expect(hotPath).not.toContain('setTimeout');
    expect(hotPath).not.toContain('clearTimeout');
    expect(hotPath).not.toContain('Date.now');
    expect(home).toContain('if (dailyPhraseCardVisibleRef.current === next) return;');
    expect(home).toContain('onScrollEndDrag={handleHomeScrollSettled}');
    expect(home).toContain('onMomentumScrollEnd={handleHomeScrollSettled}');
  });
});
