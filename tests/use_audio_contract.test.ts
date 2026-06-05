import * as fs from 'fs';
import * as path from 'path';

const audioSource = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use-audio.ts'), 'utf8');

describe('useAudio TTS resiliency', () => {
  it('guards Speech.stop so a native stop failure cannot kill replay audio', () => {
    expect(audioSource).toContain('function safeSpeechStop');
    expect(audioSource).toContain('safeSpeechStop();');
    expect(audioSource).toContain('Speech.stop();');
  });

  it('retries speech without a saved voice when the selected TTS voice fails', () => {
    expect(audioSource).toContain('function retrySpeechWithoutVoice');
    expect(audioSource).toContain('requestedVoice');
    expect(audioSource).toContain('onError:');
    expect(audioSource).toContain('retrySpeechWithoutVoice');
    expect(audioSource).toContain('voice: undefined');
  });
});
