import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { type WordCategory } from '../app/phrase_analytics';

interface CoachToastProps {
  category: WordCategory;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  mistakeCount: number;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8000;

export default function CoachToast({
  category,
  labelRu,
  labelUk,
  labelEs,
  mistakeCount,
  onDismiss,
}: CoachToastProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const categoryLabel = triLang(lang, { ru: labelRu, uk: labelUk, es: labelEs });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  const handleStart = () => {
    hapticTap();
    onDismiss();
    router.push({ pathname: '/problem_coach', params: { category } });
  };

  const descText = triLang(lang, {
    ru: `В этой сессии ${mistakeCount}+ ошибок — «${categoryLabel}»`,
    uk: `У цій сесії ${mistakeCount}+ помилок — «${categoryLabel}»`,
    es: `En esta sesión ${mistakeCount}+ errores — «${categoryLabel}»`,
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <View style={styles.iconWrap}>
          <Ionicons name="school" size={22} color={t.accent} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Разобрать тему?',
              uk: 'Розібрати тему?',
              es: '¿Trabajar el tema?',
            })}
          </Text>
          <Text style={[styles.desc, { color: t.textSecond, fontSize: f.caption }]} numberOfLines={2}>
            {descText}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleStart}
            style={[styles.startBtn, { backgroundColor: t.accent }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.startBtnText, { fontSize: f.label }]}>
              {triLang(lang, { ru: 'Давай', uk: 'Давай', es: 'Vamos' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={dismiss} style={styles.dismissBtn} hitSlop={12}>
            <Ionicons name="close" size={18} color={t.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '700',
  },
  desc: {
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  dismissBtn: {
    padding: 2,
  },
});
