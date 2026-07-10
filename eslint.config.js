// https://docs.expo.dev/guides/using-eslint/
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const { createNoUnsafeTextTruncationRule } = require('./tools/eslint-rules/no-unsafe-text-truncation');

const projectRoot = __dirname;
const noUnsafeTextTruncation = createNoUnsafeTextTruncationRule({
  projectRoot,
  baselinePath: path.join(projectRoot, 'config', 'text-integrity-baseline.json'),
});

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: [
      'app/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'constants/**/*.{ts,tsx}',
      'hooks/**/*.{ts,tsx}',
      'lib/**/*.{ts,tsx}',
      'modules/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.gen.{ts,tsx}'],
    plugins: {
      'text-integrity': {
        rules: {
          'no-unsafe-text-truncation': noUnsafeTextTruncation,
        },
      },
    },
    rules: {
      'text-integrity/no-unsafe-text-truncation': 'error',
    },
  },
]);
