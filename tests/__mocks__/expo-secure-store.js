const store = {};
const VALID_KEY_PATTERN = /^[\w.-]+$/;

function assertValidKey(key) {
  if (typeof key !== 'string' || !VALID_KEY_PATTERN.test(key)) {
    throw new Error(
      'Invalid key provided to SecureStore. Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".',
    );
  }
}

const getItemAsync = jest.fn(async (key, _options) => {
  assertValidKey(key);
  return store[key] ?? null;
});
const setItemAsync = jest.fn(async (key, value, _options) => {
  assertValidKey(key);
  store[key] = value;
});
const deleteItemAsync = jest.fn(async (key, _options) => {
  assertValidKey(key);
  delete store[key];
});

module.exports = {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  __reset: () => {
    Object.keys(store).forEach(k => delete store[k]);
    getItemAsync.mockClear();
    setItemAsync.mockClear();
    deleteItemAsync.mockClear();
  },
};
