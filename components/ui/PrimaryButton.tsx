import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../ThemeContext';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export default function PrimaryButton({ label, onPress, disabled, loading, style }: PrimaryButtonProps) {
  const { theme: t, f, ds } = useTheme();
  const isDisabled = !!disabled || !!loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}
      style={[
        styles.button,
        ds.shadow.soft,
        {
          minHeight: ds.buttonHeight,
          borderRadius: ds.radius.lg,
          backgroundColor: isDisabled ? t.bgSurface2 : t.accent,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.correctText} />
      ) : (
        <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
