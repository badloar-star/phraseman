import React, { memo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../ThemeContext';

type ThemedInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
};

function ThemedInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
}: ThemedInputProps) {
  const { theme: t, f, ds, themeMode } = useTheme();
  const isGoldTheme = themeMode === 'gold';
  return (
    <View style={{ gap: ds.spacing.xs }}>
      <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textGhost}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            minHeight: ds.inputHeight,
            borderRadius: ds.radius.lg,
            backgroundColor: t.bgCard,
            borderColor: error ? t.wrong : isGoldTheme ? t.borderHighlight : t.border,
            borderWidth: isGoldTheme ? StyleSheet.hairlineWidth : 1,
            color: t.textPrimary,
            fontSize: f.body,
          },
        ]}
      />
      {!!error && <Text style={{ color: t.wrong, fontSize: f.caption }}>{error}</Text>}
    </View>
  );
}

export default memo(ThemedInput);

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
