/**
 * Знание о бизнесе: то, что нельзя посчитать запросом к базе.
 *
 * зачем этот модуль (аудит 2026-08-16): Джарвис знал только числа — сколько
 * пользователей, сколько платящих, как изменилась метрика. Он мог сказать
 * «возвратов больше обычного», но не мог знать, что возврат в первые сутки
 * это норма для подписки с пробным периодом, а на втором месяце — уже сигнал.
 * Числа без контекста дают уверенные, но бессмысленные советы.
 *
 * зачем текстовые файлы, а не коллекция в базе: тот же приём уже работает в
 * проекте для контент-конвейеров и памяти между сессиями. Файл можно открыть
 * и прочитать глазами, поправить за минуту, а история решений остаётся в git.
 * Формальный граф знаний для этого масштаба избыточен.
 *
 * Модуль чистый: разбор и отбор без файловой системы, чтобы правила
 * проверялись тестами целиком. Чтение с диска — в `readBusinessKnowledge`.
 */

/**
 * Сколько знания отдавать департаменту за раз.
 *
 * зачем предел: контекст модели конечен, и качество ответа падает задолго до
 * формального лимита. Знание должно быть коротким по определению — если оно
 * не влезает, значит в файлах накопилось лишнее, а не предел мал.
 */
export const KNOWLEDGE_MAX_CHARS = 6_000;

/**
 * Файлы, которые читают ВСЕ департаменты.
 *
 * зачем common.md: правила уровня продукта («мы не показываем рекламу»)
 * касаются всех, и дублировать их в каждый файл — прямой путь к рассинхрону,
 * когда правило поменяли в одном месте и забыли в остальных.
 *
 * зачем product.md всем, а не только департаменту product (владелец,
 * 2026-08-16): это справочник «что вообще есть в приложении» — как называются
 * разделы, валюты и тарифы. Без него департамент опирается на обрывки
 * исходного кода и путает внутренние имена с тем, что видит человек: «Компас»
 * приняли за стороннее приложение, хотя такого раздела в приложении просто
 * нет. Знание о продукте нужно каждому, кто вообще о продукте говорит.
 */
export const COMMON_KNOWLEDGE_FILE = 'common.md';
export const PRODUCT_KNOWLEDGE_FILE = 'product.md';
const SHARED_KNOWLEDGE_FILES: readonly string[] = Object.freeze([
  COMMON_KNOWLEDGE_FILE,
  PRODUCT_KNOWLEDGE_FILE,
]);

export interface KnowledgeFile {
  readonly name: string;
  readonly topic: string;
  /** Утверждения из раздела «Что сейчас верно». */
  readonly truths: readonly string[];
  /** Причины из раздела «Почему так». */
  readonly reasons: readonly string[];
  /** Запреты из раздела «Чего делать нельзя». */
  readonly forbidden: readonly string[];
  /** Дата пересмотра, если указана. */
  readonly reviewBy: string | null;
  readonly raw: string;
}

/** Заголовки разделов — контракт формата, описанный в knowledge/README.md. */
const SECTION_TRUTHS = 'что сейчас верно';
const SECTION_REASONS = 'почему так';
const SECTION_FORBIDDEN = 'чего делать нельзя';
const SECTION_REVIEW = 'когда пересмотреть';

