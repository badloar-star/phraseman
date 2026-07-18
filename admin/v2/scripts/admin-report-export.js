export const LEGACY_REPORT_LLM_INSTRUCTION_LINES = Object.freeze([
  '=== ИНСТРУКЦИЯ ДЛЯ ЛЛМ (Claude Code, проект C:\\appsprojects\\phraseman) ===',
  'Ниже — пачка юзерских репортов об ошибках. Твой алгоритм, шаг за шагом:',
  '',
  '1. РАЗБЕРИ каждый репорт: найди в коде, подтверждается ли ошибка',
  '   (screen/category/dataId/текст задания/ответ юзера/комментарий).',
  '   Дубликаты (несколько репортов об одной и той же ошибке) — сгруппируй: чинишь ОДИН раз,',
  '   но ответить нужно КАЖДОМУ автору (см. п.6).',
  '',
  '2. ИСПРАВЬ все подтверждённые ошибки в коде (мелкие правки — сразу).',
  '   КРУПНЫЕ/спорные/рискованные фиксы, а также то, что требует пересборки приложения или',
  '   новых ассетов, — НЕ чини наспех ради галочки. Опиши в итоге и ответь юзеру честно',
  '   («разбираемся»), БЕЗ ложного «исправлено».',
  '',
  '3. ТОН ответов. Пиши от лица команды («мы») и пиши как живой сотрудник поддержки:',
  '   тепло, спокойно и уважительно, без роботизированных шаблонов. ОБРАЩЕНИЕ: только на «вы»',
  '   во всех русскоязычных ответах. Без канцелярита и корпоративщины, без длинных извинений, без ссылок,',
  '   без обещаний сроков, максимум ОДИН эмодзи. 2-4 предложения.',
  '',
  '4. ЯЗЫК ответа — СТРОГО язык юзера. Бери поле userLanguage; если его нет или оно кривое —',
  '   определи язык по тексту самого репорта (комментарий/ответ юзера), и только если совсем',
  '   не ясно — русский. НИКОГДА не отвечай англоязычному юзеру по-русски и наоборот.',
  '',
  '5. ЧТО ПИСАТЬ в ответе:',
  '   • confirmed_fixed → поблагодари; скажи, что именно исправлено; добавь, что изменения',
  '     вступят в силу со следующим обновлением приложения; награду упоминай только при shards > 0.',
  '   • confirmed_investigating → честно скажи, что проблема подтверждена и команда разбирается;',
  '     не обещай срок или следующее обновление; награду указывай только если она есть в shards.',
  '   • duplicate → дай обычный тёплый ответ по сути проблемы; не называй сообщение дубликатом и не объясняй внутреннюю логику.',
  '   • not_reproduced / rejected → мягко объясни, что именно проверили и к какому выводу пришли.',
  '   ПРИВАТНОСТЬ: юзер видит этот текст. НЕ вставляй в ответ чужие uid/имена, внутренние id,',
  '   куски кода, стектрейсы, названия файлов — никакой технической кухни; не рассказывай пользователю о внутренних правилах.',
  '',
  '6. НАГРАДА (shards):',
  '   • обычный подтверждённый баг = 1;',
  '   • серьёзный баг / влияет на многих юзеров = 2-3;',
  '   • НЕ подтвердилось, «так задумано», спам/оскорбления/бессмыслица = 0.',
  '   В ТЕКСТЕ ДЛЯ ПОЛЬЗОВАТЕЛЯ: если shards = 0, вообще не упоминай награду;',
  '   если shards > 0, назови точное количество осколков один раз и без внутренних пояснений.',
  '   ДУБЛИКАТЫ: награду (shards≥1) даёт ТОЛЬКО одному автору — первому по времени (createdAt);',
  '   остальным по тому же багу — тёплый ответ с shards:0 без обсуждения награды или правил.',
  '',
  '7. Для результата подготовь отдельный ответ для каждого reportId и собери файл replies.json — массив объектов:',
  '   { "reportId": "<id>", "uid": "<uid>", "title": "<заголовок, до 120 знаков>",',
  '     "body": "<текст ответа>", "shards": <0..100> }',
  '   title — это ПЕРВАЯ строка в колокольчике, он должен быть самодостаточным',
  '   («Спасибо за репорт!», НЕ «Ответ №3»). НЕ генерируй ответы для репортов с uid',
  '   "unknown"/"test_uid_abc123"/пустым и для уже отвеченных (в JSON есть replyMessageId) —',
  '   просто пропусти их (скрипт их тоже отсеет, но не трать на них ответы).',
  '',
  '8. ОСНОВНОЙ ПУТЬ: после подготовки автоматически добавь проверенные черновики в PREPARED_REPORT_REPLIES,',
  '   проверь превью и сразу задеплой только Firebase Hosting admin. Дополнительного подтверждения для превью не требуется.',
  '   Отправляй ответы пользователям только отдельной ручной кнопкой; CLI нужен только для технического dry-run.',
  '',
  '9. ОБЯЗАТЕЛЬНО сначала прогон вхолостую: node scripts/reply_to_reports.mjs replies.json --dry-run',
  '   Глазами проверь список и тексты. Рассылка идёт ЖИВЫМ юзерам — откатить нельзя.',
  '',
  '10. После dry-run встрои ответы в превью админки, проверь контракты и выполни npm run hosting:admin.',
  '    Затем остановись и передай результат администратору: только администратор вручную нажимает',
  '    кнопку «Отправить готовые ответы»; live CLI из Codex не запускай.',
  '    Уже отвеченные репорты и повторы должны оставаться идемпотентными и не получать двойную награду.',
  '',
  '11. В конце дай ИТОГ: сколько багов починил · сколько отклонил и почему · сколько ответов',
  '    подготовлено к ручной отправке · какие репорты требуют ручного разбора · что ждёт пересборки приложения.',
  '',
  '================================================================',
  '',
]);

