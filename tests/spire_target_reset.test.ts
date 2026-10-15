// зачем (аудит §AUTH-0110, координатор 15.10): смена изучаемого языка без перезапуска сбрасывает комнату, друзей, итог недели, шаг и выбранный этаж старого языка; лог [SPIRE-TARGET].
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: смена изучаемого языка', () => {
  const game = read('app', 'spire', 'use_spire_game.ts');
  const home = read('components', 'spire', 'SpireHomeScreen.tsx');

  it('игра: сброс идёт по lang ДО загрузчиков, идентичность и идущий старт не трогаются', () => {
    const reset = game.indexOf('const prevLangRef');
    expect(reset).toBeGreaterThan(0);
    expect(reset).toBeLessThan(game.indexOf('// ── Идентичность'));
    // зачем (разбор красных 15.10): 32775e418 (R39) — ключ сброса теперь `язык|владелец`: при смене владельца сбрасываются и ids,
    // а при смене ТОЛЬКО языка идентичность и идущий старт по-прежнему не трогаются
    expect(game).toMatch(/if \(before === `\$\{lang\}\|\$\{ownerEpoch\}`\) return;/);
    for (const s of ['setRoomLoad(null)', 'setFriends([])', 'setWeekResult(null)', 'setSession(null)', 'setPending(null)', 'setOutcome(null)', 'setStartBlock(null)']) {
      const body = game.slice(reset, game.indexOf('// ── Идентичность'));
      expect(body).toContain(s);
    }
    const body = game.slice(reset, game.indexOf('// ── Идентичность'));
    expect(body).toContain('if (ownerChanged) setIds(null);');
    expect(body.replace('if (ownerChanged) setIds(null);', '')).not.toContain('setIds(');
    expect(body).not.toContain('startingRef.current =');
  });

  it('экран: неделя и выбранный этаж сбрасываются при смене языка, до чтения новой недели', () => {
    const at = home.indexOf('const prevSpireLangRef');
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(home.indexOf('readCurrentLocalWeek(spireLang)'));
    expect(home).toMatch(/if \(before === spireLang\) return;/);
    // зачем (аудит скорости 13.10): неделя нового языка берётся из памяти процесса по ЕГО ключу (uid+язык); чужая неделя прежнего языка не остаётся
    expect(home).toMatch(/setWeek\(peekFirstFrameWeek\(spireLang\)\);[^\n]*\s+setSelected\(null\);/);
  });

  it('оба сброса пишут [SPIRE-TARGET] с было/стало', () => {
    expect(game).toMatch(/\[SPIRE-TARGET\] use_spire_game: язык\/владелец[\s\S]*from: before, to: `\$\{lang\}\|\$\{ownerEpoch\}`/);
    expect(home).toMatch(/\[SPIRE-TARGET\] home: язык[\s\S]*from: before, to: spireLang/);
  });
});
