/** Canonical pack bytes used by the independent native-content review. */
export function canonicalDialoguePackJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalDialoguePackJson).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalDialoguePackJson(record[key])}`
    )).join(',')}}`;
  }
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error('dialogue_pack_canonical_unsupported_value');
  return json;
}
