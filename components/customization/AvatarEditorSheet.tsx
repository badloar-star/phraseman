import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import CustomAvatarBadge from '../CustomAvatarBadge';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
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

export function AvatarEditorSheet(props: AvatarEditorSheetProps) {
  const { theme: t } = useTheme();
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <Pressable style={styles.backdrop} onPress={props.onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.bgCard }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={[styles.title, { color: t.textPrimary }]}>{props.title}</Text>
          {props.avatar ? <CustomAvatarBadge avatarId={props.avatar.id} gradientId={props.gradientId} logoColor={props.logoColor} size={104} /> : null}
          <View style={styles.gradientGrid}>
            {CUSTOM_AVATAR_GRADIENTS.map((gradient) => {
              const selected = gradient.id === props.gradientId;
              return (
                <TapScale key={gradient.id} onPress={() => props.onGradientChange(gradient.id)}
                  style={[styles.gradient, { borderColor: selected ? t.accent : t.border, backgroundColor: gradient.colors[1] }]}
                  accessibilityState={{ selected }} accessibilityLabel={props.gradientLabel(gradient.id)}>
                  <Text style={styles.gradientText}>{props.gradientLabel(gradient.id)}</Text>
                </TapScale>
              );
            })}
          </View>
          <View style={styles.colorRow}>
            {(['black', 'white'] as const).map((color) => (
              <TapScale key={color} onPress={() => props.onLogoColorChange(color)}
                style={[styles.colorChoice, { borderColor: props.logoColor === color ? t.accent : t.border, backgroundColor: color === 'black' ? '#111827' : '#F8FAFC' }]}
                accessibilityState={{ selected: props.logoColor === color }}>
                <Text style={{ color: color === 'black' ? '#FFFFFF' : '#111827', fontWeight: '800' }}>{color === 'black' ? props.darkLabel : props.lightLabel}</Text>
              </TapScale>
            ))}
          </View>
          <Pressable onPress={props.onConfirm} style={[styles.confirm, { backgroundColor: t.accent }]}>
            <Text style={[styles.confirmText, { color: t.correctText }]}>{props.applyLabel}{props.owned ? ` · ${CUSTOM_AVATAR_RESTYLE_COST}` : ''}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, alignItems: 'center', maxHeight: '90%' },
  handle: { width: 44, height: 5, borderRadius: 3, marginBottom: 16 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '900', marginBottom: 16 },
  gradientGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  gradient: { width: '31%', minHeight: 48, borderRadius: 12, borderWidth: 2, justifyContent: 'center', paddingHorizontal: 6 },
  gradientText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  colorRow: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 14 },
  colorChoice: { flex: 1, minHeight: 46, borderWidth: 2, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  confirm: { width: '100%', minHeight: 54, marginTop: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 16, fontWeight: '900' },
});
