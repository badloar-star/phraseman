import {
  KNOWLEDGE_MAX_CHARS,
  parseKnowledgeFile,
  renderKnowledge,
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

  test('справочник о продукте получает КАЖДЫЙ департамент, даже без своего файла', () => {
    // зачем (владелец, 2026-08-16): «Компас» приняли за стороннее приложение,
    // потому что описания продукта не было вовсе. Знание о том, что вообще
    // есть в приложении, нужно каждому, кто о продукте говорит.
    const files = [file('product.md', 'Продукт', ['Внизу четыре вкладки']), file('money.md', 'Деньги', ['x'])];
    for (const department of ['support', 'money', 'growth']) {
      expect(selectKnowledgeForDepartment(files, department).map((f) => f.name)).toContain('product.md');
    }
  });
});

// зачем этот блок (замер 2026-08-16): добавив product.md, я ПОМЕРИЛ, доходит
// ли он до департаментов, — и у денег он выпадал целиком и молча. Департамент
// при этом бодро отвечал бы про продукт, которого не знает. Тихая потеря
// знания опаснее явной поломки: она не видна ни в логах, ни в тестах.
describe('renderKnowledge — общее знание не должно молча выпадать', () => {
  const bulky = (name: string, chars: number): KnowledgeFile => ({
    name, topic: name, truths: [], reasons: [], forbidden: [], reviewBy: null, raw: 'п'.repeat(chars),
  });

  test('общие файлы попадают в промпт, даже когда свой файл департамента огромен', () => {
    // Порядок здесь — как его отдаёт readdirSync: алфавит, product последним.
    const rendered = renderKnowledge([
      bulky('common.md', 2_400),
      bulky('money.md', 4_100),
      bulky('product.md', 1_200),
    ]);
    expect(rendered).toContain('п'.repeat(1_200));
  });

  test('файл, который не влез, не отсекает следующие за ним', () => {
    // зачем: раньше стоял break — один толстый файл выкидывал всё, что за
    // ним, даже если следующий файл пара строк и место под него есть.
    const rendered = renderKnowledge([
      bulky('common.md', 100),
      bulky('money.md', KNOWLEDGE_MAX_CHARS + 1),
      bulky('support.md', 200),
    ]);
    expect(rendered).toContain('п'.repeat(200));
    expect(rendered).not.toContain('п'.repeat(KNOWLEDGE_MAX_CHARS + 1));
  });

  test('предел всё ещё соблюдается', () => {
    const rendered = renderKnowledge([
      bulky('common.md', 3_000), bulky('product.md', 3_000), bulky('money.md', 3_000),
    ]);
    expect(rendered.length).toBeLessThanOrEqual(KNOWLEDGE_MAX_CHARS + 16);
  });
});
