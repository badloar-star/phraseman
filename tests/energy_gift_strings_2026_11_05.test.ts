// зачем (подарок энергии, 05.11): тексты на 9 языках полны, без плейсхолдеров, короче 65 знаков; причины отказа сервера отображаются в сообщения.
import fs from 'node:fs';
import path from 'node:path';
import { ENERGY_GIFT_STRING_KEYS, energyGiftErrorKey, energyGiftText } from '../components/friends_together/energy_gift_strings';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('строки «Подарка энергии»', () => {
  it('11 ключей, каждый на 9 языках, непустой и короче 65 знаков, без фигурных плейсхолдеров', () => {
    expect(ENERGY_GIFT_STRING_KEYS).toHaveLength(11);
    for (const key of ENERGY_GIFT_STRING_KEYS) for (const lang of LANGS) {
      const t = energyGiftText(lang, key);
      expect(t.trim().length).toBeGreaterThan(1);
      expect(t.length).toBeLessThan(65);
      expect(t).not.toMatch(/[{}]/);
    }
  });
  it('совпадает с файлом Переводчика (русская и английская колонки)', () => {
    const md = fs.readFileSync(path.join(__dirname, '..', 'docs/work/gift_energy_strings_9lang.md'), 'utf8').replace(/\r\n/g, '\n');
    for (const key of ENERGY_GIFT_STRING_KEYS) {
      const row = md.split('\n').find((l) => l.startsWith(`| ${key} |`))!;
      const cells = row.split('|').map((c) => c.trim());
      expect(energyGiftText('ru', key)).toBe(cells[2]);
      expect(energyGiftText('en', key)).toBe(cells[4]);
    }
  });
  it('известные причины отказа → свои сообщения, неизвестная → общая ошибка; чужой язык → английский', () => {
    expect(energyGiftErrorKey('limit_sender')).toBe('giftErrSender');
    expect(energyGiftErrorKey('limit_receiver')).toBe('giftErrReceiver');
    expect(energyGiftErrorKey('recipient_plus')).toBe('giftErrPlus');
    expect(energyGiftErrorKey('not_friends')).toBe('giftErrNotFriends');
    expect(energyGiftErrorKey('too_new')).toBe('giftErrTooNew');
    expect(energyGiftErrorKey('whatever')).toBe('giftErrGeneric');
    expect(energyGiftErrorKey(null)).toBe('giftErrGeneric');
    expect(energyGiftText('de', 'giftSend')).toBe('Gift +1');
  });
});
