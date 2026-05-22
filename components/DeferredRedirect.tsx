import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

type DeferredRedirectProps = {
  href: any;
};

export function DeferredRedirect({ href }: DeferredRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(href);
    }, 0);
    return () => clearTimeout(timer);
  }, [href, router]);

  return <View style={{ flex: 1, backgroundColor: '#06141B' }} />;
}
