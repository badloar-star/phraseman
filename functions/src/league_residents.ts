// Compatibility for the published 1.x league callables. Historic league
// rooms may contain synthetic residents, but new joins must never add them.
type MemberRecord = Record<string, unknown>;
type MembersMap = Record<string, MemberRecord>;

export function isResidentMember(uid: string, member: MemberRecord | undefined): boolean {
  return uid.startsWith('res_')
    || (uid.startsWith('bot_') && member?.isBot === true);
}

export function withoutResidents(members: MembersMap | undefined | null): MembersMap {
  return Object.fromEntries(Object.entries(members ?? {}).filter(([uid, member]) => !isResidentMember(uid, member)));
}

export function countLiveMembers(members: MembersMap | undefined | null): number {
  return Object.entries(withoutResidents(members)).filter(([, member]) => member.identityHidden !== true).length;
}

export function countVisibleMembers(members: MembersMap | undefined | null): number {
  return countLiveMembers(members);
}

export function fillRoomWithResidents(
  members: MembersMap | undefined | null,
  _groupId: string,
  _weekStartMs: number,
  _nowMs: number,
): MembersMap {
  return withoutResidents(members);
}
