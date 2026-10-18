import fs from 'node:fs';
import path from 'node:path';

// зачем (Сверка 18.10 находка 13, кадр modals_1018/walk/05_light_pik.png: вкладка «Пик», гость — вечный скелет подиума, «Комната
// недели —», «Играть» неактивна без объяснения): скелет подиума держится, пока game.roomLoad === null; без идентичности, при
// исключении синхронизации или молчании сети он не снимался никогда. Теперь потолок 2,5 с (use_spire_room_ceiling) → пустой
// подиум и подпись под «Играть»; поздний ответ сети подставит комнату; журнал [PIK-LOAD]. Таймер — не в use_spire_game (там сторож «без пауз»).
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Пик: подиум не висит скелетом вечно', () => {
  const home = read('components/spire/SpireHomeScreen.tsx');
  const ceiling = read('components/spire/use_spire_room_ceiling.ts');

  it('потолок 2,5 с и скелет подиума только до потолка', () => {
    expect(ceiling).toContain('export const SPIRE_ROOM_SKELETON_CEILING_MS = 2500;');
    expect(home).toContain('const podiumSkeleton = podiumLoading && !roomCeilingPassed;');
    expect(home).toContain('loading={podiumSkeleton}');
    expect(home).not.toContain('loading={podiumLoading}');
  });

  it('«Играть» неактивна после потолка — есть спокойная подпись, а не немая кнопка', () => {
    expect(home).toContain("block={game.startBlock ?? (roomCeilingPassed && !climbReady ? 'no_tier' : null)}");
  });

  it('хук потолка вызывается до ранних return экрана (правило хуков)', () => {
    const hookAt = home.indexOf('useSpireRoomCeiling({');
    const firstReturn = home.indexOf('if (langLock.locked) return');
    expect(hookAt).toBeGreaterThan(0);
    expect(hookAt).toBeLessThan(firstReturn);
  });

  it('журнал [PIK-LOAD]: ожидание, итог комнаты, потолок — без идентификаторов', () => {
    for (const stage of ["'room:waiting'", "'room:state'", "'room:ceiling'"]) expect(ceiling).toContain(stage);
    const lines = ceiling.split('\n').filter((line) => line.includes('logPikLoad(') || line.includes("'[PIK-LOAD]'"));
    for (const line of lines) expect(line).not.toMatch(/\buid\b|stableId|name:/);
  });
});
