import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KitTouchable } from '../KitTouchable';
import { useTheme } from '../ThemeContext';
import { useSystemReduceMotion } from '../../hooks/use_system_reduce_motion';
import { triLang, type Lang } from '../../constants/i18n';
import { closeCommunityNoticeForever, communityNoticeIndex, communityNoticeOwner, readCommunityNoticeClosed } from '../../app/community_notice';
import { COMMUNITY_NOTICE_TEXTS } from '../../app/community_notice_copy';

// зачем (макет community_notice.html, утверждён владельцем 04.11): палитра плашки по кадру — карточка чуть светлее фона (тёмная) / тёмный отсвет (светлая), янтарная иконка (не красная), тонкая 1 px линия (разрешена в 2.0)
const PALETTE = {
  dark: { bg: 'rgba(255,255,255,.07)', line: 'rgba(255,255,255,.14)', text: '#F2F3F6', sub: '#B8BBC4', icon: 'rgba(245,181,68,.22)', iconInk: '#F5B544' }, // theme-exempt: палитра утверждённого макета плашки
  light: { bg: 'rgba(0,0,0,.045)', line: 'rgba(0,0,0,.12)', text: '#1B1D22', sub: '#585C66', icon: 'rgba(214,140,20,.20)', iconInk: '#B36B00' }, // theme-exempt: палитра утверждённого макета плашки
} as const;

const GOT_IT = { ru: 'Понял', uk: 'Зрозуміло', en: 'Got it', es: 'Entendido', 'pt-BR': 'Entendi', vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Rozumiem' } as const;

/**
 * Плашка «Наборы от пользователей» над списком вкладки «Наборы». Показывается, пока владелец не нажал крестик; после — никогда (флаг на владельца).
 * Крестик скрывает плашку мгновенно (Optimistic UI), запись флага идёт фоном; reduce-motion — без анимации ухода. Пока флаг читается — ничего не рисуем (без мигания).
 */
export function CommunityNotice({ lang }: Readonly<{ lang: Lang }>): React.JSX.Element | null {
  const { isDark } = useTheme();
  const reduceMotion = useSystemReduceMotion();
  // loading — флаг ещё читается (не рисуем, без мигания); shown — плашка видна; closing — уходит; hidden — закрыта (флаг или крестик)
  const [phase, setPhase] = useState<'loading' | 'shown' | 'closing' | 'hidden'>('loading');
  const ownerRef = useRef<string>('device');
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let live = true;
    void (async () => {
      const owner = await communityNoticeOwner();
      ownerRef.current = owner;
      const value = await readCommunityNoticeClosed(owner);
      if (live) setPhase(value ? 'hidden' : 'shown');
    })();
    return () => { live = false; };
  }, []);

  const onClose = useCallback(() => {
    if (phase !== 'shown') return; // защита от двойного тапа
    setPhase('closing');
    void closeCommunityNoticeForever(ownerRef.current);
    if (reduceMotion) { setPhase('hidden'); return; }
    Animated.timing(fade, { toValue: 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setPhase('hidden'));
  }, [phase, fade, reduceMotion]);

  if (phase === 'loading' || phase === 'hidden') return null;
  const p = isDark ? PALETTE.dark : PALETTE.light;
  const texts = COMMUNITY_NOTICE_TEXTS[communityNoticeIndex(new Date())];
  const text = texts[lang] ?? texts.en;
  return (
    <Animated.View
      testID="community-notice"
      accessibilityRole="text"
      style={[styles.box, { backgroundColor: p.bg, boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: p.line }], opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }]}
    >
      <View style={[styles.icon, { backgroundColor: p.icon }]} accessible={false}>
        <Text style={[styles.iconText, { color: p.iconInk }]}>!</Text>
      </View>
      <Text style={[styles.text, { color: p.text }]}>{text}</Text>
      <KitTouchable testID="community-notice-close" accessibilityRole="button" accessibilityLabel={triLang(lang, GOT_IT)} onPress={onClose} style={styles.close}>
        <Ionicons name="close" size={18} color={p.sub} />
      </KitTouchable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingVertical: 8, paddingLeft: 10, paddingRight: 0, borderRadius: 16 },
  icon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 17, lineHeight: 20, fontWeight: '800' },
  text: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  // зачем (вердикт Макетов 04.11): крестик по центру высоты плашки в зоне 44×44 — обычный элемент строки (align-items:center), а не абсолютный; отрицательные поля не раздувают плашку
  close: { width: 44, height: 44, borderRadius: 22, marginVertical: -8, marginRight: 0, alignItems: 'center', justifyContent: 'center' },
});

export default CommunityNotice;
