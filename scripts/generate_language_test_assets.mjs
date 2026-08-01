#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LANGUAGES,
  assertLanguage,
  buildLanguageBank,
  checkGeneratedOutputs,
  sha256,
  writeGeneratedOutputs,
} from './lib/language_test_bank.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const isCheck = args.includes('--check');
const languageIndex = args.indexOf('--language');
const hasAll = args.includes('--all');

if ((languageIndex !== -1 && (!args[languageIndex + 1] || hasAll)) || (!hasAll && languageIndex === -1)) {
  throw new Error('Usage: generate_language_test_assets.mjs (--language <code> | --all) [--check]');
}

const languages = hasAll ? LANGUAGES : [args[languageIndex + 1]];
languages.forEach(assertLanguage);

if (isCheck) {
  checkGeneratedOutputs({ root: ROOT, languages });
  console.log(`Check passed: ${languages.join(', ')}`);
} else {
  for (const language of languages) {
    const jsonText = buildLanguageBank({ root: ROOT, language });
    writeGeneratedOutputs({ root: ROOT, language, jsonText });
    console.log(`Generated ${language}: ${sha256(jsonText)}`);
  }
}
