export function exactDailyPhraseRowId(value) {
  return typeof value === 'string' && value.length > 0 && value.trim() === value ? value : null;
}

export function inspectDailyPhraseRowIds(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const invalidIndexes = [];
  const counts = new Map();
  for (const [index, row] of list.entries()) {
    const rowId = exactDailyPhraseRowId(row?.id);
    if (!rowId) {
      invalidIndexes.push(index);
      continue;
    }
    counts.set(rowId, (counts.get(rowId) ?? 0) + 1);
  }
  return {
    invalidIndexes,
    counts,
    duplicates: [...counts.entries()].filter(([, count]) => count > 1).map(([rowId]) => rowId),
  };
}

export function selectExactDailyPhraseRows(rows, requestedIds) {
  if (!Array.isArray(rows)) throw new Error('Daily Phrase bank rows must be an array');
  if (requestedIds === null || requestedIds === undefined) return rows;
  if (!Array.isArray(requestedIds)) {
    throw new Error('Daily Phrase requestedIds selector must be an array, null, or undefined');
  }

  const invalidRequested = requestedIds.filter((rowId) => !exactDailyPhraseRowId(rowId));
  const requested = new Set(requestedIds);
  const duplicateRequested = requestedIds.filter(
    (rowId, index) => requestedIds.indexOf(rowId) !== index,
  );
  const inventory = inspectDailyPhraseRowIds(rows);
  const duplicateSelected = [...requested].filter((rowId) => (inventory.counts.get(rowId) ?? 0) > 1);
  const missing = [...requested].filter((rowId) => (inventory.counts.get(rowId) ?? 0) === 0);
  const failures = [];
  if (invalidRequested.length) failures.push('invalid requested row ids');
  if (inventory.invalidIndexes.length) {
    failures.push(`invalid bank row ids at indexes: ${inventory.invalidIndexes.join(', ')}`);
  }
  if (duplicateRequested.length) {
    failures.push(`duplicate requested row ids: ${[...new Set(duplicateRequested)].join(', ')}`);
  }
  if (duplicateSelected.length) failures.push(`duplicate row ids: ${duplicateSelected.join(', ')}`);
  if (missing.length) failures.push(`missing row ids: ${missing.join(', ')}`);
  if (failures.length) throw new Error(`Invalid Daily Phrase row selection; ${failures.join('; ')}`);

  return rows.filter((row) => requested.has(row.id));
}
