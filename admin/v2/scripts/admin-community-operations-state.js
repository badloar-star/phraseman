export const COMMUNITY_OPERATION_CAPABILITIES = Object.freeze([
  'mod-queue', 'help-board', 'helpers-board', 'clubs', 'league-chat', 'arena-ranks', 'arena-live', 'arena-bets', 'arena-rooms',
]);
export function createCommunityOperationsState() {
  return { status: 'idle', capabilityId: 'mod-queue', workspace: null, detail: null, preview: null, approvalStatus: '', bulkProgress: null, error: '' };
}
