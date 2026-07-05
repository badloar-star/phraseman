import fs from 'node:fs';
import path from 'node:path';

function readEnvLine(filePath, name) {
  if (!fs.existsSync(filePath)) return '';
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    if (key.trim() === name) return rest.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

export function readOpenAiTtsKey(rootDir) {
  const direct = String(process.env.OPENAI_TTS_API_KEY || '').trim();
  if (direct) return direct;

  for (const envFile of ['.env.local', '.env']) {
    const value = readEnvLine(path.join(rootDir, envFile), 'OPENAI_TTS_API_KEY');
    if (value) return value;
  }

  if (process.env.PHRASEMAN_ALLOW_LEGACY_OPENAI_API_KEY_FOR_TTS === '1') {
    const legacyDirect = String(process.env.OPENAI_API_KEY || '').trim();
    if (legacyDirect) return legacyDirect;
    for (const envFile of ['.env.local', '.env']) {
      const value = readEnvLine(path.join(rootDir, envFile), 'OPENAI_API_KEY');
      if (value) return value;
    }
  }

  return '';
}

export function requireOpenAiTtsKey(rootDir) {
  const key = readOpenAiTtsKey(rootDir);
  if (!key) {
    throw new Error(
      'OPENAI_TTS_API_KEY is required for local OpenAI TTS. ' +
        'Do not use OPENAI_API_KEY in Codex sessions except with PHRASEMAN_ALLOW_LEGACY_OPENAI_API_KEY_FOR_TTS=1 for a one-off migration.',
    );
  }
  return key;
}
