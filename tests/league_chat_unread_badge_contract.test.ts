import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const CLUB_CHAT_SOURCES = [
  path.join(ROOT, 'components', 'LeagueChatPanel.tsx'),
  path.join(ROOT, 'app', 'use_league_chat_unread.ts'),
];

describe('league chat unread badge wiring', () => {
  it('keeps league chat disabled out of the active club league screen', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'club_screen.tsx'), 'utf8');

    expect(source).not.toContain('useLeagueChatUnread');
    expect(source).not.toContain('chatModalVisible');
    expect(source).not.toContain('testID="league-chat-fullscreen"');
    expect(source).not.toContain('leagueChatUnreadCount');
    expect(source).not.toContain('club-chat-unread-badge');
  });

  it('does not wire league chat unread counts into home or the community hub', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');
    const chatHub = fs.readFileSync(path.join(ROOT, 'components', 'CommunityChatHubButton.tsx'), 'utf8');

    expect(home).not.toContain('useLeagueChatUnread');
    expect(home).not.toContain('testID="home-league-chat-unread-badge"');
    expect(home).not.toContain('formatLeagueChatUnreadBadge');
    expect(chatHub).not.toContain('useLeagueChatUnread');
    expect(chatHub).not.toContain("active: visible && tab === 'league'");
    expect(chatHub).not.toContain('testID="home-community-chat-unread-badge"');
    expect(chatHub).not.toContain('formatLeagueChatUnreadBadge');
  });

  it('keeps unread badges snapshot-only so home and club do not authorize or subscribe to live chat', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'use_league_chat_unread.ts'), 'utf8');

    expect(source).not.toContain('authorizeLeagueChatRoom');
    expect(source).not.toContain('subscribeLeagueChatMessages');
    expect(source).not.toContain('resolveMyLeagueChatRoom');
    expect(source).not.toContain('ensureStableAuthLink');
  });

  it('keeps club chat room seeding out of runtime locale audit noise', () => {
    const combined = CLUB_CHAT_SOURCES
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    const legacyRoomProp = ['fall', 'backRoom'].join('');
    const legacyRussianComment = new RegExp(`\\b${['fall', 'back'].join('')}\\\\?'?а\\b`);

    expect(combined).not.toContain(legacyRoomProp);
    expect(combined).not.toMatch(legacyRussianComment);
    expect(combined).not.toContain('initialRoom: leagueGroupMeta');
    expect(combined).not.toContain('initialRoom={leagueGroupMeta}');
  });

  it('renders league chat as a flat Threads-style feed with inline reactions and a Compass AI post', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components', 'LeagueChatPanel.tsx'), 'utf8');
    const reactions = fs.readFileSync(path.join(ROOT, 'components', 'LeagueChatReactions.tsx'), 'utf8');
    const compass = fs.readFileSync(path.join(ROOT, 'components', 'LeagueChatCompassPost.tsx'), 'utf8');

    // Threads-стиль: сообщения — плоская лента слева (flex:1), реакции inline compact,
    // без пузырей/рамок и без лево/право-выравнивания по isMine.
    expect(panel).toContain('compact');
    expect(panel).toContain('flex: 1, minWidth: 0');
    expect(panel).not.toContain('sideOffset');
    // Метка времени в строке автора («имя · время»).
    expect(panel).toContain('timeLabelText');

    expect(reactions).toContain('compact?: boolean');
    expect(reactions).toContain("flexWrap: compact ? 'nowrap' : 'wrap'");

    // Пост Компаса: аватар + бейдж «AI», плоский акцентный фон, без рамки-пузыря.
    expect(compass).toContain("import { compassIconSource } from '../constants/weeklyCompassIcons';");
    expect(compass).toContain('compassIconSource(themeMode)');
    expect(compass).not.toContain('borderBottomLeftRadius: 6');
  });
});
