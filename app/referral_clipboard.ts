/**
 * iOS-фолбэк атрибуции реферала через буфер обмена.
 *
 * App Store не передаёт параметры установки (нет аналога Play Install Referrer),
 * поэтому инвайт-страница (knowly-www/phraseman/invite) при переходе в App Store
 * копирует инвайт-ссылку в буфер. Здесь при запуске читаем буфер ОДИН раз,
 * вытаскиваем ref-код и применяем его обычным pending-флоу.
 *
 * Бережём системный промпт iOS «Разрешить вставку?»:
 *  - только iOS и только при включённом referral_enabled;
 *  - hasStringAsync (без промпта) — если буфер пуст, попытку не сжигаем;
 *  - фактическое чтение (промпт) максимум один раз за установку (флаг в AsyncStorage);
 *  - если код уже применён/ожидает — буфер не читаем вовсе.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { logEvent } from './firebase';
import { captureReferralCodeIfNew, tryApplyPendingReferral } from './referral_bootstrap';
import { isReferralCloudEnabled } from './referral_flags';

const CLIPBOARD_CHECKED_KEY = 'referral_clipboard_checked_v1';
const CLIPBOARD_ATTEMPTS_KEY = 'referral_clipboard_attempts_v1';
const PENDING_REF_KEY = 'pending_referral_code';
const MAX_CLIPBOARD_TEXT_LEN = 2048;
/**
 * Сколько РЕАЛЬНЫХ чтений буфера (с iOS-промптом) допускаем за установку, прежде чем
 * окончательно сдаться. Раньше была ровно 1 попытка, и если на первом старте в буфере
 * лежал чужой текст (не инвайт) — флаг «проверено» ставился навсегда и настоящую ссылку,
 * скопированную позже, мы уже не ловили. Несколько попыток на разных стартах резко
 * поднимают долю пойманных iOS-рефералов, оставаясь бережными к промпту вставки.
 */
const MAX_CLIPBOARD_ATTEMPTS = 3;

async function readAttempts(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(CLIPBOARD_ATTEMPTS_KEY);
    const n = Math.floor(Number(raw ?? 0));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Чистая функция: достаёт ref-код из текста буфера. Принимаем ТОЛЬКО ссылку
 * с параметром ref (https-инвайт или phraseman://) — голый 6-символьный текст
 * не матчим, чтобы не ловить ложные срабатывания на чужом содержимом буфера.
 */
export function extractRefFromClipboardText(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  if (text.length > MAX_CLIPBOARD_TEXT_LEN) return null;
  if (!/invite|phraseman/i.test(text)) return null;
  const m = text.match(/[?&]ref=([A-Za-z0-9]{4,12})(?![A-Za-z0-9])/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Однократная проверка буфера на iOS. Безопасно звать при каждом старте:
 * после первого фактического чтения буфера ставится флаг и выходим сразу.
 */
export async function checkClipboardForReferralOnce(): Promise<void> {
  try {
    if (Platform.OS !== 'ios') return;
    if (!isReferralCloudEnabled()) return; // RC мог не подтянуться — попробуем в следующий старт
    // CHECKED_KEY ставится ТОЛЬКО при успехе (нашли код) или исчерпании попыток — навсегда.
    if (await AsyncStorage.getItem(CLIPBOARD_CHECKED_KEY)) return;
    // Код уже ждёт применения (deeplink успел) — буфер не нужен, промпт не показываем.
    if (await AsyncStorage.getItem(PENDING_REF_KEY)) {
      await AsyncStorage.setItem(CLIPBOARD_CHECKED_KEY, '1');
      return;
    }
    // Без промпта: пустой буфер НЕ тратит попытку — просто выходим до следующего старта.
    const hasText = await Clipboard.hasStringAsync();
    if (!hasText) return;

    // Есть какой-то текст → тратим одну попытку чтения (именно тут iOS покажет промпт).
    const attempts = (await readAttempts()) + 1;
    await AsyncStorage.setItem(CLIPBOARD_ATTEMPTS_KEY, String(attempts));

    const text = await Clipboard.getStringAsync(); // ← здесь iOS покажет промпт
    const code = extractRefFromClipboardText(text);

    if (code) {
      // Успех: код найден — больше не читаем буфер никогда.
      await AsyncStorage.setItem(CLIPBOARD_CHECKED_KEY, '1');
      logEvent('referral_clipboard_found', { ref_len: code.length, attempt: attempts });
      await captureReferralCodeIfNew(code, 'clipboard');
      await tryApplyPendingReferral().catch(() => {});
      return;
    }

    // Кода нет (чужой текст). Сдаёмся НАВСЕГДА только когда исчерпали попытки — иначе
    // даём шанс поймать настоящую ссылку, скопированную позже, на следующих стартах.
    if (attempts >= MAX_CLIPBOARD_ATTEMPTS) {
      await AsyncStorage.setItem(CLIPBOARD_CHECKED_KEY, '1');
      logEvent('referral_clipboard_exhausted', { attempts });
    }
  } catch {
    /* буфер недоступен/пользователь запретил вставку — молча пропускаем */
  }
}

/* expo-router route shim: utility module under app/ */
export default function __RouteShim() { return null; }
