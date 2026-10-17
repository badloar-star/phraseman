/**
 * Равенство секций снимка приложения (profile / progress) для Главной.
 *
 * зачем (координатор 18.10, [HOME-SETSTATE]; замер [HOME-RENDERS] cpu_1017/1_full.txt): за одно окно возврата на Главную `appSnapshot` менялся 9 из 23 раз.
 * Писатели снимка (`patchAppSnapshot*`) каждый раз собирают секцию ЗАНОВО с `updatedAt: Date.now()`, поэтому сравнение по ссылке считало
 * тот же профиль и ту же серию «новыми» и перерисовывало всю Главную. Здесь секции равны, если совпали все поля, кроме `updatedAt`
 * (штамп порядка записей; Главная его не читает, а охранные правила хранилища работают на самом хранилище, не на её копии).
 * Вложенные значения сравниваются по ссылке — это осторожная сторона: лишняя перерисовка допустима, пропущенная — нет.
 */
export function sameSnapshotSection<T extends object>(a: T | undefined, b: T | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const left = a as Readonly<Record<string, unknown>>;
  const right = b as Readonly<Record<string, unknown>>;
  const leftKeys = Object.keys(left).filter((key) => key !== 'updatedAt');
  const rightKeys = Object.keys(right).filter((key) => key !== 'updatedAt');
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => key in right && Object.is(left[key], right[key]));
}
