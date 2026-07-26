/**
 * Согласование «жемчужин» с числом (RU / UK) для строк вида "+N …".
 * Техническое имя модуля сохранено ради уже существующих данных и импортов.
 */

export function ruKnowledgeShardsAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'жемчужина';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'жемчужины';
  return 'жемчужин';
}

export function ukKnowledgeShardsAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'перлина';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'перлини';
  return 'перлин';
}

/**
 * Винительный падеж: «забери 1 жемчужину», «Открыть за 21 жемчужину».
 * зачем: helper выше даёт именительный («1 жемчужина»), который верен только в
 * позиции подлежащего («1 жемчужина будет списана»). После переходного глагола
 * или предлога «за» нужен винительный, иначе получается «забери 1 жемчужина».
 * Формы на 2–4 и на 5+ в винительном совпадают с именительным — отличается только
 * единственное число.
 */
export function ruKnowledgeShardsAccusativeAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'жемчужину';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'жемчужины';
  return 'жемчужин';
}

export function ukKnowledgeShardsAccusativeAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'перлину';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'перлини';
  return 'перлин';
}

/**
 * Родительный падеж: «не хватает ещё 1 жемчужины», «не вистачає ще 1 перлини».
 * зачем: «не хватает / не вистачає» управляет родительным, а не именительным —
 * иначе выходит «не хватает ещё 1 жемчужина». Формы 2–4 и 5+ совпадают с
 * именительным, отличается только единственное число.
 */
export function ruKnowledgeShardsGenitiveAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'жемчужины';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'жемчужин';
  return 'жемчужин';
}

export function ukKnowledgeShardsGenitiveAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'перлини';
  return 'перлин';
}

export function ruShardKnowledgeSubtitle(amount: number): string {
  return `+${amount} ${ruKnowledgeShardsAfterNumber(amount)}`;
}

export function ukShardKnowledgeSubtitle(amount: number): string {
  return `+${amount} ${ukKnowledgeShardsAfterNumber(amount)}`;
}
