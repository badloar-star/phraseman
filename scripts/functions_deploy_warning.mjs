#!/usr/bin/env node
/**
 * Предупреждение перед любой выкладкой functions (predeploy, codebase default). НЕ блокирует.
 *
 * зачем (координатор 12.10, решение советника п.60(8)): в день релиза кто-то может выкатить функции целиком
 * (`firebase deploy --only functions` без имён). Firebase не передаёт сюда, какие функции выбраны, поэтому
 * печатаем список «не выкладывать до …» на каждой выкладке. Прицельный деплой нужных функций им не мешает:
 * человек видит список и сверяет со своей командой. Источник правды по датам — docs/phraseman-2.0/DEPLOY_NOW.md.
 */

export const DO_NOT_DEPLOY_UNTIL = Object.freeze([
  { name: 'levelSpinStarGrant', until: 'день релиза 2.0, ПЕРВОЙ (серверный кошелёк монет; через неё идут награды за жалобы)' },
  { name: 'coinReconcileV1', until: 'день релиза 2.0, вместе с levelSpinStarGrant' },
  { name: 'progressSubmitEvent', until: 'день релиза 2.0 (DEPLOY_NOW.md)' },
  { name: 'giftsToCoinsMigrationReport', until: 'после релиза 2.0 (D91), прицельно' },
  { name: 'cardTtsPackWorker', until: 'после публикации §6/§13 политики об озвучке карточек (PRIVACY_R1_GAP П9); даже выложенная — молчит, пока в «Пульте» не включён card_tts_enabled' },
  { name: 'adminCardTtsRequeuePack', until: 'вместе с cardTtsPackWorker' },
]);

export function deployWarningText() {
  const lines = [
    '',
    '⚠️  [functions-deploy-warning] Если выкладываете ВСЕ функции (без имён в --only), в прод уйдут и эти — до срока их НЕ выкладывать:',
    ...DO_NOT_DEPLOY_UNTIL.map((entry) => `   • ${entry.name} — ${entry.until}`),
    '   Прицельно: firebase deploy --only "functions:имя1,functions:имя2". Подробно — docs/phraseman-2.0/DEPLOY_NOW.md.',
    '',
  ];
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('functions_deploy_warning.mjs')) {
  console.warn(deployWarningText());
}
