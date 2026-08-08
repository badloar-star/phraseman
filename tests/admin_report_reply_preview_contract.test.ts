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
  const replies = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'replies.json'), 'utf8'),
  ) as Array<{ reportId: string; uid: string; title: string; body: string; shards: number }>;
  const preparedById = new Map(readPreparedReplies().map((row) => [row.reportId, row]));

  const expected = [
    ['AczEhLm6hJioJbqUxnY3', 'be48bd2b-80fc-4ee0-8456-c774aed5d395', 'user_error', 'neon-report-discipline', 0],
    ['7lRyNxZ59O0XbfyaTVmM', '99593d2b-a277-4923-b045-104bb3f5d495', 'not_reproduced', 'lesson2-she-option-presence', 0],
    ['hEGotOManqcvLj5hKek0', '62615956-e1e1-4b47-8fa0-caa088fff6d4', 'confirmed_fixed', 'impuls-day36-missing-subject', 1],
    ['OSSadmJP0m12rDu7zY8b', '7b0b567c-d158-403f-b7d1-c8284ce9deea', 'duplicate', 'personal-plan-stale-audio-binding', 0],
    ['N5WJhdhAV3FbPvWemOiH', '2442f528-f2e3-4b56-9039-f40adf707ea8', 'confirmed_investigating', 'personal-plan-theory-task-alignment-gavan-d8', 1],
    ['thnLe30UbiT4QC8dcRaZ', '0b5e816d-e740-4067-bd32-a003be730c0b', 'by_design', 'lesson13-later-vs-late', 0],
    ['WBA37juO2ZG5wyaWPbIo', 'e79d3a7c-f49a-4d45-b7a4-76d7ee4a754c', 'no_issue_details', 'lesson30-listen-build-mismatch-unspecified', 0],
    ['imZlIU2dOYlhTDQ8ehtz', 'd9ca4a06-28a9-4098-853c-bd39be934ad6', 'duplicate', 'lesson21-synonym-audio', 0],
    ['l4LbKLwrvSkdzPaCpa4w', 'd9ca4a06-28a9-4098-853c-bd39be934ad6', 'duplicate', 'lesson21-synonym-audio', 0],
    ['tQQVuBESA2CSXjWDcmY2', 'd9ca4a06-28a9-4098-853c-bd39be934ad6', 'duplicate', 'lesson21-synonym-audio', 0],
    ['acPQkpOWTI86Mf8KOkJs', 'd9ca4a06-28a9-4098-853c-bd39be934ad6', 'duplicate', 'lesson21-synonym-audio', 0],
    ['d7PjNbly9huR51j0nZNN', '7b0b567c-d158-403f-b7d1-c8284ce9deea', 'duplicate', 'personal-plan-stale-audio-binding', 0],
    ['4iso6vyOZnfePFO32oU5', '18274995-0d6b-4fe5-b92b-078f51ab1c2b', 'duplicate', 'personal-plan-stale-audio-binding', 0],
    ['UOxo5sQ2vNBwtkjWZYpX', '18274995-0d6b-4fe5-b92b-078f51ab1c2b', 'content_review', 'lesson8-preposition-distractors', 0],
    ['iXB8hzOipdElLLR99EMS', '2d6d338b-f915-48ee-9282-3f3a15dca15f', 'confirmed_fixed', 'pronunciation-compound-number-digits', 1],
    ['yk1n8zhYreS8vm3xPivm', 'edca3193-bf9d-4383-a468-799bff73bb00', 'duplicate', 'flashcard-pack-shard-purchase', 0],
    ['JhrIHG5oAPgWAHbcf7KQ', 'edca3193-bf9d-4383-a468-799bff73bb00', 'duplicate', 'flashcard-pack-shard-purchase', 0],
    ['wBbL7btzE7mI4uwgrJWh', 'd5f541a0-efc6-4170-bfbb-cc87e8e702e1', 'duplicate', 'personal-plan-stale-audio-binding', 0],
    ['vk6lsDEEzI4Dok9OJWS6', 'd5f541a0-efc6-4170-bfbb-cc87e8e702e1', 'duplicate', 'personal-plan-stale-audio-binding', 0],
    ['sOXRG2snJkntDjdKUlVu', 'f0ca2c1a-45a3-4c4a-9947-1f47aee5904b', 'no_issue_details', 'tournament-unspecified', 0],
    ['RdzYVLbcmSeVDVtIzEd4', '2442f528-f2e3-4b56-9039-f40adf707ea8', 'duplicate', 'flashcard-pack-shard-purchase', 0],
    ['VAXanKs98uPapIllMCOR', '9b674d47-f9c1-457c-a7ae-8b85434254c2', 'not_reproduced', 'daily-phrase-flashcard-save-count', 0],
    ['AlFjdKO2dAqj2m6E19cP', 'a114eacb-184d-43aa-8275-6f21094949db', 'confirmed_investigating', 'personal-plan-stale-audio-binding', 1],
    ['kzFKOiXbHEav7l4nakpB', '9b674d47-f9c1-457c-a7ae-8b85434254c2', 'confirmed_fixed', 'daily-tasks-loading-race', 1],
    ['JCLGsmbXimrxrx2SLDoS', 'edca3193-bf9d-4383-a468-799bff73bb00', 'confirmed_investigating', 'flashcard-pack-shard-purchase', 1],
    ['EXzUZlJfVUstcHVDnwyO', '2442f528-f2e3-4b56-9039-f40adf707ea8', 'confirmed_fixed', 'lesson15-theory-my-mine', 1],
    ['UtPgIvfIbrd9x4m6Dgae', 'a114eacb-184d-43aa-8275-6f21094949db', 'confirmed_investigating', 'lesson28-audio-missing', 1],
    ['RJDFIHlWo8XyrlyOyxfH', 'dd5ae708-9f12-4186-b6c6-5ba58186d4bd', 'duplicate', 'lesson-long-word-options', 0],
    ['caOdngOoVjQRQTgQUwL9', 'ff56979a-d65b-490d-8bbe-7d47ede60c28', 'confirmed_fixed', 'lingman-video-unread-badge', 1],
  ] as const;

  const actual = replies.map((reply) => {
    const prepared = preparedById.get(reply.reportId);
    return [reply.reportId, reply.uid, prepared?.resolution, prepared?.rewardGroup, reply.shards] as const;
  });

  expect(actual).toEqual(expected);
  expect(new Set(replies.map((reply) => reply.reportId)).size).toBe(expected.length);
  for (const reply of replies) {
    expect(preparedById.get(reply.reportId)).toEqual(expect.objectContaining({
      title: reply.title,
      body: reply.body,
      shards: reply.shards,
    }));
  }

  const neonReports = new Set([
    'AczEhLm6hJioJbqUxnY3', 'wXoD0PoyC2lFuWaaVF5R', 'bdwAV2iBRkWkE0PzGLan',
    'nupzElGoogbGDK5DLSNR', 'yEYsJ9999FkOadOuSnnn', 'bt9JXZ87gTNFAcLRXZT5',
    'HLnsVFPCAL8Boray30oL', 'VdmYsQVfhCFYjcxLt5Sb',
  ]);
  expect(replies.filter((row) => neonReports.has(row.reportId)).map((row) => row.reportId))
    .toEqual(['AczEhLm6hJioJbqUxnY3']);
  expect(new Set([...expected.map(([reportId]) => reportId), ...neonReports]).size).toBe(36);
});

