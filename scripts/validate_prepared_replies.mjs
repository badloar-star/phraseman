/**
 * Локальный прогон ТОЙ ЖЕ проверки, что стоит в админке перед отправкой
 * (validatePreparedReplyBatch в admin/v2/legacy.html).
 *
 * зачем: владелец упёрся в «duplicate positive reward group» уже на боевой
 * кнопке. Проверка обязана падать здесь, а не у него.
 */
import fs from 'node:fs';

const ROOT = 'C:/appsprojects/phraseman';
const html = fs.readFileSync(ROOT + '/admin/v2/legacy.html', 'utf8');

// Достаём объект черновиков прямо из админки — источник истины один.
const at = html.indexOf('const PREPARED_REPORT_REPLIES = {');
const rest = html.slice(at);
const end = /\r?\n  \};\r?\n/.exec(rest);
const PREPARED = new Function(
  rest.slice(0, end.index + end[0].length).replace(/^const /, 'var ')
  + '; return PREPARED_REPORT_REPLIES;',
)();

// Достаём саму функцию проверки из админки, чтобы не переписывать её руками.
const vStart = html.indexOf('function validatePreparedReplyBatch');
const vRest = html.slice(vStart);
const vEnd = /\r?\n  \}\r?\n/.exec(vRest);
const validateSrc = vRest.slice(0, vEnd.index + vEnd[0].length);
const validate = new Function(validateSrc + '; return validatePreparedReplyBatch;')();

// Админка перед проверкой прогоняет тело через sanitize и подставляет бандл
// по severity — воспроизводим тот же путь.
const BUNDLES = {
  none: { version: 1, severity: 'none', spins: 0, runes: 0, pearls: 0 },
  minor: { version: 1, severity: 'minor', spins: 1, runes: 300, pearls: 1 },
  serious: { version: 1, severity: 'serious', spins: 2, runes: 600, pearls: 5 },
  critical: { version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 },
};

const replies = JSON.parse(fs.readFileSync(ROOT + '/replies.json', 'utf8'));
const rows = replies.map((r) => {
  const p = PREPARED[r.reportId];
  if (!p) throw new Error('нет черновика в админке: ' + r.reportId);
  return {
    title: p.title,
    body: p.body,
    shards: p.shards,
    resolution: p.resolution,
    rewardGroup: p.rewardGroup,
    rewardBundle: BUNDLES[p.rewardBundle?.severity || 'none'],
  };
});

const result = validate(rows);
console.log('строк проверено:', rows.length);
console.log('результат админки:', JSON.stringify(result));

if (!result.ok) {
  // Показываем ИМЕННО то, что сломалось, а не голый отказ.
  const seen = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.rewardBundle.severity === 'none') continue;
    if (seen.has(row.rewardGroup)) {
      console.log('ДУБЛЬ НАГРАДЫ в группе:', row.rewardGroup);
      console.log('  первый:', replies[seen.get(row.rewardGroup)].reportId);
      console.log('  второй:', replies[i].reportId);
    } else seen.set(row.rewardGroup, i);
  }
  process.exit(1);
}

const rewarded = rows.filter((r) => r.rewardBundle.severity !== 'none');
console.log('с наградой:', rewarded.length);
console.log('группы с наградой:', rewarded.map((r) => r.rewardGroup).join(', '));
console.log('ПРОВЕРКА ПРОЙДЕНА — кнопка отправки не откажет');
