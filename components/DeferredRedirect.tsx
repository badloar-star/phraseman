import { useEffect } from 'react';
import { InteractionManager, View } from 'react-native';
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
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        router.replace(href);
      }, 0);
    });
    return () => {
      if (timer) clearTimeout(timer);
      task.cancel?.();
    };
  }, [href, rootNavigationReady, router]);

  // зачем: фикс-тёмный филлер давал «чёрный кадр» на светлой sagePorcelain во
  // время редиректа (+not-found и админ-лабы) — фон берём из активной темы.
  const { theme } = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.bgPrimary }} />;
}
