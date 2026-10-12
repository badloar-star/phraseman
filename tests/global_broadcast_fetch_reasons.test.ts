// зачем (координатор 12.10, п.70 №4): «рассылки нет» складывалось из немых выходов и немого catch — по журналу нельзя
// было отличить «рассылки нет» от «проверка сломалась». Сторож: в fetchPendingGlobalBroadcastModal каждый выход
// называет причину, catch пишет reason=failed с кодом.
import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'app', 'global_broadcast_modal.ts'), 'utf8').replace(/\r\n/g, '\n');

function fetchBody(): string {
  const start = source.indexOf('export async function fetchPendingGlobalBroadcastModal(');
  const end = source.indexOf('\nexport async function recordReviewPromoClick(', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('fetchPendingGlobalBroadcastModal — выходы с причиной', () => {
  it('нет немого catch: сбой пишет reason=failed с кодом и сообщением', () => {
    const body = fetchBody();
    expect(body).not.toMatch(/catch\s*\{/);
    expect(body).toContain('broadcast:fetch → null reason=failed code=');
  });

  it('ранние выходы идут через skip(причина), голого return null — только в catch', () => {
    const body = fetchBody();
    const bareReturns = body.match(/return null;/g) ?? [];
    // одна — в самом skip(), одна — в catch после строки с причиной
    expect(bareReturns).toHaveLength(2);
    for (const reason of ['no_uid', 'no_active_broadcasts', 'dismissed id=', 'already_claimed id=', 'audience_free_but_premium']) {
      expect(body).toContain(reason);
    }
  });
});
