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

  it('invalidates the delayed clip fallback on stop or unmount so TTS cannot start on a hidden screen', () => {
    expect(audioSource).toContain('const clipStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);');
    expect(audioSource).toContain('const speechGenerationRef = useRef(0);');
    expect(audioSource).toContain('speechGenerationRef.current += 1;');
    expect(audioSource).toContain('speechGenerationRef.current !== generation');
  });

  it('gates every app voice start through the global voice policy', () => {
    expect(audioSource).toContain('voicePlaybackPolicy.captureStart()');
    expect(audioSource).toContain('voicePlaybackPolicy.canStart(voicePolicyToken)');
    expect(audioSource).toContain('voicePlaybackPolicy.registerStop');
    expect(phraseAudioSource).toContain('voicePlaybackPolicy.captureStart()');
    expect(phraseAudioSource).toContain('voicePlaybackPolicy.canStart(voicePolicyToken)');
  });

  it('does not leave stalled phrase-audio downloads in the shared in-flight map forever', () => {
    expect(phraseAudioSource).toContain('DOWNLOAD_TIMEOUT_MS');
    expect(phraseAudioSource).toContain('downloadFileWithTimeout');
    expect(phraseAudioSource).toContain('Promise.race([');
    expect(phraseAudioSource).toContain('File.downloadFileAsync(url, file)');
    expect(phraseAudioSource).toContain('timeout,');
    expect(phraseAudioSource).toContain('inFlightDownloads.delete(key);');
  });

  it('acquires spoken-audio activity for every generated clip playback', () => {
    expect(phraseAudioSource).toContain("acquireAudioActivity('spoken')");
    expect(phraseAudioSource).toContain('await whenAudioActivitySettled();');
    expect(phraseAudioSource).not.toContain('audioModeReady');
    expect(phraseAudioSource).toContain('player.volume = 1');
  });

  it('acquires spoken-audio activity before system TTS fallback too', () => {
    expect(audioSource).toContain("acquireAudioActivity('spoken')");
    expect(audioSource).toContain('whenAudioActivitySettled()');
    expect(audioSource).toContain('if (lastTextRef.current !== dedupeKey)');
    expect(audioSource.indexOf("acquireAudioActivity('spoken')")).toBeLessThan(
      audioSource.indexOf('Speech.speak(spokenText, speechOptions)'),
    );
  });

  it('uses visible exact text for generated clips and pronunciation text only for system TTS', () => {
    expect(audioSource).toContain('hasPhraseAudio(normalized)');
    expect(audioSource).toMatch(/playPhraseByText\(\s*normalized,/);
    expect(audioSource).toContain('Speech.speak(spokenText, speechOptions)');
  });

  // Regression: phrase clips died after ~half a lesson because createAudioPlayer
  // makes a raw native player that is NOT auto-released; a stuck/failed one kept
  // its native slot forever until an app restart, and the caller's fallback timer
  // was cleared by an onStart that fired before the clip actually played.
  it('frees every native phrase player through a registry so slots cannot leak', () => {
    expect(phraseAudioSource).toContain('const livePlayers = new Set<AudioPlayer>()');
    expect(phraseAudioSource).toContain('function disposePlayer');
    expect(phraseAudioSource).toContain('livePlayers.add(player)');
    expect(phraseAudioSource).toContain('livePlayers.delete(player)');
    // stopPhraseAudio must sweep any orphaned live players, not only currentPlayer.
    expect(phraseAudioSource).toContain('for (const player of Array.from(livePlayers)) disposePlayer(player)');
  });

  it('only reports onStart once the clip is actually loaded and playing', () => {
    // onStart must NOT fire right after createAudioPlayer — otherwise the caller
    // clears its CLIP_START_TIMEOUT fallback for a player that will never sound.
    expect(phraseAudioSource).toContain('status.isLoaded && status.playing');
    expect(phraseAudioSource).toContain('if (!superseded()) cb?.onStart?.();');
    // The create call must not be immediately followed by an onStart invocation.
    expect(phraseAudioSource).not.toMatch(/createAudioPlayer\([^)]*\);[\s\S]{0,120}cb\?\.onStart\?\.\(\);/);
  });

  it('self-heals a stalled clip via a start watchdog that falls back to TTS', () => {
    expect(phraseAudioSource).toContain('CLIP_PLAY_WATCHDOG_MS');
    expect(phraseAudioSource).toContain('currentWatchdog = setTimeout(');
    expect(phraseAudioSource).toContain('if (!started) teardown(true)');
    // A failed start reports onError so use-audio.ts falls back to system TTS.
    expect(phraseAudioSource).toContain("cb?.onError?.(new Error('phrase clip failed to start'))");
  });

  it('skips remote phrase audio immediately when the cache misses offline', () => {
    expect(phraseAudioSource).toContain("import { getNetStatus } from '../app/net_status'");
    expect(phraseAudioSource).toContain("if (getNetStatus() === 'offline') return null");
    expect(phraseAudioSource).toContain("if (!cachedUri && getNetStatus() === 'offline') return false");
  });

  it('frees a failed native player immediately on the ExoPlayer idle-error signal', () => {
    // expo-audio emits no explicit player-error event; a native decode failure /
    // exhausted player slot surfaces only as playbackState 'idle' AFTER the first
    // status. Detect that precisely and release the slot at once, not after the
    // timeout — root-cause release, with the watchdog only as a last resort.
    expect(phraseAudioSource).toContain("status.playbackState === 'idle'");
    expect(phraseAudioSource).toContain('statusTicks');
    expect(phraseAudioSource).toMatch(/statusTicks > 1 && status\.playbackState === 'idle'/);
  });
});
