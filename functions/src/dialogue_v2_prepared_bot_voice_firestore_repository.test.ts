import { createHash } from 'node:crypto';

import {
  createDialogueV2PreparedBotVoiceFirestoreRepository,
} from './dialogue_v2_prepared_bot_voice_firestore_repository';
import type {
  DialogueV2PreparedBotVoiceCommittedTurn,
} from './dialogue_v2_prepared_bot_voice_selection';

const NOW_MS = Date.UTC(2026, 8, 27, 12, 0, 0);
const SESSION_ID = `d2s_${'S'.repeat(32)}`;
const TURN_ID = `d2t_${'T'.repeat(16)}`;
const SECOND_TURN_ID = `d2t_${'U'.repeat(16)}`;
const OWNER_BINDING = 'o'.repeat(64);
const REPLY_TEXT = 'You handled that beautifully.';

const sha256 = (value: string): string => (
  createHash('sha256').update(value, 'utf8').digest('hex')
);

class FakeTimestamp {
  constructor(private readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

type FakeReference = Readonly<{ path: string }>;

class FakeFirestore {
  readonly documents = new Map<string, Record<string, unknown>>();

  readonly transactionReads: string[][] = [];

  readonly transactionWrites: string[][] = [];

  collection(collectionPath: string) {
    return {
      doc: (id: string): FakeReference => ({ path: `${collectionPath}/${id}` }),
    };
  }

  async runTransaction<T>(operation: (transaction: {
    get(reference: FakeReference): Promise<Readonly<{ exists: boolean; data(): unknown }>>;
    create(reference: FakeReference, value: Record<string, unknown>): void;
    set(reference: FakeReference, value: Record<string, unknown>): void;
  }) => Promise<T>): Promise<T> {
    const reads: string[] = [];
    const staged = new Map<string, Record<string, unknown>>();
    const creates = new Set<string>();
    const result = await operation({
      get: async (reference) => {
        reads.push(reference.path);
        return {
          exists: this.documents.has(reference.path),
          data: () => this.documents.get(reference.path),
        };
      },
      create: (reference, value) => {
        if (this.documents.has(reference.path) || creates.has(reference.path)) {
          throw new Error('already_exists');
        }
        creates.add(reference.path);
        staged.set(reference.path, { ...value });
      },
      set: (reference, value) => {
        staged.set(reference.path, { ...value });
      },
    });
    this.transactionReads.push(reads);
    this.transactionWrites.push([...staged.keys()]);
    for (const [path, value] of staged) this.documents.set(path, value);
    return result;
  }
}

const committedTurn: DialogueV2PreparedBotVoiceCommittedTurn = Object.freeze({
  sessionId: SESSION_ID,
  turnId: TURN_ID,
  studyTarget: 'en',
  scenarioId: 'social_01',
  contentManifestSha256: 'a'.repeat(64),
  contentPackSha256: 'b'.repeat(64),
  replies: Object.freeze([
    Object.freeze({
      replyIndex: 0,
      personaId: 'host',
      personaVoiceMode: 'optional_prepared_voice' as const,
      groupPosition: 'direct' as const,
      text: REPLY_TEXT,
    }),
    Object.freeze({
      replyIndex: 1,
      personaId: 'friend',
      personaVoiceMode: 'optional_prepared_voice' as const,
      groupPosition: 'follow_up' as const,
      text: 'I agree.',
    }),
  ]),
});

const catalog = Object.freeze({
  schemaVersion: 'dialogue_v2_prepared_bot_voice_catalog.v1',
  releaseId: 'dialogue_v2_voice_2026_09_27_01',
  contentManifestSha256: committedTurn.contentManifestSha256,
  entries: Object.freeze([
    Object.freeze({
      studyTarget: 'en',
      scenarioId: 'social_01',
      contentPackSha256: committedTurn.contentPackSha256,
      personaId: 'host',
      preparedResponseId: 'social_01_host_milestone_01',
      responseKind: 'milestone',
      replyText: REPLY_TEXT,
      replyTextSha256: sha256(REPLY_TEXT),
      assetKey: 'social_01_host_milestone_01_en',
      assetSha256: 'c'.repeat(64),
      assetBytes: 4_096,
    }),
    Object.freeze({
      studyTarget: 'en',
      scenarioId: 'social_01',
      contentPackSha256: committedTurn.contentPackSha256,
      personaId: 'friend',
      preparedResponseId: 'social_01_friend_closing_01',
      responseKind: 'closing',
      replyText: 'I agree.',
      replyTextSha256: sha256('I agree.'),
      assetKey: 'social_01_friend_closing_01_en',
      assetSha256: 'd'.repeat(64),
      assetBytes: 3_200,
    }),
  ]),
});

type StoredTurnFixture = Readonly<{
  turnId: string;
  userText: string;
  assistantReplies: readonly Readonly<{ personaId: string; text: string }>[];
}>;

function sessionDocument(turns: readonly StoredTurnFixture[] = [
  {
    turnId: TURN_ID,
    userText: 'A durable learner message.',
    assistantReplies: committedTurn.replies.map(({ personaId, text }) => ({ personaId, text })),
  },
]) {
  return {
    schemaVersion: 1,
    sessionId: SESSION_ID,
    ownerBinding: OWNER_BINDING,
    studyTarget: 'en',
    scenarioId: 'social_01',
    createdAt: new FakeTimestamp(NOW_MS - 1_000),
    expiresAt: new FakeTimestamp(NOW_MS + 60_000),
    revision: 3,
    groupState: {
      schemaVersion: 1,
      turnCount: turns.length,
      lastSpeakerId: 'host',
      relevanceByPersonaId: { host: 3 },
    },
    turns,
    receipts: turns.map((turn, index) => ({
      turnId: turn.turnId,
      requestDigest: String(index + 1).repeat(64),
      claimToken: `d2c_${String.fromCharCode(65 + index).repeat(32)}`,
      claimExpiresAtMs: NOW_MS + 30_000,
      state: 'completed',
    })),
  };
}

function setup(overrides: Readonly<{
  authLink?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  session?: Record<string, unknown> | null;
  tombstone?: Record<string, unknown> | null;
}> = {}) {
  const db = new FakeFirestore();
  const authLink = Object.prototype.hasOwnProperty.call(overrides, 'authLink')
    ? overrides.authLink
    : { stable_id: 'stable-user' };
  const user = Object.prototype.hasOwnProperty.call(overrides, 'user')
    ? overrides.user
    : { firebaseAuthUid: 'auth-user' };
  const session = Object.prototype.hasOwnProperty.call(overrides, 'session')
    ? overrides.session
    : sessionDocument();
  if (authLink) db.documents.set('auth_links/auth-user', authLink);
  if (user) db.documents.set('users/stable-user', user);
  if (session) db.documents.set(`dialogue_v2_sessions/${SESSION_ID}`, session);
  if (overrides.tombstone) {
    db.documents.set('account_deletion_tombstones/stable-user', overrides.tombstone);
  }
  const repository = createDialogueV2PreparedBotVoiceFirestoreRepository({
    db: db as never,
    nowMs: () => NOW_MS,
    bindOwner: () => OWNER_BINDING,
    timestampFromMillis: (millis: number) => new FakeTimestamp(millis) as never,
  });
  return { db, repository };
}

const actor = Object.freeze({ authUid: 'auth-user', stableAccountId: 'stable-user' });

describe('Dialogue V2 prepared bot voice Firestore repository', () => {
  it('atomically persists one exact direct selection and its account-scoped UTC-day state', async () => {
    const { db, repository } = setup();

    const selection = await repository.selectAfterCommittedTurn(actor, committedTurn, catalog);

    expect(selection).toMatchObject({
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      replyIndex: 0,
      personaId: 'host',
      groupPosition: 'direct',
      dayKey: '2026-09-27',
    });
    expect(db.transactionWrites).toHaveLength(1);
    expect(db.transactionWrites[0]).toHaveLength(2);
    expect(db.transactionWrites[0]).toContain(
      'users/stable-user/dialogue_v2_bot_voice_claims/daily',
    );
    const turnPath = db.transactionWrites[0].find((path) => path.endsWith(
      `/turn_${sha256(`${SESSION_ID}\u0000${TURN_ID}`)}`,
    ));
    expect(turnPath).toBeDefined();
    const persisted = JSON.stringify([
      db.documents.get(turnPath!),
      db.documents.get('users/stable-user/dialogue_v2_bot_voice_claims/daily'),
    ]);
    expect(persisted).not.toContain(REPLY_TEXT);
    expect(persisted).not.toMatch(/audio|uri|assetKey|assetBytes|auth-user|stable-user/i);
  });

  it('replays the exact persisted selection without consuming or rewriting another slot', async () => {
    const { db, repository } = setup();
    const first = await repository.selectAfterCommittedTurn(actor, committedTurn, catalog);
    const dailyBefore = structuredClone(
      db.documents.get('users/stable-user/dialogue_v2_bot_voice_claims/daily'),
    );

    const replay = await repository.selectAfterCommittedTurn(actor, committedTurn, null);

    expect(replay).toEqual(first);
    expect(db.transactionWrites[1]).toEqual([]);
    expect(db.documents.get('users/stable-user/dialogue_v2_bot_voice_claims/daily'))
      .toEqual(dailyBefore);
  });

  it('keeps a different eligible turn text-only after the same UTC-day slot is claimed', async () => {
    const secondReply = 'A second eligible direct reply.';
    const secondTurn: DialogueV2PreparedBotVoiceCommittedTurn = Object.freeze({
      ...committedTurn,
      turnId: SECOND_TURN_ID,
      replies: Object.freeze([
        Object.freeze({ ...committedTurn.replies[0], text: secondReply }),
      ]),
    });
    const secondCatalog = {
      ...catalog,
      entries: [{
        ...catalog.entries[0],
        preparedResponseId: 'social_01_host_milestone_02',
        replyText: secondReply,
        replyTextSha256: sha256(secondReply),
        assetKey: 'social_01_host_milestone_02_en',
      }],
    };
    const { db, repository } = setup({
      session: sessionDocument([
        ...sessionDocument().turns,
        {
          turnId: SECOND_TURN_ID,
          userText: 'Another durable learner message.',
          assistantReplies: [{ personaId: 'host', text: secondReply }],
        },
      ]),
    });
    await repository.selectAfterCommittedTurn(actor, committedTurn, catalog);

    await expect(repository.selectAfterCommittedTurn(actor, secondTurn, secondCatalog))
      .resolves.toBeNull();
    expect(db.transactionWrites[1]).toEqual([]);
    expect([...db.documents.keys()].filter((path) => path.includes('/turn_'))).toHaveLength(1);
  });

  it('does not create daily or turn state when no reviewed server catalog selects audio', async () => {
    const { db, repository } = setup();

    await expect(repository.selectAfterCommittedTurn(actor, committedTurn, null))
      .resolves.toBeNull();

    expect(db.transactionWrites[0]).toEqual([]);
    expect([...db.documents.keys()].some((path) => (
      path.includes('/dialogue_v2_bot_voice_claims/')
    ))).toBe(false);
  });

  it('never promotes an eligible group follow-up when the direct reply is text-only', async () => {
    const directTextOnly: DialogueV2PreparedBotVoiceCommittedTurn = Object.freeze({
      ...committedTurn,
      replies: Object.freeze([
        Object.freeze({ ...committedTurn.replies[0], personaVoiceMode: 'text_only' as const }),
        committedTurn.replies[1],
      ]),
    });
    const { db, repository } = setup();

    await expect(repository.selectAfterCommittedTurn(actor, directTextOnly, catalog))
      .resolves.toBeNull();
    expect(db.transactionWrites[0]).toEqual([]);
  });

  it('requires the exact completed server-ledger turn inside the same transaction', async () => {
    const pendingSession = sessionDocument();
    pendingSession.receipts[0].state = 'pending';
    const { db, repository } = setup({ session: pendingSession });

    await expect(repository.selectAfterCommittedTurn(actor, committedTurn, catalog))
      .rejects.toThrow('dialogue_v2_bot_voice_turn_not_durable');
    expect(db.transactionWrites).toEqual([]);
  });

  it.each([
    ['missing auth link', { authLink: null }],
    ['wrong auth link', { authLink: { stable_id: 'other-user' } }],
    ['wrong stable owner', { user: { firebaseAuthUid: 'other-auth' } }],
    ['deletion tombstone', {
      tombstone: { status: 'pending', graceDeadlineMs: NOW_MS + 60_000 },
    }],
  ] as const)('fails closed on %s and performs no claim writes', async (_label, overrides) => {
    const { db, repository } = setup(overrides);

    await expect(repository.selectAfterCommittedTurn(actor, committedTurn, catalog))
      .rejects.toThrow();
    expect(db.transactionWrites).toEqual([]);
  });

  it('reads auth link, stable owner, deletion fences, terminal, session and claim state together', async () => {
    const { db, repository } = setup();

    await repository.selectAfterCommittedTurn(actor, committedTurn, catalog);

    expect(db.transactionReads).toHaveLength(1);
    expect(db.transactionReads[0]).toEqual(expect.arrayContaining([
      'auth_links/auth-user',
      'users/stable-user',
      'account_deletion_auth_markers/auth-user',
      'account_deletion_tombstones/stable-user',
      `dialogue_v2_sessions/${SESSION_ID}`,
      `dialogue_v2_session_terminals/${SESSION_ID}`,
      'users/stable-user/dialogue_v2_bot_voice_claims/daily',
    ]));
  });
});
