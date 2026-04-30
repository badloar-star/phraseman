/**
 * Вход с диплинка (админ / QA): заполняет хранилище 7 тест-фразами и открывает экран повторения.
 * phraseman://admin_review_test
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { seedAdminTestReviewSession } from './active_recall';

export default function AdminReviewTestScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await seedAdminTestReviewSession();
        if (!cancelled) {
          router.replace('/review');
        }
      } catch {
        if (!cancelled) {
          router.back();
        }
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f13' }}>
      <ActivityIndicator color="#C8FF00" size="large" />
      <Text style={{ color: '#94a3b8', marginTop: 20, fontSize: 15 }}>
        7 карт — повтор…
      </Text>
    </View>
  );
}
