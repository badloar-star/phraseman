const fs = require('fs');
const path = require('path');

const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');

function readPreparedReplies() {
  const marker = 'PREPARED_REPORT_REPLIES = {';
  const start = adminHtml.indexOf(marker);
  const end = adminHtml.indexOf('\n  };', start);
  if (start < 0 || end <= start) throw new Error('PREPARED_REPORT_REPLIES not found');
  const objectSource = adminHtml.slice(start + marker.length - 1, end + 4);
  const prepared = Function(`return (${objectSource});`)();
  return Object.entries(prepared).map(([reportId, value]) => ({ reportId, ...(value as object) })) as Array<{
    reportId: string;
    title: string;
    body: string;
    shards: number;
    resolution: string;
    rewardGroup: string;
  }>;
}

test('admin report AI action prepares drafts without sending them', () => {
  expect(adminHtml).toContain('Подготовить черновики (ИИ)');
  expect(adminHtml).toContain('sendAllPreparedReplies()');
  expect(adminHtml).toContain('showConfirmModal');

  const start = adminHtml.indexOf('window.replyAllVisibleReportsAI');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = adminHtml.indexOf('\n  window.', start + 1);
  const prepareFunction = adminHtml.slice(start, end === -1 ? undefined : end);
  expect(prepareFunction).toContain('_preparedReplyState[r.id]');
  expect(prepareFunction).not.toContain('sendReportReplyToUser(');
  expect(prepareFunction).not.toContain('draftReportReplyAI(');
});

test('prepared replies expose resolution and reward metadata', () => {
  expect(adminHtml).toContain('resolutionLabels');
  expect(adminHtml).toContain('rewardGroup');
});

test('every published admin draft exposes the complete reply contract', () => {
  const batch = readPreparedReplies();
  const lines = adminHtml.split(/\r?\n/);
  expect(batch.length).toBeGreaterThanOrEqual(48);
  for (const row of batch) {
    const line = lines.find((item: string) => item.includes('"' + row.reportId + '": {'));
    expect(line).toBeTruthy();
    expect(line).toContain('title:' + JSON.stringify(row.title));
    expect(line).toContain('body:' + JSON.stringify(row.body));
    expect(line).toContain('shards:' + row.shards);
    expect(line).toContain('resolution:' + JSON.stringify(row.resolution));
    expect(line).toContain('rewardGroup:' + JSON.stringify(row.rewardGroup));
  }
});

test('the current replies.json batch is published in the admin preview', () => {
  const reportIds = [
    'KQ3a5NdHJJCq7cPIgzyL',
    'JDbcUxXynyyBiCvsBzk2',
    'IsA4gslKhWuiIyL9Rb5E',
    'AJytlM5NdHtyQMnZ1OiR',
    'pBOO1fDwVk4th3GnFkpc',
    '2DnpiLpbGscGtxQ1KoQq',
    'DAShjpK0W1KEKFraeVl1',
    'wMvOxNNxICJCOqZKrRen',
  ];
  const lines = adminHtml.split(/\r?\n/);
  for (const reportId of reportIds) {
    const matches = lines.filter((item: string) => item.includes('"' + reportId + '": {'));
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatch(/title:".+",body:".+",shards:\d+,resolution:".+",rewardGroup:".+"/);
  }
});

