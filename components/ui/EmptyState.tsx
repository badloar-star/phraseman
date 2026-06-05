import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';
import CompassDepthSurface from '../CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../../constants/compassTheme';

type EmptyStateProps = {
  title: string;
  subtitle: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
};

export default function EmptyState({ title, subtitle, icon = 'sparkles-outline' }: EmptyStateProps) {
  const { theme: t, f, ds, themeMode } = useTheme();
  const isCompassTheme = themeMode === 'compass';
  const radius = isCompassTheme ? 10 : ds.radius.xl;
  return (
    <View
      style={[
        styles.wrap,
        isCompassTheme ? compassShadow(1) : ds.shadow.soft,
        {
          borderRadius: radius,
          backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
          borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.border,
          padding: ds.spacing.xl,
          overflow: 'hidden',
        },
      ]}
    >
      {isCompassTheme && <CompassDepthSurface radius={radius} quiet />}
      <View
        style={[
          styles.iconPlate,
          isCompassTheme && {
            backgroundColor: COMPASS_RICH.charcoalWarm,
            borderColor: COMPASS_RICH.hairlineStrong,
            borderRadius: 9,
          },
        ]}
      >
        {isCompassTheme && <CompassDepthSurface radius={9} selected />}
        <Ionicons name={icon} size={26} color={isCompassTheme ? COMPASS_RICH.champagne : t.textSecond} />
      </View>
      <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', marginTop: ds.spacing.md }}>{title}</Text>
      <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: ds.spacing.xs }}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlate: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
