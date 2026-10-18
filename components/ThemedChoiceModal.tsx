import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import React, { memo } from 'react';
import { LinearGradient } from './SafeLinearGradient';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap, hapticWarning } from '../hooks/use-haptics';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import SheetSwipeClose, { SheetSwipeRoot } from './modal_fx/SheetSwipeClose';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: тень и затемнение окна — постоянные

export type ThemedChoice = {
  label: string;
  onPress: () => void;
  /**
   * зачем 'destructive' (Ядро, INBOX: «Сменить без сохранения» выглядела обычной кнопкой):
   * необратимое действие красится тем же мягким красным, что и в ThemedConfirmModal
   * (t.wrongBg / t.wrong), без стрелки «дальше» и с предупреждающей вибрацией.
   */
  variant?: 'primary' | 'secondary' | 'destructive';
  /**
   * Значок валюты слева от подписи (владелец 2026-09-18: «цена и ассет
   * жемчужин на кнопке обязательно»).
   *
   * зачем картинкой, а не текстом: цифра без знака валюты не читается —
   * «100» может быть чем угодно. Настоящий ассет жемчужины человек узнаёт
   * мгновенно, он же стоит в счётчике на Главной.
   */
  icon?: ImageSourcePropType;
};

type Props = {
  visible: boolean;
  title: string;
  message: string;
  choices: ThemedChoice[];
  onRequestClose: () => void;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
};

