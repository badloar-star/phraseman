import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import ScreenGradient from '../ScreenGradient';
import { hapticTap } from '../../hooks/use-haptics';
import { presentCompassRecommendation } from '../../app/compass_presenter';
import { useCompassCenter } from './CompassCenterContext';
import CompassSurface from './CompassSurface';

type Props = Readonly<{
  visible: boolean;
  onBack: () => void;
}>;

function backLabel(lang: string): string {
  if (lang === 'uk') return 'Повернутися на Головну';
  if (lang === 'es') return 'Volver a Inicio';
  if (lang === 'pt-BR') return 'Voltar ao Início';
  if (lang === 'vi') return 'Quay lại Trang chủ';
  if (lang === 'id') return 'Kembali ke Beranda';
  if (lang === 'tr') return 'Ana sayfaya dön';
  if (lang === 'pl') return 'Wróć do strony głównej';
  return 'Вернуться на Главную';
}

function pageCopy(lang: string): { today: string; home: string } {
  if (lang === 'uk') return { today: 'СЬОГОДНІ', home: 'Головна' };
  if (lang === 'es') return { today: 'HOY', home: 'Inicio' };
  if (lang === 'pt-BR') return { today: 'HOJE', home: 'Início' };
  if (lang === 'vi') return { today: 'HÔM NAY', home: 'Trang chủ' };
  if (lang === 'id') return { today: 'HARI INI', home: 'Beranda' };
  if (lang === 'tr') return { today: 'BUGÜN', home: 'Ana sayfa' };
  if (lang === 'pl') return { today: 'DZISIAJ', home: 'Główna' };
  return { today: 'СЕГОДНЯ', home: 'Главная' };
}

export default function CompassPage({ visible, onBack }: Props) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const copy = pageCopy(lang);
  const { result, refresh, launchRecommendation } = useCompassCenter();
  const recommendation = useMemo(() => (
    result?.status === 'ready'
      ? presentCompassRecommendation(result.recommendation, lang, result.whyNow)
      : null
  ), [lang, result]);

  useEffect(() => {
    if (visible) void refresh();
  }, [refresh, visible]);

  useEffect(() => {
    if (visible && !recommendation) onBack();
  }, [onBack, recommendation, visible]);

  const goBack = () => {
    hapticTap();
    onBack();
  };

  const launchPrimary = () => {
    hapticTap();
    launchRecommendation();
  };

  if (!recommendation) return null;

  return (
    <ScreenGradient style={styles.root} forceFullBleed>
      <View
        style={styles.root}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <View style={styles.topBar}>
        <Text style={[styles.today, { color: t.textMuted }]}>{copy.today}</Text>
        <Pressable
          testID="compass-page-back"
          accessibilityRole="button"
          accessibilityLabel={backLabel(lang)}
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, { backgroundColor: t.bgSurface2, borderColor: t.borderLight, opacity: pressed ? 0.66 : 1 }]}
        >
          <Text style={[styles.homeLabel, { color: t.textSecond }]}>{copy.home}</Text>
          <Ionicons name="chevron-forward" size={22} color={t.textPrimary} />
        </Pressable>
        </View>
        <CompassSurface
          presentation="page"
          active={visible}
          recommendation={recommendation}
          onPrimary={launchPrimary}
        />
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { height: 58, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  today: { fontSize: 12, fontWeight: '900', letterSpacing: 1.3 },
  backButton: { minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 14, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  homeLabel: { fontSize: 14, fontWeight: '800' },
});
