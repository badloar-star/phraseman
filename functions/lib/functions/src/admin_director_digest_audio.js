"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGenerateDirectorDigestAudio = void 0;
exports.splitDirectorDigestText = splitDirectorDigestText;
exports.getDirectorDigestAudioResponse = getDirectorDigestAudioResponse;
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const permissions_1 = require("./admin/permissions");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const MAX_INPUT_LENGTH = 30000;
const MAX_CHUNK_LENGTH = 4096;
const MAX_CLIPS = 8;
const TTS_MODEL = 'gpt-4o-mini-tts';
const TTS_VOICE = 'marin';
const TTS_INSTRUCTIONS = 'Говори по-русски как спокойный опытный продуктовый директор: естественная интонация, живые паузы между разделами, уверенно выделяй цифры, риски и следующие действия. Без лишних слов и без чтения технических ключей.';
function assertAccess(auth) {
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    if (!String(auth.uid ?? '').trim()
        || (auth.token?.adminRole !== 'owner' && auth.token?.adminRole !== 'admin')
        || !(0, permissions_1.hasClaimedPermission)(auth.token, 'briefing.read'))
        throw new https_1.HttpsError('permission-denied', 'briefing.read permission required.');
}
function parseText(data) {
    const text = data && typeof data === 'object' && typeof data.text === 'string'
        ? data.text.trim()
        : '';
    if (!text)
        throw new https_1.HttpsError('invalid-argument', 'Briefing text is required.');
    if (text.length > MAX_INPUT_LENGTH)
        throw new https_1.HttpsError('invalid-argument', 'Briefing text is too long.');
    return text;
}
function splitDirectorDigestText(text) {
    const chunks = [];
    let rest = text.trim();
    while (rest.length > 0) {
        if (chunks.length >= MAX_CLIPS)
            throw new https_1.HttpsError('invalid-argument', 'Briefing has too many audio sections.');
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
async function requestSpeech(input) {
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
        signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error('admin director digest TTS failed', response.status, detail.slice(0, 240));
        throw new https_1.HttpsError('unavailable', 'Text-to-speech provider failed.');
    }
    return Object.freeze({ mimeType: 'audio/mpeg', base64: Buffer.from(await response.arrayBuffer()).toString('base64') });
}
const DEFAULT_DEPENDENCIES = Object.freeze({ generateSpeech: requestSpeech });
async function getDirectorDigestAudioResponse(data, auth, dependencies = DEFAULT_DEPENDENCIES) {
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
exports.adminGenerateDirectorDigestAudio = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 2,
    concurrency: 4,
    secrets: [OPENAI_API_KEY],
}, async (request) => getDirectorDigestAudioResponse(request.data, request.auth));
//# sourceMappingURL=admin_director_digest_audio.js.map