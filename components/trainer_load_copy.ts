// Чистый копирайт для состояний загрузки/ошибки тренажёров (без RN-импортов,
// чтобы можно было покрыть юнит-тестами в node-окружении).
export const TRAINER_LOAD_COPY = {
  loading: { ru: 'Загружаем…', uk: 'Завантажуємо…', es: 'Cargando…' },
  errorTitle: {
    ru: 'Не удалось загрузить',
    uk: 'Не вдалося завантажити',
    es: 'No se pudo cargar',
  },
  errorBody: {
    ru: 'Проверьте подключение к интернету и попробуйте снова.',
    uk: 'Перевірте підключення до інтернету та спробуйте знову.',
    es: 'Comprueba tu conexión a internet e inténtalo de nuevo.',
  },
  retry: { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar' },
  exit: { ru: 'Выйти', uk: 'Вийти', es: 'Salir' },
} as const;
