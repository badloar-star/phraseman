import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useTheme } from '../../components/ThemeContext';
import { monoIcon } from '../../constants/monoIcon';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Theme } from '../../constants/theme';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { configureAccordionLayout } from '../../constants/layoutAnimation';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';

type GradPair = readonly [string, string];

type Props = {
  t: Theme;
  f: Record<string, number>;
  lang: Lang;
  index: number;
  en: string;
  ru: string;
  uk: string;
  es?: string;
  sourceLocales?: {
    'pt-BR'?: string;
    vi?: string;
    id?: string;
    tr?: string;
    pl?: string;
  };
  frontGradient: GradPair;
  backGradient: GradPair;
  borderAccent: string;
  canRemove: boolean;
  onRemove: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
  editing?: boolean;
};

function usePackCardPreviewHeight(): number {
  const { height: screenH } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  return useMemo(() => {
    const reserved = 200 + insets.top + bottomInset;
    const hAvail = Math.max(220, screenH - reserved);
    return Math.min(224, Math.max(140, Math.round(hAvail * 0.45)));
  }, [screenH, insets.top, bottomInset]);
}

export default function UgcPackEditorCardPreview({
  t,
  f,
  lang,
  index: _cardIndex,
  en,
  ru,
  uk,
  es,
  sourceLocales,
  frontGradient,
  backGradient,
  borderAccent,
  canRemove,
  onRemove,
  canEdit,
  onEdit,
  editing,
}: Props) {
  const { themeMode } = useTheme();
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const flipDrivingAnim = useRef(new Animated.Value(0)).current;
  const chevronRotAnim = useRef(new Animated.Value(0)).current;

  const cardH = usePackCardPreviewHeight();
  const hasDescription = uk.trim().length > 0;
  const plannedBackText =
    lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl'
      ? sourceLocales?.[lang]?.trim()
      : '';
  const backText = plannedBackText || (lang === 'es' ? (es?.trim() || ru.trim()) : ru.trim());
  const backLabel = plannedBackText ? lang.toUpperCase() : lang === 'es' && es?.trim() ? 'ES' : 'RU';
  const canScrollFront = (en.trim() || '').length > 72;
  const canScrollBack = (backText || '').length > 72;
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
  }, [en, ru, uk, es, sourceLocales, flipDrivingAnim, chevronRotAnim]);

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
    configureAccordionLayout();
    setDetailsExpanded((v) => !v);
  }, [hasDescription]);
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
          activeOpacity={0.7}
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
                decelerationRate="normal"
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
              {backLabel}
            </Text>
            {canScrollBack ? (
              <ScrollView
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                decelerationRate="normal"
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
                  {backText || '…'}
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
                  {backText || '…'}
                </Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>

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
                'pt-BR': 'Descrição',
                vi: 'Mô tả',
                id: 'Deskripsi',
                tr: 'Açıklama',
                pl: 'Opis',
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
            {triLang(lang, {
              uk: 'ОПИСАННЯ',
              ru: 'ОПИСАНИЕ',
              es: 'DESCRIPCIÓN',
              'pt-BR': 'DESCRIÇÃO',
              vi: 'MÔ TẢ',
              id: 'DESKRIPSI',
              tr: 'AÇIKLAMA',
              pl: 'OPIS',
            })}
          </Text>
          <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '600', lineHeight: 22 }}>{uk.trim()}</Text>
        </View>
      ) : null}

      {editing ? (
        <View style={[styles.toolBtn, { marginTop: 8 }]}>
          <Ionicons name="create-outline" size={18} color={t.accent} />
          <Text style={[styles.toolTxt, { color: t.accent }]}>
            {triLang(lang, {
              uk: 'Редагується…',
              ru: 'Редактируется…',
              es: 'En edición…',
              'pt-BR': 'Em edição…',
              vi: 'Đang chỉnh sửa…',
              id: 'Sedang diedit…',
              tr: 'Düzenleniyor…',
              pl: 'Edytowanie…',
            })}
          </Text>
        </View>
      ) : (
        <View style={[styles.toolRow, { marginTop: 8 }]}>
          {canEdit && onEdit ? (
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                onEdit();
              }}
              style={styles.toolBtn}
            >
              <Ionicons name="create-outline" size={18} color={t.accent} />
              <Text style={[styles.toolTxt, { color: t.accent }]}>
                {triLang(lang, {
                  uk: 'Редагувати',
                  ru: 'Редактировать',
                  es: 'Editar',
                  'pt-BR': 'Editar',
                  vi: 'Chỉnh sửa',
                  id: 'Edit',
                  tr: 'Düzenle',
                  pl: 'Edytuj',
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
          {canRemove ? (
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                onRemove();
              }}
              style={styles.toolBtn}
            >
              <Ionicons name="trash-outline" size={18} color={monoIcon(themeMode, '#f87171')} />
              <Text style={[styles.toolTxt, { color: monoIcon(themeMode, '#f87171') }]}>
                {triLang(lang, {
                  uk: 'Видалити',
                  ru: 'Удалить',
                  es: 'Eliminar',
                  'pt-BR': 'Excluir',
                  vi: 'Xóa',
                  id: 'Hapus',
                  tr: 'Sil',
                  pl: 'Usuń',
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolTxt: { fontSize: 13, fontWeight: '700' },
});
