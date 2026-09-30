export type PlayerProfileV2State =
  | 'self'
  | 'readonly'
  | 'stranger'
  | 'add-busy'
  | 'request-sent'
  | 'friend'
  | 'liked';

type StateInput = Readonly<{
  isMe: boolean;
  targetUid?: string | null;
  friendRequestBusy?: boolean;
  friendRequestSent?: boolean;
  isFriend?: boolean;
  liked?: boolean;
}>;

/** Pure view-state resolver. It never grants an action without a real target uid. */
export function resolvePlayerProfileV2State(input: StateInput): PlayerProfileV2State {
  if (input.isMe) return 'self';
  if (!String(input.targetUid ?? '').trim()) return 'readonly';
  if (input.isFriend) return 'friend';
  if (input.friendRequestBusy) return 'add-busy';
  if (input.friendRequestSent) return 'request-sent';
  if (input.liked) return 'liked';
  return 'stranger';
}

type RankInput = Readonly<{
  isMe: boolean;
  myRank?: number | null;
  publicRank?: number | null;
}>;

function validRank(value: number | null | undefined): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 19
    ? Number(value)
    : null;
}

/** Selects only the authority that owns the card; unknown stays unknown. */
export function resolvePlayerProfileVisibleRank(input: RankInput): number | null {
  return validRank(input.isMe ? input.myRank : input.publicRank);
}
