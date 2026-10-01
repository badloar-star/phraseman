import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

/*
 * Account V2, Пакет 6E (TG-52A880319166) — скрытый dev-путь входа тестовым
 * аккаунтом Auth-эмулятора: phraseman://dev-emulator-login?email=…&password=…
 * (учётки подставляет хост из gitignored seed-файла через adb, в коде их нет).
 *
 * зачем отдельный маршрут, а не кнопка: E2E на эмуляторе водится через adb, а UI
 * владельца не трогаем. В релизе и без EXPO_PUBLIC_FIREBASE_EMULATOR_HOST модуль
 * входа не загружается вовсе — экран сразу уходит на главную.
 */
export default function DevEmulatorLoginRoute() {
  const params = useLocalSearchParams<{ email?: string; password?: string }>();
  useEffect(() => {
    if (__DEV__ && process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { signInEmulatorTestAccount } = require('./firebase_emulator_dev_login') as typeof import('./firebase_emulator_dev_login');
      void signInEmulatorTestAccount(__DEV__, process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST, params.email, params.password);
    } else {
      console.warn('[FIREBASE-EMU-LOGIN] route_skip reason=not_emulator_dev');
    }
    router.replace('/');
    // зачем: один проход на заход по ссылке; параметры не должны перезапускать вход.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
