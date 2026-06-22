// Глобально защищаем AsyncStorage.multiSet/multiMerge от null/undefined в парах
// (Android SQLite иначе падает на старте: "bind value at index N is null").
// Этот импорт стоит ПЕРВЫМ и самоустанавливает обёртку при загрузке модуля,
// до сайд-эффектов expo-router/entry и всех стартовых миграций.
import './app/async_storage_null_bind_guard';

import 'expo-router/entry';
