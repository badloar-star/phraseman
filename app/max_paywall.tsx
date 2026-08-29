import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MaxHomeOrb from '../components/home/MaxHomeOrb';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import VoiceMinutePackSheet from '../modules/voice_minutes/VoiceMinutePackSheet';
import { readVoiceMinuteWalletStatus, type VoiceMinuteWalletStatus } from '../modules/voice_minutes/wallet';
import { maxPaywallAnalyticsSource } from '../modules/max_subscription/paywall_state';
import { trackEvent } from './analytics';
import { getMaxHomeOrbLayers } from './max_home_orb_assets';
import { safeRouterBack } from './navigation_back';

const FEATURES = ['mic', 'create', 'compass'] as const;

const balanceMinutes = (wallet: VoiceMinuteWalletStatus | null): string => {
  if (!wallet) return '—';
  const minutes = wallet.availableSeconds / 60;
  return minutes.toLocaleString(undefined, { maximumFractionDigits: wallet.availableSeconds % 60 ? 1 : 0 });
};

export default function MaxPaywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string | string[] }>();
  const analyticsSource = maxPaywallAnalyticsSource(params.source);
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [wallet, setWallet] = useState<VoiceMinuteWalletStatus | null>(null);

  useEffect(() => {
    void trackEvent('paywall_shown', { context: 'voice_minutes', source: analyticsSource, paywall: 'max_minutes' });
  }, [analyticsSource]);

  useEffect(() => {
    let current = true;
    void readVoiceMinuteWalletStatus().then((next) => { if (current) setWallet(next); }).catch(() => {});
    return () => { current = false; };
  }, []);

  const openSheet = useCallback(() => {
    void trackEvent('paywall_cta_click', { context: 'voice_minutes', source: analyticsSource, action: 'open_packs' });
    setSheetVisible(true);
  }, [analyticsSource]);

  const onCredited = useCallback((next: VoiceMinuteWalletStatus) => {
    setWallet(next);
    setSheetVisible(false);
  }, []);

  const featureCopy = [
    triLang(lang, {
      ru: 'Живой голосовой диалог', en: 'Live voice conversation', uk: 'Живий голосовий діалог', es: 'Conversación de voz en vivo',
      'pt-BR': 'Conversa por voz ao vivo', vi: 'Hội thoại giọng nói trực tiếp', id: 'Percakapan suara langsung', tr: 'Canlı sesli diyalog', pl: 'Rozmowa głosowa na żywo',
    }),
    triLang(lang, {
      ru: 'Разбор ошибок после звонка', en: 'Error review after the call', uk: 'Розбір помилок після дзвінка', es: 'Análisis de errores después de la llamada',
      'pt-BR': 'Revisão de erros após a ligação', vi: 'Xem lại lỗi sau cuộc gọi', id: 'Ulasan kesalahan setelah panggilan', tr: 'Arama sonrası hata analizi', pl: 'Analiza błędów po rozmowie',
    }),
    triLang(lang, {
      ru: 'Помнит твой прогресс', en: 'Remembers your progress', uk: 'Пам’ятає твій прогрес', es: 'Recuerda tu progreso',
      'pt-BR': 'Lembra do seu progresso', vi: 'Ghi nhớ tiến trình của bạn', id: 'Mengingat progresmu', tr: 'İlerlemeni hatırlar', pl: 'Pamięta twoje postępy',
    }),
  ];

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
            onPress={() => safeRouterBack(router)}
            hitSlop={12}
            style={[styles.close, { backgroundColor: t.bgCard }]}
          >
            <Ionicons name="close" size={24} color={t.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.orb} pointerEvents="none">
            <MaxHomeOrb layers={getMaxHomeOrbLayers(themeMode)} size={116} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>MAX</Text>
          <Text style={[styles.subtitle, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'ИИ-учитель для разговорной практики', en: 'Your AI teacher for speaking practice', uk: 'ШІ-вчитель для розмовної практики', es: 'Tu profesor de IA para practicar conversación',
              'pt-BR': 'Seu professor de IA para praticar conversação', vi: 'Giáo viên AI để luyện nói', id: 'Guru AI untuk latihan berbicara', tr: 'Konuşma pratiği için yapay zekâ öğretmenin', pl: 'Nauczyciel AI do ćwiczenia mówienia',
            })}
          </Text>

          <View testID="voice-minute-wallet-balance" style={[styles.balanceCard, { backgroundColor: t.bgCard }]}>
            <Text style={[styles.balanceLabel, { color: t.textMuted, fontSize: f.sub }]}>{triLang(lang, {
              ru: 'Доступно сейчас', en: 'Available now', uk: 'Доступно зараз', es: 'Disponible ahora', 'pt-BR': 'Disponível agora', vi: 'Hiện có', id: 'Tersedia sekarang', tr: 'Şu anda kullanılabilir', pl: 'Dostępne teraz',
            })}</Text>
            <Text style={[styles.balanceValue, { color: t.textPrimary, fontSize: f.h1 }]}>{balanceMinutes(wallet)} {triLang(lang, {
              ru: 'мин', en: 'min', uk: 'хв', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min',
            })}</Text>
            <Text style={[styles.balanceNote, { color: t.textMuted, fontSize: f.sub }]}>{triLang(lang, {
              ru: 'Купленные минуты не сгорают и без дневного лимита', en: 'Purchased minutes never expire and have no daily cap', uk: 'Придбані хвилини не згорають і без денного ліміту', es: 'Los minutos comprados no caducan ni tienen límite diario',
              'pt-BR': 'Os minutos comprados não expiram e não têm limite diário', vi: 'Phút đã mua không hết hạn và không có giới hạn hằng ngày', id: 'Menit yang dibeli tidak kedaluwarsa dan tanpa batas harian', tr: 'Satın alınan dakikalar süresizdir ve günlük sınırı yoktur', pl: 'Kupione minuty nie wygasają i nie mają limitu dziennego',
            })}</Text>
          </View>

          <View style={styles.features}>
            {featureCopy.map((copy, index) => (
              <View key={copy} style={[styles.feature, { backgroundColor: t.bgCard }]}>
                <View style={[styles.featureIcon, { backgroundColor: t.accent }]}>
                  <Ionicons name={FEATURES[index] ?? 'mic'} size={22} color={t.correctText} />
                </View>
                <Text style={[styles.featureText, { color: t.textPrimary, fontSize: f.body }]}>{copy}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            testID="max-buy-minutes-button"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Купить минуты', en: 'Buy minutes', uk: 'Купити хвилини', es: 'Comprar minutos', 'pt-BR': 'Comprar minutos', vi: 'Mua phút', id: 'Beli menit', tr: 'Dakika satın al', pl: 'Kup minuty' })}
            accessibilityHint={triLang(lang, {
              ru: 'Откроет выбор разовых пакетов минут', en: 'Opens one-time minute pack choices', uk: 'Відкриє вибір разових пакетів хвилин', es: 'Abre los paquetes de minutos de compra única',
              'pt-BR': 'Abre os pacotes avulsos de minutos', vi: 'Mở các gói phút mua một lần', id: 'Membuka pilihan paket menit sekali beli', tr: 'Tek seferlik dakika paketlerini açar', pl: 'Otwiera jednorazowe pakiety minut',
            })}
            hitSlop={4}
            onPress={openSheet}
            style={({ pressed }) => [styles.primary, { backgroundColor: t.accent, opacity: pressed ? 0.86 : 1, transform: [{ translateY: pressed ? 1 : 0 }] }]}
          >
            <Ionicons name="card-outline" size={20} color={t.correctText} />
            <Text style={[styles.primaryText, { color: t.correctText, fontSize: f.body }]}>{triLang(lang, {
              ru: 'Купить минуты', en: 'Buy minutes', uk: 'Купити хвилини', es: 'Comprar minutos', 'pt-BR': 'Comprar minutos', vi: 'Mua phút', id: 'Beli menit', tr: 'Dakika satın al', pl: 'Kup minuty',
            })}</Text>
          </Pressable>
          <View style={styles.links}>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://phraseman.com/terms')}>
              <Text style={[styles.link, { color: t.textMuted, fontSize: f.sub }]}>{triLang(lang, { ru: 'Условия', en: 'Terms', uk: 'Умови', es: 'Términos', 'pt-BR': 'Termos', vi: 'Điều khoản', id: 'Ketentuan', tr: 'Koşullar', pl: 'Warunki' })}</Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://phraseman.com/privacy')}>
              <Text style={[styles.link, { color: t.textMuted, fontSize: f.sub }]}>{triLang(lang, { ru: 'Конфиденциальность', en: 'Privacy', uk: 'Конфіденційність', es: 'Privacidad', 'pt-BR': 'Privacidade', vi: 'Quyền riêng tư', id: 'Privasi', tr: 'Gizlilik', pl: 'Prywatność' })}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <VoiceMinutePackSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} onCredited={onCredited} />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 52, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'flex-end' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 18, alignItems: 'stretch' },
  orb: { alignItems: 'center', marginTop: -6 },
  title: { fontWeight: '700', textAlign: 'center', marginTop: -4 },
  subtitle: { fontWeight: '400', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  balanceCard: { borderRadius: 22, padding: 16, alignItems: 'center' },
  balanceLabel: { fontWeight: '400' },
  balanceValue: { fontWeight: '700', marginTop: 2 },
  balanceNote: { fontWeight: '400', lineHeight: 20, textAlign: 'center', marginTop: 4 },
  features: { gap: 8, marginTop: 12 },
  feature: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingHorizontal: 12, gap: 12 },
  featureIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontWeight: '700' },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  primary: { minHeight: 56, borderRadius: 18, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryText: { fontWeight: '700' },
  links: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22 },
  link: { textDecorationLine: 'underline' },
});