function bulletLines(block: string): readonly string[] {
  return block
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * Разбирает файл знания.
 *
 * зачем не падать на сломанном файле: неверно оформленный файл не должен
 * ронять весь утренний прогон. Пустое знание честнее выдуманного.
 */
export function parseKnowledgeFile(name: string, source: string): KnowledgeFile {
  const topicMatch = source.match(/^#\s+(.+)$/m);
  const topic = topicMatch ? topicMatch[1].trim() : name.replace(/\.md$/i, '');

  const sections = new Map<string, string>();
  const parts = source.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const newline = part.indexOf('\n');
    if (newline < 0) continue;
    sections.set(part.slice(0, newline).trim().toLowerCase(), part.slice(newline + 1));
  }

  const reviewBlock = sections.get(SECTION_REVIEW) ?? '';
  const reviewMatch = reviewBlock.match(/\d{4}-\d{2}-\d{2}/);

  return Object.freeze({
    name,
    topic,
    truths: Object.freeze(bulletLines(sections.get(SECTION_TRUTHS) ?? '')),
    reasons: Object.freeze(bulletLines(sections.get(SECTION_REASONS) ?? '')),
    forbidden: Object.freeze(bulletLines(sections.get(SECTION_FORBIDDEN) ?? '')),
    reviewBy: reviewMatch ? reviewMatch[0] : null,
    raw: source,
  });
}

/**
 * Отбирает знание, относящееся к департаменту.
 *
 * зачем по имени файла, а не по смыслу: имя предсказуемо и проверяемо, а
 * поиск по смыслу дал бы неопределённость там, где нужна точность —
 * департамент денег не должен случайно получить правила безопасности.
 *
 * зачем не отдавать всё подряд при отсутствии своего файла: утопить
 * департамент в чужом контексте — ровно то, от чего падает качество ответа.
 */
export function selectKnowledgeForDepartment(
  files: readonly KnowledgeFile[],
  department: string,
): readonly KnowledgeFile[] {
  const own = `${department.toLowerCase()}.md`;
  return Object.freeze(files.filter(
    (file) => file.name.toLowerCase() === own || SHARED_KNOWLEDGE_FILES.includes(file.name.toLowerCase()),
  ));
}

/**
 * Читает файлы знания с диска.
 *
 * зачем синхронно и с кэшем: файлы лежат рядом с кодом, не меняются в
 * рантайме и весят килобайты. Асинхронное чтение здесь усложнило бы вызов
 * ради нулевого выигрыша, а повторное чтение на каждый департамент —
 * восемь лишних обращений к диску за прогон.
 *
 * зачем не падать при отсутствии папки: департамент обязан работать и без
 * знания — просто хуже. Пустое знание честнее выдуманного.
 */
let cachedFiles: readonly KnowledgeFile[] | null = null;

export function readBusinessKnowledge(directory?: string): readonly KnowledgeFile[] {
  if (cachedFiles && !directory) return cachedFiles;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('node:fs') as typeof import('node:fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('node:path') as typeof import('node:path');

  const dir = directory ?? path.join(__dirname, 'knowledge');
  let files: KnowledgeFile[] = [];
  try {
    files = fs.readdirSync(dir)
      .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
      .map((name) => parseKnowledgeFile(name, fs.readFileSync(path.join(dir, name), 'utf8')));
  } catch {
    files = [];
  }

  const frozen = Object.freeze(files);
  if (!directory) cachedFiles = frozen;
  return frozen;
}

/**
 * Порядок важности знания при нехватке места.
 *
 * зачем именно такой (два замера, 2026-08-16 и 2026-08-17): лимит держит от
 * утопления модели в контексте, но при переполнении кто-то обязан уступить.
 * Сначала я поставил вперёд общие файлы — и поймал зеркальную поломку: у денег
 * common(1373) + product(3206) съедали место, и вылетал money.md, то есть
 * СВОИ ЖЕ запреты департамента («не предлагать ужесточать возвраты»). Поймал
 * тест llm_enricher, а не глаз.
 *
 * Правильный порядок по цене ошибки:
 *   1. common.md  — запреты уровня продукта, нарушение стоит дороже всего;
 *   2. свой файл  — запреты департамента, ради которых он и существует;
 *   3. product.md — справочник «что есть в приложении», полезен, но потеря
 *                   его не заставит советовать отвергнутое.
 */
const KNOWLEDGE_PRIORITY: readonly string[] = Object.freeze([COMMON_KNOWLEDGE_FILE]);

function knowledgeByPriority(files: readonly KnowledgeFile[]): readonly KnowledgeFile[] {
  const rank = (file: KnowledgeFile): number => {
    const name = file.name.toLowerCase();
    const top = KNOWLEDGE_PRIORITY.indexOf(name);
    if (top >= 0) return top;
    // Справочник о продукте уступает файлу департамента: он информирует,
    // а тот запрещает.
    if (name === PRODUCT_KNOWLEDGE_FILE) return KNOWLEDGE_PRIORITY.length + 1;
    return KNOWLEDGE_PRIORITY.length;
  };
  return Object.freeze([...files].sort((a, b) => rank(a) - rank(b)));
}

/**
 * Собирает знание в текст для промпта.
 *
 * зачем обрезать, а не отдавать целиком: см. KNOWLEDGE_MAX_CHARS. Обрезка
 * идёт по файлам, а не по символам — половина правила хуже его отсутствия.
 *
 * зачем continue, а не break: один толстый файл отсекал ВСЁ, что за ним, даже
 * если следующий файл — пара строк и место под него есть.
 */
export function renderKnowledge(files: readonly KnowledgeFile[]): string {
  const blocks: string[] = [];
  let size = 0;
  for (const file of knowledgeByPriority(files)) {
    const block = file.raw.trim();
    if (size + block.length > KNOWLEDGE_MAX_CHARS) continue;
    blocks.push(block);
    size += block.length;
  }
  return blocks.join('\n\n---\n\n');
}
