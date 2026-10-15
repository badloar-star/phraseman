import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDevPromoResult } from './dev_social_state';
import { setDevVipOverride } from './dev_vip_override';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import KitTouchable from '../components/KitTouchable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { redeemPromoCode, normalizePromoCodeInput, type PromoRedeemStatus } from './promo_code_client';
import { safeRouterBack } from './navigation_back';
import { forcePremiumAccessCloudRestore, getVerifiedVipStatus, invalidatePremiumCache } from './premium_guard';
import { emitAppEvent } from './events';
import { consumeVipCelebration } from './vip_celebration_state';
import VipCelebrationModal from '../components/VipCelebrationModal';
import type { PromoReward } from '../components/premium_celebration/celebrationLiquidCopy';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette'; // зачем: экран промокода на токенах стекла (макет overlays-campaigns OS-ONB-PROMO-*)
import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { writeVipSnapshotForAccount } from './premium_vip_storage';
import { ensureAnonUser } from './cloud_sync';
import { hasEnteredCode, isPromoCodeFormatValid } from './code_entry_format';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type Feedback = { kind: 'ok' | 'error'; text: string };

function makeL(lang: Lang) {
  return (
    ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

function feedbackForStatus(
  status: PromoRedeemStatus,
  rewardDays: number | undefined,
  rewardKind: 'days' | 'lifetime' | undefined,
  L: ReturnType<typeof makeL>,
): Feedback {
  switch (status) {
    case 'redeemed': {
      if (rewardKind === 'lifetime') {
        return {
          kind: 'ok',
          text: L(
            'Готово! Plus-подписка активирована навсегда. Приятного обучения!',
            'Готово! Plus-підписку активовано назавжди. Гарного навчання!',
            'Done! Your Plus subscription is active forever. Happy learning!',
            '¡Listo! La suscripción Plus está activada para siempre. ¡A aprender!',
            'Pronto! A assinatura Plus foi ativada para sempre. Bons estudos!',
            'Xong! Gói Plus đã được kích hoạt vĩnh viễn. Chúc học vui!',
            'Selesai! Langganan Plus aktif selamanya. Selamat belajar!',
            'Tamam! Plus aboneliği kalıcı olarak etkinleştirildi. İyi öğrenmeler!',
            'Gotowe! Subskrypcja Plus została aktywowana na zawsze. Miłej nauki!',
          ),
        };
      }
      const d = rewardDays ?? 0;
      return {
        kind: 'ok',
        text: L(
          `Готово! Plus-подписка активирована на ${d} дн. Приятного обучения!`,
          `Готово! Plus-підписку активовано на ${d} дн. Гарного навчання!`,
          `Done! Your Plus subscription is active for ${d} days. Happy learning!`,
          `¡Listo! La suscripción Plus se activó por ${d} días. ¡A aprender!`,
          `Pronto! A assinatura Plus foi ativada por ${d} dias. Bons estudos!`,
          `Xong! Gói Plus đã được kích hoạt trong ${d} ngày. Chúc học vui!`,
          `Selesai! Langganan Plus aktif selama ${d} hari. Selamat belajar!`,
          `Tamam! Plus aboneliği ${d} günlüğüne etkinleştirildi. İyi öğrenmeler!`,
          `Gotowe! Subskrypcja Plus została aktywowana na ${d} dni. Miłej nauki!`,
        ),
      };
    }
    case 'already_redeemed':
      return { kind: 'error', text: L(
        'Ты уже активировал этот код.', 'Ти вже активував цей код.', 'You already used this code.', 'Ya usaste este código.',
        'Você já usou este código.', 'Bạn đã dùng mã này rồi.', 'Kamu sudah memakai kode ini.',
        'Bu kodu zaten kullandın.', 'Ten kod już został użyty.',
      ) };
    case 'expired':
      return { kind: 'error', text: L(
        'Срок действия кода истёк.', 'Термін дії коду минув.', 'The code has expired.', 'El código ha caducado.',
        'O código expirou.', 'Mã đã hết hạn.', 'Kode sudah kedaluwarsa.', 'Kodun süresi doldu.', 'Kod wygasł.',
      ) };
    case 'limit_reached':
      return { kind: 'error', text: L(
        'Лимит активаций этого кода исчерпан.', 'Ліміт активацій цього коду вичерпано.',
        'This code has reached its activation limit.',
        'Se agotaron los usos de este código.', 'Os usos deste código acabaram.',
        'Mã này đã hết lượt sử dụng.', 'Kuota kode ini sudah habis.',
        'Bu kodun kullanım limiti doldu.', 'Limit użyć tego kodu został wyczerpany.',
      ) };
    case 'promo_disabled':
      return { kind: 'error', text: L(
        'Промокоды сейчас временно выключены.',
        'Промокоди зараз тимчасово вимкнені.',
        'Promo codes are temporarily disabled right now.',
        'Los códigos promocionales están desactivados temporalmente.',
        'Os códigos promocionais estão temporariamente desativados.',
        'Mã khuyến mãi hiện đang tạm tắt.',
        'Kode promo sedang dinonaktifkan sementara.',
        'Promosyon kodları şu anda geçici olarak kapalı.',
        'Kody promocyjne są teraz tymczasowo wyłączone.',
      ) };
    case 'disabled':
    case 'not_found':
    case 'bad_reward':
      return { kind: 'error', text: L(
        'Такой код не найден или больше не действует.', 'Такий код не знайдено або він не діє.',
        'This code wasn\'t found or is no longer valid.',
        'Ese código no existe o ya no es válido.', 'Esse código não existe ou não é mais válido.',
        'Không tìm thấy mã hoặc mã không còn hiệu lực.', 'Kode tidak ditemukan atau tidak berlaku lagi.',
        'Kod bulunamadı ya da artık geçerli değil.', 'Nie znaleziono kodu lub już nie działa.',
      ) };
    case 'bad_code':
      return { kind: 'error', text: L(
        'Проверь код: похоже, он введён неверно.', 'Перевір код: схоже, він введений неправильно.',
        'Check the code: it looks incorrect.',
        'Revisa el código: parece incorrecto.', 'Confira o código: parece incorreto.',
        'Hãy kiểm tra mã: có vẻ chưa đúng.', 'Periksa kodenya: sepertinya salah.',
        'Kodu kontrol et: yanlış görünüyor.', 'Sprawdź kod: wygląda na błędny.',
      ) };
    case 'rate_limited':
      // зачем (PM-252 п.2): после 5 попыток за 10 минут сервер ставит паузу — тон D158, без тревоги.
      return { kind: 'error', text: L(
        'Слишком много попыток подряд. Попробуй снова через 10 минут.',
        'Забагато спроб поспіль. Спробуй знову за 10 хвилин.',
        'Too many tries in a row. Try again in 10 minutes.',
        'Demasiados intentos seguidos. Vuelve a intentarlo en 10 minutos.',
        'Muitas tentativas seguidas. Tente de novo em 10 minutos.',
        'Bạn đã thử quá nhiều lần liên tiếp. Hãy thử lại sau 10 phút.',
        'Terlalu banyak percobaan berturut-turut. Coba lagi 10 menit lagi.',
        'Arka arkaya çok fazla deneme yaptın. 10 dakika sonra tekrar dene.',
        'Za dużo prób pod rząd. Spróbuj ponownie za 10 minut.',
      ) };
    case 'error':
    default:
      return { kind: 'error', text: L(
        'Сейчас не получилось активировать код. Попробуй ещё раз.',
        'Зараз не вдалося активувати код. Спробуй ще раз.',
        "Couldn't activate the code right now. Try again.",
        'Ahora no se pudo activar el código. Inténtalo de nuevo.',
        'Não deu para ativar o código agora. Tente de novo.',
        'Lúc này chưa kích hoạt được mã. Hãy thử lại.',
        'Kode belum bisa diaktifkan sekarang. Coba lagi.',
        'Kod şu an etkinleştirilemedi. Tekrar dene.',
        'Teraz nie udało się aktywować kodu. Spróbuj ponownie.',
      ) };
  }
}

async function persistRedeemedPromoAccess(params: {
  code: string;
  rewardKind: 'days' | 'lifetime' | undefined;
  vipUntilMs: number | undefined;
  grantAtMs: number | undefined;
  generation: AccountGenerationToken;
}): Promise<string> {
  const stableId = params.generation.stableId;
  if (!stableId || !isCurrentAccountGeneration(params.generation, stableId)) {
    throw new Error('stale_account_generation');
  }
  const grantAt = String(params.grantAtMs && params.grantAtMs > 0 ? params.grantAtMs : Date.now());
  const vipUntil = String(Math.max(0, Math.floor(Number(params.vipUntilMs ?? 0))));
  // зачем (координатор 12.10, R1 «нет пути»): ответ подменён dev-фикстурой `promo=ok|lifetime` — VIP только в памяти, в хранилище и облако ничего не пишем; в стор-сборке getDevPromoResult() = null.
  if (getDevPromoResult() !== null) {
    setDevVipOverride(stableId, {
      vip_active: 'true', vip_plan: params.rewardKind === 'lifetime' ? 'promo_lifetime' : 'promo', vip_from: grantAt, vip_until: vipUntil, vip_admin_override: 'true', vip_admin_grant_at: grantAt,
    }, 'promo_vip');
    return grantAt;
  }
  await writeVipSnapshotForAccount(stableId, {
    vip_active: 'true',
    vip_plan: params.rewardKind === 'lifetime' ? 'promo_lifetime' : 'promo',
    vip_from: grantAt,
    vip_until: vipUntil,
    vip_admin_override: 'true',
    vip_admin_grant_at: grantAt,
  });
  if (!isCurrentAccountGeneration(params.generation, stableId)) throw new Error('stale_account_generation');
  await AsyncStorage.setItem('promo_vip_last_code', params.code).catch(noteSwallowedHandler('promo_code_entry:persistRedeemedPromoAccess.setItem'));
  return grantAt;
}

// зачем: пейвол онбординга (меню «···») активирует промокод без навигации на этот
// экран — онбординг рисуется оверлеем ПОВЕРХ стека, и router.push открыл бы экран
// под ним. Поэтому весь боевой redeem-путь (анонимный вход → generation-гейт →
// сервер → запись VIP-снапшота → события) доступен одной функцией.
export async function redeemPromoCodeWithPersist(rawCode: string): Promise<{
  status: PromoRedeemStatus;
  rewardDays?: number;
  rewardKind?: 'days' | 'lifetime';
}> {
  const stableId = await ensureAnonUser();
  const generation = captureAccountGeneration();
  if (!stableId || !isCurrentAccountGeneration(generation, stableId)) return { status: 'error' };
  const res = await redeemPromoCode(rawCode);
  if (!isCurrentAccountGeneration(generation, stableId)) return { status: 'error' };
  if (res.status === 'redeemed') {
    await persistRedeemedPromoAccess({
      code: normalizePromoCodeInput(rawCode),
      rewardKind: res.rewardKind,
      vipUntilMs: res.vipUntilMs,
      grantAtMs: res.grantAtMs,
      generation,
    });
    invalidatePremiumCache();
    emitAppEvent('vip_activated');
    emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
  }
  return { status: res.status, rewardDays: res.rewardDays, rewardKind: res.rewardKind };
}

/**
 * R61c: перечитать доступ из облака мимо TTL, затем ПРОВЕРИТЬ доступ — и только при подтверждении сообщить о VIP.
 * зачем (ревью Opus R61c): событие покупки в сторе (premium_activated) вслепую ставило Plus и isPremium в публичной
 * визитке даже при истёкшем VIP. Подтверждённый VIP → vip_activated; «нет» → ничего не выдаём. Не бросает.
 */
async function restorePromoAccessFromCloud(reason: 'local_write_failed' | 'already_redeemed'): Promise<void> {
  try {
    const confirmed = await forcePremiumAccessCloudRestore(`promo_${reason}`);
    invalidatePremiumCache();
    // Именно VIP и мимо кэша (ревью Opus): «да» от другого вида доступа не должно дать VIP в публичной визитке,
    // а поздний reload от vip_activated не должен подсунуть закэшированное «нет».
    const ok = await getVerifiedVipStatus({ bypassCache: true });
    console.log('[PROMO] cloud_restore', JSON.stringify({ reason, confirmed, ok })); // guard-ok: итог
    if (ok) emitAppEvent('vip_activated');
  } catch (error) {
    console.warn('[PROMO] cloud_restore failed', JSON.stringify({ reason, error: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
}

export default function PromoCodeEntryScreen() {
  const router = useRouter();
  const { f, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  // Диплинк со страницы «спасибо» после веб-оплаты: phraseman://promo_code_entry?code=WEB-…
  // → код подставляется и активируется сам, без клавиатуры (страница /start/thanks/).
  const { code: deepLinkCode, source } = useLocalSearchParams<{ code?: string; source?: string }>();
  const closeFallback = source === 'settings' ? '/(tabs)/settings' : '/(tabs)/home';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationMarker, setCelebrationMarker] = useState<string | null>(null);
  // зачем: празднование v6 показывает САМ код штампом перед разломом — человек
  // видит, что сработал именно тот код, который он ввёл.
  const [celebrationCode, setCelebrationCode] = useState<string | null>(null);
  // зачем (владелец ~11:20 15.10): экран «Промокод применён» называет срок — «Plus на N дней» / «Plus навсегда» — по данным ответа сервера
  const [celebrationReward, setCelebrationReward] = useState<PromoReward | null>(null);
  const autoRedeemTriedRef = useRef(false);

  // Кнопка активна только для кода валидного формата (зеркало серверного CODE_RE
  // 3..32 [A-Z0-9_-]) — чтобы не слать заведомо плохой код.
  const normalizedCode = normalizePromoCodeInput(code);
  // зачем (решение владельца п.81(13), overlays-campaigns-013): кнопка активна при любом непустом коде — неверный формат объясняется по нажатию,
  // а не молча выключенной кнопкой. Формат проверяется в submit ДО загрузки и сети.
  const canSubmit = hasEnteredCode(normalizedCode) && !busy;
  // Рамка поля — признак верного формата (как раньше); вид кнопки следует за её активностью: введён код — кнопка выглядит активной.
  const inputValid = isPromoCodeFormatValid(normalizedCode);
  const submitLooksReady = hasEnteredCode(normalizedCode);

  // зачем (координатор 10.10, Optimistic UI): замок от двойного тапа ставится синхронно — state busy обновляется после рендера,
  // второй тап в том же кадре успел бы отправить код дважды; снимается в finally.
  const redeemInFlightRef = useRef(false);
  const runRedeem = useCallback(async (rawCode: string) => {
    if (redeemInFlightRef.current) {
      console.warn('[PROMO] redeem: уже в пути — повторный тап пропущен');
      return;
    }
    redeemInFlightRef.current = true;
    hapticTap();
    setBusy(true);
    setFeedback(null);
    try {
      const stableId = await ensureAnonUser();
      const generation = captureAccountGeneration();
      if (!stableId || !isCurrentAccountGeneration(generation, stableId)) {
        // зачем: раньше выход без единого слова — кнопка отпускалась, а человек не понимал, что произошло
        console.warn('[PROMO] redeem: нет анонимного входа или сменился аккаунт — показываем «не получилось»', { hasStableId: Boolean(stableId) });
        setFeedback(feedbackForStatus('error', undefined, undefined, L));
        return;
      }
      const res = await redeemPromoCode(rawCode);
      if (!isCurrentAccountGeneration(generation, stableId)) {
        console.warn('[PROMO] redeem: аккаунт сменился во время запроса — результат отброшен');
        return;
      }
      if (res.status !== 'redeemed') {
        setFeedback(feedbackForStatus(res.status, res.rewardDays, res.rewardKind, L));
      }
      if (res.status === 'already_redeemed') {
        // зачем (R61c, Ревизор 61374cf4e): ответ первого погашения мог потеряться — VIP на сервере есть, локальной записи нет.
        // Перечитываем облако мимо TTL; VIP показываем только если проверка доступа подтвердит (срок мог истечь).
        void restorePromoAccessFromCloud('already_redeemed');
      }
      if (res.status === 'redeemed') {
        // зачем (R56, аудит кнопок 15.10): «успех» показывался ДО локальной записи VIP — при сбое записи человек видел
        // ошибку, хотя сервер доступ уже выдал. Сначала запись (один повтор), при провале — синхронизация с сервером
        // (кэш доступа сбрасывается ниже, PremiumContext перечитает), и только потом «Готово».
        const persistInput = {
          code: normalizePromoCodeInput(rawCode),
          rewardKind: res.rewardKind,
          vipUntilMs: res.vipUntilMs,
          grantAtMs: res.grantAtMs,
          generation,
        };
        let marker: Awaited<ReturnType<typeof persistRedeemedPromoAccess>> | null = null;
        for (let attempt = 1; attempt <= 2 && marker === null; attempt += 1) {
          try {
            marker = await persistRedeemedPromoAccess(persistInput);
          } catch (persistError: unknown) {
            console.warn(`[PROMO] redeem: локальная запись VIP не удалась attempt=${attempt}`, persistError instanceof Error ? persistError.message : String(persistError)); // guard-ok: причина в журнал
          }
        }
        if (!generation.stableId || !isCurrentAccountGeneration(generation, generation.stableId)) return;
        if (marker === null) console.warn('[PROMO] redeem: VIP выдан сервером, локальная запись не удалась — доступ подтянется синхронизацией'); // guard-ok: ветка
        setFeedback(feedbackForStatus(res.status, res.rewardDays, res.rewardKind, L));
        setCelebrationMarker(marker);
        setCelebrationCode(normalizePromoCodeInput(rawCode));
        setCelebrationReward(res.rewardKind === 'lifetime' ? { kind: 'lifetime' } : res.rewardKind === 'days' || typeof res.rewardDays === 'number' ? { kind: 'days', days: res.rewardDays } : null);
        // VIP обновился на сервере — сбрасываем кэш и оповещаем приложение.
        invalidatePremiumCache();
        emitAppEvent('vip_activated');
        emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
        // R61c: локальная запись VIP не удалась — без этого полная проверка могла закэшировать «нет» на 30 мин.
        if (marker === null) void restorePromoAccessFromCloud('local_write_failed');
        setCelebrationVisible(true);
      }
    } catch (error: unknown) {
      // зачем: исключение сети/хранилища оставляло экран без ответа (async-обработчик onPress никто не ловит)
      console.warn('[PROMO] redeem: исключение', error instanceof Error ? error.message : String(error));
      setFeedback(feedbackForStatus('error', undefined, undefined, L));
    } finally {
      redeemInFlightRef.current = false;
      setBusy(false);
    }
  }, [L]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    if (!isPromoCodeFormatValid(code)) {
      console.log(`[PROMO] redeem: неверный формат (длина ${normalizePromoCodeInput(code).length}) — сразу «Проверь код», сеть не вызывается`); // guard-ok: ранний выход логируется
      setFeedback(feedbackForStatus('bad_code', undefined, undefined, L));
      return;
    }
    await runRedeem(code);
  }, [L, canSubmit, code, runRedeem]);

  useEffect(() => {
    if (autoRedeemTriedRef.current) return;
    const fromLink = normalizePromoCodeInput(String(deepLinkCode ?? ''));
    if (!/^[A-Z0-9_-]{3,32}$/.test(fromLink)) return;
    autoRedeemTriedRef.current = true; // одна автопопытка: ошибку юзер видит и решает сам
    setCode(fromLink);
    void runRedeem(fromLink);
  }, [deepLinkCode, runRedeem]);

  const closeCelebration = useCallback(() => {
    const marker = celebrationMarker;
    setCelebrationVisible(false);
    setCelebrationMarker(null);
    setCelebrationCode(null);
    setCelebrationReward(null);
    if (marker) void consumeVipCelebration(marker);
    safeRouterBack(router, '/(tabs)/settings' as any);
  }, [celebrationMarker, router]);

  return (
    <ScreenGradient artBackdrop="friends">
      <SafeAreaView testID="screen-promo-code-entry" style={{ flex: 1 }}>
        {/* зачем: стандарт «шторки раздела» — модал с выездом снизу; шапка
            фиксированная над скроллом, закрытие крестиком вниз, не «назад». */}
        <SectionSheetHeader
          title={L('Промокод', 'Промокод', 'Promo code', 'Código promocional', 'Código promocional', 'Mã khuyến mãi', 'Kode promo', 'Promo kod', 'Kod promocyjny')}
          onClose={() => safeRouterBack(router, closeFallback as any)}
          closeVariant="flat" // зачем (координатор 12.10, overlays-campaigns-004): в образце promo-code-states крестик справа без плашки
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34 }}
          >

            {/* зачем (стиль «Тень», владелец 12.10): карточка — плашка с тенью без кромки; overflow: hidden убран, он резал бы тень */}
            <View style={{ padding: 20, gap: 16, borderRadius: 24, boxShadow: plateBoxShadow(g) }}>
              <PlateFill g={g} radius={24} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }}>
                  <Ionicons name="gift-outline" size={22} color={g.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: g.text, fontSize: f.h3 ?? 20, lineHeight: 26, fontWeight: '800' }}>
                {L('Есть промокод?', 'Є промокод?', 'Have a promo code?', '¿Tienes un código?', 'Tem um código?', 'Có mã khuyến mãi?', 'Punya kode promo?', 'Promo kodun var mı?', 'Masz kod promocyjny?')}
                  </Text>
                </View>
              </View>
              <Text style={{ color: g.secondary, fontSize: f.body ?? 16, lineHeight: 23, fontWeight: '600' }}>
                {L(
                  'Введи промокод, чтобы получить Plus-подписку.',
                  'Введи промокод, щоб отримати Plus-підписку.',
                  'Enter a code to get the Plus subscription.',
                  'Introduce un código para obtener la suscripción Plus.',
                  'Digite um código para receber a assinatura Plus.',
                  'Nhập mã để nhận gói Plus.',
                  'Masukkan kode untuk mendapatkan langganan Plus.',
                  'Plus aboneliği almak için kodu gir.',
                  'Wpisz kod, aby otrzymać subskrypcję Plus.',
                )}
              </Text>
              <TextInput
                testID="promo-code-input"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => { if (canSubmit) void submit(); }}
                placeholder={L('Введи промокод', 'Введи промокод', 'Enter the promo code', 'Introduce el código', 'Digite o código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod')}
                placeholderTextColor={g.mutedText}
                style={{
                  minHeight: 56, borderRadius: 16, paddingHorizontal: 16,
                  backgroundColor: g.opaqueControl, color: g.text,
                  // зачем (стиль «Тень»): нейтральная кромка снята, остаётся только индикатор «код подходит» (кольцо lightTint); 1 px сохранён прозрачным, чтобы поле не прыгало
                  boxShadow: nestedBoxShadow(g) as unknown as string /* зачем: типы RN для стиля TextInput знают boxShadow только строкой, на деле массив работает */,
                  borderWidth: 1, borderColor: inputValid ? g.lightTint : 'transparent', // shadow-ok: индикатор валидности введённого кода, не рамка контейнера
                  fontSize: f.body ?? 16, fontWeight: '900', letterSpacing: 1,
                }}
              />
              <KitTouchable
                testID="promo-code-submit"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit, busy }}
                activeOpacity={0.82}
                disabled={!canSubmit}
                onPress={submit}
                style={{
                  minHeight: 56, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  backgroundColor: (submitLooksReady || busy) ? g.cta : g.selected,
                  boxShadow: nestedBoxShadow(g),
                  opacity: (submitLooksReady || busy) ? 1 : 0.55,
                }}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={g.ctaInk} />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={20} color={submitLooksReady ? g.ctaInk : g.mutedText} />
                )}
                <Text style={{ color: submitLooksReady ? g.ctaInk : g.mutedText, fontSize: f.body ?? 16, fontWeight: '800' }}>
                  {busy
                    ? L('Активируем…', 'Активуємо…', 'Activating…', 'Activando…', 'Ativando…', 'Đang kích hoạt…', 'Mengaktifkan…', 'Etkinleştiriliyor…', 'Aktywujemy…')
                    : L('Активировать', 'Активувати', 'Activate', 'Activar', 'Ativar', 'Kích hoạt', 'Aktifkan', 'Etkinleştir', 'Aktywuj')}
                </Text>
              </KitTouchable>
              {feedback && (
                // зачем: макет OS-ONB-PROMO-*: итог проверки — стеклянная плашка со значком, не цветной текст.
                <View
                  testID="promo-code-feedback"
                  accessibilityRole="alert"
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14, backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }}
                >
                  <Ionicons name={feedback.kind === 'ok' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={20} color={g.text} />
                  <Text style={{ flex: 1, color: g.text, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '700' }}>
                    {feedback.text}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <VipCelebrationModal visible={celebrationVisible} onClose={closeCelebration} promoCode={celebrationCode} promoReward={celebrationReward} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
