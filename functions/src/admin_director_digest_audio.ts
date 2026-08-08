import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasClaimedPermission } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const MAX_INPUT_LENGTH = 30_000;
const MAX_CHUNK_LENGTH = 4_096;
const MAX_CLIPS = 8;
const TTS_MODEL = 'gpt-4o-mini-tts';
const TTS_VOICE = 'marin';
const TTS_INSTRUCTIONS = 'Говори по-русски как спокойный опытный продуктовый директор: естественная интонация, живые паузы между разделами, уверенно выделяй цифры, риски и следующие действия. Без лишних слов и без чтения технических ключей.';

interface DirectorDigestAudioAuth {
  readonly uid?: string;
  readonly token?: Record<string, unknown>;
}

export interface DirectorDigestSpeechInput {
  readonly text: string;
  readonly model: string;
  readonly voice: string;
  readonly instructions: string;
}

export interface DirectorDigestAudioClip {
  readonly mimeType: 'audio/mpeg';
  readonly base64: string;
}

export interface DirectorDigestAudioDependencies {
  readonly generateSpeech: (input: DirectorDigestSpeechInput) => Promise<DirectorDigestAudioClip>;
}

export interface DirectorDigestAudioResponse {
  readonly schemaVersion: 1;
  readonly model: string;
  readonly voice: string;
  readonly clips: readonly DirectorDigestAudioClip[];
}

function assertAccess(auth: DirectorDigestAudioAuth | null | undefined): void {
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  if (
    !String(auth.uid ?? '').trim()
    || (auth.token?.adminRole !== 'owner' && auth.token?.adminRole !== 'admin')
    || !hasClaimedPermission(auth.token, 'briefing.read')
  ) throw new HttpsError('permission-denied', 'briefing.read permission required.');
}

function parseText(data: unknown): string {
  const text = data && typeof data === 'object' && typeof (data as { text?: unknown }).text === 'string'
    ? (data as { text: string }).text.trim()
    : '';
  if (!text) throw new HttpsError('invalid-argument', 'Briefing text is required.');
  if (text.length > MAX_INPUT_LENGTH) throw new HttpsError('invalid-argument', 'Briefing text is too long.');
  return text;
}

export function splitDirectorDigestText(text: string): readonly string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > 0) {
    if (chunks.length >= MAX_CLIPS) throw new HttpsError('invalid-argument', 'Briefing has too many audio sections.');
    if (rest.length <= MAX_CHUNK_LENGTH) {
      chunks.push(rest);
      break;
    }
    const window = rest.slice(0, MAX_CHUNK_LENGTH + 1);
    const boundary = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '), window.lastIndexOf(' '));
    const cut = boundary >= Math.floor(MAX_CHUNK_LENGTH * 0.65) ? boundary : MAX_CHUNK_LENGTH;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return Object.freeze(chunks);
}

async function requestSpeech(input: DirectorDigestSpeechInput): Promise<DirectorDigestAudioClip> {
  const response = await fetch(OPENAI_SPEECH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY.value().trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: input.model,
      voice: input.voice,
      input: input.text,
      instructions: input.instructions,
      response_format: 'mp3',
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('admin director digest TTS failed', response.status, detail.slice(0, 240));
    throw new HttpsError('unavailable', 'Text-to-speech provider failed.');
  }
  return Object.freeze({ mimeType: 'audio/mpeg', base64: Buffer.from(await response.arrayBuffer()).toString('base64') });
}

const DEFAULT_DEPENDENCIES: DirectorDigestAudioDependencies = Object.freeze({ generateSpeech: requestSpeech });

export async function getDirectorDigestAudioResponse(
  data: unknown,
  auth: DirectorDigestAudioAuth | null | undefined,
  dependencies: DirectorDigestAudioDependencies = DEFAULT_DEPENDENCIES,
): Promise<DirectorDigestAudioResponse> {
  assertAccess(auth);
  const text = parseText(data);
  const chunks = splitDirectorDigestText(text);
  const clips = await Promise.all(chunks.map((chunk) => dependencies.generateSpeech({
      text: chunk,
      model: TTS_MODEL,
      voice: TTS_VOICE,
      instructions: TTS_INSTRUCTIONS,
    })));
  return Object.freeze({ schemaVersion: 1, model: TTS_MODEL, voice: TTS_VOICE, clips: Object.freeze(clips) });
}

export const adminGenerateDirectorDigestAudio = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 120,
  memory: '512MiB',
  maxInstances: 2,
  concurrency: 4,
  secrets: [OPENAI_API_KEY],
}, async (request) => getDirectorDigestAudioResponse(request.data, request.auth));
