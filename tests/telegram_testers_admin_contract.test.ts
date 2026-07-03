import fs from 'fs';
import path from 'path';

describe('telegram testers admin page contract', () => {
  const htmlPath = path.join(process.cwd(), 'admin', 'testers.html');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
  const adminIndex = fs.readFileSync(path.join(process.cwd(), 'admin', 'index.html'), 'utf8');
  const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  const functionSource = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'telegram_premium_bot.ts'), 'utf8');

  it('exposes a protected testers page without payment wording in visible copy', () => {
    expect(html).toContain('Тестеры');
    expect(html).toContain("collection(db, 'telegram_premium_orders')");
    expect(html).toContain('getIdTokenResult');
    expect(html).toContain('claims.admin === true');
    expect(html).toContain('openTesterUserCard');
    expect(html).toContain('Период');

    const visibleText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');

    expect(visibleText).not.toMatch(/оплат|деньг|цен|stars|paid|payment|premium/i);
  });

  it('opens a tester activation panel and still links to the original Users detail card', () => {
    expect(html).toContain('function openTesterUserCard');
    expect(html).toContain('activateTesterPeriod');
    expect(html).toContain('openFullUserCard');
    expect(html).toContain("new URL('index.html'");
    expect(html).toContain("target.searchParams.set('openUser', userDoc.id)");
    expect(html).toContain('window.location.href = target.toString()');

    expect(adminIndex).toContain('openAdminUserFromQuery');
    expect(adminIndex).toContain("params.get('openUser')");
    expect(adminIndex).toContain("window.switchTab('users'");
    expect(adminIndex).toContain('window.openDetail(uid)');
  });

  it('activates the selected tester period as admin VIP without touching store Premium fields', () => {
    expect(html).toContain("import { getFirestore, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where }");
    expect(html).toContain('function activationMonthsForPlan');
    expect(html).toContain("return plan === 'yearly' ? 12 : 1");
    expect(html).toContain('function buildTesterVipUpdate');
    expect(html).toContain("'progress.vip_active': 'true'");
    expect(html).toContain("'progress.vip_plan': 'telegram_tester'");
    expect(html).toContain("'progress.vip_from': fromStr");
    expect(html).toContain("'progress.vip_until': expiryStr");
    expect(html).toContain("'progress.vip_admin_override': 'true'");
    expect(html).toContain("'progress.vip_admin_grant_at': grantAt");
    expect(html).toContain("updateDoc(doc(db, 'users', uid),");
    expect(html).toContain("updateDoc(doc(db, 'telegram_premium_orders', tester.id),");
    expect(html).toContain('testerActivationStatus');
    expect(html).toContain("status: 'vip_activated'");
    expect(html).not.toContain("'progress.premium_plan':");
    expect(html).not.toContain("'progress.premium_expiry':");
    expect(html).not.toContain('premium_rc_');
  });

  it('confirms tester VIP activation and refreshes the open detail state', () => {
    expect(html).toContain('id="tester-activation-status"');
    expect(html).toContain('id="activation-notice"');
    expect(html).toContain('function setActivationNotice');
    expect(html).toContain('function setActivationButtonsBusy');
    expect(html).toContain('function refreshOpenTesterDetailFromRows');
    expect(html).toContain("setActivationButtonsBusy(true)");
    expect(html).toContain("setActivationNotice('Активирую доступ...', 'info')");
    expect(html).toContain("setActivationNotice('VIP активирован. Статус записи обновлён.', 'success')");
    expect(html).toContain('currentTesterDetail.testerId');
    expect(html).toContain('testerRows.find((row) => row.id === currentTesterDetail.testerId)');
    expect(html).toContain('refreshOpenTesterDetailFromRows()');
  });

  it('keeps the testers table minimal without KPI cards or service columns', () => {
    const visibleText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');

    expect(html).not.toContain('class="kpi"');
    expect(html).not.toContain('k-pending');
    expect(html).not.toContain('k-total');
    expect(html).not.toContain('function statusLabel');
    expect(html).not.toContain('formatDate(row.paidAt');
    expect(html).not.toContain('telegramPaymentChargeId || row.id');

    expect(visibleText).toContain('Ник');
    expect(visibleText).toContain('Период');
    expect(visibleText).not.toContain('Ожидают');
    expect(visibleText).not.toContain('Статус');
    expect(visibleText).not.toContain('Дата');
    expect(visibleText).not.toContain('ID записи');
  });

  it('lets only admin read tester intake records and blocks client writes', () => {
    expect(rules).toContain('match /telegram_premium_orders/{orderId}');
    expect(rules).toContain('allow read: if isAdmin();');
    expect(rules).toContain('allow create, delete: if false;');
    expect(rules).toContain('allow update: if isAdmin();');
  });

  it('does not persist unnecessary Telegram or invoice details in Firestore orders', () => {
    const orderStart = functionSource.indexOf('const order = {');
    const orderEnd = functionSource.indexOf('};', orderStart);
    const orderBody = functionSource.slice(orderStart, orderEnd);

    expect(orderBody).toContain('appNickname');
    expect(orderBody).toContain('planDuration');
    expect(orderBody).toContain('telegramUserId');
    expect(orderBody).toContain('telegramPaymentChargeId');
    expect(orderBody).not.toContain('telegramUsername');
    expect(orderBody).not.toContain('providerPaymentChargeId');
    expect(orderBody).not.toContain('invoicePayload');
    expect(orderBody).not.toContain('chatId');
  });

  it('keeps cloud admin setup and admin menu callbacks tied to the same Telegram user id', () => {
    expect(functionSource).toContain("db.collection('telegram_premium_bot').doc('config')");
    expect(functionSource).toContain('return ids.map(String)');
    expect(functionSource).toContain('includes(String(userId))');
    expect(functionSource).toContain('admin.firestore.FieldValue.arrayUnion(String(userId))');

    const setupStart = functionSource.indexOf('async function handleAdminSetup');
    const setupEnd = functionSource.indexOf('async function notifyAdmins', setupStart);
    const setupBody = functionSource.slice(setupStart, setupEnd);
    expect(setupBody).toContain('await addAdmin(userId)');
    expect(setupBody).toMatch(/await addAdmin\(userId\);\s*await sendMessage\(token, chatId,/);

    const callbackStart = functionSource.indexOf('async function handleCallbackQuery');
    const callbackEnd = functionSource.indexOf('async function handlePreCheckoutQuery', callbackStart);
    const callbackBody = functionSource.slice(callbackStart, callbackEnd);
    expect(callbackBody).toContain("if (data === 'admin:orders')");
    expect(callbackBody).toContain('await sendOrdersList(token, chatId, userId)');
  });

  it('keeps a visible Telegram pay button that starts the nickname flow', () => {
    expect(functionSource).toContain("const PAY_BUTTON_TEXT_RU = 'Оплатить Premium'");
    expect(functionSource).toContain('const HERO_IMAGE_URL =');
    expect(functionSource).toContain('assets/telegram-premium/phraseman-premium-hero.png');
    expect(functionSource).toContain("telegramRequest(token, 'sendPhoto'");
    expect(functionSource).toContain('async function sendPremiumWelcome');
    expect(functionSource).toContain('function startReplyKeyboard()');
    expect(functionSource).toContain('keyboard: [[{ text: PAY_BUTTON_TEXT_RU }], [{ text: SUPPORT_BUTTON_TEXT_RU }]]');
    expect(functionSource).toContain("text === PAY_BUTTON_TEXT_RU");
    expect(functionSource).toContain('reply_markup: startReplyKeyboard()');
  });

  it('makes monthly Telegram Stars payments recurring without provider token and keeps yearly one-time', () => {
    expect(functionSource).toContain('const MONTHLY_SUBSCRIPTION_PERIOD_SECONDS = 2592000');
    expect(functionSource).toContain("if (plan === 'monthly')");
    expect(functionSource).toContain('invoice.subscription_period = MONTHLY_SUBSCRIPTION_PERIOD_SECONDS');
    expect(functionSource).toContain("telegramRequest(token, 'createInvoiceLink', invoice)");
    expect(functionSource).toContain('sendMonthlyInvoiceLink');
    expect(functionSource).not.toContain("provider_token: ''");
    expect(functionSource).not.toMatch(/\bprovider_token\s*:/);
    expect(functionSource).toContain("telegramRequest(token, 'sendInvoice', invoice)");
    expect(functionSource).toContain('isRecurring: payment.is_recurring === true');
    expect(functionSource).toContain('isFirstRecurring: payment.is_first_recurring === true');
    expect(functionSource).toContain('subscriptionExpirationDate: payment.subscription_expiration_date || null');
  });

  it('notifies Telegram admins when a tester record is activated from the admin page', () => {
    expect(functionSource).toContain("import { onDocumentUpdated } from 'firebase-functions/v2/firestore'");
    expect(functionSource).toContain('telegramPremiumActivationNotifier');
    expect(functionSource).toContain("document: 'telegram_premium_orders/{orderId}'");
    expect(functionSource).toContain('notifyTesterActivationAdmins');
    expect(functionSource).toContain("after.testerActivationStatus === 'activated'");
    expect(functionSource).toContain("before.testerActivationStatus === 'activated'");
    expect(functionSource).toContain('activationNotificationSentAt');
    expect(functionSource).toContain('activationNotificationStatus');
    expect(functionSource).toContain('Premium активирован');
    expect(functionSource).toContain('VIP выдан через админку');
    expect(functionSource).toContain('await change.after.ref.set');
    expect(functionSource).toContain("activationNotificationStatus: 'sent'");

    expect(functionSource).toContain('export const telegramPremiumActivationNotifier');
    expect(functionSource).toContain('secrets: [PHRASEMAN_PREMIUM_BOT_TOKEN]');
    expect(functionSource).toContain('const token = PHRASEMAN_PREMIUM_BOT_TOKEN.value()');
    expect(functionSource).toContain('await notifyTesterActivationAdmins(token, after)');
  });
});
