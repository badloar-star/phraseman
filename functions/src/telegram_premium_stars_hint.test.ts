// Жалоба 11.11: из России «купить невозможно» — Telegram не продаёт Stars в окне счёта. Сторож: рядом с каждой кнопкой оплаты
// бот показывает, сколько Stars нужно и как пополнить баланс отдельно; сбой подсказки не ломает сам счёт.
import fs from 'fs';
import path from 'path';

import { TELEGRAM_STARS_TOP_UP_BOT_URL, starsTopUpHintRu, starsTopUpKeyboardRow } from './telegram_premium_stars_hint';

describe('подсказка о пополнении Stars перед оплатой', () => {
  it('называет точную сумму, ошибку, которую видит человек, и оба пути пополнения', () => {
    const text = starsTopUpHintRu(2500);
    expect(text).toContain('2500 Stars');
    expect(text).toContain('ошибка платёжной системы');
    expect(text).toContain('@PremiumBot');
    expect(text).toContain('Мои звёзды');
    expect(text).toContain('/paysupport');
    expect(starsTopUpHintRu(500)).toContain('500 Stars');
  });

  it('кнопка ведёт в официальный бот Telegram', () => {
    expect(TELEGRAM_STARS_TOP_UP_BOT_URL).toBe('https://t.me/PremiumBot');
    expect(starsTopUpKeyboardRow()).toEqual([{ text: 'Пополнить Stars', url: 'https://t.me/PremiumBot' }]);
  });

  it('бот показывает подсказку и для годового счёта, и для месячной ссылки', () => {
    const source = fs.readFileSync(path.join(__dirname, 'telegram_premium_bot.ts'), 'utf8');
    // годовой: отдельное сообщение после счёта, сбой которого не роняет оплату
    expect(source).toMatch(/await sendInvoice\(token, chatId, \{[^}]*\}\);\s*await sendStarsTopUpHint\(token, chatId, plan, userId\);/);
    expect(source).toMatch(/async function sendStarsTopUpHint[\s\S]*?catch \(error\) \{[\s\S]*?'stars_hint:failed'/);
    // месячный: подсказка в том же сообщении, что и кнопка оплаты
    expect(source).toMatch(/starsTopUpHintRu\(starsForPlan\('monthly'\)\)/);
    expect(source).toMatch(/\[\{ text: 'Оплатить месяц', url: link \}\],\s*starsTopUpKeyboardRow\(\)/);
  });
});
