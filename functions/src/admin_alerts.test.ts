import { dispatchTelegramAlert, formatContentReportAlert, formatContentReportAlertSafe } from './admin_alerts';

const TELEGRAM_TEXT_LIMIT = 4096;

const baseReport = {
  uid: 'stable_abcd1234',
  authUid: 'auth_xyz',
  platform: 'android',
  appVersion: '1.4.2',
  screen: 'lesson1',
  category: 'free_text',
  dataId: 'lesson3_phrase_2',
  dataText: 'Я пью кофе каждое утро.\nI drink coffee every morning.',
  userAnswer: 'I drink a coffee every morning',
  comment: 'Тут лишний артикль в ответе, а приложение говорит что я неправ',
  deviceModel: 'Pixel 7',
  deviceOS: 'Android',
  deviceOSVersion: '14',
  userName: 'Лена',
  userLevel: 12,
  userXP: 3400,
  userStreak: 5,
  userPremium: true,
  userDaysInApp: 21,
};

describe('formatContentReportAlert', () => {
  it('включает полный текст репорта: комментарий, контент, ответ юзера, экран, dataId, юзера', () => {
    const text = formatContentReportAlert(baseReport);
    expect(text).toContain('Content-репорт');
    expect(text).toContain('Тут лишний артикль в ответе, а приложение говорит что я неправ');
    expect(text).toContain('Я пью кофе каждое утро.');
    expect(text).toContain('I drink coffee every morning.');
    expect(text).toContain('I drink a coffee every morning');
    expect(text).toContain('lesson1');
    expect(text).toContain('lesson3_phrase_2');
    expect(text).toContain('Лена');
    expect(text).toContain('#1234'); // хвост stable uid
    expect(text).toContain('Premium');
  });

  it('экранирует HTML в пользовательском тексте (parse_mode=HTML не должен ломаться)', () => {
    const text = formatContentReportAlert({
      ...baseReport,
      comment: 'тег <b>жирный</b> & "кавычки"',
      dataText: '<script>alert(1)</script>',
    });
    expect(text).not.toContain('<script>');
    expect(text).toContain('&lt;script&gt;');
    expect(text).toContain('тег &lt;b&gt;жирный&lt;/b&gt; &amp;');
  });

  it('не печатает строку «Ответ юзера» когда ответа нет', () => {
    const text = formatContentReportAlert({ ...baseReport, userAnswer: '' });
    expect(text).not.toContain('Ответ юзера');
  });

  it('скрывает категорию free_text, но показывает кастомную', () => {
    expect(formatContentReportAlert(baseReport)).not.toContain('free_text');
    expect(formatContentReportAlert({ ...baseReport, category: 'wrong_translation' }))
      .toContain('wrong_translation');
  });
});

describe('formatContentReportAlertSafe', () => {
  it('обычный репорт проходит без обрезки', () => {
    const text = formatContentReportAlertSafe(baseReport);
    expect(text).toContain('Тут лишний артикль');
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
  });

  it('гигантские поля ужимаются под лимит Telegram (4096)', () => {
    const huge = {
      ...baseReport,
      comment: 'к'.repeat(2000),
      dataText: 'т&т<т>'.repeat(900), // 5400 сырых символов + раздувание при экранировании
      userAnswer: 'о'.repeat(1000),
    };
    const text = formatContentReportAlertSafe(huge);
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
    // сообщение остаётся валидным HTML: <pre> закрыт, и комментарий присутствует (пусть и обрезанный)
    expect((text.match(/<pre>/g) || []).length).toBe((text.match(/<\/pre>/g) || []).length);
    expect(text).toContain('кккк');
  });

  it('держит лимит даже при патологическом экранировании (сплошные &)', () => {
    const nasty = {
      ...baseReport,
      comment: '&'.repeat(2000),
      dataText: '&'.repeat(5000),
      userAnswer: '&'.repeat(1000),
      userName: '&'.repeat(60),
    };
    const text = formatContentReportAlertSafe(nasty);
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
  });
});

describe('dispatchTelegramAlert', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports provider acceptance, HTTP rejection and uncertain transport separately', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);
    await expect(dispatchTelegramAlert('token', 'hello', { enabled: true, chatId: '123' })).resolves.toEqual({ status: 'accepted_by_provider' });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad chat' } as Response);
    await expect(dispatchTelegramAlert('token', 'hello', { enabled: true, chatId: '123' })).resolves.toEqual({ status: 'rejected' });
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(dispatchTelegramAlert('token', 'hello', { enabled: true, chatId: '123' })).resolves.toEqual({ status: 'delivery_uncertain' });
  });
});
