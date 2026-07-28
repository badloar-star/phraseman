import fs from 'fs';
import path from 'path';

describe('Telegram Premium monthly subscription checkout guard', () => {
  const source = fs.readFileSync(path.join(__dirname, 'telegram_premium_bot.ts'), 'utf8');

  it('checks every server-recorded recurring order before creating a monthly invoice link', () => {
    const guardStart = source.indexOf('async function findActiveMonthlySubscriptionExpiration');
    const guardEnd = source.indexOf('async function sendMonthlyInvoiceLink', guardStart);
    const guardBody = source.slice(guardStart, guardEnd);

    expect(guardStart).toBeGreaterThan(-1);
    expect(guardBody).toContain("db.collection('telegram_premium_orders')");
    expect(guardBody).toContain(".where('telegramUserId', '==', telegramUserId)");
    expect(guardBody).toContain(".where('plan', '==', 'monthly')");
    expect(guardBody).toContain('order.isRecurring === true');
    expect(guardBody).not.toContain('order.isFirstRecurring');
    expect(guardBody).toContain('expiration > nowSeconds');
    expect(guardBody).not.toContain('order.status');

    const sendStart = source.indexOf('async function sendMonthlyInvoiceLink');
    const sendEnd = source.indexOf('const db = admin.firestore()', sendStart);
    const sendBody = source.slice(sendStart, sendEnd);
    const guardCall = sendBody.indexOf('findActiveMonthlySubscriptionExpiration(input.userId)');
    const linkCall = sendBody.indexOf('createInvoiceLink(token, input)');

    expect(guardCall).toBeGreaterThan(-1);
    expect(linkCall).toBeGreaterThan(guardCall);
  });

  it('blocks the invoice link with a clear Russian expiry message while preserving expired checkout', () => {
    const sendStart = source.indexOf('async function sendMonthlyInvoiceLink');
    const sendEnd = source.indexOf('const db = admin.firestore()', sendStart);
    const sendBody = source.slice(sendStart, sendEnd);

    expect(sendBody).toContain('if (activeExpiration !== null)');
    expect(sendBody).toContain('У вас уже есть активная месячная подписка Phraseman Premium.');
    expect(sendBody).toContain('Она действует до ${formatSubscriptionExpirationDateRu(activeExpiration)}.');
    expect(sendBody).toMatch(/if \(activeExpiration !== null\)[\s\S]*?return;[\s\S]*?createInvoiceLink\(token, input\)/);
  });
});
