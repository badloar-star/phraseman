export interface ArenaQuestionPoolRow {
  readonly id: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly level: string;
  readonly availability: 'active' | 'removed';
  readonly skillTag: string;
  readonly rand: number;
}

export type ArenaPoolFallback = 'none' | 'allow_recent';

export function selectArenaPoolQuestions(rows: readonly ArenaQuestionPoolRow[], request: {
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly level: string;
  readonly count: number;
  readonly excludedIds: ReadonlySet<string>;
}): { readonly ids: readonly string[]; readonly fallback: ArenaPoolFallback } {
  const eligible = rows.filter((row) => row.availability === 'active'
    && row.studyTarget === request.studyTarget
    && row.learnerSourceLocale === request.learnerSourceLocale
    && row.level === request.level);
  const fresh = eligible.filter((row) => !request.excludedIds.has(row.id));
  const selected = (fresh.length >= request.count ? fresh : eligible).slice(0, request.count);
  return Object.freeze({ ids: Object.freeze(selected.map((row) => row.id)), fallback: fresh.length >= request.count ? 'none' : 'allow_recent' });
}
