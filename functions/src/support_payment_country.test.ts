import { classifySupportRisk, isPaymentCountryQuestion, buildPaymentCountryReply } from './support_auto_reply_policy';

/**
 * зачем этот файл (владелец, 2026-08-17, письмо Шухрата): «в какую страну
 * идёт платёж, если оплачу подписку?» — вопрос ФАКТА, а не разбор покупки.
 * Слово «оплата» само по себе давало billing-риск, и клиент, который ещё НЕ
 * платил, получал шаблон «поднимем вашу конкретную покупку», написанный для
 * того, у кого списали деньги. Ответ не по делу читается как заготовка,
 * а не как осмысленный ИИ-ответ — владелец заметил это на реальном письме.
 */
describe('isPaymentCountryQuestion — вопрос факта, а не разбор покупки', () => {
  test('реальное письмо Шухрата распознаётся', () => {
    const text = 'Мой ник в приложении: Nova 41646\n Доброе времени суток))\n'
      + 'Могу ли я уточнить если я оплачу подписку оплата какой стране идет ?\nСпасибо заранее';
    expect(isPaymentCountryQuestion(text)).toBe(true);
  });

  test('английская и испанская формулировки тоже распознаются', () => {
    expect(isPaymentCountryQuestion('Which country does the payment go to if I subscribe?')).toBe(true);
    expect(isPaymentCountryQuestion('¿A qué país va el pago si me suscribo?')).toBe(true);
  });

  test('жалоба на списание НЕ уходит сюда — там нужен человек', () => {
    // зачем: «оплатил, а доступа нет» — это разбор конкретной покупки, ответ
    // про устройство платежа звучал бы как отписка мимо проблемы.
    expect(isPaymentCountryQuestion('Оплатил подписку, но доступ не появился. В какую страну ушли деньги?')).toBe(false);
    expect(isPaymentCountryQuestion('Списали дважды за подписку, куда идут деньги?')).toBe(false);
  });

  test('вопрос без слова про оплату не подхватывается', () => {
    expect(isPaymentCountryQuestion('В какую страну вы отправляете письма?')).toBe(false);
  });

  test('классификатор всё ещё видит здесь billing-риск', () => {
    // зачем: маршрут допускает risk safe ИЛИ billing — сам классификатор
    // трогать нельзя, слово «оплата» законно значит риск. Проверяем, что
    // именно billing, а не что-то ещё, чтобы условие допуска не разъехалось.
    const text = 'Могу ли я уточнить если я оплачу подписку оплата какой стране идет?';
    expect(classifySupportRisk(text)).toBe('billing');
  });
});

describe('buildPaymentCountryReply — ответ без выдуманных фактов', () => {
  test('называет App Store и Google Play, не RevenueCat', () => {
    // зачем: RevenueCat — внутреннее имя, клиент его не знает и не должен.
    const reply = buildPaymentCountryReply('В какую страну идёт платёж?');
    expect(reply).toMatch(/App Store/i);
    expect(reply).toMatch(/Google Play/i);
    expect(reply).not.toMatch(/RevenueCat/i);
  });

  test('не называет конкретную страну — её определяет аккаунт клиента, не мы', () => {
    // зачем: у Phraseman нет доступа к платёжным данным магазина — назвать
    // страну значило бы выдумать факт, которого мы не знаем.
    const reply = buildPaymentCountryReply('В какую страну идёт платёж?');
    expect(reply).not.toMatch(/\bРоссия\b|\bUSA\b|\bEurope\b/i);
  });

  test('переводится на три языка', () => {
    expect(buildPaymentCountryReply('Здравствуйте, вопрос про оплату')).toMatch(/Здравствуйте/);
    expect(buildPaymentCountryReply('Hello, payment question')).toMatch(/Hello/);
    expect(buildPaymentCountryReply('¡Hola! Pregunta de pago')).toMatch(/Hola/);
  });
});
