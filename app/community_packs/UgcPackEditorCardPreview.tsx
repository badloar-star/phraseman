import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../../constants/theme';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';

type GradPair = readonly [string, string];

type Props = {
  t: Theme;
  f: Record<string, number>;
  lang: Lang;
  index: number;
  en: string;
  ru: string;
  uk: string;
  frontGradient: GradPair;
  backGradient: GradPair;
  borderAccent: string;
  canRemove: boolean;
  onRemove: () => void;
  onSpeakEn?: (text: string) => void;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function usePackCardPreviewHeight(): number {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return useMemo(() => {
    const reserved = 200 + insets.top + insets.bottom;
    const hAvail = Math.max(220, screenH - reserved);
    return Math.min(224, Math.max(140, Math.round(hAvail * 0.45)));
  }, [screenH, insets.top, insets.bottom]);
}

export default function UgcPackEditorCardPreview({
  t,
  f,
  lang,
  index: _cardIndex,
  en,
  ru,
  uk,
  frontGradient,
  backGradient,
  borderAccent,
  canRemove,
  onRemove,
  onSpeakEn,
}: Props) {
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const flipDrivingAnim = useRef(new Animated.Value(0)).current;
  const chevronRotAnim = useRef(new Animated.Value(0)).current;

  const cardH = usePackCardPreviewHeight();
  const hasDescription = uk.trim().length > 0;
  const canScrollFront = (en.trim() || '').length > 72;
  const canScrollBack = (ru.trim() || '').length > 72;
  const textInsetTop = 32;
  const textInsetBottom = hasDescription ? 56 : 34;

  const cFrontScaleX = flipDrivingAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const cBackScaleX = flipDrivingAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const cFrontOp = flipDrivingAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const cBackOp = flipDrivingAnim.interpolate({ inputRange: [0, 0.49, 0.5, 0.85, 1], outputRange: [0, 0, 0, 1, 1] });

  const chevronSpin = chevronRotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  useEffect(() => {
    setCardSide('front');
    setDetailsExpanded(false);
    flipDrivingAnim.setValue(0);
    chevronRotAnim.setValue(0);
  }, [en, ru, uk, flipDrivingAnim, chevronRotAnim]);

  useEffect(() => {
    Animated.timing(flipDrivingAnim, {
      toValue: cardSide === 'back' ? 1 : 0,
      duration: 360,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [cardSide, flipDrivingAnim]);

  useEffect(() => {
    Animated.timing(chevronRotAnim, {
      toValue: detailsExpanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [detailsExpanded, chevronRotAnim]);

  const toggleFlip = useCallback(() => {
    Keyboard.dismiss();
    setCardSide((s) => (s === 'front' ? 'back' : 'front'));
  }, []);

  const toggleDetails = useCallback(() => {
    if (!hasDescription) return;
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setDetailsExpanded((v) => !v);
  }, [hasDescription]);

  const onSpeak = useCallback(() => {
    Keyboard.dismiss();
    const s = en.trim();
    if (!s) return;
    onSpeakEn?.(s);
  }, [en, onSpeakEn]);

  const cardFaceStyle = useMemo(
    () =>
      ({
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }) satisfies View['props']['style'],
    [],
  );

  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ height: cardH, position: 'relative', borderRadius: 20 }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleFlip}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, overflow: 'hidden' }}
        >
          <Animated.View style={[cardFaceStyle, { transform: [{ scaleX: cFrontScaleX }], opacity: cFrontOp }]}>
            <LinearGradient
              colors={[...frontGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 20, borderWidth: 1, borderColor: borderAccent }]}
            />
            {canScrollFront ? (
              <ScrollView
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingTop: textInsetTop,
                  paddingBottom: textInsetBottom,
                  flexGrow: 1,
                  justifyContent: 'center',
                }}
                showsVerticalScrollIndicator
                scrollEnabled
                bounces={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <Text style={{ color: t.textPrimary, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center' }}>
                  {en.trim() || '…'}
                </Text>
              </ScrollView>
            ) : (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 12,
                  paddingTop: textInsetTop,
                  paddingBottom: textInsetBottom,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center' }}>
                  {en.trim() || '…'}
                </Text>
              </View>
            )}
          </Animated.View>

          <Animated.View style={[cardFaceStyle, { transform: [{ scaleX: cBackScaleX }], opacity: cBackOp }]}>
            <LinearGradient
              colors={[...backGradient]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 20, borderWidth: 1, borderColor: borderAccent }]}
            />
            <Text
              style={{
                position: 'absolute',
                top: 14,
                left: 12,
                color: t.accent,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.5,
                zIndex: 1,
              }}
            >
              RU
            </Text>
            {canScrollBack ? (
              <ScrollView
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingTop: textInsetTop,
                  paddingBottom: textInsetBottom,
                  flexGrow: 1,
                  justifyContent: 'center',
                }}
                showsVerticalScrollIndicator
                scrollEnabled
                bounces={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <Text style={{ color: t.textPrimary, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center' }}>
                  {ru.trim() || '…'}
                </Text>
              </ScrollView>
            ) : (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 12,
                  paddingTop: textInsetTop,
                  paddingBottom: textInsetBottom,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center' }}>
                  {ru.trim() || '…'}
                </Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>

        <Animated.View
          style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, opacity: cFrontOp }}
          onStartShouldSetResponder={() => true}
        >
          <TouchableOpacity
            onPress={onSpeak}
            disabled={!onSpeakEn || !en.trim()}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              uk: 'Озвучити англійське',
              ru: 'Озвучить по-английски',
              es: 'Escuchar en inglés',
            })}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${t.bgSurface}F0`,
              borderWidth: 1,
              borderColor: t.border,
              opacity: onSpeakEn && en.trim() ? 1 : 0.45,
            }}
          >
            <Ionicons name="volume-medium" size={15} color={t.accent} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ position: 'absolute', top: 14, left: 44, opacity: cFrontOp, zIndex: 1 }} pointerEvents="none">
          <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>EN</Text>
        </Animated.View>

        {hasDescription ? (
          <View
            style={{ position: 'absolute', bottom: 8, left: 0, right: 0, zIndex: 6, alignItems: 'center' }}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              onPress={toggleDetails}
              hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                uk: 'Опис',
                ru: 'Описание',
                es: 'Descripción',
              })}
              style={{ padding: 4 }}
            >
              <Animated.View style={{ transform: [{ rotate: chevronSpin }] }}>
                <Ionicons name="chevron-down" size={22} color={borderAccent} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {detailsExpanded && hasDescription ? (
        <View
          style={{
            marginTop: 8,
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: t.bgSurface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 }}>
            {triLang(lang, { uk: 'ОПИСАННЯ', ru: 'ОПИСАНИЕ', es: 'DESCRIPCIÓN' })}
          </Text>
          <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '600', lineHeight: 22 }}>{uk.trim()}</Text>
        </View>
      ) : null}

      {canRemove ? (
        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            onRemove();
          }}
          style={[styles.toolBtn, { marginTop: 8 }]}
        >
          <Ionicons name="trash-outline" size={18} color="#f87171" />
          <Text style={[styles.toolTxt, { color: '#f87171' }]}>{triLang(lang, { uk: 'Видалити', ru: 'Удалить', es: 'Eliminar' })}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolTxt: { fontSize: 13, fontWeight: '700' },
});
