import fs from 'node:fs';

const file = 'docs/architecture/TECH_DEBT_REGISTER.json';
const register = JSON.parse(fs.readFileSync(file, 'utf8'));
const allowed = new Set(['pay', 'contain', 'accept']);
const ids = new Set();
for (const item of register.items ?? []) {
  for (const field of ['id', 'title', 'disposition', 'owner', 'reviewDate', 'impactCeiling', 'exitEnabler', 'taskPacket']) {
    if (!item[field]) throw new Error(`technical_debt_field_missing:${item.id ?? 'unknown'}:${field}`);
  }
  if (ids.has(item.id)) throw new Error(`technical_debt_duplicate:${item.id}`);
  ids.add(item.id);
  if (!allowed.has(item.disposition)) throw new Error(`technical_debt_disposition_invalid:${item.id}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.reviewDate)) throw new Error(`technical_debt_review_date_invalid:${item.id}`);
  if (!fs.existsSync(item.taskPacket)) throw new Error(`technical_debt_packet_missing:${item.id}`);
  if (/pending|tbd|unknown/i.test(item.owner) && item.disposition === 'accept') throw new Error(`accepted_debt_requires_owner:${item.id}`);
}
console.log(`technical_debt_ok items=${ids.size} dispositions=${[...new Set(register.items.map((item) => item.disposition))].sort().join(',')}`);
