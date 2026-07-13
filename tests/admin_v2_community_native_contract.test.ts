import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string): string => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';

describe('Admin v2 native Community Operations', () => {
  test('ships isolated state, controller, view and seven guarded callables', () => {
    const state = read('admin/v2/scripts/admin-community-operations-state.js');
    const controller = read('admin/v2/scripts/admin-community-operations-controller.js');
    const view = read('admin/v2/scripts/admin-community-operations-view.js');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    expect(state).toContain('createCommunityOperationsState');
    expect(controller).toContain('createCommunityOperationsController');
    expect(view).toContain('renderCommunityOperationsWorkspace');
    for (const callable of [
      'adminGetCommunityOperationsWorkspace', 'adminGetCommunityOperationDetail', 'adminPreviewCommunityMutation',
      'adminRequestCommunityApproval', 'adminApproveCommunityMutation', 'adminApplyCommunityMutation', 'adminResumeCommunityBulk',
    ]) expect(firebase).toContain(callable);
  });

  test('covers all nine community capabilities with explicit refresh', () => {
    const state = read('admin/v2/scripts/admin-community-operations-state.js');
    const view = read('admin/v2/scripts/admin-community-operations-view.js');
    for (const id of ['mod-queue', 'help-board', 'helpers-board', 'clubs', 'league-chat', 'arena-ranks', 'arena-live', 'arena-bets', 'arena-rooms']) {
      expect(`${state}\n${view}`).toContain(id);
    }
    expect(view).toContain('data-community-mobile-view');
    expect(view).toContain('#safety-moderation');
  });

  test('never mutates Arena during read and guards destructive/economy actions', () => {
    const controller = read('admin/v2/scripts/admin-community-operations-controller.js');
    expect(controller).not.toMatch(/load[A-Za-z]*(?:cleanup|purge|delete|finish)/i);
    for (const permission of ['community.arena.destructive', 'community.arena.economy.write', 'community.approve']) {
      expect(controller).toContain(permission);
    }
    for (const field of ['idempotencyKey', 'expectedVersion', 'confirmation']) {
      expect(controller).toContain(field);
    }
    expect(controller).not.toContain("manifestFingerprint = 'server-owned'");
  });

  test('uses capability-specific Help, League and Arena controls without arbitrary JSON', () => {
    const controller = read('admin/v2/scripts/admin-community-operations-controller.js');
    const view = read('admin/v2/scripts/admin-community-operations-view.js');
    const backend = read('functions/src/admin_community_operations.ts');
    expect(view).not.toContain('community-payload');
    for (const action of ['help-comment-status', 'help-report-resolve', 'help-queue-status', 'help-restriction', 'help-admin-post', 'help-admin-comment', 'league-chat-report', 'league-chat-message-status', 'league-chat-restriction', 'league-chat-admin-message', 'arena-profile-resync', 'arena-placeholder-cleanup', 'arena-wager-flag', 'arena-session-finish', 'arena-room-close', 'arena-room-delete']) expect(`${controller}\n${view}\n${backend}`).toContain(action);
    expect(backend).toContain("row['stats.matchesPlayed']");
    expect(backend).toContain('row.matchesPlayed');
    expect(backend).toContain("'arena-rooms': ['arena_rooms_live', 'arena_room_members']");
    expect(backend).toContain('applyCommunitySubmissionModerationInTransaction');
    expect(backend).toContain('buildHelpBoardAdminTopic');
    expect(backend).toContain('buildHelpBoardAdminComment');
    expect(backend).toContain('buildLeagueChatAdminRestrictionPatch');
    expect(backend).toContain("['help-admin-post', 'help-admin-comment', 'league-chat-admin-message']");
    expect(backend).toContain('requires expectedVersion=missing');
    expect(backend).toContain("'help_board_moderation_queue'");
    expect(backend).toContain("collection('league_chat_messages').doc()");
    expect(backend).toContain("status: 'visible'");
    expect(view).toContain('request_changes');
    for (const control of ['community-help-restriction', 'community-target-lang', 'community-ui-lang', 'community-post-as-name', 'community-topic-id', 'community-reply-to-comment-id', 'community-compass-enabled', 'community-chat-restriction', 'community-chat-message-status', 'community-duration-hours', 'community-week-id', 'community-league-id']) expect(`${controller}\n${view}`).toContain(control);
    expect(view).toContain('data-topic-id');
    expect(view).toContain('data-reply-to');
    for (const canonicalValue of ['value="visible"', 'value="hidden"', 'value="deleted"', 'value="restrict"', 'value="clear"', 'value="mute"', 'value="ban"']) expect(view).toContain(canonicalValue);
  });
});
