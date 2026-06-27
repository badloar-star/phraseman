import fs from 'node:fs';
import path from 'node:path';
import {
  createOptimisticLeagueChatMessage,
  getLeagueChatConnectionUi,
  getLeagueChatKeyboardAvoidingBehavior,
  getLeagueChatKeyboardOverlapInset,
  getLeagueChatKeyboardTopY,
  mergeLeagueChatOptimisticMessages,
} from '../components/leagueChatPanelBehavior';

const ROOT = path.resolve(__dirname, '..');

describe('league chat cache-first behavior', () => {
  it('renders the cached chat panel while authorization is still running', () => {
    const ui = getLeagueChatConnectionUi({
      hasRoom: true,
      roomAuthorized: false,
      roomAuthorizing: true,
      subscriptionError: false,
      sending: false,
      draft: 'hello',
      draftBlocked: false,
    });

    expect(ui.showBlockingConnectionState).toBe(false);
    expect(ui.canEditDraft).toBe(true);
    expect(ui.canSendDraft).toBe(false);
    expect(ui.shouldSubscribe).toBe(false);
  });

  it('enables sending after the cached room is authorized', () => {
    const ui = getLeagueChatConnectionUi({
      hasRoom: true,
      roomAuthorized: true,
      roomAuthorizing: false,
      subscriptionError: false,
      sending: false,
      draft: 'hello',
      draftBlocked: false,
    });

    expect(ui.canEditDraft).toBe(true);
    expect(ui.canSendDraft).toBe(true);
    expect(ui.shouldSubscribe).toBe(true);
  });

  it('opens an immediate shell without a room cache and blocks sending until a room is known', () => {
    const ui = getLeagueChatConnectionUi({
      hasRoom: false,
      roomAuthorized: false,
      roomAuthorizing: false,
      subscriptionError: false,
      sending: false,
      draft: 'hello',
      draftBlocked: false,
    });

    expect(ui.showBlockingConnectionState).toBe(false);
    expect(ui.canEditDraft).toBe(false);
    expect(ui.canSendDraft).toBe(false);
    expect(ui.shouldSubscribe).toBe(false);
  });

  it('keeps cached messages visible when the live subscription reconnects after an error', () => {
    const ui = getLeagueChatConnectionUi({
      hasRoom: true,
      roomAuthorized: true,
      roomAuthorizing: false,
      subscriptionError: true,
      sending: false,
      draft: '',
      draftBlocked: false,
    });

    expect(ui.showBlockingConnectionState).toBe(false);
    expect(ui.canEditDraft).toBe(true);
    expect(ui.shouldSubscribe).toBe(false);
  });

  it('uses platform-specific keyboard avoidance so the composer stays visible', () => {
    expect(getLeagueChatKeyboardAvoidingBehavior('ios')).toBe('padding');
    expect(getLeagueChatKeyboardAvoidingBehavior('android')).toBe('height');
  });

  it('computes only the real keyboard overlap for the nested league panel', () => {
    expect(getLeagueChatKeyboardOverlapInset(760, 520)).toBe(240);
    expect(getLeagueChatKeyboardOverlapInset(520, 520)).toBe(0);
    expect(getLeagueChatKeyboardOverlapInset(480, 520)).toBe(0);
    expect(getLeagueChatKeyboardTopY({ screenY: 520, height: 280 }, 800)).toBe(520);
    expect(getLeagueChatKeyboardTopY({ height: 280 }, 800)).toBe(520);
  });

  it('shows my sent message immediately as an optimistic league chat row', () => {
    const row = createOptimisticLeagueChatMessage(
      { groupId: 'group-a', weekId: '2026-W22', leagueId: 3 },
      {
        clientId: 'local-1',
        authorUid: 'me',
        authorAvatar: 'avatar-1',
        authorAura: 'aura-1',
        text: 'hello now',
        now: 1234,
      },
    );

    expect(row).toMatchObject({
      id: 'optimistic:local-1',
      groupId: 'group-a',
      weekId: '2026-W22',
      leagueId: 3,
      authorUid: 'me',
      authorAvatar: 'avatar-1',
      authorAura: 'aura-1',
      text: 'hello now',
      status: 'visible',
      createdAt: 1234,
      localStatus: 'sending',
    });
  });

  it('keeps optimistic messages visible until the server snapshot catches up', () => {
    const optimistic = createOptimisticLeagueChatMessage(
      { groupId: 'group-a', weekId: '2026-W22', leagueId: 3 },
      { clientId: 'local-1', authorUid: 'me', text: 'hello now', now: 1000 },
    );

    expect(mergeLeagueChatOptimisticMessages([], [optimistic]).map((m) => m.id)).toEqual([
      'optimistic:local-1',
    ]);

    const serverMessage = {
      ...optimistic,
      id: 'server-1',
      createdAt: 1600,
    };

    expect(mergeLeagueChatOptimisticMessages([serverMessage], [optimistic]).map((m) => m.id)).toEqual([
      'server-1',
    ]);
  });

  it('keeps the composer keyboard-safe through the fullscreen chat shell', () => {
    const panelSource = fs.readFileSync(path.join(ROOT, 'components', 'LeagueChatPanel.tsx'), 'utf8');
    const screenSource = fs.readFileSync(path.join(ROOT, 'app', 'club_screen.tsx'), 'utf8');

    expect(screenSource).toContain('presentationStyle="fullScreen"');
    expect(screenSource).toContain('testID="league-chat-fullscreen"');
    expect(screenSource).toContain("behavior={Platform.OS === 'ios' ? 'padding' : 'height'}");
    expect(panelSource).toContain('onFocus={handleComposerFocus}');
    expect(panelSource).toContain('testID="league-chat-composer"');
    expect(panelSource).not.toContain('measureInWindow');
    expect(panelSource).not.toContain('keyboardBottomInset');
  });

  it('adds optimistic chat rows before awaiting Firestore send', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'LeagueChatPanel.tsx'), 'utf8');

    expect(source).toContain('setOptimisticMessages((cur) =>');
    expect(source.indexOf('setOptimisticMessages((cur) =>')).toBeLessThan(
      source.indexOf('await sendLeagueChatMessage(room, text)'),
    );
    expect(source).not.toContain('Сообщение отправлено');
  });

  it('routes the blocking fallback through the cache-first connection helper', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'LeagueChatPanel.tsx'), 'utf8');

    expect(source).toContain('if (connectionUi.showBlockingConnectionState)');
    expect(source).not.toContain('if (!room || !roomAuthorized || roomAuthorizing || subscriptionError)');
  });

  it('does not authorize inside room resolution before returning the room', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'firestore_league_chat.ts'), 'utf8');
    const resolveBody = source.match(/export async function resolveMyLeagueChatRoom\(\)[\s\S]*?\n}/)?.[0] ?? '';

    expect(resolveBody).not.toContain('await authorizeLeagueChatRoom(room)');
  });

  it('caches successful room authorization and exposes an invalidation path for reconnect errors', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'firestore_league_chat.ts'), 'utf8');

    expect(source).toContain('ROOM_AUTH_CACHE_PREFIX');
    expect(source).toContain('DEFAULT_ROOM_AUTH_TTL_MS');
    expect(source).toContain('getLeagueChatAuthTtlMs');
    expect(source).toContain('loadCachedLeagueChatAuthorization');
    expect(source).toContain('forgetCachedLeagueChatAuthorization');
    expect(source).toContain('cachedStableId !== stableId');
    expect(source.indexOf('await loadCachedLeagueChatAuthorization(normalized, stableId)')).toBeLessThan(
      source.indexOf("const fn = callable<LeagueChatRoom & { stableId?: string }, { ok: boolean }>('leagueChatAuthorizeRoom')"),
    );
  });

  it('invalidates cached authorization before retrying after a live subscription error', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'LeagueChatPanel.tsx'), 'utf8');

    expect(source).toContain('forgetCachedLeagueChatAuthorization(room)');
  });
});
