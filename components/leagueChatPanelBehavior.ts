type LeagueChatConnectionInput = {
  hasRoom: boolean;
  roomAuthorized: boolean;
  roomAuthorizing: boolean;
  subscriptionError: boolean;
  sending: boolean;
  draft: string;
  draftBlocked: boolean;
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

export function getLeagueChatKeyboardAvoidingBehavior(
  _platform: string,
): 'padding' {
  return 'padding';
}
