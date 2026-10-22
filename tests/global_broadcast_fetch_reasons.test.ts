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

  // зачем (смета Firebase п.8, 13.10): «рассылок нет» помним 3 ч на uid — на старте без сети; есть рассылки — запись снимается.
  it('ответ «рассылок нет» кэшируется на 3 ч, выход из кэша называет причину', () => {
    const body = fetchBody();
    expect(source).toContain('export const GLOBAL_BROADCAST_EMPTY_TTL_MS = 12 * 60 * 60 * 1000;');
    expect(body).toContain('return skip(`empty_cached age=');
    // Вопрос 27 (22.10): тот же выход теперь ещё и отмечает «показывать нечего» при версии рассылок (settled → skip).
    expect(body).toMatch(/if \(listData\.items\.length === 0\) \{\s*writeBroadcastEmptyCache\(uid\);\s*return settled\('no_active_broadcasts'\);\s*\}\s*writeBroadcastEmptyCache\(null\);/);
    expect(body).toContain('writeBroadcastSettled(uid, remoteRev);\n    return skip(reason);');
    expect(source).toContain("if (parsed?.uid !== uid || typeof parsed.at !== 'number') return null;");
  });
});
