export type FriendSheetSession<T extends { uid: string }> = {
  uid: string;
  visible: boolean;
  fallbackProfile: T;
};

export type FriendSheetPendingAction<T extends { uid: string }> = {
  kind: 'gift' | 'delete' | 'duel';
  profile: T;
};

export function createFriendSheetSession<T extends { uid: string }>(profile: T): FriendSheetSession<T> {
  return { uid: profile.uid, visible: true, fallbackProfile: profile };
}

export function hideFriendSheetSession<T extends { uid: string }>(
  session: FriendSheetSession<T> | null,
  uid: string,
): FriendSheetSession<T> | null {
  if (!session || session.uid !== uid || !session.visible) return session;
  return { ...session, visible: false };
}

export function completeFriendSheetSession<T extends { uid: string }>(
  session: FriendSheetSession<T> | null,
  uid: string,
): FriendSheetSession<T> | null {
  if (!session || session.uid !== uid || session.visible) return session;
  return null;
}

export function resolveFriendSheetProfile<T extends { uid: string }>(
  session: FriendSheetSession<T>,
  currentProfiles: readonly T[],
): T {
  return currentProfiles.find(profile => profile.uid === session.uid) ?? session.fallbackProfile;
}

export function isCurrentFriendSheetMember(
  uid: string,
  currentFriends: readonly { uid: string }[],
  devBots: readonly { uid: string }[],
): boolean {
  return currentFriends.some(friend => friend.uid === uid) || devBots.some(bot => bot.uid === uid);
}

export function queueFirstFriendSheetAction<T extends { uid: string }>(
  existing: FriendSheetPendingAction<T> | null,
  next: FriendSheetPendingAction<T>,
): FriendSheetPendingAction<T> {
  return existing ?? next;
}
