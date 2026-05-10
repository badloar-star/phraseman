const store = {};

const api = {
  getItem: jest.fn(async (key) => store[key] ?? null),
  setItem: jest.fn(async (key, value) => {
    store[key] = String(value);
  }),
  removeItem: jest.fn(async (key) => {
    delete store[key];
  }),
  multiGet: jest.fn(async (keys) => keys.map((key) => [key, store[key] ?? null])),
  multiSet: jest.fn(async (pairs) => {
    pairs.forEach(([key, value]) => {
      store[key] = String(value);
    });
  }),
  multiRemove: jest.fn(async (keys) => {
    keys.forEach((key) => {
      delete store[key];
    });
  }),
  clear: jest.fn(async () => {
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  }),
  __reset: () => {
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  },
};

module.exports = api;
module.exports.default = api;
