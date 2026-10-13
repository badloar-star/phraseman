import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import DuoPressable from './DuoPressable';
import { useLang } from './LangContext';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import { isSpireTabEnabled } from '../app/spire_tab_flag';
import { pickReleaseNotesV2Texts } from './release_notes_v2_copy';

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
}>;

/** Separate release-2.0 campaign; the build-118 notes and admin announcements stay unchanged. */
function ReleaseNotesV2Modal({ visible, onClose }: Props) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const copy = useMemo(() => pickReleaseNotesV2Texts(lang), [lang]);
  // зачем (координатор 13.10, №34): строка про Пик — только когда раздел виден (рубильник spire_tab_enabled + интерфейс ru/uk, тот же замок, что у вкладки);
  // считаем при каждом показе окна, а не при монтировании: флаг мог прогреться позже.
  const items = useMemo(() => (visible && copy.peak && isSpireTabEnabled() ? [...copy.items, copy.peak] : copy.items), [visible, copy]);

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={copy.close}
      backdropAccessible={false}
      material="liquid-glass"
      testID="release-notes-v2-sheet"
    >
      {({ requestDismiss }) => (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false} decelerationRate="fast"
          >
            <Text style={[styles.eyebrow, { color: glass.secondary }]}>{copy.eyebrow}</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: glass.text }]}>{copy.title}</Text>

            <View style={[styles.hero, { backgroundColor: glass.opaqueCard }]}>
              <LinearGradient
                pointerEvents="none"
                colors={[glass.opaqueControl, glass.bg]}
                start={{ x: 0.8, y: 0 }}
                end={{ x: 0.1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.heroTitle, { color: glass.text }]}>{copy.hero}</Text>
            </View>

            <View style={styles.items}>
              {items.map((item) => (
                <View key={item.title} style={styles.item}>
                  <View style={[styles.itemIcon, { backgroundColor: glass.opaqueControl }]} accessible={false}>
                    <Ionicons name={item.icon} size={20} color={glass.lightTint} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={[styles.itemTitle, { color: glass.text }]}>{item.title}</Text>
                    <Text style={[styles.itemBody, { color: glass.secondary }]}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <DuoPressable
            testID="release-notes-v2-cta"
            accessibilityRole="button"
            accessibilityLabel={copy.cta}
            onPress={requestDismiss}
            edgeColor={glass.opaqueControl}
            edgeHeight={4}
            wrapStyle={styles.ctaWrap}
            style={[styles.cta, { backgroundColor: glass.accent }]}
          >
            <Text style={[styles.ctaText, { color: glass.accentInk }]}>{copy.cta}</Text>
          </DuoPressable>
        </>
      )}
    </HybridSheetShell>
  );
}

export default memo(ReleaseNotesV2Modal);

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  scrollContent: { paddingTop: 12, paddingBottom: 8 },
  eyebrow: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', marginTop: 6 },
  hero: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 14,
    marginTop: 18,
  },
  heroTitle: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  items: { marginTop: 16, gap: 9 },
  item: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  itemIcon: {
    // зачем: паритет с макетом system.html system_14 — плашка 41pt, радиус 10 (.tile в kit.css).
    width: 41,
    height: 41,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  itemBody: { fontSize: 13, lineHeight: 18, fontWeight: '400', marginTop: 2 },
  ctaWrap: { width: '100%', marginTop: 12 },
  // зачем: макет system_14 — главная кнопка 48pt в форме пилюли (.cta в kit.css).
  cta: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
