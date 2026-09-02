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
// зачем (владелец 2026-09-02, аудит расходов): maxVoiceProviderHealth снят с
// деплоя. Замер за 30 дней: проба НЕ поймала ни одной деградации OpenAI — все
// её ошибки в логах это падения деплоя самой пробы («Quota exceeded for CPU»).
// Настоящую поломку провайдера всё равно видно раньше и точнее: maxVoiceWatchdog
// разбирает зависшие живые звонки, а отказ минта уходит в Telegram-алерт.
// Проба стоила 720 запусков и 720 минтов ключа OpenAI в месяц ради нуля пользы.
// Код в max_voice_watchdog.ts оставлен: вернуть = снова экспортировать здесь.
export { maxVoiceWatchdog } from '../functions/src/max_voice_watchdog';
export { maxVoiceUsageRecon } from '../functions/src/max_voice_usage_recon';
export { maxVoiceSafetyReport } from '../functions/src/max_voice_safety';
export { maxVoiceFinalize } from '../functions/src/max_voice_finalize';
export {
  maxVoiceGetMemory,
  maxVoiceUpdateMemory,
  maxVoiceDeleteMemoryItem,
  maxVoiceClearMemory,
} from '../functions/src/max_voice_memory_controls';
