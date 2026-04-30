import { useTheme } from '@/components/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: 'text' | 'background' | 'icon' | 'tabIconDefault' | 'tabIconSelected'
): string {
  const { theme } = useTheme();
  const colorFromProps = props.dark ?? props.light;

  if (colorFromProps) {
    return colorFromProps;
  }

  switch (colorName) {
    case 'text':
      return theme.textPrimary;
    case 'background':
      return theme.bgPrimary;
    case 'icon':
      return theme.textSecond;
    case 'tabIconDefault':
      return theme.textMuted;
    case 'tabIconSelected':
      return theme.accent;
    default:
      return theme.textPrimary;
  }
}
