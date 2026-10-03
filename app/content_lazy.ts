/*
 * Ленивая загрузка крупного учебного контента: модуль-данные выполняется при ПЕРВОМ обращении, а не при старте.
 *
 * зачем (PM-216, координатор 2026-10-03; владелец: «так чтобы все летало»): expo-router в sync-режиме
 * (asyncRoutes выключен, inlineRequires выключен) требует ВСЕ маршруты при запуске, а каждый маршрут тянет
 * статическим import всё своё замыкание — в том числе мегабайты данных (озвучка Learning V2, карты ссылок,
 * словарные глоссы). На слабом Android это JS-работа ДО первого кадра Главной. Контент остаётся в бандле
 * (сети нет), меняется только момент выполнения: require внутри функции-загрузчика.
 *
 * Поведение не меняется: загрузчик синхронный, результат запоминается; потребитель получает те же данные,
 * просто не при импорте, а при первом вызове. Каждая загрузка пишет ОДНУ строку [CONTENT-LAZY] (console.warn —
 * release вырезает log/info/debug, warn остаётся; так же устроены [HOME-PAINT] и [COLD-START-IO]):
 *   [CONTENT-LAZY] loaded key=<ключ> ms=<время выполнения> epochMs=<время начала, сравнимо с epochMs в [HOME-PAINT]>
 * Сбой тоже не молчит: [CONTENT-LAZY] failed key=… reason=… и исключение летит дальше, как раньше при импорте.
 */

const loadedKeys = new Set<string>();

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Возвращает функцию-доступ: первый вызов выполняет `load()` и логирует, следующие отдают то же значение.
 * Ключ должен быть уникальным и стабильным — по нему ищут строки в логе и сторожа тестов.
 */
export function lazyContent<T>(key: string, load: () => T): () => T {
  let loaded = false;
  let value: T | undefined;
  return () => {
    if (loaded) return value as T;
    const startedAt = Date.now();
    try {
      value = load();
    } catch (error) {
      console.warn(`[CONTENT-LAZY] failed key=${key} reason=${reasonOf(error)}`);
      throw error;
    }
    loaded = true;
    loadedKeys.add(key);
    console.warn(`[CONTENT-LAZY] loaded key=${key} ms=${Date.now() - startedAt} epochMs=${startedAt}`);
    return value as T;
  };
}

/** Какие ключи уже загружены в этом запуске (для сторожей/диагностики). */
export function loadedContentKeys(): readonly string[] {
  return [...loadedKeys];
}

/** Только для тестов. */
export function resetContentLazyForTests(): void {
  loadedKeys.clear();
}

/* expo-router: keep this utility from being treated as a screen */
export default function __ContentLazyRouteShim() {
  return null;
}
