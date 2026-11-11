import {
  PRODUCT_CHARTER_MAX_CHARS,
  PRODUCT_CHARTER_SECTIONS,
  diffProductCharters,
  nextProductCharterReviewDate,
  parseProductCharter,
  renderProductCharter,
  validateProductCharterSections,
} from './product_charter';

// зачем (владелец, 2026-08-16): «изучи продукт и дай ему фулл описание… пиши
// сразу устав где-то в админке… удобными категориями, чтобы было удобно раз в
// месяц всё проверить и обновить, а также записывать и сохранять историю».
// Устав — это то, чем бот отвечает живым людям, поэтому тихая потеря куска
// текста здесь дороже явной ошибки: заметить её можно только по жалобе.

const charter = (sections: Array<{ key: string; body: string }>, extra: Record<string, unknown> = {}) =>
  parseProductCharter({ sections, revision: 1, ...extra });

describe('parseProductCharter — устав из базы', () => {
  test('разделы идут в порядке проверки, а не в порядке базы', () => {
    // зачем: раз в месяц владелец проходит по списку сверху вниз. Порядок,
    // зависящий от того, как легли данные, сломал бы саму привычку проверять.
    const parsed = charter([
      { key: 'disabled', body: 'турниры выключены' },
      { key: 'about', body: 'приложение для английского' },
    ]);
    expect(parsed.sections.map((s) => s.key)).toEqual(['about', 'disabled']);
  });

  test('неизвестный раздел отбрасывается', () => {
    // зачем: раздел вне списка не покажется в панели и не попадёт в
    // ежемесячную проверку. Невидимый раздел устаревает молча.
    expect(charter([{ key: 'придуманный', body: 'текст' }]).sections).toEqual([]);
  });

  test('пустые разделы не занимают место в промпте', () => {
    expect(charter([{ key: 'about', body: '   ' }]).sections).toEqual([]);
  });

  test('дубль раздела берётся один раз', () => {
    const parsed = charter([
      { key: 'about', body: 'первый' },
      { key: 'about', body: 'второй' },
    ]);
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].body).toBe('первый');
  });

  test('мусор вместо документа не роняет чтение', () => {
    // зачем: устав читают и Джарвис, и панель. Сломанный документ не должен
    // ронять ни утренний прогон, ни вход в админку.
    for (const broken of [null, undefined, 'строка', 42, [], { sections: 'не массив' }]) {
      expect(parseProductCharter(broken).sections).toEqual([]);
    }
  });

  test('битая ревизия не превращается в NaN', () => {
    expect(parseProductCharter({ revision: 'много' }).revision).toBe(0);
  });

  test('дата пересмотра читается только в правильном формате', () => {
    expect(parseProductCharter({ reviewBy: '2026-09-16' }).reviewBy).toBe('2026-09-16');
    expect(parseProductCharter({ reviewBy: '16.09.2026' }).reviewBy).toBeNull();
  });
});

describe('renderProductCharter — текст для Джарвиса', () => {
  test('заголовки категорий попадают в промпт', () => {
    // зачем: без заголовка «Чего в приложении НЕТ» модель видит просто абзац.
    // Сам заголовок несёт запрет.
    const text = renderProductCharter(charter([{ key: 'disabled', body: 'турниры выключены' }]));
    expect(text).toContain('Чего в приложении НЕТ');
    expect(text).toContain('турниры выключены');
  });

  test('пустой устав даёт пустой текст, а не заголовок без содержания', () => {
    expect(renderProductCharter(charter([]))).toBe('');
  });

  test('слишком длинный устав обрезается, а не уходит в промпт целиком', () => {
    const text = renderProductCharter(charter([{ key: 'about', body: 'я'.repeat(PRODUCT_CHARTER_MAX_CHARS * 2) }]));
    expect(text.length).toBeLessThanOrEqual(PRODUCT_CHARTER_MAX_CHARS);
  });
});

describe('validateProductCharterSections — что пускаем в базу', () => {
  test('нормальный устав проходит', () => {
    const sections = validateProductCharterSections([{ key: 'about', body: 'текст' }]);
    expect(sections).toHaveLength(1);
  });

  test('выдуманный раздел не пускаем', () => {
    // зачем проверка на сервере, а не только в панели: панель можно обойти.
    expect(() => validateProductCharterSections([{ key: 'hack', body: 'x' }])).toThrow(/unknown section/);
  });

  test('дубль раздела не пускаем', () => {
    expect(() => validateProductCharterSections([
      { key: 'about', body: 'a' }, { key: 'about', body: 'b' },
    ])).toThrow(/duplicate/);
  });

  test('слишком длинный устав не пускаем', () => {
    expect(() => validateProductCharterSections([
      { key: 'about', body: 'я'.repeat(PRODUCT_CHARTER_MAX_CHARS + 1) },
    ])).toThrow(/too long/);
  });

  test('не массив — ошибка, а не молчаливое «ноль разделов»', () => {
    expect(() => validateProductCharterSections('текст')).toThrow();
  });
});

describe('diffProductCharters — что изменилось', () => {
  test('видит добавленный, изменённый и удалённый раздел', () => {
    const before = charter([{ key: 'about', body: 'старое' }, { key: 'money', body: 'тарифы' }]);
    const after = charter([{ key: 'about', body: 'новое' }, { key: 'disabled', body: 'нет турниров' }]);
    const changes = diffProductCharters(before, after);
    expect(changes.find((c) => c.key === 'about')?.kind).toBe('edited');
    expect(changes.find((c) => c.key === 'money')?.kind).toBe('removed');
    expect(changes.find((c) => c.key === 'disabled')?.kind).toBe('added');
  });

  test('без правок — пустой список, «сохранил и ничего не менял» видно', () => {
    const same = charter([{ key: 'about', body: 'текст' }]);
    expect(diffProductCharters(same, same)).toEqual([]);
  });
});

describe('nextProductCharterReviewDate — срок следующей проверки', () => {
  test('ровно через месяц от сохранения', () => {
    expect(nextProductCharterReviewDate(Date.parse('2026-08-16T10:00:00Z'))).toBe('2026-09-16');
  });

  test('конец месяца не даёт несуществующей даты', () => {
    // 31 января + месяц: в феврале нет 31-го. Дата обязана остаться реальной,
    // иначе напоминание не распарсит её и решит, что срока нет вовсе.
    const result = nextProductCharterReviewDate(Date.parse('2026-01-31T10:00:00Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(`${result}T00:00:00Z`))).toBe(false);
  });
});

describe('категории устава', () => {
  test('у каждой есть подсказка, что проверять', () => {
    // зачем: раздел без подсказки при ежемесячном обходе пролистывают.
    for (const section of PRODUCT_CHARTER_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.checkHint.length).toBeGreaterThan(0);
    }
  });

  test('ключи уникальны', () => {
    const keys = PRODUCT_CHARTER_SECTIONS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('раздел про отсутствующее есть — он важнее прочих', () => {
    // зачем именно он: «Компас» приняли за стороннее приложение, потому что
    // нигде не сказано, чего в приложении НЕТ.
    expect(PRODUCT_CHARTER_SECTIONS.map((s) => s.key)).toContain('disabled');
  });
});
