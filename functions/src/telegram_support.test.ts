import {
  buildSupportReplyCallback,
  formatSupportForward,
  formatUserLabel,
  parseReplyCommand,
  parseSupportReplyCallback,
  supportReplyKeyboard,
  supportThreadDocId,
  truncateForForward,
} from './telegram_support';

const TELEGRAM_TEXT_LIMIT = 4096;

describe('telegram_support — чат поддержки в премиум-боте', () => {
  describe('parseReplyCommand', () => {
    it('разбирает /reply <id> <текст>', () => {
      expect(parseReplyCommand('/reply 123456 Привет! Premium активирован.')).toEqual({
        targetUserId: '123456',
        replyText: 'Привет! Premium активирован.',
      });
    });
    it('многострочный ответ сохраняется целиком', () => {
      const parsed = parseReplyCommand('/reply 42 первая строка\nвторая строка');
      expect(parsed?.targetUserId).toBe('42');
      expect(parsed?.replyText).toBe('первая строка\nвторая строка');
    });
    it('невалидные формы → null', () => {
      expect(parseReplyCommand('/reply')).toBeNull();
      expect(parseReplyCommand('/reply 123')).toBeNull();
      expect(parseReplyCommand('/reply 123   ')).toBeNull();
      expect(parseReplyCommand('/reply abc текст')).toBeNull();
      expect(parseReplyCommand('reply 123 текст')).toBeNull();
      expect(parseReplyCommand('')).toBeNull();
    });
  });

  describe('formatSupportForward', () => {
    const user = { id: 987654, username: 'lena_eng', first_name: 'Лена' };

    it('содержит имя, username, id, текст и подсказку как ответить', () => {
      const text = formatSupportForward(user, 'Оплатил год, премиум не пришёл');
      expect(text).toContain('Лена');
      expect(text).toContain('@lena_eng');
      expect(text).toContain('id 987654');
      expect(text).toContain('Оплатил год, премиум не пришёл');
      expect(text).toContain('/reply 987654');
      expect(text).toContain('reply на это сообщение');
    });
    it('без username и имени не ломается', () => {
      const text = formatSupportForward({ id: 5 }, 'привет');
      expect(text).toContain('Без имени');
      expect(text).toContain('id 5');
      expect(text).not.toContain('@');
    });
    it('гигантский текст юзера ужимается под лимит Telegram', () => {
      const text = formatSupportForward(user, 'ж'.repeat(10_000));
      expect(text.length).toBeLessThanOrEqual(TELEGRAM_TEXT_LIMIT);
      expect(text).toContain('…');
      expect(text).toContain('/reply 987654'); // подсказка не съедена обрезкой
    });
  });

  describe('formatUserLabel', () => {
    it('полный профиль', () => {
      expect(formatUserLabel({ id: 1, username: 'u', first_name: 'Имя' })).toBe('Имя · @u · id 1');
    });
    it('пустой профиль', () => {
      expect(formatUserLabel(undefined)).toBe('Без имени · id -');
    });
  });

  describe('truncateForForward', () => {
    it('короткий текст не трогается', () => {
      expect(truncateForForward('привет')).toBe('привет');
    });
    it('длинный обрезается с многоточием в пределах лимита', () => {
      const out = truncateForForward('а'.repeat(5000), 100);
      expect(out.length).toBe(100);
      expect(out.endsWith('…')).toBe(true);
    });
  });

  describe('supportThreadDocId', () => {
    it('ключ «админ + его message_id» уникален на каждое пересланное сообщение', () => {
      expect(supportThreadDocId(111, 42)).toBe('111_42');
      expect(supportThreadDocId('111', '43')).toBe('111_43');
      expect(supportThreadDocId(111, 42)).not.toBe(supportThreadDocId(222, 42));
    });
  });

  // ── Кнопка «Ответить» под пересланным сообщением ──────────────────────────
  describe('buildSupportReplyCallback', () => {
    it('кодирует ТОЛЬКО message_id админа (не id юзера)', () => {
      expect(buildSupportReplyCallback(42)).toBe('sr:42');
      expect(buildSupportReplyCallback('1234567890')).toBe('sr:1234567890');
    });
    it('callback_data укладывается в лимит Telegram 64 байта для реальных message_id', () => {
      // message_id всегда маленький (per-chat), даже 10 знаков → ~13 байт.
      const data = buildSupportReplyCallback(9999999999);
      expect(Buffer.byteLength(data, 'utf8')).toBeLessThanOrEqual(64);
    });
    it('отсутствующий message_id НЕ даёт валидный callback (никогда не "sr:undefined")', () => {
      // parse должен отвергнуть всё, что не строго sr:<цифры>
      expect(parseSupportReplyCallback(buildSupportReplyCallback(undefined as unknown as number))).toBeNull();
      expect(parseSupportReplyCallback(buildSupportReplyCallback(null as unknown as number))).toBeNull();
    });
  });

  describe('parseSupportReplyCallback', () => {
    it('round-trip: parse(build(id)).adminMessageId === String(id)', () => {
      expect(parseSupportReplyCallback(buildSupportReplyCallback(42))?.adminMessageId).toBe('42');
      expect(parseSupportReplyCallback(buildSupportReplyCallback('700'))?.adminMessageId).toBe('700');
    });
    it('мусор и чужие callback → null (оба конца заякорены)', () => {
      expect(parseSupportReplyCallback('')).toBeNull();
      expect(parseSupportReplyCallback('sr:')).toBeNull();
      expect(parseSupportReplyCallback('sr:abc')).toBeNull();
      expect(parseSupportReplyCallback('srx:123')).toBeNull();
      expect(parseSupportReplyCallback('support:start')).toBeNull();
      expect(parseSupportReplyCallback('sr:12:34')).toBeNull();
      expect(parseSupportReplyCallback('SR:123')).toBeNull();
      expect(parseSupportReplyCallback('sr: 123')).toBeNull();
      expect(parseSupportReplyCallback('sr:123 ')).toBeNull();
      expect(parseSupportReplyCallback(undefined as unknown as string)).toBeNull();
    });
    it('очень длинный числовой id не ломает разбор (остаётся строкой)', () => {
      const id = '1'.repeat(60);
      expect(parseSupportReplyCallback(`sr:${id}`)?.adminMessageId).toBe(id);
    });
  });

  describe('supportReplyKeyboard', () => {
    it('кнопка содержит имя в тексте и parseable callback_data', () => {
      const kb = supportReplyKeyboard(42, 'Гульфия')!;
      const button = kb.inline_keyboard[0][0];
      expect(button.text).toContain('Гульфия');
      expect(button.callback_data).toBe('sr:42');
      expect(parseSupportReplyCallback(button.callback_data)?.adminMessageId).toBe('42');
    });
    it('имя живёт ТОЛЬКО в тексте — спецсимволы/эмодзи/кавычки в имени не попадают в callback_data', () => {
      const kb = supportReplyKeyboard(7, '«Лена» 😀 /reply')!;
      const button = kb.inline_keyboard[0][0];
      expect(button.callback_data).toBe('sr:7');
      expect(button.text).toContain('«Лена»');
    });
    it('без message_id кнопка не строится (нечего редактировать)', () => {
      expect(supportReplyKeyboard(undefined as unknown as number, 'Кто-то')).toBeNull();
    });
  });
});
