/**
 * @see https://docs.expo.dev/versions/latest/config/babel/
 * `babel-preset-expo` (SDK 54) automatically adds the `react-native-worklets`
 * Babel plugin LAST when react-native-reanimated v4 + react-native-worklets are
 * installed. Without this config file the worklets plugin is never applied, so
 * `useAnimatedStyle` / worklets crash app-wide with:
 *   "You attempted to set the key `current` ... immutable and has been frozen."
 */
module.exports = function (api) {
  // зачем (аудит нагрева 2026-09-20, владелец выбрал «вырезать только самые
  // болтливые»): в коде 682 вызова console, из них ~480 не закрыты на __DEV__.
  // На телефоне пользователя консоли НЕТ — вывод уходит в никуда, но текст
  // всё равно собирается и склеивается каждый раз. В аварии (ошибка в цикле)
  // это сотни пустых склеек в секунду ровно тогда, когда человеку и так плохо.
  //
  // ЧТО ОСТАЁТСЯ (правило владельца «сперва логи, потом починка»):
  //   • console.warn и console.error НЕ вырезаются — это причины ранних
  //     выходов и проглоченных catch, они обязаны жить ВСЕГДА;
  //   • ошибки пользователей идут в облако отдельным каналом
  //     (app/app_health.ts → submitClientReport('app_error')) и читаются в
  //     админке — сборка их вообще не касается;
  //   • app/debug-logger.ts пишет в AsyncStorage, тоже не через console.
  // Вырезается только console.log/info/debug — «вот что сейчас происходит»,
  // которое в релизе физически некому прочитать.
  //
  // Признак релиза берём ТЕМ ЖЕ способом, что и сам babel-preset-expo
  // (build/common.js → getIsProd): сначала caller.isDev от сборщика, и только
  // если его нет — переменные окружения. Проверять один лишь NODE_ENV нельзя:
  // Metro сообщает режим через caller, а не через env, и вырезание молча не
  // срабатывало бы в части сборок.
  const isDevCaller = api.caller((caller) => caller?.isDev);
  const isProduction = isDevCaller != null
    ? isDevCaller === false
    : (process.env.BABEL_ENV === 'production' || process.env.NODE_ENV === 'production');

  // Кеш настроек обязан зависеть от режима: при api.cache(true) первый
  // посчитанный вариант застывал бы для всех последующих сборок процесса.
  api.cache.using(() => String(isProduction));

  return {
    presets: ['babel-preset-expo'],
    plugins: isProduction
      ? [['transform-remove-console', { exclude: ['warn', 'error'] }]]
      : [],
  };
};
