// Governance-ID: TG-09E2E8CBBE64
// paid_audio_guard.mjs — замок на ПЛАТНУЮ генерацию озвучки (ElevenLabs, OpenAI TTS, Google/Azure/Polly и т.п.).
//
// зачем (владелец 05.11: «Аудио не генерим за деньги»): скрипты ниже ходят во внешние платные API. Чтобы их нельзя было запустить
// случайно (по привычке, из чужой сессии, по старому ночному плану), каждый из них первой строкой зовёт requireAllowPaidAudio().
// Без явного ALLOW_PAID_AUDIO=1 скрипт завершается с понятным сообщением и НИЧЕГО не отправляет в сеть.
// Допустимо без флага: системный TTS устройства и уже записанные файлы. Сторож — tests/paid_audio_guard_2026_11_05.test.ts:
// новый скрипт с вызовом платного API без этого замка ломает проверку.
export function requireAllowPaidAudio(scriptName) {
  if (process.env.ALLOW_PAID_AUDIO === '1') {
    console.warn(`[PAID-AUDIO] ${scriptName}: ALLOW_PAID_AUDIO=1 — платная генерация РАЗРЕШЕНА явно`);
    return;
  }
  console.error(
    `[PAID-AUDIO] ${scriptName}: ОТКАЗ. Платная генерация озвучки запрещена правилом владельца («аудио не генерим за деньги»). ` +
      'Если это осознанное исключение с разрешением владельца — запусти с ALLOW_PAID_AUDIO=1. Ничего в сеть не отправлено.',
  );
  process.exit(3);
}
