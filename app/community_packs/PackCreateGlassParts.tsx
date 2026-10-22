/**
 * Детали Liquid Glass экрана «Создание набора» (cards.html #23–24, #65–74).
 *
 * зачем отдельным файлом: `community_pack_create.tsx` — 1400+ строк со всей
 * логикой черновика и публикации; вёрстку новых кирпичей (переключатель,
 * строка карточки, всплывающее меню) держим здесь, чтобы не раздувать экран и
 * не трогать его логику. Только внешний вид; данные и обработчики приходят
 * снаружи.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CARDS_GLASS_DANGER, CardsGlassSurface, type CardsGlassTokens } from '../flashcards/CardsGlassKit';
import { plateBoxShadow } from '../../components/v2/ShadowSurface';


/** Переключатель 50×30 из макета: заливка cta + тёмная «пуговка». */
export function PackSwitch({ g, on, disabled = false }: { g: CardsGlassTokens; on: boolean; disabled?: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        width: 50,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        backgroundColor: on ? g.cta : g.opaqueControl,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: on ? g.ctaInk : g.mutedText,
        }}
      />
    </View>
  );
}

/** Строка карточки набора: лицевая сторона, перевод, «⋯». */
export function PackCardRow({
  g,
  front,
  back,
  editing,
  onPress,
  onMore,
  moreLabel,
  testID,
}: {
  g: CardsGlassTokens;
  front: string;
  back: string;
  editing: boolean;
  onPress: () => void;
  onMore: () => void;
  moreLabel: string;
  testID?: string;
}) {
  return (
    <CardsGlassSurface g={g} focused={editing} style={{ flexDirection: 'row', alignItems: 'center' }} testID={testID}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.85}
        onPress={onPress}
        style={{ flex: 1, minHeight: 64, paddingLeft: 14, paddingVertical: 12, justifyContent: 'center' }}
      >
        <Text style={{ color: g.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{front}</Text>
        {back ? (
          <Text style={{ color: g.secondary, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{back}</Text>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={moreLabel}
        activeOpacity={0.7}
        onPress={onMore}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={{ width: 52, minHeight: 64, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={g.secondary} />
      </TouchableOpacity>
    </CardsGlassSurface>
  );
}

/**
 * Всплывающее меню у правого края (макет «Меню: черновик / ошибка»).
 * Не Modal: внутри может жить своя кнопка с собственным окном (жалоба).
 */
export function PackPopoverMenu({
  g,
  visible,
  onClose,
  top,
  closeLabel,
  children,
}: {
  g: CardsGlassTokens;
  visible: boolean;
  onClose: () => void;
  top: number;
  closeLabel: string;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 60 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: g.scrim }]} // затемнение — скрим текущей темы (закон владельца 22.10)
      />
      <View
        style={{
          position: 'absolute',
          right: 20,
          top,
          minWidth: 230,
          padding: 6,
          borderRadius: 18,
          backgroundColor: g.opaqueSheet,
          // зачем (Тень 12.10): меню без кромки — отделяют затемнение и тень плашки
          boxShadow: plateBoxShadow(g),
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Строка меню/шторки действий: иконка + подпись, 48dp. */
export function PackMenuRow({
  g,
  icon,
  label,
  onPress,
  danger = false,
  testID,
}: {
  g: CardsGlassTokens;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}) {
  const color = danger ? CARDS_GLASS_DANGER : g.text;
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      activeOpacity={0.8}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: 12 }}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ flex: 1, color, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}
