import {
  decideSpamAction,
  buildSpamTriagePrompt,
  parseSpamVerdict,
  SPAM_ARCHIVE_MIN_CONFIDENCE,
  type SpamVerdict,
} from './support_spam_triage';

/**
 * Разбор писем на спам — единственное место, где Джарвис МЕНЯЕТ чужие данные
 * (архивирует письмо) без подтверждения владельца. Поэтому правило владельца
 * 2026-08-04 жёсткое: архивируем только ОЧЕВИДНЫЙ спам, всё сомнительное
 * остаётся в очереди. Потерянное письмо клиента дороже лишнего спама в списке.
 */

function verdict(over: Partial<SpamVerdict> = {}): SpamVerdict {
  return { isSpam: true, confidence: 0.99, reason: 'массовая реклама', ...over };
}

describe('decideSpamAction — архивируем только при высокой уверенности', () => {
  test('очевидный спам с высокой уверенностью архивируется', () => {
    expect(decideSpamAction(verdict({ isSpam: true, confidence: 0.99 }))).toBe('archive');
  });

  test('спам на пороге уверенности архивируется', () => {
    expect(decideSpamAction(verdict({ isSpam: true, confidence: SPAM_ARCHIVE_MIN_CONFIDENCE }))).toBe('archive');
  });

  test('спам ЧУТЬ НИЖЕ порога остаётся в очереди — сомнение в пользу человека', () => {
    expect(decideSpamAction(verdict({ isSpam: true, confidence: SPAM_ARCHIVE_MIN_CONFIDENCE - 0.01 }))).toBe('keep');
  });

  test('не спам не трогаем даже при полной уверенности модели', () => {
    expect(decideSpamAction(verdict({ isSpam: false, confidence: 1 }))).toBe('keep');
  });

  test('битый вердикт (null) ничего не архивирует', () => {
    expect(decideSpamAction(null)).toBe('keep');
  });
});

describe('parseSpamVerdict — доверяем только валидному ответу модели', () => {
  test('корректный JSON разбирается', () => {
    const parsed = parseSpamVerdict('{"isSpam":true,"confidence":0.97,"reason":"реклама казино"}');
    expect(parsed).toEqual({ isSpam: true, confidence: 0.97, reason: 'реклама казино' });
  });

  test('JSON внутри markdown-обёртки тоже разбирается', () => {
    const parsed = parseSpamVerdict('```json\n{"isSpam":false,"confidence":0.4,"reason":"вопрос по оплате"}\n```');
    expect(parsed?.isSpam).toBe(false);
  });

  test('мусор вместо JSON — null, а не догадка', () => {
    expect(parseSpamVerdict('не знаю, наверное спам')).toBeNull();
    expect(parseSpamVerdict('')).toBeNull();
  });

  test('confidence вне диапазона 0..1 отбрасывается целиком', () => {
    expect(parseSpamVerdict('{"isSpam":true,"confidence":5,"reason":"x"}')).toBeNull();
    expect(parseSpamVerdict('{"isSpam":true,"confidence":-1,"reason":"x"}')).toBeNull();
  });

  test('отсутствие isSpam делает вердикт невалидным', () => {
    expect(parseSpamVerdict('{"confidence":0.9,"reason":"x"}')).toBeNull();
  });

  test('нечисловой confidence отбрасывается', () => {
    expect(parseSpamVerdict('{"isSpam":true,"confidence":"высокая","reason":"x"}')).toBeNull();
  });
});

describe('buildSpamTriagePrompt — модель не должна получать лишнего', () => {
  test('тема и текст письма попадают в промпт', () => {
    const prompt = buildSpamTriagePrompt({
      subject: 'Купите ссылки дёшево',
      bodyText: 'Продвижение сайта, 500 ссылок за 10 долларов',
      fromEmail: 'seo@spam-shop.example',
    });
    expect(prompt.user).toContain('Купите ссылки');
    expect(prompt.user).toContain('Продвижение сайта');
  });

  test('длинное письмо обрезается — не платим за простыню и не ломаем лимит', () => {
    const prompt = buildSpamTriagePrompt({
      subject: 'тема',
      bodyText: 'а'.repeat(50_000),
      fromEmail: 'a@b.c',
    });
    expect(prompt.user.length).toBeLessThan(3_000);
  });

  test('системная инструкция требует консервативности — сомневаешься, значит не спам', () => {
    const prompt = buildSpamTriagePrompt({ subject: 's', bodyText: 'b', fromEmail: 'a@b.c' });
    expect(prompt.system).toMatch(/сомнева|не уверен|консервативн/i);
  });
});
