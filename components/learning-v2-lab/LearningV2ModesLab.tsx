// зачем: владелец забраковал и порт «скриптовой витрины», и session-прототип
// (решение опроса 2026-07-26, серия A: «снести сразу»). Learning V2 строится
// заново по планам Кодекса (docs/v2/00–08) через ревизию → HTML-макеты →
// RN-волны. Этот экран — временный вход страницы «Уроки → V2» (ENABLE_DEV_TOOLS):
// держит точку монтажа стабильной, пока сюда волнами не приедут новые режимы.
// Цвета — ТОЛЬКО из темы приложения (решение владельца №4: не хардкодить палитру).
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../ThemeContext';

interface LearningV2ModesLabProps {
  readonly bottomPadding?: number;
}

const WAVES: readonly string[] = [
  'Выбор — картинка и слух',
  'Сборка фразы и диктант',
  'Пары и скорость',
  'Ввод и контекст',
  'Диалоги и сцены',
  'Голосовые режимы',
];

const LearningV2ModesLab = memo(function LearningV2ModesLab({ bottomPadding = 0 }: LearningV2ModesLabProps) {
  const { theme, f } = useTheme();

  return (
    <View style={[s.root, { backgroundColor: theme.bgPrimary, paddingBottom: bottomPadding + 24 }]}>
      <Text style={[s.title, { color: theme.textPrimary, fontSize: f.h1 }]}>Learning V2 строится</Text>
      <Text style={[s.body, { color: theme.textSecond, fontSize: f.bodyLg }]}>
        Режимы пересобираются с нуля по планам Кодекса и появятся здесь волнами:
      </Text>
      <View style={s.list}>
        {WAVES.map((wave, index) => (
          <View key={wave} style={s.row}>
            <Text style={[s.rowIndex, { color: theme.accent, fontSize: f.bodyLg }]}>{index + 1}</Text>
            <Text style={[s.rowText, { color: theme.textPrimary, fontSize: f.bodyLg }]}>{wave}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    marginBottom: 12,
  },
  body: {
    lineHeight: 24,
    marginBottom: 20,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIndex: {
    fontWeight: '800',
    width: 22,
    textAlign: 'center',
  },
  rowText: {
    fontWeight: '600',
    flexShrink: 1,
  },
});

export default LearningV2ModesLab;
