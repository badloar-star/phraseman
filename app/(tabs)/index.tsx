import { DeferredRedirect } from '../../components/DeferredRedirect';

/**
 * Дефолтный маршрут группы (tabs) без сегмента = главная.
 * Экран списка уроков — отдельный файл `lessons.tsx` (`/(tabs)/lessons`), чтобы не путать
 * с корневым `app/index.tsx` и `Stack.Screen name="index"` в `app/_layout.tsx`.
 */
export default function TabsGroupIndex() {
  return <DeferredRedirect href="/(tabs)/home" />;
}
