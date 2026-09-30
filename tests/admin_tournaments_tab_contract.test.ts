import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const html = readFileSync(path.join(repoRoot, 'admin/v2/legacy.html'), 'utf8');

// зачем: D74/D78/D83 — Арена и её турниры удалены в PhraseMan 2.0, а админские
// турнирные функции (adminListTournamentTasks, adminFillTournamentPool, …) сняты
// с экспорта. Прежний контракт сторожил UI проверки пула v11; теперь сторожим,
// что мёртвые вкладки не вернулись в единственную боевую админку.
describe('retired tournaments admin surface', () => {
  it('has no tournaments or tournament-pool tabs, panels or loaders', () => {
    expect(html).not.toContain("switchTab('tournaments')");
    expect(html).not.toContain("switchTab('tournament-pool')");
    expect(html).not.toContain('id="tab-tournaments"');
    expect(html).not.toContain('id="tab-tournament-pool"');
    expect(html).not.toContain('window.tnOpenTab');
    expect(html).not.toContain('tournament_pool.html');
  });

  it('does not call removed tournament admin callables', () => {
    for (const name of [
      'adminListTournamentTasks',
      'adminMutateTournamentTasks',
      'adminTournamentPoolStats',
      'adminFillTournamentPool',
      'adminGetTournamentSchedule',
      'adminSetTournamentSchedule',
    ]) {
      expect(html).not.toContain(`'${name}'`);
    }
  });
});
