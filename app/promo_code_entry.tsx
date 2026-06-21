import React, { useCallback, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { redeemPromoCode, type PromoRedeemStatus } from './promo_code_client';
import { safeRouterBack } from './navigation_back';
import { invalidatePremiumCache } from './premium_guard';
import { emitAppEvent } from './events';

type Feedback = { kind: 'ok' | 'error'; text: string };

function makeL(lang: Lang) {
  return (
    ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

function feedbackForStatus(
  status: PromoRedeemStatus,
  rewardDays: number | undefined,
  L: ReturnType<typeof makeL>,
): Feedback {
  switch (status) {
    case 'redeemed': {
      const d = rewardDays ?? 0;
      return {
        kind: 'ok',
        text: L(
          `Готово! Тебе начислено ${d} дней полного доступа. Приятного обучения!`,
          `Готово! Тобі нараховано ${d} днів повного доступу. Гарного навчання!`,
          `¡Listo! Te dimos ${d} días de acceso completo. ¡A aprender!`,
          `Pronto! Você ganhou ${d} dias de acesso completo. Bons estudos!`,
          `Xong! Bạn nhận được ${d} ngày truy cập đầy đủ. Chúc học vui!`,
          `Selesai! Kamu dapat ${d} hari akses penuh. Selamat belajar!`,
          `Tamam! Sana ${d} gün tam erişim verildi. İyi öğrenmeler!`,
          `Gotowe! Masz ${d} dni pełnego dostępu. Miłej nauki!`,
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

export default function PromoCodeEntryScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const canSubmit = code.trim().length >= 3 && !busy;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    hapticTap();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await redeemPromoCode(code);
      setFeedback(feedbackForStatus(res.status, res.rewardDays, L));
      if (res.status === 'redeemed') {
        // Премиум обновился на сервере — сбрасываем кэш и оповещаем приложение.
        invalidatePremiumCache();
        emitAppEvent('premium_activated');
      }
    } finally {
      setBusy(false);
    }
  }, [L, canSubmit, code]);

  return (
    <ScreenGradient artBackdrop="friends">
      <SafeAreaView testID="screen-promo-code-entry" style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                  backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border, marginRight: 12,
                }}
              >
                <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
              </TapScale>
              <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900' }}>
                {L('Промокод', 'Промокод', 'Código promocional', 'Código promocional', 'Mã khuyến mãi', 'Kode promo', 'Promo kod', 'Kod promocyjny')}
              </Text>
            </View>

            <View style={{ borderRadius: 20, padding: 18, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
                <Ionicons name="gift-outline" size={24} color={t.accent} />
              </View>
              <Text style={{ color: t.textPrimary, fontSize: f.h2 ?? 22, lineHeight: 28, fontWeight: '900' }}>
                {L('Есть промокод?', 'Є промокод?', '¿Tienes un código?', 'Tem um código?', 'Có mã khuyến mãi?', 'Punya kode promo?', 'Promo kodun var mı?', 'Masz kod promocyjny?')}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body ?? 16, lineHeight: 23, fontWeight: '700' }}>
                {L(
                  'Введи промокод и получи дни полного доступа к Phraseman.',
                  'Введи промокод і отримай дні повного доступу до Phraseman.',
                  'Introduce un código y consigue días de acceso completo a Phraseman.',
                  'Digite um código e ganhe dias de acesso completo ao Phraseman.',
                  'Nhập mã và nhận những ngày truy cập đầy đủ vào Phraseman.',
                  'Masukkan kode dan dapatkan hari akses penuh ke Phraseman.',
                  'Kodu gir ve Phraseman’a tam erişim günleri kazan.',
                  'Wpisz kod i zdobądź dni pełnego dostępu do Phraseman.',
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
                  borderWidth: 1, borderColor: t.border,
                  fontSize: f.body ?? 16, fontWeight: '900', letterSpacing: 1,
                }}
              />
              <TouchableOpacity
                testID="promo-code-submit"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={!canSubmit}
                onPress={submit}
                style={{
                  minHeight: 56, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  backgroundColor: canSubmit ? t.accent : t.bgSurface,
                  opacity: canSubmit ? 1 : 0.55,
                }}
              >
                {busy ? <ActivityIndicator color={t.correctText} /> : <Ionicons name="checkmark-circle-outline" size={20} color={canSubmit ? t.correctText : t.textMuted} />}
                <Text style={{ color: canSubmit ? t.correctText : t.textMuted, fontSize: f.body ?? 16, fontWeight: '900' }}>
                  {L('Активировать', 'Активувати', 'Activar', 'Ativar', 'Kích hoạt', 'Aktifkan', 'Etkinleştir', 'Aktywuj')}
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
