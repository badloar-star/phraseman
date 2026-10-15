// Самая первая строка JS: время входа для [COLD-START] (цена импортов корня видна только от этой точки).
import './app/cold_start_entry_mark';
// Release: тишина предупреждений RN Firebase о namespaced API (Q53: 241 шт. в окне старта).
// Первым — флаг читается в момент вызова, раньше любых обращений к Firebase.
import './app/rnfb_release_quiet';
// Глобально защищаем AsyncStorage.multiSet/multiMerge от null/undefined в парах
// (Android SQLite иначе падает на старте: "bind value at index N is null").
// Этот импорт стоит ПЕРВЫМ и самоустанавливает обёртку при загрузке модуля,
// до сайд-эффектов expo-router/entry и всех стартовых миграций.
import './app/async_storage_null_bind_guard';
// Account V2, Пакет 6D: dev-only подключение к Firebase Emulator Suite —
// только при __DEV__ И EXPO_PUBLIC_FIREBASE_EMULATOR_HOST; до любого обращения к Firebase.
import './app/firebase_emulator_dev_boot';
// [FS-READS] (координатор 15.10): dev-only перепись чтений Firestore с первого вызова; в релизе ветка __DEV__ вырезается.
import './app/dev_firestore_read_counter_boot';
// зачем (inlineRequires, 2026-10-03): эти модули делают работу ПРИ ИМПОРТЕ, и она обязана начаться на старте, а не при
// первом обращении: прогрев пиков энергии и рун ради первого кадра Главной (решение владельца 2026-08-24, PM-212 ALLOW)
// и регистрация сетевых проб в паузе занятия. Голый import inlineRequires не откладывает.
import './app/energy_peek_cache';
import './app/runes_system';
import './app/net_status';

import 'expo-router/entry';
