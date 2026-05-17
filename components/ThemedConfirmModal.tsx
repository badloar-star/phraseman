import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import GoldBevel from './GoldBevel';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  /** JSX alternative to message — use when you need inline images/icons */
  messageNode?: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Accent confirm button (e.g. go to shop) */
  confirmVariant?: 'default' | 'accent';
  testIDPrefix?: string;
};

export default function ThemedConfirmModal({
  visible,
  title,
  message,
  messageNode,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmVariant = 'accent',
  testIDPrefix,
}: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const dim = 'rgba(0,0,0,0.60)';
  const isGoldTheme = themeMode === 'gold';
  const modalColors = isGoldTheme
    ? GOLD_GRADIENTS.premiumPanel
    : ([t.bgCard, t.bgCard, t.bgCard] as [string, string, string]);
  const confirmBg = confirmVariant === 'accent' ? t.accent : t.bgSurface;
  const confirmText = confirmVariant === 'accent' ? t.correctText : t.textPrimary;
  const confirmBorder = confirmVariant === 'accent' ? t.accent : t.border;
  const cancelColors = isGoldTheme
    ? GOLD_GRADIENTS.raisedTile
    : ([t.bgSurface, t.bgSurface, t.bgSurface] as [string, string, string]);
  const confirmColors = isGoldTheme
    ? confirmVariant === 'accent'
      ? GOLD_GRADIENTS.primaryButton
      : GOLD_GRADIENTS.raisedTile
    : ([confirmBg, confirmBg, confirmBg] as [string, string, string]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: dim,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <LinearGradient
          testID={testIDPrefix ? `${testIDPrefix}-modal` : undefined}
          colors={modalColors}
          locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
          start={isGoldTheme ? { x: 0, y: 0 } : undefined}
          end={isGoldTheme ? { x: 1, y: 1 } : undefined}
          style={{
            borderRadius: 16,
            padding: 22,
            width: '100%',
            maxWidth: 360,
            borderWidth: 1,
            borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : t.border,
            overflow: 'hidden',
            ...(isGoldTheme ? goldShadow(3) : {}),
          }}
        >
          {isGoldTheme && <GoldBevel radius={16} intensity="strong" />}
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 10, zIndex: 10 }}>
            {title}
          </Text>
          {messageNode ? (
            <View style={{ zIndex: 10, marginBottom: 22 }}>{messageNode}</View>
          ) : (
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.body,
                lineHeight: f.body * 1.5,
                marginBottom: 22,
                zIndex: 10,
              }}
            >
              {message}
            </Text>
          )}
          {/* Stacked full-width actions: equal flex:1 in a row forces identical
              narrow columns and awkward wraps for long localized labels. */}
          <View style={{ flexDirection: 'column', gap: 10, zIndex: 10 }}>
            <TouchableOpacity
              testID={testIDPrefix ? `${testIDPrefix}-cancel` : undefined}
              onPress={() => {
                hapticTap();
                onCancel();
              }}
              style={{
                width: '100%',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isGoldTheme ? GOLD_RICH.hairline : t.border,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={cancelColors}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={isGoldTheme ? { x: 0, y: 0 } : undefined}
                end={isGoldTheme ? { x: 1, y: 1 } : undefined}
                style={{ paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' }}
              >
                {isGoldTheme && <GoldBevel radius={12} intensity="quiet" />}
                <Text style={{ color: t.textPrimary, fontWeight: '600', textAlign: 'center', fontSize: f.body, zIndex: 10 }}>
                  {cancelLabel}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              testID={testIDPrefix ? `${testIDPrefix}-confirm` : undefined}
              onPress={() => {
                hapticTap();
                onConfirm();
              }}
              style={{
                width: '100%',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isGoldTheme
                  ? confirmVariant === 'accent' ? GOLD_RICH.edgeLight : GOLD_RICH.hairline
                  : confirmBorder,
                overflow: 'hidden',
                ...(isGoldTheme && confirmVariant === 'accent' ? goldShadow(1) : {}),
              }}
            >
              <LinearGradient
                colors={confirmColors}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={isGoldTheme ? { x: 0, y: 0 } : undefined}
                end={isGoldTheme ? { x: 1, y: 1 } : undefined}
                style={{ paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' }}
              >
                {isGoldTheme && <GoldBevel radius={12} intensity={confirmVariant === 'accent' ? 'strong' : 'quiet'} />}
                <Text
                  style={{
                    color: isGoldTheme && confirmVariant === 'accent' ? GOLD_RICH.blackPiano : confirmText,
                    fontWeight: '700',
                    textAlign: 'center',
                    fontSize: f.body,
                    zIndex: 10,
                  }}
                >
                  {confirmLabel}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}
