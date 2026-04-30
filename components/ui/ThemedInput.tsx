import React from 'react';
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

export default function ThemedInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
}: ThemedInputProps) {
  const { theme: t, f, ds } = useTheme();
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
            borderColor: error ? t.wrong : t.border,
            color: t.textPrimary,
            fontSize: f.body,
          },
        ]}
      />
      {!!error && <Text style={{ color: t.wrong, fontSize: f.caption }}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
