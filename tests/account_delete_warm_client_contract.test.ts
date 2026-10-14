// зачем (координатор 14.10): клиент прогревает accountDeleteEnqueue из окна удаления, но тело прогрева обязано быть БЕЗ ключа
// удаления — тогда ни новый сервер (ветка warm), ни старый (отказ account_delete_credential_pending до любых записей) не могут
// поставить удаление. Сторож держит именно это.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('прогрев accountDeleteEnqueue с клиента', () => {
  const cloud = read('app/cloud_sync.ts');
  const body = cloud.slice(cloud.indexOf('export function warmAccountDeleteEnqueue('), cloud.indexOf('export async function ensureStableAuthLinkForStableIdDetailed('));

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
