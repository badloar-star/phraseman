/**
 * Личность соперника-бота.
 *
 * Владелец (2026-08-12): бот не раскрывается в интерфейсе. Значит у него должно
 * быть правдоподобное имя, а не «Тренировочный соперник». Состав пулов —
 * смешанный: часть ников на языке интерфейса игрока, часть международные
 * латиницей, как в реальной глобальной игре.
 *
 * Генерация детерминирована по seed матча: имя не должно меняться при
 * переподключении или пересинхронизации.
 */

/** Международные ники — работают в любой локали и составляют половину пула. */
const INTERNATIONAL = [
  'Nika', 'Orion', 'Sasha', 'Mira', 'Kai', 'Luca', 'Noor', 'Emin', 'Vera', 'Dima',
  'Yuki', 'Aria', 'Milo', 'Zara', 'Timur', 'Lena', 'Ravi', 'Ines', 'Bruno', 'Alina',
  'Deniz', 'Nadia', 'Oskar', 'Sofia', 'Arman', 'Elif', 'Marek', 'Tomas', 'Lara', 'Ilya',
] as const;

/** Локальные пулы. Язык, которого здесь нет, получает международный пул. */
const LOCAL: Readonly<Record<string, readonly string[]>> = {
  ru: ['Артём', 'Настя', 'Кирилл', 'Полина', 'Женя', 'Марина', 'Стас', 'Юля', 'Гоша', 'Даша'],
  uk: ['Остап', 'Оксана', 'Богдан', 'Соломія', 'Тарас', 'Ярина', 'Данило', 'Христина'],
  es: ['Javi', 'Lucía', 'Álvaro', 'Carmen', 'Nacho', 'Paula', 'Rubén', 'Marta'],
  'pt-BR': ['Thiago', 'Bia', 'Rafa', 'Camila', 'Gustavo', 'Larissa', 'Caio', 'Manu'],
  vi: ['Minh', 'Linh', 'Tuấn', 'Thảo', 'Huy', 'Ngọc', 'Nam', 'Trang'],
  id: ['Rizky', 'Putri', 'Bagus', 'Ayu', 'Dimas', 'Sari', 'Yoga', 'Intan'],
  tr: ['Kerem', 'Ceren', 'Umut', 'Selin', 'Berk', 'Ezgi', 'Kaan', 'Melis'],
  pl: ['Kuba', 'Zosia', 'Bartek', 'Ola', 'Michał', 'Kasia', 'Piotrek', 'Ewa'],
};

/** Суффиксы: без них пул из тридцати имён быстро становится узнаваемым. */
const SUFFIXES = ['', '', '', '_', '.', '7', '21', '99', '_x', '01'] as const;

function unitFromSeed(seed: string, salt: string): number {
  let hash = 2166136261;
  const source = `${seed}|${salt}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function pick<T>(pool: readonly T[], unit: number): T {
  return pool[Math.min(pool.length - 1, Math.floor(unit * pool.length))] as T;
}

/**
 * Имя соперника-бота. `lang` — язык интерфейса игрока, если он известен;
 * ровно половина матчей всё равно получает международный ник.
 */
export function arenaBotDisplayName(seed: string, lang?: string): string {
  const localPool = lang ? LOCAL[lang] : undefined;
  const useLocal = Boolean(localPool) && unitFromSeed(seed, 'pool') < 0.5;
  const pool = useLocal && localPool ? localPool : INTERNATIONAL;
  const base = pick(pool, unitFromSeed(seed, 'name'));
  const suffix = pick(SUFFIXES, unitFromSeed(seed, 'suffix'));
  return `${base}${suffix}`.slice(0, 48);
}

/** Ранг соперника — тот же, что у игрока, поэтому аватар берём из общего набора. */
export function arenaBotAvatarKey(seed: string, avatars: readonly string[]): string | undefined {
  if (!avatars.length) return undefined;
  return pick(avatars, unitFromSeed(seed, 'avatar'));
}
