# Arena Firestore Contract (Single Source of Truth)

This document defines canonical fields for the friend-room and invite flows.
Any client or backend change touching these collections must follow this contract.

## `arena_rooms/{roomId}`

- `roomId: string` — room code/id.
- `hostId: string` — owner uid (room creator).
- `hostName?: string` — owner display name.
- `guestId?: string` — joined player uid.
- `guestName?: string` — joined player display name.
- `status: 'waiting' | 'matched' | 'expired'` — room lifecycle state.
- `sessionId?: string` — created arena session id after successful match.
- `rankTier?: string` — optional rank context.
- `expiresAt?: number | Timestamp` — optional TTL boundary.
- `createdAt?: number | Timestamp` — creation timestamp.

Allowed client update fields:
- `guestId`, `guestName`, `status`, `sessionId`

## `arena_invites/{inviteId}`

- `fromUid: string` — inviter uid.
- `fromName?: string` — inviter display name.
- `toUid: string` — invitee uid.
- `toName?: string` — invitee display name.
- `roomId?: string` — optional linked room id.
- `status: 'pending' | 'accepted' | 'declined' | 'expired'` — invite state.
- `createdAt?: number | Timestamp` — creation timestamp.
- `updatedAt?: number | Timestamp` — update timestamp.

Allowed client update fields:
- `status`

## Notes

- Legacy `duel_*` collections are deprecated and must not be used for new logic.
- Session creation remains server-authoritative; client should only signal intent by
  updating room/invite state.
