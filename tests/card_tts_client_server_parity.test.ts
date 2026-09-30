/**
 * D128: клиент вычисляет ссылку клипа карточки сам — она обязана совпасть с
 * тем, куда сервер положил файл. Разъедутся константы/алгоритм — карточки
 * молча перестанут звучать голосом OpenAI. Этот сторож ловит расхождение.
 */
import { createHash } from 'crypto';

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
}));

import * as client from '../app/flashcards/card_tts_audio';
import * as server from '../functions/src/card_tts_core';

const nodeSha256 = async (material: string) => createHash('sha256').update(material, 'utf8').digest('hex');

describe('card TTS client ↔ server parity (D128)', () => {
  beforeEach(() => client.__resetCardTtsAudioForTests());

  it('shares model, voices, style version, prefix, bucket and max length', () => {
    expect(client.CARD_TTS_MODEL).toBe(server.CARD_TTS_MODEL);
    expect(client.CARD_TTS_VOICE_BY_LANGUAGE).toEqual(server.CARD_TTS_VOICE_BY_LANGUAGE);
    expect(client.CARD_TTS_STYLE_VERSION).toBe(server.CARD_TTS_STYLE_VERSION);
    expect(client.CARD_TTS_STORAGE_PREFIX).toBe(server.CARD_TTS_STORAGE_PREFIX);
    expect(client.CARD_TTS_DEFAULT_BUCKET).toBe(server.CARD_TTS_DEFAULT_BUCKET);
    expect(client.CARD_TTS_MAX_CHARS).toBe(server.CARD_TTS_MAX_CHARS);
  });

  it.each([
    ['en', 'Nice to meet you'],
    ['es', '  ¿Dónde   está el baño? '],
    ['fr', "Je n'ai pas compris"],
    ['de', 'Das Haus ist groß'],
    ['it', 'Piacere di conoscerti'],
  ] as const)('computes the same object path and download URL for %s', async (language, text) => {
    const target = await client.resolveCardTtsTarget(language, text, nodeSha256);
    const key = server.cardTtsKey(language, text);
    const objectPath = server.cardTtsObjectPath(language, key);
    expect(target).not.toBeNull();
    expect(target!.key).toBe(key);
    expect(target!.objectPath).toBe(objectPath);
    expect(target!.url).toBe(server.cardTtsDownloadUrl(server.CARD_TTS_DEFAULT_BUCKET, objectPath));
  });

  it('returns no target for empty or too long text (server never voices them)', async () => {
    await expect(client.resolveCardTtsTarget('en', '   ', nodeSha256)).resolves.toBeNull();
    await expect(client.resolveCardTtsTarget('en', 'x'.repeat(301), nodeSha256)).resolves.toBeNull();
  });

  it('maps speech locales to card languages; translations and "none" are not clip languages', () => {
    expect(client.cardTtsLanguageFromSpeechLocale('es-ES')).toBe('es');
    expect(client.cardTtsLanguageFromSpeechLocale('it_IT')).toBe('it');
    expect(client.cardTtsLanguageFromSpeechLocale('en-US')).toBe('en');
    expect(client.cardTtsLanguageFromSpeechLocale('ru-RU')).toBeNull();
    expect(client.cardTtsLanguageFromSpeechLocale('zxx')).toBeNull();
  });

  it('device voice only for the exact language; never a foreign default', () => {
    const voices = [{ identifier: 'v1', language: 'en-US' }, { identifier: 'v2', language: 'es-MX' }];
    expect(client.resolveCardDeviceVoice('es', voices)).toEqual({ available: true, locale: 'es-mx' });
    expect(client.resolveCardDeviceVoice('it', voices)).toEqual({ available: false, reason: 'exact_language_missing' });
    expect(client.resolveCardDeviceVoice('fr', [])).toEqual({ available: false, reason: 'inventory_unverified' });
    expect(client.resolveCardDeviceVoice('en', [])).toEqual({ available: true, locale: 'en-US' });
    expect(client.resolveCardDeviceVoice('de', [{ identifier: 'd', language: 'de-DE' }])).toEqual({ available: true, locale: 'de-DE' });
  });

  it('remembers a missing clip for a while so taps do not hit the network each time', () => {
    client.markCardTtsMissing('k', 1_000);
    expect(client.isCardTtsKnownMissing('k', 2_000)).toBe(true);
    expect(client.isCardTtsKnownMissing('k', 1_000 + 11 * 60 * 1000)).toBe(false);
  });

  it('shows the calm "voice unavailable" notice at most once per cooldown', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.doMock('../app/events', () => ({ emitAppEvent: jest.fn(), actionToastTri: (_t: string, m: unknown) => m }));
    expect(client.notifyCardVoiceUnavailable('it', 'exact_language_missing', 100_000)).toBe(true);
    expect(client.notifyCardVoiceUnavailable('it', 'exact_language_missing', 105_000)).toBe(false);
    expect(client.notifyCardVoiceUnavailable('it', 'exact_language_missing', 200_000)).toBe(true);
    warn.mockRestore();
  });

  it('use-audio routes card taps through the clip first and never through a foreign device voice', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const audio = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use-audio.ts'), 'utf8');
    expect(audio).toContain('cardAudio?: boolean;');
    expect(audio).toContain('playCardClipUrl(target.cacheKey, target.url');
    expect(audio).toContain('resolveCardDeviceVoice(cardLang, voices)');
    expect(audio).toContain("opts?.onError?.(new Error('card_voice_unavailable'))");
    const player = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'phrase_audio_player.ts'), 'utf8');
    expect(player).toContain('if (!cachedUri && requireCached)');
  });
});
