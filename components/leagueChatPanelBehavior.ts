type LeagueChatConnectionInput = {
  hasRoom: boolean;
  roomAuthorized: boolean;
  roomAuthorizing: boolean;
  subscriptionError: boolean;
  sending: boolean;
  draft: string;
  draftBlocked: boolean;
};

type LeagueChatRoomLike = {
  groupId: string;
  weekId: string;
  leagueId: number;
};

export type LeagueChatMessageLike = {
  id: string;
  groupId: string;
  weekId: string;
  leagueId: number;
  authorUid: string;
  authorAuthUid?: string;
  authorName: string;
  authorAvatar?: string;
  authorAura?: string;
  text: string;
  status: 'visible' | 'review' | 'blocked' | 'deleted';
  reportCount?: number;
  createdAt: number;
  /** Реплай как в Telegram: денормализованная цитата исходного сообщения. */
  replyToMessageId?: string;
  replyToAuthorUid?: string;
  replyToAuthorName?: string;
  replyToText?: string;
  replyToKind?: 'user' | 'system';
};

export type OptimisticLeagueChatMessage = LeagueChatMessageLike & {
  localStatus: 'sending' | 'failed' | 'review';
};

type CreateOptimisticLeagueChatMessageInput = {
  clientId: string;
  authorUid: string;
  authorAuthUid?: string | null;
  authorName?: string;
  authorAvatar?: string | null;
  authorAura?: string | null;
  text: string;
  now: number;
};

export function getLeagueChatConnectionUi(input: LeagueChatConnectionInput) {
  const hasText = input.draft.trim().length > 0;
  const canEditDraft = input.hasRoom;
  const connectionReady =
    input.hasRoom &&
    input.roomAuthorized &&
    !input.roomAuthorizing &&
    !input.subscriptionError;

  return {
    showBlockingConnectionState: false,
    canEditDraft,
    canSendDraft: connectionReady && hasText && !input.sending && !input.draftBlocked,
    shouldSubscribe: connectionReady,
  };
}

export function createOptimisticLeagueChatMessage(
  room: LeagueChatRoomLike,
  input: CreateOptimisticLeagueChatMessageInput,
): OptimisticLeagueChatMessage {
  return {
    id: `optimistic:${input.clientId}`,
    groupId: room.groupId,
    weekId: room.weekId,
    leagueId: room.leagueId,
    authorUid: input.authorUid,
    authorAuthUid: input.authorAuthUid ?? undefined,
    authorName: input.authorName ?? '',
    authorAvatar: input.authorAvatar ?? undefined,
    authorAura: input.authorAura ?? undefined,
    text: input.text,
    status: 'visible',
    createdAt: input.now,
    localStatus: 'sending',
  };
}

function hasMatchingServerMessage(
  optimistic: OptimisticLeagueChatMessage,
  serverMessages: readonly LeagueChatMessageLike[],
): boolean {
  return serverMessages.some((serverMessage) => {
    if (serverMessage.id === optimistic.id) return true;
    return (
      serverMessage.authorUid === optimistic.authorUid &&
      serverMessage.text === optimistic.text &&
      Math.abs(serverMessage.createdAt - optimistic.createdAt) < 120_000
    );
  });
}

export function mergeLeagueChatOptimisticMessages<T extends LeagueChatMessageLike>(
  serverMessages: readonly T[],
  optimisticMessages: readonly OptimisticLeagueChatMessage[],
): Array<T | OptimisticLeagueChatMessage> {
  const unresolvedOptimistic = optimisticMessages.filter(
    (optimistic) => !hasMatchingServerMessage(optimistic, serverMessages),
  );
  return [...serverMessages, ...unresolvedOptimistic]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-80);
}

export function isOptimisticLeagueChatMessage(
  message: LeagueChatMessageLike,
): message is OptimisticLeagueChatMessage {
  return 'localStatus' in message;
}

export function getLeagueChatKeyboardAvoidingBehavior(
  platform: string,
): 'padding' | 'height' {
  return platform === 'ios' ? 'padding' : 'height';
}

type LeagueChatKeyboardCoordinates = {
  screenY?: number;
  height?: number;
} | null | undefined;

export function getLeagueChatKeyboardTopY(
  coordinates: LeagueChatKeyboardCoordinates,
  screenHeight: number,
): number {
  const screenY = coordinates?.screenY;
  if (typeof screenY === 'number' && Number.isFinite(screenY) && screenY > 0) {
    return screenY;
  }

  const height = coordinates?.height;
  if (
    typeof height === 'number' &&
    Number.isFinite(height) &&
    height > 0 &&
    Number.isFinite(screenHeight) &&
    screenHeight > height
  ) {
    return screenHeight - height;
  }

  return Number.POSITIVE_INFINITY;
}

export function getLeagueChatKeyboardOverlapInset(
  panelBottomY: number,
  keyboardTopY: number,
): number {
  if (!Number.isFinite(panelBottomY) || !Number.isFinite(keyboardTopY)) {
    return 0;
  }
  return Math.max(0, Math.ceil(panelBottomY - keyboardTopY));
}
