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
  {
    // Единый баланс звёзд (владелец 2026-08-12, D-09/D-10/D-11).
    //
    // Счётчики недели и сезона хранятся вместе со СВОИМ ключом. Прочитанные
    // напрямую, они выглядят как настоящее число даже когда относятся к прошлой
    // неделе или прошлому сезону — и именно такое прямое чтение раздавало
    // награды сезонного пропуска бесплатно.
    //
    // Читать их разрешено только через проекции starsWeekEarned /
    // starsSeasonEarned, которые сверяют ключ и честно отдают ноль.
    files: [
      'app/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'modules/**/*.{ts,tsx}',
    ],
    ignores: ['app/stars_view.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "MemberExpression[property.name='weekEarned']",
          message: 'Читай недельные звёзды только через starsWeekEarned() из app/stars_view — прямое чтение не сверяет ключ недели.',
        },
        {
          selector: "MemberExpression[property.name='prevWeekEarned']",
          message: 'Читай недельные звёзды только через starsWeekEarned() из app/stars_view — прямое чтение не сверяет ключ недели.',
        },
        {
          selector: "MemberExpression[property.name='seasonEarned']",
          message: 'Читай сезонные звёзды только через starsSeasonEarned() из app/stars_view — прямое чтение не сверяет сезон и раздаёт награды прошлого сезона.',
        },
      ],
    },
  },
]);
