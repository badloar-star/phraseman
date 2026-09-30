import Ionicons from '@expo/vector-icons/build/vendor/react-native-vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import React, { memo } from 'react';
import { LinearGradient } from './SafeLinearGradient';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';

export type ThemedChoice = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
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
  const { liquidGlassThemeId, f } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const panelBackground = Platform.OS === 'android' ? glass.opaqueSheet : glass.sheet;

  const panelContent = (
    <LinearGradient
      colors={[panelBackground, panelBackground]}
      style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom + 10) }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={Platform.OS === 'android' ? 12 : 22}
          blurReductionFactor={3}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'}
          tint="systemUltraThinMaterialDark"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.sheet }]} />
        <LinearGradient colors={[glass.selected, 'transparent']} start={{ x: 0.05, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[styles.grabber, { backgroundColor: glass.glassEdge }]} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
          <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: f.h2 }]}>
            {title}
          </Text>
        </CascadeItem>
        <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
          <Text style={[styles.message, { color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.5 }]}>
            {message}
          </Text>
        </CascadeItem>
        <CascadeItem delay={isHybrid ? LUM.ladder[2] + 192 : 0} reduceMotion={!isHybrid || reduceMotion}>
          <View style={styles.choices}>
            {choices.map((c, index) => {
              const primary = c.variant !== 'secondary';
              return (
                <TouchableOpacity
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={c.label}
                  activeOpacity={0.78}
                  onPress={() => {
                    hapticTap();
                    // Choice owns its close/navigation behavior; calling the
                    // sheet close handler here would invoke a callback twice.
                    c.onPress();
                  }}
                  style={[
                    styles.choice,
                    { backgroundColor: primary ? glass.opaqueControl : glass.selected },
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
                  <Text style={[styles.choiceLabel, { color: primary ? glass.text : glass.secondary, fontSize: f.body }]}>
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
  );

  if (isHybrid) {
    return (
      <HybridAlertShell
        visible={visible}
        onRequestClose={onRequestClose}
        placement="bottom"
        scrollContent={false}
        shadowColor="#000000"
        testID="themed-choice-modal-hybrid"
      >
        {panelContent}
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    maxHeight: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingTop: 10,
  },
  grabber: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  scroll: { flexShrink: 1, minHeight: 0 },
  content: { paddingHorizontal: 18, paddingBottom: 2 },
  title: { fontWeight: '700', paddingHorizontal: 4, marginBottom: 8 },
  message: { paddingHorizontal: 4, marginBottom: 16 },
  choices: { gap: 8 },
  choice: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  choiceIcon: { width: 24, height: 24, flexShrink: 0 },
  choiceLabel: { flex: 1, fontWeight: '700' },
  classicBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 24,
  },
  classicSheetWrap: { width: '100%', maxWidth: 430, maxHeight: '100%' },
});

export default memo(ThemedChoiceModal);
