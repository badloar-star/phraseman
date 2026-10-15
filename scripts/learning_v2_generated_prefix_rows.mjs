function generatedRows(source) {
  const starts = [...source.matchAll(/^  Object\.freeze\(\{\r?$/gmu)].map((match) => match.index);
  if (starts.length === 0) throw new Error("generated_row_count_invalid");
  const close = source.indexOf("\n]);", starts.at(-1));
  if (close < 0) throw new Error("generated_row_count_invalid");
  return {
    header: source.slice(0, starts[0]),
    rows: starts.map((start, index) => source.slice(start, starts[index + 1] ?? close).trimEnd()),
    trailer: source.slice(close),
  };
}

export function replaceGeneratedPrefixRows(currentSource, prefixSource, prefixCount) {
  const current = generatedRows(currentSource);
  const replacement = generatedRows(prefixSource);
  if (
    !Number.isSafeInteger(prefixCount) ||
    prefixCount < 1 ||
    current.rows.length < prefixCount ||
    replacement.rows.length !== prefixCount
  ) throw new Error("generated_row_count_invalid");
  return `${current.header}${[
    ...replacement.rows,
    ...current.rows.slice(prefixCount),
  ].join("\n")}\n${current.trailer}`;
}
