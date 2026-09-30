import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

// зачем: D78 (владелец, 2026-09-30) — серверная Арена (arena_v2.ts,
// arena_expansion.ts, arena_duel_v3.ts) удалена из кода целиком. Проверки
// ротации публикаций внутри матчей, призраков, соперничеств и квитанций сняты
// вместе с ней. Остаётся договор Merkle-доказательств пула: его читает сборщик
// пакетов Шпиля (spire_pack_build.ts).
test('Merkle proof verifier exports the complete proof type and callers do not erase it with any', () => {
  const publication = read('functions/src/tournament_pool_publication.ts');
  assert.match(publication, /export type ArenaPublication/);
  assert.match(publication, /readonly schemaVersion: 'tournament-task-merkle\.v1'/);
  assert.match(publication, /readonly proof:/);
  for (const file of ['functions/src/spire_pack_build.ts']) {
    const source = read(file);
    assert.match(source, /type ArenaPublication/);
    assert.doesNotMatch(source, /verifyTournamentPoolTaskProof\([^\n]* as any/);
  }
});
