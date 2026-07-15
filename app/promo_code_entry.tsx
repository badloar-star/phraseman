import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { redeemPromoCode, normalizePromoCodeInput, type PromoRedeemStatus } from './promo_code_client';
import { safeRouterBack } from './navigation_back';
import { invalidatePremiumCache } from './premium_guard';
import { emitAppEvent } from './events';
import { consumeVipCelebration } from './vip_celebration_state';
import VipCelebrationModal from '../components/VipCelebrationModal';
import TonalSurface from '../components/TonalSurface';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';

type Feedback = { kind: 'ok' | 'error'; text: string };

function makeL(lang: Lang) {
  return (
    ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
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
        'Ты уже активировал этот код.', 'Ти вже активував цей код.', 'Ya usaste este código.',
        'Você já usou este código.', 'Bạn đã dùng mã này rồi.', 'Kamu sudah memakai kode ini.',
        'Bu kodu zaten kullandın.', 'Ten kod już został użyty.',
      ) };
    case 'expired':
      return { kind: 'error', text: L(
        'Срок действия кода истёк.', 'Термін дії коду минув.', 'El código ha caducado.',
        'O código expirou.', 'Mã đã hết hạn.', 'Kode sudah kedaluwarsa.', 'Kodun süresi doldu.', 'Kod wygasł.',
      ) };
    case 'limit_reached':
      return { kind: 'error', text: L(
        'Лимит активаций этого кода исчерпан.', 'Ліміт активацій цього коду вичерпано.',
        'Se agotaron los usos de este código.', 'Os usos deste código acabaram.',
        'Mã này đã hết lượt sử dụng.', 'Kuota kode ini sudah habis.',
        'Bu kodun kullanım limiti doldu.', 'Limit użyć tego kodu został wyczerpany.',
      ) };
    case 'promo_disabled':
      return { kind: 'error', text: L(
        'Промокоды сейчас временно выключены.',
        'Промокоди зараз тимчасово вимкнені.',
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
        'Ese código no existe o ya no es válido.', 'Esse código não existe ou não é mais válido.',
        'Không tìm thấy mã hoặc mã không còn hiệu lực.', 'Kode tidak ditemukan atau tidak berlaku lagi.',
        'Kod bulunamadı ya da artık geçerli değil.', 'Nie znaleziono kodu lub już nie działa.',
      ) };
    case 'bad_code':
      return { kind: 'error', text: L(
        'Проверь код: похоже, он введён неверно.', 'Перевір код: схоже, він введений неправильно.',
        'Revisa el código: parece incorrecto.', 'Confira o código: parece incorreto.',
        'Hãy kiểm tra mã: có vẻ chưa đúng.', 'Periksa kodenya: sepertinya salah.',
        'Kodu kontrol et: yanlış görünüyor.', 'Sprawdź kod: wygląda na błędny.',
      ) };
    case 'error':
    default:
      return { kind: 'error', text: L(
        'Не получилось активировать код. Проверь интернет и попробуй ещё раз.',
        'Не вдалося активувати код. Перевір інтернет і спробуй ще раз.',
        'No se pudo activar el código. Revisa internet e inténtalo de nuevo.',
        'Não foi possível ativar o código. Confira a internet e tente de novo.',
        'Không kích hoạt được mã. Kiểm tra mạng rồi thử lại.',
        'Kode belum bisa diaktifkan. Periksa internet lalu coba lagi.',
        'Kod etkinleştirilemedi. İnterneti kontrol edip tekrar dene.',
        'Nie udało się aktywować kodu. Sprawdź internet i spróbuj ponownie.',
      ) };
  }
}

async function persistRedeemedPromoAccess(params: {
  code: string;
  rewardKind: 'days' | 'lifetime' | undefined;
  vipUntilMs: number | undefined;
  grantAtMs: number | undefined;
}, accountToken: AccountGenerationToken): Promise<string | null> {
  const grantAt = String(params.grantAtMs && params.grantAtMs > 0 ? params.grantAtMs : Date.now());
  const vipUntil = String(Math.max(0, Math.floor(Number(params.vipUntilMs ?? 0))));
  return withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(accountToken)) return null;
    await AsyncStorage.multiSet([
      ['vip_active', 'true'],
      ['vip_plan', params.rewardKind === 'lifetime' ? 'promo_lifetime' : 'promo'],
      ['vip_from', grantAt],
      ['vip_until', vipUntil],
      ['vip_admin_override', 'true'],
      ['vip_admin_grant_at', grantAt],
      ['promo_vip_last_code', params.code],
    ]).catch(() => {});
    return isCurrentAccountGeneration(accountToken) ? grantAt : null;
  });
}

