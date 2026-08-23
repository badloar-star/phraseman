// ═══════════════════════════════════════════════════════════════════════════
// functions-max/index.ts — отдельная кодбаза голосового учителя MAX.
//
// зачем: владелец 2026-08-23. Cloud Functions gen2 при старте ЛЮБОГО
// контейнера грузит index.js своей кодбазы целиком. В основной кодбазе это
// 240 функций и 853 модуля = 370 МБ RSS и 2.2 с холодного старта, из-за чего
// maxVoiceFinalize вообще не запускалась («Memory limit of 256 MiB exceeded»),
// а supportInboxOnNewMail падала при обработке письма.
//
// Замер: все модули MAX вместе занимают 80 МБ (12 МБ своего кода + Node с
// Firebase), общие зависимости — ещё 5 МБ. То есть здесь запас к лимиту
// 256 MiB трёхкратный, и холодный старт кратно короче — ученик быстрее
// слышит учителя.
//
// ВАЖНО: исходники НЕ дублируются. tsconfig с rootDir ".." компилирует те же
// файлы functions/src/*, что и основная кодбаза, — правка делается в одном
// месте и попадает в обе сборки.
// ═══════════════════════════════════════════════════════════════════════════

export { maxVoicePreflight, maxVoiceMint } from '../functions/src/max_voice_mint';
export { maxVoiceHeartbeat, maxVoiceSessionEnd } from '../functions/src/max_voice_session_end';
export { maxVoiceWatchdog, maxVoiceProviderHealth } from '../functions/src/max_voice_watchdog';
export { maxVoiceSafetyReport } from '../functions/src/max_voice_safety';
export { maxVoiceFinalize } from '../functions/src/max_voice_finalize';
export {
  maxVoiceGetMemory,
  maxVoiceUpdateMemory,
  maxVoiceDeleteMemoryItem,
  maxVoiceClearMemory,
} from '../functions/src/max_voice_memory_controls';
