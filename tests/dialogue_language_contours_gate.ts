import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  DIALOGUE_LANGUAGE_ACTIVATION_RECEIPTS,
  DIALOGUE_OWNER_RELEASED_TARGETS,
  dialogueLanguageIsActivated,
} from '../app/dialogue_language_activation';
import { DIALOGUE_STUDY_TARGETS } from '../app/dialogue_language_registry';

const root = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const fail = (message: string): never => { throw new Error(`dialogue-language-contours: ${message}`); };

const targets = ['en', 'es', 'fr', 'de'] as const;
if (JSON.stringify(DIALOGUE_STUDY_TARGETS) !== JSON.stringify(targets)) fail('client registry target mismatch');
if (!dialogueLanguageIsActivated('en')) fail('English regression: contour unexpectedly closed');

for (const target of ['es', 'fr', 'de'] as const) {
  if (!dialogueLanguageIsActivated(target)) {
    fail(`${target} missing from the explicit owner-authorised release`);
  }
}
if (JSON.stringify(DIALOGUE_OWNER_RELEASED_TARGETS) !== JSON.stringify(['es', 'fr', 'de'])) {
  fail('owner-authorised client release set mismatch');
}
if (Object.keys(DIALOGUE_LANGUAGE_ACTIVATION_RECEIPTS).length !== 0) {
  fail('owner release must not forge independent-review receipts');
}

const targetGate = read('app/ai_dialog_target_gate.ts');
if (!targetGate.includes("dialogueLanguageIsActivated('es')")
  || !targetGate.includes("dialogueLanguageIsActivated('fr')")
  || !targetGate.includes("dialogueLanguageIsActivated('de')")) {
  fail('client activation gate does not bind every non-English target to receipt validation');
}

for (const file of [
  'app/ai_dialog_session.tsx',
  'app/ai_companion_session.tsx',
  'app/ai_dialog_tutor_session.tsx',
]) {
  if (read(file).includes("'en-US'")) fail(`${file} still hard-codes en-US`);
}

const client = read('app/ai_dialog_client.ts');
if (client.includes("studyTarget: req.studyTarget ?? 'en'")) {
  fail('client callable adapter silently defaults the dialogue target to English');
}

const serverContract = read('functions/src/dialogue_ai_language_contract.ts');
if (!serverContract.includes("DIALOGUE_ACTIVATED_STUDY_TARGETS = ['en', 'es', 'fr', 'de']")) {
  fail('server activation baseline is not fail-closed');
}

console.log('dialogue-language-contours-gate: PASS (owner-authorised targets active; unknown targets fail closed)');