function displayFilter(value, fallback = '(все)') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function reportKey(source, id) {
  return `${String(source)}:${String(id)}`;
}

function createdAtLabel(item, document) {
  const raw = document?.createdAt ?? document?.serverCreatedAt ?? document?.createdAtMs ?? item?.createdAtMs;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) return new Date(raw).toISOString();
  if (raw && typeof raw === 'object') {
    if (typeof raw.iso === 'string') return raw.iso;
    const seconds = Number(raw.seconds ?? raw._seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000).toISOString();
  }
  return '—';
}

function primaryUid(item, document) {
  return displayFilter(
    document?.uid
      ?? document?.stableUid
      ?? document?.reporterUid
      ?? item?.users?.primaryUid
      ?? item?.users?.reporterUid,
    '—',
  );
}

export function chunkReportReferences(items, chunkSize = 100) {
  const size = Math.max(1, Math.min(100, Number.isFinite(Number(chunkSize)) ? Math.floor(Number(chunkSize)) : 100));
  const references = (Array.isArray(items) ? items : []).map((item) => ({ source: String(item.source), id: String(item.id) }));
  const chunks = [];
  for (let index = 0; index < references.length; index += size) chunks.push(references.slice(index, index + size));
  return chunks;
}

function isResourceExhausted(error) {
  return String(error?.code ?? '').toLowerCase().endsWith('resource-exhausted');
}

async function loadAdaptiveChunk(references, loadChunk) {
  try {
    const documents = await loadChunk(references);
    if (!Array.isArray(documents) || documents.length !== references.length) {
      throw new Error('Сервер вернул неполный набор документов. Обновите очередь и повторите.');
    }
    return documents;
  } catch (error) {
    if (!isResourceExhausted(error) || references.length < 2) throw error;
    const middle = Math.floor(references.length / 2);
    const left = await loadAdaptiveChunk(references.slice(0, middle), loadChunk);
    const right = await loadAdaptiveChunk(references.slice(middle), loadChunk);
    return [...left, ...right];
  }
}

export async function loadReportDocumentsInAdaptiveChunks(items, loadChunk, chunkSize = 100) {
  const documents = [];
  for (const references of chunkReportReferences(items, chunkSize)) {
    documents.push(...await loadAdaptiveChunk(references, loadChunk));
  }
  return documents;
}

