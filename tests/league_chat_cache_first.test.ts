import fs from 'node:fs';
import path from 'node:path';
import {
  getLeagueChatConnectionUi,
  getLeagueChatKeyboardAvoidingBehavior,
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
});
