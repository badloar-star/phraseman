// Сторож D162 на клиенте: комната Пика показывает и сортирует по монетам недели ровно тогда, когда так решает сервер
// (один рубильник config/spire_v1.rankBy, с недели 2026-W43). Сработал — чини логику, а не сторожа.
import fs from 'node:fs';
import path from 'node:path';
import {
  SPIRE_CONFIG_DEFAULTS,
  SPIRE_RANK_BY_COINS_FROM_WEEK,
  SPIRE_WEEK_COINS_CAP_DEFAULT,
  spireBotWeekCoins,
  spireEffectiveRankBy,
  parseSpireConfigDoc,
} from '../modules/spire/config_contract';
import { spireCompareRowsBy, spireDecodeRoomMembers, type SpireRoomRow } from '../modules/spire/room_rows';
import { spireMemberScored, spireSortMembers, type SpireMemberRow } from '../components/spire/spire_room_types';
import { spireCoinsCount, spireGroupThousands } from '../components/spire/spire_plurals';
import { spireDecodeWeekResult } from '../app/spire/spire_week_result_client';

const row = (uid: string, steps: number, weekCoins: number, reachedAtMs = 0): SpireRoomRow => ({ uid, name: uid, steps, reachedAtMs, isMe: false, weekCoins });
const member = (uid: string, steps: number, weekCoins?: number): SpireMemberRow => ({ uid, name: uid, steps, isMe: false, weekCoins });

describe('D162 клиент: договор совпадает с сервером', () => {
  it('те же дефолты, неделя включения и потолок, что в functions/src/spire_config_contract.ts', () => {
    const server = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'spire_config_contract.ts'), 'utf8');
    expect(server).toContain(`SPIRE_RANK_BY_COINS_FROM_WEEK = '${SPIRE_RANK_BY_COINS_FROM_WEEK}'`);
    expect(server).toContain('SPIRE_WEEK_COINS_CAP_DEFAULT = 20_000');
    expect(server).toContain('SPIRE_BOT_WEEK_COINS_PER_STEP = 30');
    expect(SPIRE_WEEK_COINS_CAP_DEFAULT).toBe(20_000);
    expect(SPIRE_CONFIG_DEFAULTS.rankBy).toBe('steps');
  });

  it('клиент читает рубильник из конфига: только явное coins и только с W43', () => {
    expect(parseSpireConfigDoc({}).rankBy).toBe('steps');
    expect(parseSpireConfigDoc({ rankBy: 'coins' }).rankBy).toBe('coins');
    expect(spireEffectiveRankBy(parseSpireConfigDoc({ rankBy: 'coins' }), '2026-W42')).toBe('steps');
    expect(spireEffectiveRankBy(parseSpireConfigDoc({ rankBy: 'coins' }), '2026-W43')).toBe('coins');
  });
});

describe('D162 клиент: строки комнаты', () => {
  it('монеты недели читаются из документа комнаты; нет поля — 0', () => {
    const members = spireDecodeRoomMembers({ a: { name: 'A', steps: 3, weekCoins: 450 }, b: { name: 'B', steps: 9 } });
    expect(members.find((m) => m.uid === 'a')?.weekCoins).toBe(450);
    expect(members.find((m) => m.uid === 'b')?.weekCoins).toBe(0);
  });

  it('coins: больше монет выше при меньших ступенях; ничья — ступени; steps — как раньше', () => {
    const rows = [row('climber', 30, 800, 5), row('learner', 2, 5000, 9), row('tie', 10, 800, 7)];
    expect([...rows].sort(spireCompareRowsBy('coins')).map((r) => r.uid)).toEqual(['learner', 'climber', 'tie']);
    expect([...rows].sort(spireCompareRowsBy('steps')).map((r) => r.uid)).toEqual(['climber', 'tie', 'learner']);
  });

  it('у ботов монеты по формуле от ступеней (только показ)', () => {
    expect(spireBotWeekCoins(0)).toBe(0);
    expect(spireBotWeekCoins(7)).toBe(210);
  });
});

