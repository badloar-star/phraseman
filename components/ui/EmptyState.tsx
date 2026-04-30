import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';

type EmptyStateProps = {
  title: string;
  subtitle: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
};

export default function EmptyState({ title, subtitle, icon = 'sparkles-outline' }: EmptyStateProps) {
  const { theme: t, f, ds } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        ds.shadow.soft,
        {
          borderRadius: ds.radius.xl,
          backgroundColor: t.bgCard,
          borderColor: t.border,
          padding: ds.spacing.xl,
        },
      ]}
    >
      <Ionicons name={icon} size={26} color={t.textSecond} />
      <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', marginTop: ds.spacing.md }}>{title}</Text>
      <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: ds.spacing.xs }}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
