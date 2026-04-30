/**
 * Jest stub: real @react-native-firebase/firestore is ESM; Node test env loads this via moduleNameMapper.
 *
 * Test hooks for claimDailyTasksAllShardsReward (runTransaction):
 *   firestore.__testState = { rewardClaimExists: boolean, userDocExists: boolean, userShards: number | null }
 *   firestore.__resetTestState()
 */

/** @type {{ rewardClaimExists: boolean; userDocExists: boolean; userShards: number | null }} */
const testState = {
  rewardClaimExists: false,
  userDocExists: true,
  userShards: 0,
};

function createRef(path) {
  const ref = {
    __path: path,
    collection(sub) {
      return createRef(`${path}/${sub}`);
    },
    doc(id) {
      return createRef(`${path}/${id}`);
    },
    set: jest.fn(() => Promise.resolve()),
    get: jest.fn(() =>
      Promise.resolve({
        exists: false,
        data: () => ({}),
      }),
    ),
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
      const transaction = {
        get: jest.fn(async (ref) => {
          const p = ref.__path || '';
          if (p.includes('/reward_claims/')) {
            return { exists: testState.rewardClaimExists, data: () => ({}) };
          }
          if (testState.userDocExists && /^users\/[^/]+$/.test(p)) {
            return {
              exists: true,
              data: () => ({ shards: testState.userShards ?? 0 }),
            };
          }
          return { exists: false, data: () => ({}) };
        }),
        set: jest.fn((ref, _data, _opts) => {
          const p = ref.__path || '';
          if (p.includes('/reward_claims/')) {
            testState.rewardClaimExists = true;
          }
          return Promise.resolve();
        }),
      };
      return fn(transaction);
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
};

firestore.default = firestore;
module.exports = firestore;
