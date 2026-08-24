import * as fs from 'fs';
import * as path from 'path';

// зачем: решение владельца 2026-08-24 — «звуки не должна скорость в настройках
// как-либо влиять, они должны оригинальной длины быть».
//
// История. 20.06.2026 два коммита одного дня сложились в регрессию:
//   18e4b7970 — слайдер скорости стали применять к готовым клипам озвучки
//               (до него клипы всегда играли на 1.0, слайдер их не касался);
//   226660a44 — диапазон слайдера раздвинули с 0.5–1.0 до 0.8–1.3.
// Одно и то же число подавалось в две системы с РАЗНЫМИ шкалами: для
// expo-speech 1.0 = быстрая машинная речь, а для клипа 1.0 = уже спокойный темп
// живой записи. Двойной учёт: при 0.9 клип почти разогнан, при 1.3 запись гнала
// на треть быстрее. Владелец услышал это как «звук сильно ускорился».
//
// Сработал этот сторож — возвращать оригинальную длину клипа, а НЕ править тест.
// Слайдер скорости остаётся живым, но управляет ТОЛЬКО системным TTS-фолбэком.

const playerPath = path.join(__dirname, '..', 'hooks', 'phrase_audio_player.ts');
const audioPath = path.join(__dirname, '..', 'hooks', 'use-audio.ts');
const playerSource = fs.readFileSync(playerPath, 'utf8');
const audioSource = fs.readFileSync(audioPath, 'utf8');

// Проверяем КОД, а не комментарии: пояснение «setPlaybackRate здесь запрещён»
// само содержит запрещённое имя и иначе валило бы сторожа на честной правке.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ 	]*\/\/.*$/gm, '');
}

const playerCode = stripComments(playerSource);

describe('готовые клипы озвучки играют в оригинальной длине', () => {
  it('плеер клипов не выставляет скорость воспроизведения', () => {
    expect(playerCode).not.toMatch(/setPlaybackRate/);
    expect(playerCode).not.toMatch(/shouldCorrectPitch/);
    expect(playerCode).not.toMatch(/playbackRate\s*=/);
  });

  it('в плеере клипов не осталось клампа скорости и его границ', () => {
    expect(playerCode).not.toMatch(/clampPlaybackRate/);
    expect(playerCode).not.toMatch(/MIN_CLIP_RATE/);
    expect(playerCode).not.toMatch(/MAX_CLIP_RATE/);
  });

  it('держит маркер решения владельца, чтобы правило не потерялось', () => {
    expect(playerSource).toContain('CLIP_RATE_LOCKED_TO_ORIGINAL');
  });

  it('playPhraseByText не принимает скорость параметром', () => {
    const signature = playerCode.match(
      /export async function playPhraseByText\(([\s\S]*?)\): Promise<boolean>/,
    );
    expect(signature).not.toBeNull();
    expect(signature![1]).not.toMatch(/\brate\b/);
  });

  it('use-audio не передаёт скорость в клип', () => {
    const call = audioSource.match(/playPhraseByText\(([\s\S]*?)\n      \)/);
    expect(call).not.toBeNull();
    expect(call![1]).not.toMatch(/safeRate/);
  });

  it('слайдер скорости продолжает работать для системного TTS', () => {
    // Правило снимает скорость с клипов, но не ломает озвучку синтезатором:
    // без этого «фикс» превратился бы в отключение настройки целиком.
    expect(audioSource).toContain('const safeRate = normalizeSpeechRate(');
    expect(audioSource).toContain('rate: safeRate,');
  });
});
