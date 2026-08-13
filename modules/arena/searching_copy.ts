/**
 * Строка «сколько игроков сейчас ищет» — во всех восьми локалях.
 *
 * Вынесена отдельно от `copy.ts` намеренно. `copy.ts` тянет за собой весь
 * механизм локализации, а тот — нативные модули, и проверить правило склонения
 * без запуска приложения стало бы невозможно. Здесь же чистые строки: ни
 * импортов, ни состояния.
 *
 * Склонение существует потому, что в русском, украинском и польском число
 * управляет окончанием: «1 игрок», «2 игрока», «5 игроков», «11 игроков».
 * Склеенная строка вида `${count} игроков` разъехалась бы по смыслу в трёх
 * локалях из восьми, а это ровно тот экран, где игрок сидит и ждёт.
 */

export type ArenaCopyLocale = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

/**
 * Славянская форма числительного.
 *
 * Числа 11–14 — исключение: они берут форму множества, хотя оканчиваются на
 * 1–4. Без этой проверки получилось бы «11 игрок».
 */
export function arenaSlavicPlural(count: number, one: string, few: string, many: string): string {
  const value = Math.abs(Math.trunc(count));
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = value % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** Приводит любое пришедшее число к пригодному счёту. */
export function arenaSearchingCount(raw: unknown): number {
  const value = Math.trunc(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Строки по локалям для положительного счёта.
 *
 * Ноль сюда не попадает: пустой рейтинг честнее назвать пустым, чем показать
 * «0 игроков» — от цифры игрок ждёт соперника, а ждать некого.
 */
export function arenaSearchingCountForms(count: number): Readonly<Record<ArenaCopyLocale, string>> {
  const value = Math.max(1, Math.trunc(count));
  const slavic = (one: string, few: string, many: string) => arenaSlavicPlural(value, one, few, many);
  return {
    ru: `Сейчас ищут ещё ${value} ${slavic('игрок', 'игрока', 'игроков')}`,
    uk: `Зараз шукають ще ${value} ${slavic('гравець', 'гравці', 'гравців')}`,
    es: value === 1 ? 'Hay 1 jugador más buscando' : `Hay ${value} jugadores más buscando`,
    'pt-BR': value === 1 ? 'Mais 1 jogador procurando' : `Mais ${value} jogadores procurando`,
    vi: `Còn ${value} người chơi đang tìm`,
    id: `${value} pemain lain sedang mencari`,
    tr: value === 1 ? '1 oyuncu daha arıyor' : `${value} oyuncu daha arıyor`,
    pl: `Szuka jeszcze ${value} ${slavic('gracz', 'graczy', 'graczy')}`,
  };
}
