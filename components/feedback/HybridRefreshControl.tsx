// ─── HybridRefreshControl — pull-to-refresh с токенами темы ─────────────────
// зачем: голый RefreshControl рисует системный (обычно серый/чёрный) спиннер,
// не в цвет темы приложения — мелкая, но заметная нестыковка на планке
// Apple/Linear/Stripe. Кастомный индикатор без нативной прокрутки невозможен
// (RefreshControl — нативный компонент, не JS-анимация под наш контроль),
// поэтому берём нативный, но красим его в accent/фон темы. Это тонкий wrapper,
// а не редизайн: сам жест pull-to-refresh не меняется.
import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useTheme } from '../ThemeContext';

type HybridRefreshControlProps = Omit<RefreshControlProps, 'tintColor' | 'colors' | 'progressBackgroundColor'>;

/**
 * RefreshControl, обёрнутый в токены текущей темы: iOS — tintColor=accent,
 * Android — colors=[accent] на фоне bgCard. Проброс всех остальных пропов
 * (refreshing, onRefresh, ...) без изменений.
 */
export default function HybridRefreshControl(props: HybridRefreshControlProps) {
  const { theme: t } = useTheme();
  return (
    <RefreshControl
      {...props}
      tintColor={t.accent}
      colors={[t.accent]}
      progressBackgroundColor={t.bgCard}
    />
  );
}
