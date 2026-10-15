// зачем (координатор 14.10): клиент прогревает accountDeleteEnqueue из окна удаления, но тело прогрева обязано быть БЕЗ ключа
// удаления — тогда ни новый сервер (ветка warm), ни старый (отказ account_delete_credential_pending до любых записей) не могут
// поставить удаление. Сторож держит именно это.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

describe('прогрев accountDeleteEnqueue с клиента', () => {
  const cloud = read('app/cloud_sync.ts');
  // зачем (полный прогон 15.10): 594f643ad вставил между прогревом и ensureStableAuthLink блок памяти ensure_link (там есть stableId) —
  // режем ровно тело функции прогрева: до первой строки «}» в начале строки после её начала.
  const warmStart = cloud.indexOf('export function warmAccountDeleteEnqueue(');
  const body = cloud.slice(warmStart, cloud.indexOf('\n}', warmStart) + 2);

  it('тело вызова — только { warm: true }, без ключа удаления и личности', () => {
    expect(body).toContain("callable<{ warm: true }, { ok?: boolean; warm?: boolean }>('accountDeleteEnqueue'");
    expect(body).toContain('void fn({ warm: true })');
    expect(body).not.toMatch(/operationId|capability|stableId|accountsV2Deletion/);
  });

  it('троттл и строка журнала на каждом исходе', () => {
    expect(body).toContain('ACCOUNT_DELETE_WARMUP_THROTTLE_MS');
    for (const outcome of ['skip source=', 'reason=throttled', 'ok source=', 'answered source=', 'failed source=']) {
      expect(body).toContain(outcome);
    }
  });

  it('окно удаления прогревает при открытии', () => {
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    expect(modal).toContain("warmAccountDeleteEnqueue('delete_confirm_modal')");
  });
});