describe('D162 клиент: пьедестал и «Все участники»', () => {
  const ms = [member('a', 30, 100), member('b', 1, 900), member('c', 0, 0)];

  it('порядок и зоны по монетам; «играл» = монеты > 0', () => {
    expect(spireSortMembers(ms, 'coins').map((m) => m.uid)).toEqual(['b', 'a', 'c']);
    expect(spireSortMembers(ms).map((m) => m.uid)).toEqual(['a', 'b', 'c']);
    expect(spireMemberScored(member('x', 5, 0), 'coins')).toBe(false);
    expect(spireMemberScored(member('x', 5, 0), 'steps')).toBe(true);
    // «Все участники» делят зоны тем же правилом (spireMemberScored) и тем же порядком (spireSortMembers)
    const all = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'SpireAllMembers.tsx'), 'utf8');
    // зачем (D190): функция зон вынесена в components/spire/spire_zones.ts (сторож D190 гоняет её без экранного кода).
    const zones = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'spire_zones.ts'), 'utf8');
    expect(zones).toMatch(/const scored = spireMemberScored\(m, rankBy\)/);
    expect(all).toContain("import { spireZonesFor, type SpireZone } from './spire_zones';");
    expect(all).toMatch(/spireSortMembers\(members, rankBy\)/);
  });

  it('подпись — «N монет» со склонением (ru/uk) и общей валютой на всех языках', () => {
    expect(spireCoinsCount('ru', 1)).toBe('1 монета');
    expect(spireCoinsCount('ru', 3)).toBe('3 монеты');
    expect(spireCoinsCount('ru', 11)).toBe('11 монет');
    expect(spireCoinsCount('uk', 5)).toBe('5 монет');
    expect(spireCoinsCount('en', 1)).toBe('1 coin');
    expect(spireCoinsCount('en', 1240)).toBe('1240 coins');
  });

  it('на подиуме число монет с неразрывным пробелом тысяч и маленькой монетой вместо слова; слово остаётся в «Все участники»-подписи и ярлыке читалки', () => {
    const nb = String.fromCharCode(160);
    expect(spireGroupThousands(8511)).toBe('8' + nb + '511');
    expect(spireGroupThousands(20000)).toBe('20' + nb + '000');
    expect(spireGroupThousands(999)).toBe('999');
    expect(spireGroupThousands(0)).toBe('0');
    expect(spireGroupThousands(-5)).toBe('0');
    expect(spireGroupThousands(1234567)).toBe('1' + nb + '234' + nb + '567');
    const podium = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'SpirePodium.tsx'), 'utf8');
    expect(podium).toContain('spireGroupThousands(m.weekCoins ?? 0)');
    expect(podium).toContain('<RuneGlyph size={14} />');
    // слово «монет» на подиум не возвращаем: колонка ≈101 dp; оно остаётся только в подписи для читалки
    expect(podium).not.toMatch(/\{score\(m\)\}/);
    expect(podium).not.toContain('adjustsFontSizeToFit');
    const all = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'SpireAllMembers.tsx'), 'utf8');
    expect(all).toContain('spireGroupThousands(m.weekCoins ?? 0)');
    expect(all).toContain('runeWord(lang, m.weekCoins ?? 0)');
  });

  it('экран передаёт рубильник в пьедестал и «Все участники»; подпись «место по монетам недели»', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'SpireHomeScreen.tsx'), 'utf8');
    expect(screen).toMatch(/<SpirePodium [^>]*rankBy=\{game\.rankBy\}/);
    expect(screen).toMatch(/<SpireAllMembers [^>]*rankBy=\{game\.rankBy\}/);
    expect(screen).toMatch(/game\.rankBy === 'coins' \? 'rankedByCoins' : 'rankedBySteps'/);
  });
});

describe('D162 клиент: итог недели', () => {
  const base = { schema: 'spire-week-result.v1', steps: 12, roomRank: 2, roomTotal: 30, promoted: true, demoted: false, prevTier: 1, newTier: 2, rewardCoins: { place: 200, promotion: 100 } };
  it('итог по монетам несёт rankBy и монеты недели; старый итог — ступени', () => {
    expect(spireDecodeWeekResult({ ...base, rankBy: 'coins', weekCoins: 4200 }, '2026-W43', 'en')).toMatchObject({ rankBy: 'coins', weekCoins: 4200 });
    expect(spireDecodeWeekResult(base, '2026-W42', 'en')).toMatchObject({ rankBy: 'steps', weekCoins: 0 });
  });
});