test('the published prepared replies contain readable UTF-8 text', () => {
  const batch = readPreparedReplies();
  const mojibake = /[ÐÑÃÂ]|â[€„™œšž—–]/u;

  expect(batch.length).toBeGreaterThanOrEqual(48);
  for (const row of batch) {
    expect(`${row.title}\n${row.body}`).toMatch(/[А-Яа-яЁё]/u);
    expect(`${row.title}\n${row.body}`).not.toMatch(mojibake);
  }
  const start = adminHtml.indexOf('PREPARED_REPORT_REPLIES = {');
  const end = adminHtml.indexOf('\n  };', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  expect(adminHtml.slice(start, end)).not.toMatch(mojibake);
  expect(adminHtml).not.toMatch(/\?{3,}/u);
});

test('exported LLM instructions are preview-first and not mojibake', () => {
  const start = adminHtml.indexOf('const llmInstructions');
  const end = adminHtml.indexOf('].join', start);
  const instructions = adminHtml.slice(start, end === -1 ? undefined : end);
  expect(instructions).not.toContain('?????');
  expect(instructions).toContain('Отправить готовые ответы');
  expect(instructions).toContain('только администратор');
  expect(instructions).not.toContain('нажми в админке');
  expect(instructions).not.toContain('replies.json --send');
});

test('copied report instructions enforce respectful support replies', () => {
  const start = adminHtml.indexOf('const llmInstructions');
  const end = adminHtml.indexOf('].join', start);
  const instructions = adminHtml.slice(start, end === -1 ? undefined : end);

  expect(instructions).toContain('ОБРАЩЕНИЕ: только на «вы»');
  expect(instructions).toContain('пиши как живой сотрудник поддержки');
  expect(instructions).toContain('не рассказывай пользователю о внутренних правилах');
  expect(instructions).toContain('если shards = 0, вообще не упоминай награду');
  // зачем: валюта в приложении — жемчужины. Инструкция обязана называть её так,
  // иначе ИИ напишет живому юзеру «начислен 1 осколок» за подтверждённый репорт.
  expect(instructions).toContain('если shards > 0, назови точное количество ЖЕМЧУЖИН');
  expect(instructions).toContain('НЕ «осколки» и НЕ «монеты»');
  expect(instructions).toContain('подготовь отдельный ответ для каждого reportId');
  expect(instructions).not.toContain('По умолчанию на «ты»');
  expect(instructions).not.toContain('дополнительной награды нет');
  expect(instructions).not.toContain('награды нет');
});

test('prepared drafts are user-safe and manual bulk send is guarded', () => {
  const batch = readPreparedReplies();
  for (const row of batch) {
    expect(row.body).not.toMatch(/dataId|contentId|TextInput|watchdog|escape-path|device-repro|report №|забери 0 оскол/);
  }
  expect(adminHtml).toContain('window.sendAllPreparedReplies = async function()');
  const start = adminHtml.indexOf('window.sendAllPreparedReplies = async function()');
  const end = adminHtml.indexOf('\n  async function fetchActiveGlobalBroadcastDocs', start);
  const sender = adminHtml.slice(start, end === -1 ? undefined : end);
  expect(sender).toContain('sendReportReplyToUser(report');
  expect(sender).toContain('validatePreparedReplyBatch');
  expect(sender).toContain('showConfirmModal');
  expect(sender).toContain('.filter((entry) => entry.prepared)');
  expect(sender).toContain('const skipped = candidates.length - entries.length');
  expect(sender).toContain('они будут пропущены');
  expect(sender).not.toContain('const preparedRows = list.map((r) => getPreparedReply(r.id))');

  const labelStart = adminHtml.indexOf('const resolutionLabels');
  const labelEnd = adminHtml.indexOf('const _preparedReplyState', labelStart);
  const labels = adminHtml.slice(labelStart, labelEnd);
  expect(labels).not.toContain('????');
  expect(labels).toContain('confirmed_fixed');
  expect(labels).toContain('\\u0418');

  const validationStart = adminHtml.indexOf('function validatePreparedReplyBatch');
  const validationEnd = adminHtml.indexOf('window.sendAllPreparedReplies', validationStart);
  expect(validationStart).toBeGreaterThanOrEqual(0);
  expect(validationEnd).toBeGreaterThan(validationStart);
  const validate = Function(`${adminHtml.slice(validationStart, validationEnd)}; return validatePreparedReplyBatch;`)();
  const base = { title: 'x', body: 'y', shards: 1, resolution: 'confirmed_fixed', rewardGroup: 'group-a' };
  const preparedBatch = readPreparedReplies();
  expect(validate(preparedBatch).ok).toBe(true);
  expect(validate([base]).ok).toBe(true);
  expect(validate([base, { ...base, title: 'y' }]).ok).toBe(false);
  expect(validate([{ ...base, resolution: 'duplicate', shards: 1 }]).ok).toBe(false);
  expect(validate([{ ...base, resolution: 'not_reproduced', shards: 1 }]).ok).toBe(true);
  expect(validate([{ ...base, rewardGroup: '' }]).ok).toBe(false);
  expect(validate([base, { ...base, resolution: 'duplicate', shards: 0 }]).ok).toBe(true);
});

test('all published replies use respectful support language and mention only awarded rewards', () => {
  const batch = readPreparedReplies();
  const informalAddress = /(^|[\s«("'])(ты|тебя|тебе|тобой|твой|твоя|твоё|твои|твоего|твоему|твою|твоих)(?=$|[\s,.:;!?»)"'])/iu;
  const internalOrRoboticLanguage = /правил[оа]\s+(дубл|наград)|дубликат|отдельная награда|награда не начисляется|без награды|безопасно объявлять|по текущим данным|подтвердили сигнал|повторный сигнал|device-repro|TextInput|watchdog|dataId|contentId/iu;

  expect(batch.length).toBeGreaterThanOrEqual(48);
  for (const row of batch) {
    const customerText = `${row.title}\n${row.body}`;
    expect(customerText).not.toMatch(informalAddress);
    expect(customerText).not.toMatch(internalOrRoboticLanguage);
    expect(row.body).toMatch(/^Спасибо/iu);
    // зачем: валюта называется жемчужинами (ru) / перлинами (uk). Слово «осколки»
    // — legacy-название поля shards в коде, живому юзеру его показывать нельзя.
    expect(customerText).not.toMatch(/оскол/iu);
    if (row.shards > 0) {
      expect(row.body).toMatch(new RegExp(`${row.shards}\\s+(жемчужин|перлин)`, 'iu'));
    } else {
      expect(row.body).not.toMatch(/наград|жемчужин|перлин/iu);
    }
  }
});

test('prepared reply text is always visible in each report card', () => {
  const start = adminHtml.indexOf('function renderPreparedReplyBox');
  const end = adminHtml.indexOf('window.openReportReplyModal', start);
  const renderer = adminHtml.slice(start, end === -1 ? undefined : end);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  expect(renderer).not.toContain('<details');
  expect(renderer).not.toContain('<summary');
  expect(renderer).not.toContain('без награды');
  expect(renderer).toContain('<section class="prepared-reply-box"');
  expect(renderer).toContain('aria-label="Подготовленный ответ пользователю"');
  expect(renderer).toContain('escapeHtml(prepared.body)');
});
