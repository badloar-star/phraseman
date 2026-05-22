/**
 * Вход с диплинка (админ / QA): заполняет хранилище 7 тест-фразами и открывает экран повторения.
 * phraseman://admin_review_test
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useStudyTarget } from '../components/StudyTargetContext';
import { seedAdminTestReviewSession } from './active_recall';

export default function AdminReviewTestScreen() {
  const router = useRouter();
  const { studyTarget } = useStudyTarget();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seeded = await seedAdminTestReviewSession(studyTarget);
        if (!cancelled) {
          if (seeded) router.replace('/review');
          else router.back();
        }
      } catch {
        if (!cancelled) {
          router.back();
        }
      }
    })();
    return () => { cancelled = true; };
  }, [router, studyTarget]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f13' }}>
      <View />
      <Text style={{ color: '#94a3b8', marginTop: 20, fontSize: 15 }}>
        7 карт — повтор…
      </Text>
    </View>
  );
}
