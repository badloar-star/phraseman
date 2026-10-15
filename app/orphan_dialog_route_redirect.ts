/**
 * Сиротские экраны старых ИИ-диалогов — R56 (аудит кнопок 15.10).
 *
 * зачем: ai_dialog_briefing / ai_dialog_session / ai_companion_session больше не открываются из приложения (Диалоги V2
 * рисуют свой каталог, старое тело DialogsTabContentBody не монтируется), но достижимы внешней ссылкой — и идут без
 * энергии и квоты новых Диалогов. В стор-сборке такой вход уводит на Главную; в dev экран остаётся для витрины.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export type OrphanDialogRoute = 'ai_dialog_briefing' | 'ai_dialog_session' | 'ai_companion_session';

function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

/** true — экран рисовать нельзя (идёт уход на Главную). Вызывать до раннего return, порядок хуков постоянный. */
export function useOrphanDialogRouteRedirect(route: OrphanDialogRoute): boolean {
  const router = useRouter();
  const blocked = !isDevBuild();
  useEffect(() => {
    if (!blocked) {
      console.log(`[ORPHAN-ROUTE] ${route}: dev — экран открыт (витрина), в стор-сборке ушёл бы на Главную`); // guard-ok: dev-ветка
      return;
    }
    console.warn(`[ORPHAN-ROUTE] ${route}: вход по внешней ссылке без энергии и квоты → Главная`); // guard-ok: ранний выход логируется
    router.replace('/(tabs)/home' as never);
  }, [blocked, route, router]);
  return blocked;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __OrphanDialogRouteRedirectShim() {
  return null;
}
