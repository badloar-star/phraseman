import { useEffect } from 'react';
import { InteractionManager, View } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';

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

  return <View style={{ flex: 1, backgroundColor: '#06141B' }} />;
}
