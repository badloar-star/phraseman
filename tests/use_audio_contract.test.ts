import * as fs from 'fs';
import * as path from 'path';

const audioSource = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use-audio.ts'), 'utf8');
const phraseAudioSource = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'phrase_audio_player.ts'), 'utf8');

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

  it('falls back to system TTS when a pre-generated clip does not start', () => {
    expect(audioSource).toContain('CLIP_START_TIMEOUT_MS');
    expect(audioSource).toContain('clipStartTimer = setTimeout(fallbackOnce, CLIP_START_TIMEOUT_MS)');
    expect(audioSource).toContain('clearClipStartTimer();');
    expect(audioSource).toContain('stopPhraseAudio();');
    expect(audioSource).toContain('speakWithSystemTts();');
  });

  it('does not leave stalled phrase-audio downloads in the shared in-flight map forever', () => {
    expect(phraseAudioSource).toContain('DOWNLOAD_TIMEOUT_MS');
    expect(phraseAudioSource).toContain('downloadFileWithTimeout');
    expect(phraseAudioSource).toContain('Promise.race([');
    expect(phraseAudioSource).toContain('File.downloadFileAsync(url, file)');
    expect(phraseAudioSource).toContain('timeout,');
    expect(phraseAudioSource).toContain('inFlightDownloads.delete(key);');
  });

  it('restores the loud phrase audio mode on every generated clip playback', () => {
    expect(phraseAudioSource).toContain('LOUD_PLAYBACK_AUDIO_MODE');
    expect(phraseAudioSource).toContain('await setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE);');
    expect(phraseAudioSource).not.toContain('audioModeReady');
    expect(phraseAudioSource).toContain('player.volume = 1');
  });

  it('restores the loud playback mode before system TTS fallback too', () => {
    expect(audioSource).toContain('setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE)');
    expect(audioSource).toContain('if (lastTextRef.current !== normalized) return;');
    expect(audioSource.indexOf('setAudioModeAsync(LOUD_PLAYBACK_AUDIO_MODE)')).toBeLessThan(
      audioSource.indexOf('Speech.speak(normalized, speechOptions)'),
    );
  });
});
