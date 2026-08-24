let counter = 0;
let randomByteBatch = 0;
const { createHash } = require('node:crypto');

const randomUUID = jest.fn(() => `test-uuid-${++counter}`);
const digestStringAsync = jest.fn(async (_algorithm, value, _options) => (
  createHash('sha256').update(String(value), 'utf8').digest('hex')
));
const getRandomBytesAsync = jest.fn(async (size) => {
  const batch = randomByteBatch++;
  return Uint8Array.from({ length: size }, (_, index) => (batch + index) & 0xff);
});

module.exports = {
  randomUUID,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
  digestStringAsync,
  getRandomBytesAsync,
  __reset: () => {
    counter = 0;
    randomByteBatch = 0;
    randomUUID.mockClear();
    digestStringAsync.mockClear();
    getRandomBytesAsync.mockClear();
    getRandomBytesAsync.mockImplementation(async (size) => {
      const batch = randomByteBatch++;
      return Uint8Array.from({ length: size }, (_, index) => (batch + index) & 0xff);
    });
  },
};
