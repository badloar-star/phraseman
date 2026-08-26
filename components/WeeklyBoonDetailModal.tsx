// Weekly Boons — модалка «подробно про подарок дня».
//
// Открывается по тапу на плашку TodaysBoonStrip. Показывает иконку бонуса,
// заголовок и развёрнутое описание простыми словами (несколько абзацев) — что
// это за подарок и как им воспользоваться сегодня. День недели НЕ упоминается:
// расписание задаётся в «Пульте» и может включаться/выключаться/меняться.
//
// Структура и темизация — по образцу NotificationPermissionModal (transparent
// fade Modal + затемнение + карточка t.bgCard/t.border). Локальное состояние
// видимости управляется родителем (TodaysBoonStrip) через visible/onClose.

import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useModalBackdropFade } from '../hooks/useModalBackdropFade';
import { getBoonCopy, getMysteryChestClaimedDetail } from '../app/boons/boon_copy';
import type { BoonId } from '../app/boons/boon_types';
import RetiredRasterFallback from './feedback/RetiredRasterFallback';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import DuoPressable from './DuoPressable';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';

import { noAndroidOutline } from '../constants/androidGlow';
interface WeeklyBoonDetailModalProps {
  visible: boolean;
  /** Бонус, по которому показываем подробности (null = нечего показывать). */
  boon: BoonId | null;
  /** «Сундук недели» уже забран — показываем текст «уже открыт», а не «открой и забери». */
  claimed?: boolean;
  onClose: () => void;
  /**
   * зачем: гибрид «Световод» (макет .motion-mockups/phraseman-hybrid.html,
   * семья «Алерты и формы») — информационная модалка без удара-кульминации:
   * вход из света + каскад строк. Production default — hybrid; classic — rollback.
   */
  motionVariant?: 'classic' | 'hybrid';
}