test('the published prepared replies contain readable UTF-8 text', () => {
  const batch = readPreparedReplies();
  const mojibake = /[ÐÑÃÂ]|â[€„™œšž—–]/u;

  expect(batch.length).toBeGreaterThanOrEqual(48);
  for (const row of batch) {
    expect(`${row.title}\n${row.body}`).toMatch(/\p{L}/u);
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
  // Quoted pronouns may be the subject of a language explanation; only flag
  // direct informal address outside Russian quotation marks.
  const informalAddress = /(^|[\s("'])(ты|тебя|тебе|тобой|твой|твоя|твоё|твои|твоего|твоему|твою|твоих)(?=$|[\s,.:;!?)"'])/iu;
  const internalOrRoboticLanguage = /правил[оа]\s+(дубл|наград)|дубликат|отдельная награда|награда не начисляется|без награды|безопасно объявлять|по текущим данным|подтвердили сигнал|повторный сигнал|device-repro|TextInput|watchdog|dataId|contentId/iu;

  expect(batch.length).toBeGreaterThanOrEqual(48);
  for (const row of batch) {
    const customerText = `${row.title}\n${row.body}`;
    expect(customerText).not.toMatch(informalAddress);
    expect(customerText).not.toMatch(internalOrRoboticLanguage);
    // зачем: валюта называется жемчужинами (ru) / перлинами (uk). Слово «осколки»
    // — legacy-название поля shards в коде, живому юзеру его показывать нельзя.
    expect(customerText).not.toMatch(/оскол/iu);
    if (row.shards > 0) {
      expect(row.body).toMatch(new RegExp(`${row.shards}\\s+(жемчужин|перлин)`, 'iu'));
    } else {
      expect(row.body).not.toMatch(/наград|начисл[^.!?]*(?:жемчуж|перлин)/iu);
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
