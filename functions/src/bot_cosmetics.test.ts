/**
 * Сторож витринной косметики ботов (владелец, 2026-08-27).
 *
 * Ловит два класса бага, которые обычные тесты арены и лиг не видят:
 * • частоты уехали (все боты в аурах либо снова все голые);
 * • в пул попал id, которого нет в каталоге клиента — такая аура молча
 *   не рисуется, и доля просядет незаметно.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  BOT_AURA_CHANCE,
  botCosmeticsForCorpus,
  BOT_CUSTOM_AVATAR_MAX,
  BOT_CUSTOM_AVATAR_MIN,
  BOT_SELLABLE_AVATAR_NUMBERS,
  BOT_PLUS_AURA_SHARE,
  BOT_SHOWCASE_AURA_IDS,
  BOT_SHOWCASE_AVATAR_CHANCE,
  PLUS_BOT_AURA_ID,
  botCosmetics,
  botShowcaseAvatarValue,
} from './bot_cosmetics';

const SAMPLE = 20000;
const seeds = Array.from({ length: SAMPLE }, (_, i) => `seed-${i}`);

describe('bot_cosmetics', () => {
  it('косметика есть не у всех и не у горстки — доли близки к заказанным', () => {
    const all = seeds.map((seed) => botCosmetics(seed));
    const withAvatar = all.filter((c) => c.avatar).length / SAMPLE;
    const withAura = all.filter((c) => c.aura).length / SAMPLE;
    // Допуск 2 п.п.: хэш — не идеальный генератор, но перекос вдвое поймает.
    expect(Math.abs(withAvatar - BOT_SHOWCASE_AVATAR_CHANCE)).toBeLessThan(0.02);
    expect(Math.abs(withAura - BOT_AURA_CHANCE)).toBeLessThan(0.02);
    // Владелец: «не все». Обе доли обязаны оставаться меньшинством.
    expect(withAvatar).toBeLessThan(0.25);
    expect(withAura).toBeLessThan(0.25);
  });

  it('часть ботов носит и аватар, и ауру — броски независимы', () => {
    const both = seeds.filter((seed) => {
      const c = botCosmetics(seed);
      return Boolean(c.avatar && c.aura);
    }).length / SAMPLE;
    const expected = BOT_SHOWCASE_AVATAR_CHANCE * BOT_AURA_CHANCE;
    expect(both).toBeGreaterThan(expected / 3);
    expect(both).toBeLessThan(expected * 3);
  });

  it('Plus-аура редка и всегда идёт вместе с признаком подписки', () => {
    const auras = seeds.map((s) => botCosmetics(s)).filter((c) => c.aura);
    const plus = auras.filter((c) => c.aura === PLUS_BOT_AURA_ID);
    expect(plus.length).toBeGreaterThan(0);
    expect(plus.length / auras.length).toBeLessThan(BOT_PLUS_AURA_SHARE * 2);
    // Без isPremium клиент погасит Plus-ауру — носитель остался бы голым.
    for (const c of plus) expect(c.isPremium).toBe(true);
    // Обычная аура НЕ выдаёт подписку: золотое имя было бы обманом.
    for (const c of auras.filter((x) => x.aura !== PLUS_BOT_AURA_ID)) {
      expect(c.isPremium).toBeUndefined();
    }
  });

  it('ауры берутся только из витринного пула', () => {
    const allowed = new Set<string>([...BOT_SHOWCASE_AURA_IDS, PLUS_BOT_AURA_ID]);
    for (const seed of seeds.slice(0, 3000)) {
      const aura = botCosmetics(seed).aura;
      if (aura) expect(allowed.has(aura)).toBe(true);
    }
  });

  it('аватар — валидная строка витрины из числа продающихся', () => {
    const sellable = new Set(BOT_SELLABLE_AVATAR_NUMBERS);
    for (const seed of seeds.slice(0, 3000)) {
      const value = botShowcaseAvatarValue(seed);
      const parts = value.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('custom');
      const num = Number(parts[1].replace('custom-gen-', ''));
      // Ловит главный класс бага: бот в аватаре, которого нет в продаже.
      expect(sellable.has(num)).toBe(true);
      expect(['black', 'white']).toContain(parts[3]);
    }
  });

  it('за много бросков покрывается почти весь ассортимент магазина', () => {
    // Иначе «продающиеся» могло бы означать три штуки из пятидесяти трёх.
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i += 1) {
      const value = botShowcaseAvatarValue(`spread-${i}`);
      seen.add(Number(value.split(':')[1].replace('custom-gen-', '')));
    }
    expect(seen.size).toBe(BOT_SELLABLE_AVATAR_NUMBERS.length);
  });

  it('косметика детерминирована по seed — соперник не переодевается', () => {
    for (const seed of seeds.slice(0, 500)) {
      expect(botCosmetics(seed)).toEqual(botCosmetics(seed));
    }
  });

  it('каждый id пула реально существует в каталоге клиента', () => {
    // зачем: пул живёт на сервере, каталог — в constants/avatar_auras.ts.
    // Разъехались — аура молча не рисуется. Читаем файл, а не импортируем:
    // клиентские константы тянут за собой React Native.
    const catalog = readFileSync(
      join(__dirname, '..', '..', 'constants', 'avatar_auras.ts'),
      'utf8',
    );
    for (const id of BOT_SHOWCASE_AURA_IDS) {
      expect(catalog).toContain(`id: '${id}'`);
    }
    expect(catalog).toContain("PLUS_AVATAR_AURA_ID = 'aura-plus'");
  });

  it('пул аватаров совпадает с магазином клиента ОДИН В ОДИН', () => {
    // зачем: правда о продаже живёт в AVATAR100_CATALOG на клиенте, а пул —
    // на сервере. Разъедутся — бот наденет снятый с продажи аватар (ровно то,
    // что владелец запретил 2026-08-27) либо перестанет носить новинки.
    // Импортировать каталог нельзя: он тянет React Native, поэтому читаем файл.
    const catalog = readFileSync(
      join(__dirname, '..', '..', 'constants', 'avatar100_assets.ts'),
      'utf8',
    );
    const shopIds = (catalog.match(/'custom-gen-(\d+)':\s*\{\s*name:/g) ?? [])
      .map((row) => Number(row.replace(/\D+/g, '')))
      .sort((a, b) => a - b);
    expect(shopIds.length).toBeGreaterThan(0);
    expect([...BOT_SELLABLE_AVATAR_NUMBERS].sort((a, b) => a - b)).toEqual(shopIds);
    // Границы констант тоже держим в согласии с каталогом.
    expect(BOT_CUSTOM_AVATAR_MIN).toBe(shopIds[0]);
    expect(BOT_CUSTOM_AVATAR_MAX).toBe(shopIds[shopIds.length - 1]);
  });

  it('подарочные и снятые с продажи аватары боту недоступны', () => {
    const sellable = new Set(BOT_SELLABLE_AVATAR_NUMBERS);
    // 01–40 — подарочный пул, 41–72 и 90 — сняты с продажи навсегда.
    for (let i = 1; i <= 72; i += 1) expect(sellable.has(i)).toBe(false);
    expect(sellable.has(90)).toBe(false);
  });
});

describe('bot_cosmetics — квота для замкнутого корпуса (жители лиг)', () => {
  // зачем: свободный бросок на сотне персонажей давал 5 аур вместо 12 —
  // владелец увидел бы почти голую таблицу. Квота держит долю на ЛЮБОМ
  // размере корпуса, так что рост реестра её не сломает.
  const sizes = [40, 100, 250, 1000];

  it('доля носителей ровно заказанная, а не «как повезёт»', () => {
    for (const size of sizes) {
      const all = Array.from({ length: size }, (_, i) => botCosmeticsForCorpus(i, size));
      const avatars = all.filter((c) => c.avatar).length;
      const auras = all.filter((c) => c.aura).length;
      expect(avatars).toBe(Math.ceil(size * BOT_SHOWCASE_AVATAR_CHANCE));
      expect(auras).toBe(Math.ceil(size * BOT_AURA_CHANCE));
    }
  });

  it('подписчик выпадает хотя бы один на корпус и остаётся редкостью', () => {
    for (const size of sizes) {
      const all = Array.from({ length: size }, (_, i) => botCosmeticsForCorpus(i, size));
      const auras = all.filter((c) => c.aura);
      const plus = auras.filter((c) => c.aura === PLUS_BOT_AURA_ID);
      // Ловит баг «две независимые квоты не пересеклись» — там было plus=0.
      expect(plus.length).toBeGreaterThan(0);
      expect(plus.length).toBeLessThan(auras.length / 2);
      for (const c of plus) expect(c.isPremium).toBe(true);
    }
  });

  it('косметика не у всех — большинство корпуса остаётся без неё', () => {
    const size = 100;
    const bare = Array.from({ length: size }, (_, i) => botCosmeticsForCorpus(i, size))
      .filter((c) => !c.avatar && !c.aura).length;
    expect(bare).toBeGreaterThan(size * 0.7);
  });

  it('персонаж не переодевается между вызовами', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(botCosmeticsForCorpus(i, 100)).toEqual(botCosmeticsForCorpus(i, 100));
    }
  });
});
