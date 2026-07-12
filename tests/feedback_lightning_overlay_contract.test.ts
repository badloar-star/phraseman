import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

interface WavAnalysis {
  channels: number;
  duration: number;
  finalPeak: number;
  sampleRate: number;
  tailRmsDb: number;
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function sha256(rel: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').toUpperCase();
}

function analyzePcm16Wav(rel: string): WavAnalysis {
  const wav = fs.readFileSync(path.join(ROOT, rel));
  expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
  expect(wav.toString('ascii', 8, 12)).toBe('WAVE');

  const channels = wav.readUInt16LE(22);
  const sampleRate = wav.readUInt32LE(24);
  const bitsPerSample = wav.readUInt16LE(34);
  expect(bitsPerSample).toBe(16);

  let chunkOffset = 12;
  let dataOffset = 0;
  let dataSize = 0;
  while (chunkOffset + 8 <= wav.length) {
    const id = wav.toString('ascii', chunkOffset, chunkOffset + 4);
    const size = wav.readUInt32LE(chunkOffset + 4);
    if (id === 'data') {
      dataOffset = chunkOffset + 8;
      dataSize = size;
      break;
    }
    chunkOffset += 8 + size + (size % 2);
  }

  expect(dataOffset).toBeGreaterThan(0);
  const frameCount = dataSize / (channels * 2);
  const tailFrames = Math.round(sampleRate * 0.02);
  let squareSum = 0;
  let sampleCount = 0;
  let finalPeak = 0;

  for (let frame = frameCount - tailFrames; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = wav.readInt16LE(dataOffset + (frame * channels + channel) * 2);
      squareSum += (sample / 32768) ** 2;
      sampleCount += 1;
      if (frame === frameCount - 1) finalPeak = Math.max(finalPeak, Math.abs(sample));
    }
  }

  return {
    channels,
    duration: frameCount / sampleRate,
    finalPeak,
    sampleRate,
    tailRmsDb: 20 * Math.log10(Math.sqrt(squareSum / sampleCount) || 1e-12),
  };
}

describe('lesson lightning overlay contract', () => {
  it('uses finite, focus-safe and reduced-motion-aware animation layers', () => {
    const overlay = read('components/feedback/LightningOverlay.tsx');

    expect(overlay).toContain("useReduceMotion");
    expect(overlay).toContain('secondaryPath');
    expect(overlay).toContain('edgeOpacity');
    expect(overlay).toContain('sparkOpacity');
    expect(overlay).toContain('cancelOverlayAnimations');
    expect(overlay).toContain('if (!focused) return;');
    expect(overlay).not.toContain('withRepeat');
    expect(overlay).not.toContain('Animated.loop');
    expect(overlay).not.toContain('setInterval');
    expect(overlay).not.toContain("backgroundColor: '#FFFFFF'");
  });

  it('keeps the approved lightning sounds complete and smoothly faded', () => {
    const crackPath = 'assets/audio/ui/crack.wav';
    const thunderPath = 'assets/audio/ui/thunder.wav';

    expect(sha256(crackPath)).toBe('B5A692EF005072D835249512F2FA75AB4309793D7F14CD94D9D22ABEDA9B368F');
    expect(sha256(thunderPath)).toBe('5ED3E54AAFC4FD5E053647EF0704132412B15A897D4C5067AE6ACEC73467DABA');

    const crack = analyzePcm16Wav(crackPath);
    const thunder = analyzePcm16Wav(thunderPath);

    expect(crack).toMatchObject({ channels: 2, sampleRate: 48000, finalPeak: 0 });
    expect(thunder).toMatchObject({ channels: 2, sampleRate: 48000, finalPeak: 0 });
    expect(crack.duration).toBeCloseTo(1.08, 2);
    expect(thunder.duration).toBeCloseTo(1.85, 2);
    expect(crack.tailRmsDb).toBeLessThanOrEqual(-60);
    expect(thunder.tailRmsDb).toBeLessThanOrEqual(-60);
  });

  it('keeps the existing lesson mix volumes while replacing only the samples', () => {
    const soundBank = read('app/feedback/sound_bank.ts');

    expect(soundBank).toContain('crack: 0.16');
    expect(soundBank).toContain('thunder: 0.5');
  });
});
