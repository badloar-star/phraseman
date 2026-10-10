import { useEffect } from 'react';
import { View } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';

type DeferredRedirectProps = {
  href: any;
};

export function DeferredRedirect({ href }: DeferredRedirectProps) {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const rootNavigationReady = Boolean(rootNavigationState?.key);

  useEffect(() => {
    if (!rootNavigationReady) return;
    // зачем (правило «каждый раздел мгновенно»): replace — в следующем кадре после готовности навигации, а не после
    // ВСЕХ анимаций (runAfterInteractions держал пустой фон, пока шла любая анимация входа или шторки).
    const frame = requestAnimationFrame(() => {
      router.replace(href);
    });
    return () => cancelAnimationFrame(frame);
  }, [href, rootNavigationReady, router]);

  // зачем: фикс-тёмный филлер давал «чёрный кадр» на светлой sagePorcelain во
  // время редиректа (+not-found и админ-лабы) — фон берём из активной темы.
  const { theme } = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.bgPrimary }} />;
}
