/**
 * coin_exchange.tsx — бывшая «Биржа» (обмен монет-жемчуга на руны/звёзды).
 *
 * зачем (решение владельца 2026-09-30): жемчуг удалён из приложения ПОЛНОСТЬЮ, вместе
 * с остатками. Биржа тратила именно этот баланс, поэтому экран закрыт. Маршрут оставлен
 * только ради старых ссылок / dev-витрины: вместо торгового экрана — нейтральное
 * «Раздел закрыт» и кнопка назад. Клиент биржи (coin_exchange_client / outbox) и ядро
 * жемчуга здесь больше не импортируются — их удаляет соседняя сессия.
 */
import React, { useCallback, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
// зачем: голый router.back() крашит Android/Fabric при teardown — контракт
// navigation_back_underlay_contract требует safeRouterBack (честный replace).
import { safeRouterBack } from './navigation_back';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import TapScale from '../components/TapScale';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

export default function CoinExchangeScreen() {
  const router = useRouter();
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();

  useEffect(() => {
    // Лог на вход: если сюда кто-то всё ещё ведёт — владелец найдёт источник одним grep.
    console.log('[PEARL-RETIRED] coin_exchange: открыт закрытый раздел «Биржа», показываем заглушку'); // guard-ok: редкое событие
  }, []);

  const goBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const title = triLang(lang, {
    ru: 'Раздел закрыт', uk: 'Розділ закрито', en: 'This section is closed', es: 'Sección cerrada',
    'pt-BR': 'Seção encerrada', vi: 'Mục này đã đóng', id: 'Bagian ini ditutup', tr: 'Bu bölüm kapatıldı', pl: 'Sekcja zamknięta',
  });
  const backLabel = triLang(lang, {
    ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: glass.bg }]} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: glass.opaqueControl }]}>
          <Ionicons name="lock-closed" size={32} color={glass.secondary} accessibilityElementsHidden />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>
          {title}
        </Text>
        <TapScale
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={[styles.button, { backgroundColor: glass.cta }]}
        >
          <Text style={[styles.buttonLabel, { color: glass.ctaInk, fontSize: f.body }]}>{backLabel}</Text>
        </TapScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', textAlign: 'center' },
  button: { alignSelf: 'stretch', minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonLabel: { fontWeight: '700', textAlign: 'center' },
});
