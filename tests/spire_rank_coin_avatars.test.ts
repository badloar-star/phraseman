// зачем (владелец 13.10, «должно показывать аватары ников — монеты рангов»): во всех местах Шпиля, где участник комнаты
// был кружком с буквой, показывается монета ранга; неизвестный ранг — базовая монета, буква не возвращается.
import fs from 'node:fs';
import path from 'node:path';
import { spireBuildRoomRows, spireDecodeCoinRank, spireDecodeRoomMembers, spireDecodeRoster, type SpireRoomSnapshot } from '../modules/spire/room_rows';
import { SPIRE_CONFIG_DEFAULTS } from '../modules/spire/config_contract';
import { spireRivalsByFloor } from '../components/spire/spire_tower_model';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('Шпиль: монеты рангов вместо букв', () => {
  const PLACES: ReadonlyArray<readonly [string, string]> = [
    ['components/spire/SpireTower.tsx', 'соперники у этажей'],
    ['components/spire/SpireFloorInfo.tsx', 'кто на этаже'],
    ['components/spire/SpireAllMembers.tsx', 'все участники'],
    ['components/spire/SpirePodium.tsx', 'пьедестал'],
  ];

  for (const [file, label] of PLACES) {
    it(`${label}: монета ранга, без буквы`, () => {
      const src = read(file);
      expect(src).toContain('<SpireRankCoin rank={m.coinRank}');
      expect(src).not.toContain('SpireInitial');
    });
  }

  it('кружка с буквой в Шпиле больше нет нигде', () => {
    const dir = path.join(__dirname, '..', 'components', 'spire');
    for (const name of fs.readdirSync(dir)) {
      if (!/\.tsx?$/.test(name)) continue;
      expect(`${name}: ${/SpireInitial/.test(read(`components/spire/${name}`))}`).toBe(`${name}: false`);
    }
  });

  it('неизвестный ранг рисуется базовой монетой (ранг 0), а не буквой', () => {
    const src = read('components/spire/SpireRankCoin.tsx');
    expect(src).toContain('coinRank={rank ?? SPIRE_BASE_COIN_RANK}');
    expect(src).toContain('export const SPIRE_BASE_COIN_RANK = 0;');
  });

  it('ранг из документа комнаты: только целое 0..19, иначе null', () => {
    expect(spireDecodeCoinRank(7)).toBe(7);
    expect(spireDecodeCoinRank(0)).toBe(0);
    expect(spireDecodeCoinRank(19)).toBe(19);
    for (const bad of [-1, 20, 3.5, '4', null, undefined, NaN]) expect(spireDecodeCoinRank(bad)).toBeNull();
    const members = spireDecodeRoomMembers({ u1: { name: 'А', steps: 3, coinRank: 12 }, u2: { name: 'Б', steps: 1 } });
    expect(members.map((m) => m.coinRank)).toEqual([12, null]);
    const roster = spireDecodeRoster([{ slot: 1, uid: 'resident_1', name: 'Бот', coinRank: 4 }]);
    expect(roster[0].coinRank).toBe(4);
  });

  it('строки комнаты несут ранг только живых участников; старый roster с ботами игнорируется', () => {
    const room: SpireRoomSnapshot = {
      schema: 'spire-room-cache.v1', uid: 'me', lang: 'en', weekId: 'w', groupId: 'g1', tier: 0, cohortDay: 2, weekStartMs: 0,
      members: [
        { uid: 'me', name: 'Я', steps: 0, reachedAtMs: 0, totalMs: 0, coinRank: 5 },
        { uid: 'a', name: 'Анна', steps: 4, reachedAtMs: 1, totalMs: 1, coinRank: 11 },
        { uid: 'b', name: 'Борис', steps: 4, reachedAtMs: 2, totalMs: 1 },
      ],
      roster: Array.from({ length: 29 }, (_, slot) => ({ uid: `res_${slot}`, slot, name: `Бот ${slot}`, avatar: null, aura: null, isPremium: false, streak: 0 })),
      fetchedAtMs: 0,
    };
    const rows = spireBuildRoomRows({ room, myUid: 'me', mySteps: 0, myReachedAtMs: 0, nowMs: 3 * 86_400_000, tuning: SPIRE_CONFIG_DEFAULTS.residents });
    const byUid = new Map(rows.map((r) => [r.uid, r]));
    expect(byUid.get('a')?.coinRank).toBe(11);
    expect(byUid.get('b')?.coinRank).toBeNull();
    const rivals = [...spireRivalsByFloor(rows).values()].flat();
    expect(rivals.find((r) => r.uid === 'a')?.coinRank).toBe(11);
    expect(rivals.some((r) => r.uid === 'me')).toBe(false); // себя среди «кто на этаже» нет
    expect(rows.map((r) => r.uid).sort()).toEqual(['a', 'b', 'me']);
  });

  it('«Комната недели» (пьедестал + «Все участники») — сразу под заголовком, выше башни (владелец 13.10)', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    const head = home.indexOf('<SpireEnergyPill');
    const podium = home.indexOf('<SpirePodium');
    const tower = home.indexOf('<SpireTower ');
    expect(head).toBeGreaterThan(0);
    expect(podium).toBeGreaterThan(head);
    expect(tower).toBeGreaterThan(podium);
    expect(home.match(/<SpirePodium/g)?.length).toBe(1); // блок один, внизу его больше нет
    expect(home).toContain('testID="spire-room-top"');
  });

  it('кадр «Итог недели»: шапка и башня берут новую лигу карточки; боевой путь (без dev-подмены) не меняется', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('devWeekResult?.newTier ?? game.tier ?? week?.tier ?? null');
    expect(home).toContain('getDevSpireWeekResultOverride()');
  });

  it('номер этажа на башне #8E8E92 (≥ 4,5 на небе всех лиг), у своего этажа белый', () => {
    const svg = read('components/spire/SpireTowerSvg.tsx');
    // зачем (координатор 17.10, храповик theme_hardcoded_colors): цвета арта башни вынесены в constants/spireTowerArtPalette.ts
    // с ТЕМИ ЖЕ значениями — сторожим и ссылку, и само значение.
    expect(svg).toContain('mine ? TOWER_ART.white : TOWER_ART.c8E8E92'); // без сцены (по умолчанию) — #8E8E92; со сценой цвет берётся из токенов темы (Темы, 80b07bdaa)
    const art = read('constants/spireTowerArtPalette.ts');
    expect(art).toContain("white: '#FFFFFF',");
    expect(art).toContain("c8E8E92: '#8E8E92',");
    expect(svg + art).not.toContain('#6E6E72');
  });

  it('свой ранг в списках — из useMyCoinRank, а не из комнаты', () => {
    expect(read('components/spire/SpireHomeScreen.tsx')).toContain('coinRank: r.isMe ? myCoinRank : (r.coinRank ?? null)');
  });
});
