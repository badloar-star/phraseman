let counter = 0;
const { createHash } = require('node:crypto');
module.exports = {
  randomUUID: jest.fn(() => `test-uuid-${++counter}`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algorithm, value) => createHash('sha256').update(String(value), 'utf8').digest('hex')),
};
