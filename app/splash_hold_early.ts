/**
 * Запрет автоскрытия нативной заставки — САМЫМ первым делом JS, до графа импортов корня.
 *
 * зачем (координатор 18.10, Макеты d7a6d7469 splash_night_6dab4, night no): при светлой системе после нативной заставки
 * ~3 с чистого чёрного экрана, затем светлая Главная. По журналу [BOOTSPLASH]: JS-заставка рисует первый кадр (уже светлая)
 * лишь через ~3,8 с от входа в JS, а hideAsync зовётся ещё позже — т.е. чёрное не от раннего hideAsync. preventAutoHideAsync
 * стоял в app/_layout.tsx ПОСЛЕ всех статических импортов корня (~6 с в dev-бандле) — до него нативная заставка снималась
 * сама, и между ней и JS-заставкой виден фон окна (на старой нативной сборке — чёрный). Здесь запрет ставится до импортов;
 * повторный вызов в _layout безопасен. Снимает заставку по-прежнему только _layout (после первого кадра JS-заставки).
 */
import * as SplashScreen from 'expo-splash-screen';
import { msSinceJsEntry } from './cold_start_entry_mark';

const startedAt = msSinceJsEntry();
SplashScreen.preventAutoHideAsync()
  .then((held) => {
    console.log(`[BOOTSPLASH] preventAutoHide early ${JSON.stringify({ sinceJsEntryMs: startedAt, settledMs: msSinceJsEntry(), held })}`); // guard-ok: одна строка на старт
  })
  .catch((e: unknown) => {
    // зачем: не немой catch — если заставка уже снята системой, это и есть ответ на вопрос «откуда чёрное»
    console.warn(`[BOOTSPLASH] preventAutoHide early FAILED ${JSON.stringify({ sinceJsEntryMs: startedAt, error: e instanceof Error ? e.message : String(e) })}`); // guard-ok: причина в журнале
  });

/* expo-router route shim: служебный модуль в app/ не должен давать предупреждение маршрута */
export default function __RouteShim() { return null; }
