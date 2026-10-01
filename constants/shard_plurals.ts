/**
 * Согласование слова «монета» с числом (RU / UK) для строк вида "+N …".
 * Техническое имя модуля сохранено ради уже существующих данных и импортов.
 * зачем (PM-008, Q74): единственная валюта 2.0 — монеты; слова «жемчуг/перлины» из слов экранов убраны.
 */

export function ruKnowledgeShardsAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'монета';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'монеты';
  return 'монет';
}

export function ukKnowledgeShardsAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'монета';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'монети';
  return 'монет';
}

/**
 * Винительный падеж: «забери 1 монету», «Открыть за 21 монету».
 * зачем: helper выше даёт именительный («1 монета»), который верен только в
 * позиции подлежащего («1 монета будет списана»). После переходного глагола
 * или предлога «за» нужен винительный, иначе получается «забери 1 монета».
 * Формы на 2–4 и на 5+ в винительном совпадают с именительным — отличается только
 * единственное число.
 */
export function ruKnowledgeShardsAccusativeAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'монету';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'монеты';
  return 'монет';
}

export function ukKnowledgeShardsAccusativeAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'монету';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'монети';
  return 'монет';
}

/**
 * Родительный падеж: «не хватает ещё 1 монеты», «не вистачає ще 1 монети».
 * зачем: «не хватает / не вистачає» управляет родительным, а не именительным —
 * иначе выходит «не хватает ещё 1 монета». Формы 2–4 и 5+ совпадают с
 * именительным, отличается только единственное число.
 */
export function ruKnowledgeShardsGenitiveAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'монеты';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'монет';
  return 'монет';
}

export function ukKnowledgeShardsGenitiveAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'монети';
  return 'монет';
}

export function ruShardKnowledgeSubtitle(amount: number): string {
  return `+${amount} ${ruKnowledgeShardsAfterNumber(amount)}`;
}

export function ukShardKnowledgeSubtitle(amount: number): string {
  return `+${amount} ${ukKnowledgeShardsAfterNumber(amount)}`;
}
