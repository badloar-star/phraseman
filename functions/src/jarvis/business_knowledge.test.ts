import {
  KNOWLEDGE_MAX_CHARS,
  parseKnowledgeFile,
  selectKnowledgeForDepartment,
  type KnowledgeFile,
} from './business_knowledge';

const SAMPLE = `# Возвраты

## Что сейчас верно
Возврат в первые сутки — норма для подписки с пробным периодом.
Возврат на втором месяце — сигнал, что ожидания разошлись с продуктом.

## Почему так
Люди пробуют и передумывают; это заложено в цену привлечения.

## Чего делать нельзя
Не предлагать ужесточать возвраты — это бьёт по доверию сильнее, чем экономит.

## Когда пересмотреть
2026-12-01
`;

describe('Знание о бизнесе — то, что нельзя посчитать', () => {
  test('файл разбирается на разделы', () => {
    const parsed = parseKnowledgeFile('refunds.md', SAMPLE);
    expect(parsed.topic).toBe('Возвраты');
    expect(parsed.truths).toHaveLength(2);
    expect(parsed.forbidden).toHaveLength(1);
  });

  test('запреты не теряются: Джарвис не должен предлагать отвергнутое', () => {
    const parsed = parseKnowledgeFile('refunds.md', SAMPLE);
    expect(parsed.forbidden[0]).toContain('ужесточать');
  });

  test('файл без структуры не роняет чтение', () => {
    // зачем: сломанный файл знаний не должен ронять весь утренний прогон.
    const parsed = parseKnowledgeFile('broken.md', 'просто текст без заголовков');
    expect(parsed.truths).toEqual([]);
    expect(parsed.topic).toBe('broken');
  });

  test('пустой файл — пустое знание, а не выдумка', () => {
    expect(parseKnowledgeFile('empty.md', '').truths).toEqual([]);
  });

  test('дата пересмотра вытаскивается', () => {
    expect(parseKnowledgeFile('refunds.md', SAMPLE).reviewBy).toBe('2026-12-01');
  });
});

describe('Отбор знания под департамент', () => {
  function file(name: string, topic: string, truths: string[]): KnowledgeFile {
    return { name, topic, truths, reasons: [], forbidden: [], reviewBy: null, raw: truths.join('\n') };
  }

  test('департамент получает свой файл по имени', () => {
    // зачем по имени файла: это самый предсказуемый способ. Поиск по
    // смыслу здесь дал бы неопределённость там, где нужна точность.
    const files = [
      file('money.md', 'Деньги', ['Подписка помесячная']),
      file('support.md', 'Поддержка', ['Отвечаем в течение суток']),
    ];
    const picked = selectKnowledgeForDepartment(files, 'money');
    expect(picked.map((f) => f.name)).toEqual(['money.md']);
  });

  test('общий файл достаётся всем департаментам', () => {
    // зачем: правила уровня продукта («не предлагать рекламу») касаются
    // всех, и дублировать их в каждый файл — путь к рассинхрону.
    const files = [
      file('common.md', 'Общее', ['Мы не показываем рекламу']),
      file('money.md', 'Деньги', ['Подписка помесячная']),
    ];
    expect(selectKnowledgeForDepartment(files, 'support').map((f) => f.name)).toContain('common.md');
  });

  test('чужие файлы не подмешиваются', () => {
    const files = [file('money.md', 'Деньги', ['x']), file('safety.md', 'Безопасность', ['y'])];
    expect(selectKnowledgeForDepartment(files, 'money').map((f) => f.name)).not.toContain('safety.md');
  });

  test('нет своего файла — пусто, а не весь набор', () => {
    // зачем: отдать департаменту всё знание проекта значит утопить его
    // в чужом контексте — ровно то, от чего качество ответов падает.
    const files = [file('money.md', 'Деньги', ['x'])];
    expect(selectKnowledgeForDepartment(files, 'growth')).toEqual([]);
  });

  test('объём знания ограничен', () => {
    // зачем предел: контекст модели конечен, и качество падает задолго до
    // формального лимита. Знание должно быть коротким по определению.
    expect(KNOWLEDGE_MAX_CHARS).toBeLessThanOrEqual(8_000);
  });
});
