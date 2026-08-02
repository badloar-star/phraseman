import { DeferredRedirect } from '../../components/DeferredRedirect';

/**
 * Дефолтный маршрут группы (tabs) без сегмента = главная.
 * Список уроков живёт в `lessons.tsx` и рендерится push-маршрутом `/lessons_list`
 * (таб «Уроки» убран 2026-08-02); файл не путать с корневым `app/index.tsx`
 * и `Stack.Screen name="index"` в `app/_layout.tsx`.
 */
export default function TabsGroupIndex() {
  return <DeferredRedirect href="/(tabs)/home" />;
}
