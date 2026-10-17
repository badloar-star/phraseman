import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import CoinRankCatalog, { coinRankCatalogTitle } from '../components/coins/CoinRankCatalog';
import V2Backdrop from '../components/v2/V2Backdrop';
import V2Pressable from '../components/v2/V2Pressable';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { V2 } from '../constants/v2Style';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import BackGlyph from '../components/v2/BackGlyph';

// зачем (владелец 11.10, журнал 35): каталог рангов монет — ОТДЕЛЬНЫЙ экран по макету coins.html (`rankCatalog`: «назад», заголовок
// «Ранги монеты», сетка 4×5 «монета 50 + Ранг N», текущий ранг подсвечен), вход — ссылка «Все ранги» с экрана «Повысить ранг».
// Только вид: цены и повышение здесь не участвуют. Строка макета «Контракт суммы не закрыт» — служебная, пользователю не показывается.
export default function CoinRankCatalogScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const p = useV2Palette();
  // зачем (темы 2.0): токены зависят ещё от уровня цвета и оформления; поиск кэширован.
  const g = liquidGlassTokens(liquidGlassThemeId);
  const rank = useMyCoinRank();
  const goBack = useCallback(() => safeRouterBack(router), [router]);

  return (
    <View testID="coin-rank-catalog-screen" style={[styles.root, { backgroundColor: g.bg }]}>
      {/* зачем (coins-002): общий фон 2.0 — почти чёрный bg с едва светлым верхом и свечениями темы; собственный градиент bgTop→bgBottom давал плоский тёмно-синий без виньетки. */}
      <V2Backdrop />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <V2Pressable
          testID="coin-rank-catalog-back"
          accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
          onPress={goBack}
          scaleTo={0.94}
          style={styles.backButton}
        >
          <BackGlyph size={21} color={p.text} />
        </V2Pressable>
      </View>
      <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={[styles.headerTitle, { color: p.text }]}>{coinRankCatalogTitle(lang)}</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
      >
        <CoinRankCatalog glass={g} lang={lang} currentRank={rank} showTitle={false} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // как на экране ранга (`coins.html back()`): голый шеврон 48×44 и крупный заголовок 34/40 слева.
  header: { minHeight: 44, paddingHorizontal: V2.screenPad, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 10, paddingHorizontal: V2.screenPad },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: V2.screenPad, paddingTop: 14 },
});