function ThemedChoiceModal({
  visible,
  title,
  message,
  choices,
  onRequestClose,
  motionVariant = 'hybrid',
}: Props) {
  const { theme: t, liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const panelBackground = Platform.OS === 'android' ? glass.opaqueSheet : glass.sheet;

  // зачем (координатор 14.10, «ручка ⇒ свайп»; решение: лист едет за пальцем): у шторки выбора ручка была без свайпа — теперь свайп вниз за ручку/шапку закрывает её тем же onRequestClose, что фон и «назад».
  // Внешний слой несёт translateY; высоту ограничивает он сам (maxHeight 100% от родителя, flexShrink 1), а лист внутри сжимается (flexShrink 1) — прокрутка списка цела.
  const panelContent = (
    <SheetSwipeClose name="themed-choice" onClose={onRequestClose} wrapStyle={{ flexShrink: 1, maxHeight: '100%', minHeight: 0 }}>
    <LinearGradient
      colors={[panelBackground, panelBackground]}
      style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom + 10) }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {/* зачем (координатор 18.10, список Сайта; прецедент — интро урока, «свечение текста убери»): на Android dimezis-BlurView без blurTarget снимает экран вместе с текстом панели
            и кладёт размытую копию под него — ореол у текста. На Android живой блюр выключен; тон, вуаль и кромка ниже остаются, iOS как было. */}
        {Platform.OS !== 'android' ? (
          <BlurView
          intensity={Platform.OS === 'android' ? 12 : 22}
          blurReductionFactor={3}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
          tint="systemUltraThinMaterialDark"
          style={StyleSheet.absoluteFill}
        />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.sheet }]} />
        <LinearGradient colors={[glass.selected, 'transparent']} start={{ x: 0.05, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[styles.grabber, { backgroundColor: glass.glassEdge }]} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false} decelerationRate="fast"
      >
        <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
          <Text accessibilityRole="header" style={[styles.title, { color: glass.text }]}>
            {title}
          </Text>
        </CascadeItem>
        <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
          <Text style={[styles.message, { color: glass.secondary }]}>
            {message}
          </Text>
        </CascadeItem>
        <CascadeItem delay={isHybrid ? LUM.ladder[2] + 192 : 0} reduceMotion={!isHybrid || reduceMotion}>
          <View style={styles.choices}>
            {choices.map((c, index) => {
              const destructive = c.variant === 'destructive';
              const primary = c.variant !== 'secondary' && !destructive;
              // зачем: макет system.html system_23 — приглушённо-красная плашка и коралловый текст для необратимого действия.
              // зачем (10.10, замечание владельца о цвете не от темы): в светлой теме «красное» берём из ролей темы, как в ThemedConfirmModal;
              // приглушённая пара макета рассчитана на тёмный графит.
              const darkDanger = liquidGlassAppearance === 'dark';
              const background = destructive ? (darkDanger ? DANGER_BG_DARK : t.wrongBg) : primary ? glass.opaqueControl : glass.selected;
              const foreground = destructive ? (darkDanger ? DANGER_INK_DARK : t.wrong) : primary ? glass.text : glass.secondary;
              return (
                <TouchableOpacity
                  key={index}
                  // зачем (координатор 12.10, английский проход): робот нажимал по русскому тексту — на любом языке тот же #glass-alert-action-N
                  testID={`glass-alert-action-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={c.label}
                  activeOpacity={0.78}
                  onPress={() => {
                    if (destructive) hapticWarning();
                    else hapticTap();
                    // Choice owns its close/navigation behavior; calling the
                    // sheet close handler here would invoke a callback twice.
                    c.onPress();
                  }}
                  style={[
                    styles.choice,
                    { backgroundColor: background },
                  ]}
                >
                  {c.icon ? (
                    <Image
                      source={c.icon}
                      style={styles.choiceIcon}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  ) : null}
                  <Text style={[styles.choiceLabel, { color: foreground }]}>
                    {c.label}
                  </Text>
                  {primary ? <Ionicons name="chevron-forward" size={18} color={glass.secondary} accessibilityElementsHidden importantForAccessibility="no" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </CascadeItem>
      </ScrollView>
    </LinearGradient>
    </SheetSwipeClose>
  );

  if (isHybrid) {
    return (
      <HybridAlertShell
        visible={visible}
        onRequestClose={onRequestClose}
        placement="bottom"
        scrollContent={false}
        shadowColor={EXEMPT_COLOR_1}
        testID="themed-choice-modal-hybrid"
      >
        {panelContent}
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <SheetSwipeRoot>
      <Pressable
        accessible={false}
        style={[styles.classicBackdrop, { paddingTop: Math.max(24, insets.top) }]}
        onPress={onRequestClose}
      >
        <Pressable
          accessible={false}
          accessibilityViewIsModal
          importantForAccessibility="yes"
          onPress={(event) => event.stopPropagation()}
          style={styles.classicSheetWrap}
        >
          {panelContent}
        </Pressable>
      </Pressable>
      </SheetSwipeRoot>
    </Modal>
  );
}

const DANGER_BG_DARK = '#3A1E1C'; // theme-exempt: приглушённо-красная плашка макета system_23 — только для тёмного оформления
const DANGER_INK_DARK = '#FF8C82'; // theme-exempt: коралловый текст макета system_23 — только для тёмного оформления

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    maxHeight: '100%',
    flexShrink: 1, // зачем: внутри внешнего слоя свайпа лист сжимается вместе с ним — прокрутка списка цела
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingTop: 10,
  },
  grabber: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  scroll: { flexShrink: 1, minHeight: 0 },
  content: { paddingHorizontal: 18, paddingBottom: 2 },
  // зачем: макет system_24 — заголовок шторки выбора 22/700, строки-карточки радиус 14, подпись 16/600.
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', paddingHorizontal: 4, marginBottom: 8 },
  message: { fontSize: 16, lineHeight: 22, paddingHorizontal: 4, marginBottom: 16 }, // D145: 16/22
  choices: { gap: 8 },
  choice: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  choiceIcon: { width: 24, height: 24, flexShrink: 0 },
  choiceLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  classicBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)', // theme-exempt: тень и затемнение окна — постоянные
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 24,
  },
  classicSheetWrap: { width: '100%', maxWidth: 430, maxHeight: '100%' },
});

export default memo(ThemedChoiceModal);
