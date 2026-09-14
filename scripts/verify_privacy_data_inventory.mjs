import fs from 'node:fs';

const inventory = JSON.parse(fs.readFileSync('docs/security/PRIVACY_DATA_INVENTORY.json', 'utf8'));
const required = ['id','category','purpose','consent','store','retention','deletion','vendor','residency','childSensitivity','owner'];
const ids = new Set();
for (const row of inventory.records ?? []) {
  for (const key of required) if (!row[key]) throw new Error(`privacy_inventory_field_missing:${row.id ?? 'unknown'}:${key}`);
  if (ids.has(row.id)) throw new Error(`privacy_inventory_duplicate:${row.id}`);
  ids.add(row.id);
  if (!['low','medium','high'].includes(row.childSensitivity)) throw new Error(`privacy_inventory_sensitivity_invalid:${row.id}`);
}
for (const requiredCategory of ['account-identifiers','learning-progress','entitlements','voice-input','consented-web-analytics','support-data']) {
  if (!inventory.records.some((row) => row.category === requiredCategory)) throw new Error(`privacy_inventory_category_missing:${requiredCategory}`);
}
console.log(`privacy_data_inventory_ok records=${ids.size} status=${inventory.status}`);
