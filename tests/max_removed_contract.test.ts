import fs from 'node:fs';
import path from 'node:path';

/**
 * зачем: владелец 04.10 — «вычистить весь MAX». Код раздела удалён, данные в проде
 * оставлены. Упоминать MAX разрешено только там, где это нужно для живых данных:
 * удаление аккаунта, слияние кошелька, выручка Джарвиса, отзывы-архив, отказ от
 * старых покупок. Новое место с MAX = попытка вернуть раздел без команды владельца.
 * Список только сокращать: убрал MAX из файла — убери файл отсюда.
 */
const root = process.cwd();
// зачем: functions-admin тоже экспортирует из functions/src — после шага 2 он ссылался на удалённые файлы MAX и не собирался.
const SCAN_DIRS = ['app', 'components', 'modules', 'hooks', 'functions/src', 'functions-admin', 'functions-content', 'functions-english-test'];
const MAX_MARK = /max_voice|maxVoice|MaxVoice|voice_minute|functions-max/;

const ALLOWED = new Set([
  'app/cloud_sync.ts', // стоп-лист старых очередей max_voice_*_outbox
  'app/revenuecat_premium_access.ts', // покупка минут не даёт Plus
  'functions/src/account_delete.ts',
  'functions/src/account_delete.test.ts',
  'functions/src/admin_compliance.ts',
  'functions/src/admin_compliance.test.ts',
  'functions/src/ai_safety.ts',
  'functions/src/auth_identity.ts',
  'functions/src/auth_merge.ts',
  'functions/src/feedback_admin_logic.test.ts',
  'functions/src/feedback_entries.ts',
  'functions/src/feedback_summary.ts',
  'functions/src/index.ts', // voiceMinuteWalletMine — его зовут старые сборки
  'functions/src/jarvis/all_departments_callables.ts',
  'functions/src/jarvis/jarvis_crons.ts',
  'functions/src/jarvis/jarvis_data_contract_guard.test.ts',
  'functions/src/jarvis/jarvis_money_writer_index_contract.test.ts',
  'functions/src/jarvis/money_callables.ts',
  'functions/src/jarvis/money_department.test.ts',
  'functions/src/jarvis/money_firestore_fetcher.ts',
  'functions/src/jarvis/money_snapshot.test.ts',
  'functions/src/jarvis/money_snapshot.ts',
  'functions/src/jarvis/money_source_reader.test.ts',
  'functions/src/jarvis/money_source_reader.ts',
  'functions/src/payment_webhook_alert.ts',
  'functions/src/premium_dialog.ts',
  'functions/src/revenuecat_shards.ts',
  'functions/src/revenuecat_shards.test.ts',
  'functions/src/support_repository_context.ts',
  'functions/src/voice_feedback_archive.ts',
  'functions/src/voice_minutes.ts',
  'functions/src/voice_minutes.test.ts',
  'functions/src/voice_minutes_api.ts',
  'functions/src/voice_minutes_api.test.ts',
]);

function listSources(dir: string, out: string[] = []): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'lib' || entry.name === 'generated' || entry.name.startsWith('.')) continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) listSources(rel, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

describe('MAX removed (owner 2026-10-04)', () => {
  const mentioning = SCAN_DIRS.flatMap((dir) => listSources(dir))
    .filter((file) => MAX_MARK.test(fs.readFileSync(path.join(root, file), 'utf8')));

  it('MAX упоминается только в разрешённых местах', () => {
    expect(mentioning.filter((file) => !ALLOWED.has(file))).toEqual([]);
  });

  it('список разрешённых не протух — только сокращать', () => {
    const stale = [...ALLOWED].filter((file) => !mentioning.includes(file));
    expect(stale).toEqual([]);
  });

  it('кодовой базы max нет ни на диске, ни в firebase.json', () => {
    expect(fs.existsSync(path.join(root, 'functions-max'))).toBe(false);
    const firebase = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
    const codebases = (Array.isArray(firebase.functions) ? firebase.functions : [firebase.functions])
      .map((entry: { codebase?: string }) => entry?.codebase);
    expect(codebases).not.toContain('max');
  });
});
