import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const CLUB_CHAT_SOURCES = [
  path.join(ROOT, 'app', 'club_screen.tsx'),
  path.join(ROOT, 'components', 'LeagueChatPanel.tsx'),
  path.join(ROOT, 'app', 'use_league_chat_unread.ts'),
];

describe('league chat unread badge wiring', () => {
  it('shows the chat badge on the club league screen and clears it while chat is active', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'club_screen.tsx'), 'utf8');
    const hero = fs.readFileSync(path.join(ROOT, 'components', 'league', 'LeagueClubHero.tsx'), 'utf8');

    expect(source).toContain('useLeagueChatUnread');
    expect(source).toContain('active: chatModalVisible');
    expect(source).toContain('testID="league-chat-fullscreen"');
    expect(source).toContain('unreadCount: leagueChatUnreadCount');
    expect(hero).toContain('testID="club-chat-unread-badge"');
    expect(hero).toContain('formatLeagueChatUnreadBadge(model.unreadCount)');
  });

  it('shows the same unread count on the home league icon', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');
    const chatHub = fs.readFileSync(path.join(ROOT, 'components', 'CommunityChatHubButton.tsx'), 'utf8');

    expect(home).toContain('const homeLeagueChatUnreadCount = useLeagueChatUnread');
    expect(home).toContain('testID="home-league-chat-unread-badge"');
    expect(home).toContain('formatLeagueChatUnreadBadge(homeLeagueChatUnreadCount)');
    expect(chatHub).toContain('const leagueUnreadCount = useLeagueChatUnread');
    expect(chatHub).toContain("active: visible && tab === 'league'");
    expect(chatHub).toContain('testID="home-community-chat-unread-badge"');
    expect(chatHub).toContain('formatLeagueChatUnreadBadge(leagueUnreadCount)');
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
    expect(combined).toContain('initialRoom: leagueGroupMeta');
    expect(combined).toContain('initialRoom={leagueGroupMeta}');
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
