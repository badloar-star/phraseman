#!/usr/bin/env node
/** Compatibility entry point for the English level-test bank. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLanguageBank,
  checkGeneratedOutputs,
  outputPathsFor,
  sha256,
  writeGeneratedOutputs,
} from './lib/language_test_bank.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const isCheck = process.argv.includes('--check');
const jsonText = buildLanguageBank({ root: ROOT, language: 'en' });

if (isCheck) {
  checkGeneratedOutputs({ root: ROOT, languages: ['en'] });
  console.log('Check passed: outputs match');
} else {
  writeGeneratedOutputs({ root: ROOT, language: 'en', jsonText });
  const [webOutput, functionsOutput] = outputPathsFor(ROOT, 'en');
  console.log(`Web output: ${webOutput}`);
  console.log(`Functions output: ${functionsOutput}`);
  console.log(`SHA-256: ${sha256(jsonText)}`);
  console.log('Generated 240 reviewed questions');
}
