import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildReviewWorkOrder,
  loadCandidateBankDirectory,
  validateFilledReview,
} from './lib/language_test_external_review.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const supportedLanguages = new Set(['es', 'de', 'it', 'fr']);

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args[outputIndex + 1] : '';
const inputIndex = args.indexOf('--input');
const input = inputIndex >= 0 ? args[inputIndex + 1] : '';
const generateIndex = args.indexOf('--generate');
const validateIndex = args.indexOf('--validate');
const mode = generateIndex >= 0 ? 'generate' : validateIndex >= 0 ? 'validate' : '';
const language = mode === 'generate' ? args[generateIndex + 1] : mode === 'validate' ? args[validateIndex + 1] : '';

if (!supportedLanguages.has(language) || (mode === 'generate' && !output) || (mode === 'validate' && !input)) {
  console.error('Usage: --generate <language> --output <path> OR --validate <language> --input <path>');
  process.exitCode = 2;
} else {
  const candidateDirectory = join(repositoryRoot, 'content', 'language-test-pilots', language, 'candidate-bank');
  const bank = loadCandidateBankDirectory(candidateDirectory);
  if (mode === 'generate') {
    const packet = buildReviewWorkOrder(bank);
    const outputPath = resolve(output);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
    console.log(`Generated ${language} external-review work order: ${packet.decisions.length} items.`);
  } else {
    const packet = JSON.parse(readFileSync(resolve(input), 'utf8'));
    const result = validateFilledReview(packet, bank);
    console.log(`releaseReady=${result.releaseReady} approved=${result.approved}/${result.total} blockers=${result.blockers.length}`);
    for (const blocker of result.blockers.slice(0, 10)) console.log(`- ${blocker}`);
    process.exitCode = result.releaseReady ? 0 : 1;
  }
}
