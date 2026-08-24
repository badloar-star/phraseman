import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const SOURCES = [
  'modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1.ts',
  'modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1.ts',
  'modules/learning-v2/content/source/episode_01_sessions_25_32_support_v1.ts',
  'modules/learning-v2/content/source/episode_01_sessions_33_40_support_v1.ts',
  'modules/learning-v2/content/source/episode_01_sessions_41_48_support_v1.ts',
  'modules/learning-v2/content/source/episode_01_sessions_49_56_support_v1.ts',
] as const;

const FORBIDDEN = [
  /function\s+introBody\s*\(/u,
  /const\s+introBody\s*=/u,
  /\bINTRO_FOCUS\b/u,
  /\bbodies\.map\s*\(/u,
  /page\.body\[[^\]]+\][^\n]+page\.explanation/u,
  /episode01IntroChoiceContrast/u,
] as const;

const findings: string[] = [];
for (const relative of SOURCES) {
  const source = readFileSync(resolve(ROOT, relative), 'utf8');
  FORBIDDEN.forEach((pattern) => {
    if (pattern.test(source)) findings.push(`${relative}:${pattern.source}`);
  });
}

if (findings.length > 0) {
  throw new Error(`LESSON 1 INTRO AUTHORSHIP GATE: HOLD\n${findings.join('\n')}`);
}

process.stdout.write('LESSON 1 INTRO AUTHORSHIP GATE: PASS\n');
