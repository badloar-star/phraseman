import {
  HOLD_PCM_CONFIG,
  MAX_HOLD_MS,
  MIN_CAPTURE_SEC,
  deleteHoldRecording,
  isHoldRecordingSupported,
  pcm16VolumeSample,
  startHoldRecording,
} from '../app/speaking_hold_recorder';

// In the jest environment neither the native PCM-stream package nor a native
// filesystem exists, so the recorder MUST degrade gracefully — never throw,
// always hand callers a controller whose stop() yields null so they fall back
// to the system recognizer.

describe('hold recorder config', () => {
  it('captures 16 kHz mono 16-bit PCM (what whisper expects)', () => {
    expect(HOLD_PCM_CONFIG).toEqual({ sampleRate: 16000, channels: 1, bitsPerSample: 16 });
  });

  it('maps PCM16 loudness to the equalizer raw-volume range', () => {
    expect(pcm16VolumeSample(new Uint8Array([0, 0, 0, 0]))).toBe(0);
    // Two little-endian +4096 samples -> a clearly visible mid-level signal.
    expect(pcm16VolumeSample(new Uint8Array([0x00, 0x10, 0x00, 0x10]))).toBeCloseTo(2, 4);
    expect(pcm16VolumeSample(new Uint8Array([0xff, 0x7f, 0xff, 0x7f]))).toBeCloseTo(4, 4);
  });

  it('bounds a single hold and a minimum useful capture', () => {
    expect(MAX_HOLD_MS).toBeGreaterThanOrEqual(10000);
    expect(MAX_HOLD_MS).toBeLessThanOrEqual(60000);
    expect(MIN_CAPTURE_SEC).toBeGreaterThan(0);
    expect(MIN_CAPTURE_SEC).toBeLessThan(1);
  });
});

describe('graceful degradation without the native package', () => {
  it('reports unsupported when the PCM-stream module is not in the binary', () => {
    expect(isHoldRecordingSupported()).toBe(false);
  });

  it('startHoldRecording returns a no-op controller instead of throwing', async () => {
    const rec = startHoldRecording();
    expect(rec.isActive()).toBe(false);
    await expect(rec.stop()).resolves.toBeNull();
  });

  it('the no-op controller is safe to cancel and double-stop', async () => {
    const rec = startHoldRecording();
    expect(() => rec.cancel()).not.toThrow();
    await expect(rec.stop()).resolves.toBeNull();
    await expect(rec.stop()).resolves.toBeNull();
  });

  it('accepts live callbacks without firing them in the degraded path', async () => {
    const onFirstAudio = jest.fn();
    const onLevel = jest.fn();
    const rec = startHoldRecording({ onFirstAudio, onLevel });
    expect(rec.isActive()).toBe(false);
    await expect(rec.stop()).resolves.toBeNull();
    // No native capture in jest → no first chunk → callback must not fire.
    expect(onFirstAudio).not.toHaveBeenCalled();
    expect(onLevel).not.toHaveBeenCalled();
  });

  it('deleteHoldRecording never throws (no fs, nullish, or normal uri)', () => {
    expect(() => deleteHoldRecording(null)).not.toThrow();
    expect(() => deleteHoldRecording('file:///tmp/attempt.wav')).not.toThrow();
  });
});
