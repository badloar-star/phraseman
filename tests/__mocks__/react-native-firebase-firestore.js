/**
 * Jest stub: real @react-native-firebase/firestore is ESM; Node test env loads this via moduleNameMapper.
 *
 * Test hooks for claimDailyTasksAllShardsReward (runTransaction):
 *   firestore.__testState = { rewardClaimExists: boolean, userDocExists: boolean, userShards: number | null }
 *   firestore.__resetTestState()
 */

/** @type {{ rewardClaimExists: boolean; userDocExists: boolean; userShards: number | null; userShardsUpdatedAtMs: number | null; userShardsUpdatedOp: string | null; userShardsUpdatedReason: string | null; runTransactionCalls: number; transactionGetBarrier: Promise<void> | null; transactionReturnBarrier: Promise<void> | null; userDocPaths: string[] }} */
const testState = {
  rewardClaimExists: false,
  userDocExists: true,
  userShards: 0,
  userShardsUpdatedAtMs: null,
  userShardsUpdatedOp: null,
  userShardsUpdatedReason: null,
  runTransactionCalls: 0,
  transactionGetBarrier: null,
  transactionReturnBarrier: null,
  userDocPaths: [],
};

function applySet(path, data) {
  if (path.includes('/reward_claims/')) {
    testState.rewardClaimExists = true;
  }
  if (/^users\/[^/]+$/.test(path)) {
    testState.userDocPaths.push(path);
    if (Object.prototype.hasOwnProperty.call(data, 'shards')) {
      testState.userShards = data.shards;
      testState.userDocExists = true;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'shards_updated_at_ms')) {
      testState.userShardsUpdatedAtMs = data.shards_updated_at_ms;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'shards_updated_op')) {
      testState.userShardsUpdatedOp = data.shards_updated_op;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'shards_updated_reason')) {
      testState.userShardsUpdatedReason = data.shards_updated_reason;
    }
  }
}

function createRef(path) {
  const ref = {
    __path: path,
    collection(sub) {
      return createRef(`${path}/${sub}`);
    },
    doc(id) {
      return createRef(`${path}/${id}`);
    },
    set: jest.fn((data) => {
      applySet(path, data || {});
      return Promise.resolve();
    }),
    update: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => {
      if (testState.userDocExists && /^users\/[^/]+$/.test(path)) {
        return Promise.resolve({
          exists: true,
          data: () => ({
            shards: testState.userShards ?? 0,
            shards_updated_at_ms: testState.userShardsUpdatedAtMs,
            shards_updated_op: testState.userShardsUpdatedOp,
            shards_updated_reason: testState.userShardsUpdatedReason,
          }),
        });
      }
      return Promise.resolve({
        exists: false,
        data: () => ({}),
      });
    }),
    add: jest.fn(() => Promise.resolve()),
    where: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
    })),
    orderBy: jest.fn(function orderBy() {
      return ref;
    }),
    limit: jest.fn(function limit() {
      return ref;
    }),
  };
  return ref;
}

function firestore() {
  return {
    collection: jest.fn((name) => createRef(name)),
    runTransaction: async (fn) => {
      testState.runTransactionCalls += 1;
      const transaction = {
        get: jest.fn(async (ref) => {
          if (testState.transactionGetBarrier) await testState.transactionGetBarrier;
          const p = ref.__path || '';
          if (p.includes('/reward_claims/')) {
            return { exists: testState.rewardClaimExists, data: () => ({}) };
          }
          if (testState.userDocExists && /^users\/[^/]+$/.test(p)) {
            return {
              exists: true,
              data: () => ({
                shards: testState.userShards ?? 0,
                shards_updated_at_ms: testState.userShardsUpdatedAtMs,
                shards_updated_op: testState.userShardsUpdatedOp,
                shards_updated_reason: testState.userShardsUpdatedReason,
              }),
            };
          }
          return { exists: false, data: () => ({}) };
        }),
        set: jest.fn((ref, _data, _opts) => {
          const p = ref.__path || '';
          applySet(p, _data || {});
          return Promise.resolve();
        }),
      };
      const result = await fn(transaction);
      if (testState.transactionReturnBarrier) await testState.transactionReturnBarrier;
      return result;
    },
  };
}

firestore.FieldValue = {
  serverTimestamp: () => ({ __serverTimestamp: true }),
  increment: (n) => ({ __increment: n }),
};

firestore.__testState = testState;
firestore.__resetTestState = () => {
  testState.rewardClaimExists = false;
  testState.userDocExists = true;
  testState.userShards = 0;
  testState.userShardsUpdatedAtMs = null;
  testState.userShardsUpdatedOp = null;
  testState.userShardsUpdatedReason = null;
  testState.runTransactionCalls = 0;
  testState.transactionGetBarrier = null;
  testState.transactionReturnBarrier = null;
  testState.userDocPaths = [];
};

firestore.default = firestore;
module.exports = firestore;