export default function PromoCodeEntryScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  // Диплинк со страницы «спасибо» после веб-оплаты: phraseman://promo_code_entry?code=WEB-…
  // → код подставляется и активируется сам, без клавиатуры (страница /start/thanks/).
  const { code: deepLinkCode } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationMarker, setCelebrationMarker] = useState<string | null>(null);
  const autoRedeemTriedRef = useRef(false);

  // Кнопка активна только для кода валидного формата (зеркало серверного CODE_RE
  // 3..32 [A-Z0-9_-]) — чтобы не слать заведомо плохой код.
  const normalizedCode = normalizePromoCodeInput(code);
  const inputValid = /^[A-Z0-9_-]{3,32}$/.test(normalizedCode);
  const canSubmit = inputValid && !busy;

  const runRedeem = useCallback(async (rawCode: string) => {
    const accountToken = captureAccountGeneration();
    hapticTap();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await redeemPromoCode(rawCode);
      if (!isCurrentAccountGeneration(accountToken)) return;
      setFeedback(feedbackForStatus(res.status, res.rewardDays, res.rewardKind, L));
      if (res.status === 'redeemed') {
        const marker = await persistRedeemedPromoAccess({
          code: normalizePromoCodeInput(rawCode),
          rewardKind: res.rewardKind,
          vipUntilMs: res.vipUntilMs,
          grantAtMs: res.grantAtMs,
        }, accountToken);
        if (!marker) return;
        await withAccountTransitionLock(async () => {
          if (!isCurrentAccountGeneration(accountToken)) return;
          setCelebrationMarker(marker);
        // VIP обновился на сервере — сбрасываем кэш и оповещаем приложение.
          invalidatePremiumCache();
          if (!isCurrentAccountGeneration(accountToken)) return;
          emitAppEvent('vip_activated');
          if (!isCurrentAccountGeneration(accountToken)) return;
          emitAppEvent('premium_access_changed', { active: true, source: 'vip' });
          if (!isCurrentAccountGeneration(accountToken)) return;
          setCelebrationVisible(true);
        });
      }
    } finally {
      setBusy(false);
    }
  }, [L]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    await runRedeem(code);
  }, [canSubmit, code, runRedeem]);

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
    if (marker) void consumeVipCelebration(marker);
    safeRouterBack(router, '/(tabs)/settings' as any);
  }, [celebrationMarker, router]);

  return (
    <ScreenGradient artBackdrop="friends">
      <SafeAreaView testID="screen-promo-code-entry" style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <TapScale
                accessibilityRole="button"
                accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}
                onPress={() => safeRouterBack(router, '/(tabs)/home' as any)}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: t.bgSurface, borderWidth: 0, borderColor: t.border, marginRight: 12,
                }}
              >
                <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
              </TapScale>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900' }}>
                {L('Промокод', 'Промокод', 'Código promocional', 'Código promocional', 'Mã khuyến mãi', 'Kode promo', 'Promo kod', 'Kod promocyjny')}
              </Text>
            </View>

            <TonalSurface radius={20} style={{ padding: 18, gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
                <Ionicons name="gift-outline" size={24} color={t.accent} />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.h2 ?? 22, lineHeight: 28, fontWeight: '900' }}>
                {L('Есть промокод?', 'Є промокод?', '¿Tienes un código?', 'Tem um código?', 'Có mã khuyến mãi?', 'Punya kode promo?', 'Promo kodun var mı?', 'Masz kod promocyjny?')}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body ?? 16, lineHeight: 23, fontWeight: '700' }}>
                {L(
                  'Введи промокод, чтобы получить Plus-подписку.',
                  'Введи промокод, щоб отримати Plus-підписку.',
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
                placeholder={L('Введите промокод', 'Введіть промокод', 'Introduce el código', 'Digite o código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod')}
                placeholderTextColor={t.textMuted}
                style={{
                  minHeight: 56, borderRadius: 16, paddingHorizontal: 16,
                  backgroundColor: t.bgSurface, color: t.textPrimary,
                  borderWidth: 0, borderColor: t.border,
                  fontSize: f.body ?? 16, fontWeight: '900', letterSpacing: 1,
                }}
              />
              <TouchableOpacity
                testID="promo-code-submit"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit, busy }}
                activeOpacity={0.82}
                disabled={!canSubmit}
                onPress={submit}
                style={{
                  minHeight: 56, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  backgroundColor: (inputValid || busy) ? t.accent : t.bgSurface,
                  opacity: (inputValid || busy) ? 1 : 0.55,
                }}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={t.correctText} />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={20} color={inputValid ? t.correctText : t.textMuted} />
                )}
                <Text style={{ color: inputValid ? t.correctText : t.textMuted, fontSize: f.body ?? 16, fontWeight: '900' }}>
                  {busy
                    ? L('Активируем…', 'Активуємо…', 'Activando…', 'Ativando…', 'Đang kích hoạt…', 'Mengaktifkan…', 'Etkinleştiriliyor…', 'Aktywujemy…')
                    : L('Активировать', 'Активувати', 'Activar', 'Ativar', 'Kích hoạt', 'Aktifkan', 'Etkinleştir', 'Aktywuj')}
                </Text>
              </TouchableOpacity>
              {feedback && (
                <Text
                  testID="promo-code-feedback"
                  style={{ color: feedback.kind === 'ok' ? t.correct : t.wrong, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '800' }}
                >
                  {feedback.text}
                </Text>
              )}
            </TonalSurface>
          </ScrollView>
        </KeyboardAvoidingView>
        <VipCelebrationModal visible={celebrationVisible} onClose={closeCelebration} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
