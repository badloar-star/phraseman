import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import CustomAvatarBadge from '../CustomAvatarBadge';
import DuoPressable from '../DuoPressable';
import PressableHybrid from '../PressableHybrid';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATAR_RESTYLE_COST,
  type CustomAvatarDef,
  type CustomAvatarLogoColor,
} from '../../constants/custom_avatars';

export interface AvatarEditorSheetProps {
  visible: boolean;
  avatar: CustomAvatarDef | null;
  gradientId: string;
  logoColor: CustomAvatarLogoColor;
  owned: boolean;
  title: string;
  applyLabel: string;
  darkLabel: string;
  lightLabel: string;
  gradientLabel: (id: string) => string;
  onGradientChange: (id: string) => void;
  onLogoColorChange: (color: CustomAvatarLogoColor) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * AvatarEditorSheet — гибрид «Световод + Чекан» (владелец, 2026-08-15).
 *
 * зачем: собственный PanResponder-выезд (кастомный translateY + drag-to-dismiss)
 * заменён на общий каркас HybridSheetShell — жесты совпадали 1:1 (тяга вниз,
 * резина ×0.12, порог 88px/900), так что конфликта нет и держать свою копию
 * незачем. Плитки градиентов/чипы цвета логотипа — PressableHybrid variant
 * (card/chip), выбор читается тоном (accentBg) и галочкой, а не рамкой (правило
 * владельца — контейнеры без обводок). CTA «Сохранить» — DuoPressable, кромка 6.
 */
export function AvatarEditorSheet(props: AvatarEditorSheetProps) {
  const { theme: t } = useTheme();

  const handleClose = useCallback(() => {
    props.onClose();
  }, [props]);

  const handleConfirm = useCallback(() => {
    void hapticTap();
    props.onConfirm();
  }, [props]);

  return (
    <HybridSheetShell
      visible={props.visible}
      onClose={handleClose}
      closeLabel={props.title}
      glowColor={t.accent}
      testID="avatar-editor-sheet"
    >
      <View style={styles.body}>
        <Text style={[styles.title, { color: t.textPrimary }]}>{props.title}</Text>
        {props.avatar ? (
          <View style={styles.badgeWrap}>
            <CustomAvatarBadge avatarId={props.avatar.id} gradientId={props.gradientId} logoColor={props.logoColor} size={104} />
          </View>
        ) : null}

        <View style={styles.gradientGrid}>
          {CUSTOM_AVATAR_GRADIENTS.map((gradient) => {
            const selected = gradient.id === props.gradientId;
            return (
              <PressableHybrid
                key={gradient.id}
                variant="card"
                onPress={() => props.onGradientChange(gradient.id)}
                style={styles.gradient}
                contentStyle={[
                  styles.gradientSurface,
                  { backgroundColor: gradient.colors[1] },
                ]}
                accessibilityState={{ selected }}
                accessibilityLabel={props.gradientLabel(gradient.id)}
              >
                <Text style={styles.gradientText} numberOfLines={1}>{props.gradientLabel(gradient.id)}</Text>
                {selected ? (
                  <View style={[styles.selectedBadge, { backgroundColor: t.accent }]}>
                    <Ionicons name="checkmark" size={11} color={t.correctText} />
                  </View>
                ) : null}
              </PressableHybrid>
            );
          })}
        </View>

        <View style={styles.colorRow}>
          {(['black', 'white'] as const).map((color) => {
            const selected = props.logoColor === color;
            return (
              <PressableHybrid
                key={color}
                variant="card"
                onPress={() => props.onLogoColorChange(color)}
                style={styles.colorChoiceWrap}
                contentStyle={[
                  styles.colorChoice,
                  { backgroundColor: color === 'black' ? '#111827' : '#F8FAFC' },
                  selected ? { backgroundColor: color === 'black' ? '#111827' : '#F8FAFC' } : null,
                ]}
                accessibilityState={{ selected }}
              >
                <Text style={{ color: color === 'black' ? '#FFFFFF' : '#111827', fontWeight: '700' }}>
                  {color === 'black' ? props.darkLabel : props.lightLabel}
                </Text>
                {selected ? (
                  <View style={[styles.selectedBadge, { backgroundColor: t.accent }]}>
                    <Ionicons name="checkmark" size={11} color={t.correctText} />
                  </View>
                ) : null}
              </PressableHybrid>
            );
          })}
        </View>

        <DuoPressable
          onPress={handleConfirm}
          style={[styles.confirm, { backgroundColor: t.accent }]}
          edgeColor={t.accentBg}
          edgeHeight={6}
          testID="avatar-editor-confirm"
        >
          <Text style={[styles.confirmText, { color: t.correctText }]}>
            {props.applyLabel}{props.owned ? ` · ${CUSTOM_AVATAR_RESTYLE_COST}` : ''}
          </Text>
        </DuoPressable>
      </View>
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', paddingBottom: 4 },
  badgeWrap: { marginTop: 4, marginBottom: 4 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  gradientGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  gradient: { width: '31%' },
  gradientSurface: {
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  gradientText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  selectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 14 },
  colorChoiceWrap: { flex: 1 },
  colorChoice: {
    minHeight: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirm: { width: '100%', marginTop: 18, borderRadius: 16 },
  confirmText: { fontSize: 16, fontWeight: '700', paddingVertical: 15 },
});
