/**
 * Открыть юридическую/внешнюю ссылку с честным ответом при сбое.
 *
 * зачем (аудит R58 #53, координатор 15.10): в онбординге и окне регистрации Linking.openURL звали без .catch — при сбое
 * (нет браузера, системный отказ) ничего не происходило, а промис оставался без обработки. Пейвол (R58 #1) уже показывал тост;
 * теперь одна функция на все места: лог причины + тост на 9 языках. Вид экранов не меняется.
 */
import { Linking } from 'react-native';
import { DebugLogger } from './debug-logger';
import { actionToastTri, emitAppEvent } from './events';

export function openLegalLink(url: string, surface: string): void {
  DebugLogger.info('[LEGAL-LINK]', `open: ${surface} ${url}`);
  Linking.openURL(url).catch((e: unknown) => {
    DebugLogger.error(`[LEGAL-LINK] ${surface}`, e instanceof Error ? e : new Error(String(e)), 'warning');
    emitAppEvent('action_toast', actionToastTri('error', {
      ru: 'Не удалось открыть страницу. Попробуй ещё раз.', uk: 'Не вдалося відкрити сторінку. Спробуй ще раз.', en: "Couldn't open the page. Try again.",
      es: 'No se pudo abrir la página. Inténtalo de nuevo.', 'pt-BR': 'Não foi possível abrir a página. Tente de novo.', vi: 'Không mở được trang. Hãy thử lại.',
      id: 'Halaman tidak dapat dibuka. Coba lagi.', tr: 'Sayfa açılamadı. Tekrar dene.', pl: 'Nie udało się otworzyć strony. Spróbuj ponownie.',
    }));
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
