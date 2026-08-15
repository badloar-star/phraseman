import fs from 'fs';
import path from 'path';
import { arenaBotAvatar, arenaBotDisplayName } from '../functions/src/arena_bot_identity';

/**
 * Соперник-бот не раскрывается — требование владельца, и оно про интерфейс, а
 * не про честность: игрок не должен догадаться, что играет с ботом.
 *
 * Здесь проверяется ровно то, чем бот выдавал себя на глаз.
 */
describe('бот не выдаёт себя внешностью', () => {
  it('у бота есть аватар, а не заглушка', () => {
    // Аватар — это номер в наборе строкой. Пусто значит заглушка, и в
    // заставке «соперник найден» одна из двух картинок всегда была пустой.
    for (const seed of ['m1', 'm2', 'm3', 'zz', '']) {
      expect(arenaBotAvatar(seed, '30')).toMatch(/^\d+$/);
    }
  });

  it('номер аватара не выше собственного аватара игрока', () => {
    // Набор аватаров на сервере не продублирован: номер выше того, что есть у
    // игрока, может отсутствовать в его сборке — и заглушка вернётся.
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const value = Number(arenaBotAvatar(seed, '14'));
      expect(value).toBeLessThanOrEqual(14);
      expect(value).toBeGreaterThanOrEqual(1);
    }
  });

  it('работает, когда про игрока ничего не известно', () => {
    for (const viewer of [undefined, null, '', 'custom:xyz', '0', 'abc']) {
      const value = Number(arenaBotAvatar('seed', viewer));
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(12);
    }
  });

  it('аватар и имя не меняются при переподключении', () => {
    // Иначе соперник менял бы лицо посреди матча — это заметнее любого бота.
    expect(arenaBotAvatar('same', '20')).toBe(arenaBotAvatar('same', '20'));
    expect(arenaBotDisplayName('same', 'ru')).toBe(arenaBotDisplayName('same', 'ru'));
  });

  it('имя не служебное и умещается в поле', () => {
    for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'xx']) {
      const name = arenaBotDisplayName(`seed_${lang}`, lang);
      expect(name.length).toBeGreaterThan(0);
      expect(name.length).toBeLessThanOrEqual(48);
      expect(name.toLowerCase()).not.toContain('bot');
    }
  });
});

describe('сервер действительно ставит боту аватар', () => {
  it('снимок бота собирается с аватаром', () => {
    // Функция может существовать и не быть подключённой — именно так это и
    // было до сих пор.
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'functions/src/arena_v2.ts'), 'utf8');
    expect(source).toContain('avatar: arenaBotAvatar(botSeed, who.user.avatar)');
  });
});
