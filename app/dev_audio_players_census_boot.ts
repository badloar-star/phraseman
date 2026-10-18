/*
 * [AUDIO-PLAYERS] точка входа (координатор 18.10): импортируется из index.js ДО expo-router/entry, как
 * dev_firestore_read_counter_boot. зачем: перепись должна видеть каждый плеер с первого создания. В релизе
 * `__DEV__ === false`, а в стор-сборке ещё и EXPO_PUBLIC_STORE_RELEASE=1 (тот же признак, что IS_STORE_RELEASE в
 * app/config.ts; config здесь не импортируем — точка входа должна оставаться без побочных импортов). Обе величины
 * подставляются при сборке, ветка сворачивается вместе с require — модуль переписи в релизный бандл не попадает.
 */

if (__DEV__ && process.env.EXPO_PUBLIC_STORE_RELEASE !== '1') {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const census = require('./dev_audio_players_census') as typeof import('./dev_audio_players_census');
    const audioModule = require('expo-audio/build/AudioModule').default as Parameters<typeof census.installAudioPlayersCensus>[0];
    /* eslint-enable @typescript-eslint/no-require-imports */
    const refused = census.installAudioPlayersCensus(audioModule);
    console.log(refused === null ? '[AUDIO-PLAYERS] census_install ok' : `[AUDIO-PLAYERS] census_install refused reason=${refused}`);
  } catch (error) {
    console.warn(`[AUDIO-PLAYERS] перепись не установлена (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина пропуска
  }
}

/* expo-router route shim */
export default function __AudioPlayersCensusBootRouteShim() { return null; }
