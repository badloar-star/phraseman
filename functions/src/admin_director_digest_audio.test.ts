import { HttpsError } from 'firebase-functions/v2/https';
import {
  getDirectorDigestAudioResponse,
  type DirectorDigestAudioDependencies,
} from './admin_director_digest_audio';

const auth = { uid: 'owner-1', token: { admin: true, adminRole: 'owner' } };

function deps(overrides: Partial<DirectorDigestAudioDependencies> = {}): DirectorDigestAudioDependencies {
  return {
    generateSpeech: async () => ({ mimeType: 'audio/mpeg', base64: 'YXVkaW8=' }),
    ...overrides,
  };
}

describe('admin director digest audio', () => {
  it('rejects unauthenticated or unauthorized callers', async () => {
    await expect(getDirectorDigestAudioResponse({ text: 'Брифинг' }, null, deps()))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(getDirectorDigestAudioResponse({ text: 'Брифинг' }, { uid: 'admin', token: { adminRole: 'admin' } }, deps()))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('splits long briefings into bounded TTS clips and preserves order', async () => {
    const inputs: string[] = [];
    const result = await getDirectorDigestAudioResponse(
      { text: `${'Первый вывод. '.repeat(400)}\n\n${'Второй вывод. '.repeat(400)}` },
      auth,
      deps({ generateSpeech: async (input) => { inputs.push(input.text); return { mimeType: 'audio/mpeg', base64: input.text.slice(0, 4) }; } }),
    );
    expect(inputs.length).toBeGreaterThan(1);
    expect(Math.max(...inputs.map((item) => item.length))).toBeLessThanOrEqual(4096);
    expect(result.clips).toHaveLength(inputs.length);
    expect(result.clips.map((clip) => clip.base64)).toEqual(inputs.map((item) => item.slice(0, 4)));
  });

  it('requests multiple clips concurrently so a long briefing does not hit the callable deadline', async () => {
    let active = 0;
    let maxActive = 0;
    const result = await getDirectorDigestAudioResponse(
      { text: 'Длинный раздел. '.repeat(700) },
      auth,
      deps({ generateSpeech: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return { mimeType: 'audio/mpeg', base64: 'YXVkaW8=' };
      } }),
    );
    expect(result.clips.length).toBeGreaterThan(1);
    expect(maxActive).toBeGreaterThan(1);
  });

  it('rejects empty or oversized input before spending on TTS', async () => {
    const generateSpeech = jest.fn();
    await expect(getDirectorDigestAudioResponse({ text: '   ' }, auth, deps({ generateSpeech })))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(getDirectorDigestAudioResponse({ text: 'x'.repeat(30_001) }, auth, deps({ generateSpeech })))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(generateSpeech).not.toHaveBeenCalled();
  });
});
