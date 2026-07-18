export function normalizeQuery(value) {
  return typeof value === 'string' ? value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ') : '';
}

function containsId(collection, value) {
  return Boolean(collection?.has?.(value));
}

function normalizedTokens(value) {
  const normalized = normalizeQuery(value);
  return normalized ? normalized.split(' ') : [];
}

export function buildSearchIndex(registry, { can = () => false, excludedIds = new Set(), retiredIds = new Set() } = {}) {
  if (!Array.isArray(registry)) return [];
  const seen = new Set();
  const result = [];
  for (const item of registry) {
    const id = typeof item?.id === 'string' ? item.id.trim() : '';
    const label = typeof item?.label === 'string' ? item.label.trim() : '';
    if (!id || !label || seen.has(id) || item.excluded === true || containsId(excludedIds, id) || containsId(retiredIds, id)) continue;
    if (item.permission && can(item.permission) !== true) continue;
    seen.add(id);
    result.push({
      id,
      label,
      description: typeof item.description === 'string' ? item.description : '',
      route: typeof item.route === 'string' ? item.route : '',
      nativeRoute: typeof item.nativeRoute === 'string' ? item.nativeRoute : '',
      legacyStatus: typeof item.legacyStatus === 'string' ? item.legacyStatus : '',
    });
  }
  return result;
}

export function rankSearchResult(entry, terms) {
  const normalizedTerms = Array.isArray(terms) ? terms.map(normalizeQuery).filter(Boolean) : [];
  if (!entry || !normalizedTerms.length) return 0;
  const identifiers = [entry.id, entry.route, entry.nativeRoute].map(normalizeQuery).filter(Boolean);
  const label = normalizeQuery(entry.label);
  const labelTokens = normalizedTokens(entry.label);
  const descriptionTokens = normalizedTokens(entry.description);
  let score = 0;
  for (const term of normalizedTerms) {
    if (identifiers.includes(term)) {
      score += 1000;
    } else if (labelTokens.includes(term)) {
      score += 700;
    } else if (labelTokens.some((token) => token.startsWith(term))) {
      score += 600;
    } else if (label.includes(term)) {
      score += 400;
    } else if (descriptionTokens.includes(term)) {
      score += 200;
    } else {
      return 0;
    }
  }
  return score;
}

export function searchIndex(index, query, { limit = 20 } = {}) {
  const normalized = normalizeQuery(query);
  if (!normalized || !Array.isArray(index)) return [];
  const requestedLimit = Number.isFinite(limit) ? Math.floor(limit) : 20;
  const cappedLimit = Math.min(Math.max(requestedLimit, 0), 20);
  if (!cappedLimit) return [];
  const terms = normalized.split(' ');
  return index
    .map((entry, position) => ({ entry, position, score: rankSearchResult(entry, terms) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.position - right.position)
    .slice(0, cappedLimit)
    .map(({ entry, score }) => ({
      id: entry.id,
      label: entry.label,
      description: entry.description,
      route: entry.route,
      nativeRoute: entry.nativeRoute,
      legacyStatus: entry.legacyStatus,
      score,
    }));
}

export function createQueryCancellation() {
  let current = 0;
  return {
    nextToken() {
      current += 1;
      return current;
    },
    isCurrent(token) {
      return token === current;
    },
  };
}
