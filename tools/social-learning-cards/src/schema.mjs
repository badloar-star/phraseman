import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

export const CARD_STATUSES = [
  'idea',
  'copy_ready',
  'waiting_dalle',
  'images_ready',
  'review',
  'ready',
  'published',
  'collecting',
  'scored',
];

const immutableStatuses = new Set(['published', 'collecting', 'scored']);
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(
  moduleDir,
  '../../../functions/src/contracts/social_learning_card_manifest_v1.json',
);
const manifestSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({
  allErrors: true,
  removeAdditional: false,
  useDefaults: false,
  coerceTypes: false,
  strict: true,
});
const validateSchema = ajv.compile(manifestSchema);

function duplicateErrors(items) {
  const errors = [];
  const fields = ['id', 'english', 'russian'];
  for (const field of fields) {
    const seen = new Set();
    for (const item of items) {
      const raw = item?.[field];
      if (typeof raw !== 'string') continue;
      const normalized = raw.trim().toLocaleLowerCase('en-US');
      if (!normalized) continue;
      if (seen.has(normalized)) errors.push(`/items:duplicate_${field}`);
      seen.add(normalized);
    }
  }
  return errors;
}

export function validateCardManifest(input) {
  const schemaOk = validateSchema(input);
  const errors = schemaOk
    ? []
    : (validateSchema.errors ?? []).map((error) => `${error.instancePath || '/'}:${error.keyword}`);
  if (input && typeof input === 'object' && Array.isArray(input.items)) {
    errors.push(...duplicateErrors(input.items));
  }
  if (errors.length > 0) return { ok: false, value: null, errors };
  return { ok: true, value: input, errors: [] };
}

export function canMutateRevision(status) {
  return CARD_STATUSES.includes(status) && !immutableStatuses.has(status);
}
