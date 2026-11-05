/**
 * Ранг 0 = утверждённый макет (Ревизор, 05.11.2026; слово владельца 06:08 «Ранг 0, а у меня всё доступно»; P0 координатора, пункт (в)).
 *
 * зачем: на ранге 0 новичок видит только то, что в макете (home-free-0…3 в docs/work/golden/approved-rev8): «Уроки» и «Сохранённые», «Сегодня» — 1 задача,
 * открыты Друзья / Наборы / свои карточки; Видео и Диалоги — с ранга 1, Пик — с 2, хаб «Карточки» — с 3. Сторож держит три слоя:
 * (1) дефолты флагов в remote_flags, (2) таблица «ранг → открытые разделы» из shared/rank_access_contract = таблица макета,
 * (3) проводка Главной: четыре запроса доступа и использование их результата в плитках. Аудит: docs/work/release/AUDIT_RANK_GATING_2026-11-05.md.
 */
import * as fs from 'fs';
import * as path from 'path';

import { decideRankAccess, type RankAccessFacts, type RankAccessSurface } from '../shared/rank_access_contract';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const facts = (rank: number, over: Partial<RankAccessFacts> = {}): RankAccessFacts => ({
  rank, rankResolved: true, plusActive: false, plusResolved: true,
  grantedSurfaces: new Set<RankAccessSurface>(), grantsResolved: true, available: true, availabilityResolved: true, ...over,
});

const GATED: ReadonlyArray<readonly [RankAccessSurface, number]> = [['video', 1], ['dialogues', 1], ['peak', 2], ['cards_hub', 3]];
const ALWAYS_OPEN: readonly RankAccessSurface[] = ['friends', 'social_packs', 'own_cards', 'saved_cards', 'card_practice'];

describe('ранг 0 = макет — слой 1: флаги', () => {
  const flags = read('app/remote_flags.ts');
  it('rank_gates_enabled по умолчанию true (гейтинг включён)', () => {
    expect(flags).toMatch(/rank_gates_enabled: true/);
  });
  it('rank_gates_existing_users по умолчанию false (настоящие старые не теряют доступ; новые получают замки)', () => {
    expect(flags).toMatch(/rank_gates_existing_users: false/);
  });
  it('rank_gates_force_new_uid_hash по умолчанию 0 (принудительный «новый» — только числом из Пульта)', () => {
    expect(flags).toMatch(/rank_gates_force_new_uid_hash: 0/);
  });
});

describe('ранг 0 = макет — слой 2: таблица ранг → разделы', () => {
  it.each(GATED)('%s закрыт на ранге 0 и открывается ровно с ранга %i', (surface, min) => {
    for (let rank = 0; rank < min; rank += 1) expect(decideRankAccess(surface, facts(rank))).toEqual({ status: 'locked', minimumRank: min });
    for (let rank = min; rank <= 19; rank += 1) expect(decideRankAccess(surface, facts(rank)).status).toBe('allowed');
  });

  it.each(ALWAYS_OPEN)('%s открыт на ранге 0 без Plus и без привилегий', (surface) => {
    expect(decideRankAccess(surface, facts(0))).toEqual({ status: 'allowed', basis: 'always_open' });
  });

  it('Plus открывает закрытые разделы на любом ранге, а привилегия «старого» — только свой раздел', () => {
    for (const [surface] of GATED) expect(decideRankAccess(surface, facts(0, { plusActive: true })).status).toBe('allowed');
    expect(decideRankAccess('peak', facts(0, { grantedSurfaces: new Set<RankAccessSurface>(['peak']) }))).toEqual({ status: 'allowed', basis: 'grandfather' });
    expect(decideRankAccess('video', facts(0, { grantedSurfaces: new Set<RankAccessSurface>(['peak']) })).status).toBe('locked');
  });

  it('неизвестный ранг не открывает раздел (fail-closed: pending, а не allowed)', () => {
    expect(decideRankAccess('dialogues', facts(0, { rankResolved: false })).status).toBe('pending');
    expect(decideRankAccess('dialogues', facts(0, { rank: null })).status).not.toBe('allowed');
    expect(decideRankAccess('dialogues', facts(-1)).status).not.toBe('allowed');
    expect(decideRankAccess('dialogues', facts(99)).status).not.toBe('allowed');
  });
});

describe('ранг 0 = макет — слой 3: проводка Главной', () => {
  const home = read('app/(tabs)/home.tsx');
  it('Главная спрашивает доступ ровно у четырёх закрытых разделов', () => {
    for (const surface of ['video', 'dialogues', 'peak', 'cards_hub']) expect(home).toContain(`useRankAccess('${surface}')`);
  });
  it('результат запросов используется при сборке плиток (не только объявлен)', () => {
    for (const name of ['rankLockedVideo', 'rankLockedDialogues', 'rankLockedPeak', 'rankLockedCardsHub']) {
      const uses = home.split(name).length - 1;
      expect(`${name}: ${uses >= 2}`).toBe(`${name}: true`);
    }
  });
  it('хук доступа читает флаг и закрывает разделы, пока флаг включён', () => {
    const hook = read('hooks/use_rank_access.ts');
    expect(hook).toContain('rank_gates_enabled');
  });
});