export function buildReportClipboardText({ generatedAt, items, documents, filters = {}, hasNextPage = false, isTruncated = false }) {
  const visibleItems = Array.isArray(items) ? items : [];
  if (!visibleItems.length) throw new Error('Нет репортов в текущем фильтре.');
  const documentByKey = new Map((Array.isArray(documents) ? documents : []).map((entry) => [reportKey(entry?.source, entry?.id), entry?.document]));
  const missing = visibleItems.filter((item) => !documentByKey.has(reportKey(item?.source, item?.id)));
  if (missing.length) throw new Error(`Не удалось получить полный документ для ${missing.length} репорт(ов). Обновите очередь и повторите.`);

  const scope = [
    'все загруженные и показанные репорты',
    ...(hasNextPage ? ['есть ещё незагруженная страница'] : []),
    ...(isTruncated ? ['сервер ограничил выборку; часть репортов могла не загрузиться'] : []),
  ].join('; ');
  const header = LEGACY_REPORT_LLM_INSTRUCTION_LINES.join('\n') + [
    '=== PHRASEMAN ERROR_REPORTS · EXPORT ===',
    `сформировано: ${String(generatedAt || new Date().toISOString())}`,
    `записей: ${visibleItems.length}`,
    `источник: ${displayFilter(filters.source)}`,
    `рабочее состояние: ${displayFilter(filters.lane)}`,
    `исходный статус: ${displayFilter(filters.rawStatus)}`,
    `uid: ${displayFilter(filters.uid)}`,
    `категория: ${displayFilter(filters.category)}`,
    `период: ${displayFilter(filters.sinceDays, '7')} дн.`,
    `сортировка / группировка: ${displayFilter(filters.grouping, 'рабочее состояние')}`,
    `выборка: ${scope}`,
    '',
  ].join('\n');

  const blocks = visibleItems.map((item, index) => {
    const document = documentByKey.get(reportKey(item.source, item.id));
    const copyText = typeof document?.copyText === 'string' ? document.copyText.trim() : '';
    const separator = '='.repeat(76);
    const meta = [
      separator,
      `#${index + 1} / ${visibleItems.length}`,
      `source: ${displayFilter(item.source, '—')}`,
      `id: ${displayFilter(item.id, '—')}`,
      `createdAt: ${createdAtLabel(item, document)}`,
      `status: ${displayFilter(item.rawStatus ?? document?.status, '—')}`,
      `screen: ${displayFilter(item.context?.screen ?? document?.screen, '—')}`,
      `category: ${displayFilter(item.category ?? document?.category ?? document?.severity, '—')}`,
      `dataId: ${displayFilter(item.context?.dataId ?? document?.dataId, '—')}`,
      `uid: ${primaryUid(item, document)}`,
      separator,
      '',
    ].join('\n');
    const fullDocument = { ...document, id: String(item.id) };
    return `${meta}${copyText ? `${copyText}\n\n` : ''}--- полный документ (JSON) ---\n${JSON.stringify(fullDocument, null, 2)}`;
  });

  return `${header}\n${blocks.join('\n\n')}`;
}

function textValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString('ru-RU');
  return String(value);
}