function WeeklyBoonDetailModal({ visible, boon, claimed = false, onClose, motionVariant = 'hybrid' }: WeeklyBoonDetailModalProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const isClassic = motionVariant === 'classic';
  const backdropOpacity = useModalBackdropFade(visible);
  const reduceMotion = useReduceMotion();

  // Появление карточки (пружина) + парение/«дыхание» иконки бонуса.
  const entrance = useRef(new Animated.Value(0)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;
  const floatLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible || !isClassic) {
      floatLoop.current?.stop();
      return;
    }
    entrance.setValue(0);
    iconFloat.setValue(0);
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, tension: 120, friction: 12 }).start();
    floatLoop.current?.stop();
    floatLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(iconFloat, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    floatLoop.current.start();
    return () => { floatLoop.current?.stop(); };
  }, [visible, isClassic, entrance, iconFloat]);

  const handleClose = () => {
    hapticTap();
    onClose();
  };

  // boon может быть null между сменой дня/конфига — модалку при этом не рисуем.
  if (!boon) return null;

  const copy = getBoonCopy(boon, lang);
  // «Сундук недели» уже забран → не зовём «открой и забери», а сообщаем, что награда уже у юзера.
  const paragraphs = boon === 'mystery_monday' && claimed
    ? getMysteryChestClaimedDetail(lang)
    : copy.detail;
  const closeLabel = triLang(lang, {
    ru: 'Закрыть',
    uk: 'Закрити',
    es: 'Entendido',
    'pt-BR': 'Entendi',
    vi: 'Đã hiểu',
    id: 'Mengerti',
    tr: 'Anladım',
    pl: 'Jasne',
  });

  if (motionVariant === 'hybrid') {
    return (
      <HybridAlertShell visible={visible} onRequestClose={handleClose} shadowColor={t.accent} testID="weekly-boon-detail-hybrid-backdrop">
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border, borderWidth: 0 }]}>
          <CascadeItem delay={LUM.ladder[1]} reduceMotion={reduceMotion}>
            <View style={styles.iconRow}>
              <View style={styles.iconFrame}>
                <View pointerEvents="none" style={styles.iconGlow}>
                  <LinearGradient
                    colors={[`${t.accent}66`, `${t.accent}00`]}
                    start={{ x: 0.5, y: 0.5 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
                <RetiredRasterFallback kind="boon" size={96} color={t.accent} />
              </View>
            </View>
          </CascadeItem>

          <CascadeItem delay={LUM.ladder[2]} reduceMotion={reduceMotion}>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{copy.title}</Text>
          </CascadeItem>

          <CascadeItem delay={LUM.ladder[3]} reduceMotion={reduceMotion}>
            <ScrollView decelerationRate="fast"
              style={styles.bodyScroll}
              contentContainerStyle={{ paddingBottom: 4 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {paragraphs.map((paragraph, i) => (
                <Text
                  key={i}
                  style={[styles.paragraph, { color: t.textSecond, fontSize: f.body, marginTop: i === 0 ? 0 : 12 }]}
                >
                  {paragraph}
                </Text>
              ))}
            </ScrollView>
          </CascadeItem>

          <CascadeItem delay={LUM.ladder[4]} reduceMotion={reduceMotion}>
            <DuoPressable
              testID="weekly-boon-detail-hybrid-close"
              onPress={handleClose}
              edgeColor={t.bgSurface2}
              edgeHeight={4}
              style={[styles.closeBtn, { backgroundColor: t.accent, marginTop: 0 }]}
            >
              <Text style={[styles.closeBtnText, { color: t.correctText, fontSize: f.body }]}>{closeLabel}</Text>
            </DuoPressable>
          </CascadeItem>
        </View>
      </HybridAlertShell>
    );
  }

  const cardScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const cardY = entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const iconTranslateY = iconFloat.interpolate({ inputRange: [0, 1], outputRange: [3, -5] });
  const iconScale = iconFloat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const glowOpacity = iconFloat.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        {/* Тап по затемнению = закрыть. */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: t.bgCard,
              borderColor: t.border,
              shadowColor: t.accent,
              transform: [{ scale: cardScale }, { translateY: cardY }],
            },
          ]}
        >
          {/* Иконка подарка: парит, «дышит», за ней мягкое свечение акцентом. */}
          <View style={styles.iconRow}>
            <View style={styles.iconFrame}>
              <Animated.View pointerEvents="none" style={[styles.iconGlow, { opacity: glowOpacity }]}>
                <LinearGradient
                  colors={[`${t.accent}66`, `${t.accent}00`]}
                  start={{ x: 0.5, y: 0.5 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <Animated.View style={{ transform: [{ translateY: iconTranslateY }, { scale: iconScale }] }}>
                <RetiredRasterFallback kind="boon" size={96} color={t.accent} />
              </Animated.View>
            </View>
          </View>

          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {copy.title}
          </Text>

          <ScrollView decelerationRate="fast"
            style={styles.bodyScroll}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {paragraphs.map((paragraph, i) => (
              <Text
                key={i}
                style={[
                  styles.paragraph,
                  { color: t.textSecond, fontSize: f.body, marginTop: i === 0 ? 0 : 12 },
                ]}
              >
                {paragraph}
              </Text>
            ))}
          </ScrollView>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            onPress={handleClose}
            style={[styles.closeBtn, { backgroundColor: t.accent }]}
          >
            <Text style={[styles.closeBtnText, { color: t.correctText, fontSize: f.body }]}>
              {closeLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 18,
    borderWidth: 0,
    padding: 20,
    overflow: 'hidden',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    ...noAndroidOutline,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconFrame: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  iconImage: {
    width: 96,
    height: 96,
  },
  iconGlow: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    overflow: 'hidden',
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
  },
  bodyScroll: {
    marginTop: 12,
    maxHeight: 320,
  },
  paragraph: {
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'left',
  },
  closeBtn: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeBtnText: {
    fontWeight: '800',
  },
});

export default memo(WeeklyBoonDetailModal);