function analyticsReportText(report) {
  const request = report?.request || {};
  const period = request.period || {};
  const filters = request.filters || {};
  const lines = [
    'PHRASEMAN ADMIN V2 ANALYTICS',
    `generatedAtMs: ${textValue(report?.generatedAtMs)}`,
    `activeReport: ${textValue(report?.activeReport)}`,
    `definitionVersion: ${textValue(report?.definitionVersion)}`,
    '',
    'REQUEST',
    `rangeDays: ${textValue(period.rangeDays)}`,
    `fromDate: ${textValue(period.fromDate)}`,
    `toDate: ${textValue(period.toDate)}`,
    `granularity: ${textValue(period.granularity)}`,
    `timezone: ${textValue(period.timezone)}`,
    `comparePrevious: ${request.comparison?.comparePrevious ? 'true' : 'false'}`,
    `filters: ${JSON.stringify(filters)}`,
    '',
    'METRICS',
    ...(Array.isArray(report?.metrics) ? report.metrics : []).map((metric) => [
      `- ${textValue(metric.label)} (${textValue(metric.id)})`,
      `  value: ${textValue(metric.value)} ${textValue(metric.unit)}`,
      `  state: ${textValue(metric.state)}`,
      `  source: ${textValue(metric.source)}`,
      `  definition: ${textValue(metric.definition)}`,
      `  points: ${Array.isArray(metric.points) ? metric.points.length : 0}`,
    ].join('\n')),
    '',
    'SOURCE HEALTH',
    ...(Array.isArray(report?.sourceHealth) ? report.sourceHealth : []).map((source) => [
      `- ${textValue(source.source)}`,
      `  state: ${textValue(source.state)}`,
      `  count: ${textValue(source.count)}`,
      `  latestAtMs: ${textValue(source.latestAtMs)}`,
      `  checkedAtMs: ${textValue(source.checkedAtMs)}`,
      `  truncated: ${source.truncated ? 'true' : 'false'}`,
      `  errorCode: ${textValue(source.errorCode)}`,
    ].join('\n')),
    '',
    'RAW_JSON',
    JSON.stringify(report, null, 2),
  ];
  return lines.join('\n');
}

function pdfUtf16Hex(value) {
  let hex = 'FEFF';
  for (const char of String(value)) {
    const codePoint = char.codePointAt(0);
    if (codePoint > 0xFFFF) {
      const adjusted = codePoint - 0x10000;
      const high = 0xD800 + (adjusted >> 10);
      const low = 0xDC00 + (adjusted & 0x3FF);
      hex += high.toString(16).padStart(4, '0').toUpperCase();
      hex += low.toString(16).padStart(4, '0').toUpperCase();
    } else {
      hex += codePoint.toString(16).padStart(4, '0').toUpperCase();
    }
  }
  return `<${hex}>`;
}

function pdfByteLength(value) {
  return new TextEncoder().encode(String(value)).length;
}

function wrapPdfLine(line, maxLength = 92) {
  const text = String(line);
  if (text.length <= maxLength) return [text];
  const chunks = [];
  for (let index = 0; index < text.length; index += maxLength) chunks.push(text.slice(index, index + maxLength));
  return chunks;
}

export function buildSimpleTextPdf(text, title = 'Phraseman analytics report') {
  const lines = String(text).split(/\r?\n/).flatMap((line) => wrapPdfLine(line));
  const pages = [];
  for (let index = 0; index < lines.length; index += 48) pages.push(lines.slice(index, index + 48));
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add('<< /Type /Catalog /Pages 2 0 R >>');
  void catalogId;
  const pagesPlaceholderIndex = objects.length;
  objects.push('');
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  pages.forEach((pageLines, pageIndex) => {
    const stream = [
      'BT',
      '/F1 10 Tf',
      '50 790 Td',
      `${pdfUtf16Hex(`${title} - page ${pageIndex + 1}`)} Tj`,
      '0 -18 Td',
      ...pageLines.map((line) => `${pdfUtf16Hex(line)} Tj 0 -14 Td`),
      'ET',
    ].join('\n');
    const contentId = add(`<< /Length ${pdfByteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });
  objects[pagesPlaceholderIndex] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([output], { type: 'application/pdf' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadAnalyticsReportBundle(report, now = new Date()) {
  if (!report || !Array.isArray(report.metrics) || !report.metrics.length) {
    throw new Error('Нет аналитических данных для экспорта. Сначала обновите аналитику.');
  }
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const baseName = `phraseman-admin-analytics-${report.activeReport || 'overview'}-${stamp}`;
  const json = JSON.stringify(report, null, 2);
  downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), `${baseName}.json`);
  downloadBlob(buildSimpleTextPdf(analyticsReportText(report)), `${baseName}.pdf`);
  return { jsonFilename: `${baseName}.json`, pdfFilename: `${baseName}.pdf`, metrics: report.metrics.length };
}
