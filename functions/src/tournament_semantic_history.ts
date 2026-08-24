export type TournamentReadyBarrier = Readonly<{
  state: 'ready';
  generation: string;
  revision: number;
}>;

export type TournamentSignaturePage = Readonly<{
  signatures: readonly string[];
  nextCursor: string | null;
}>;

export interface TournamentSemanticHistoryAdapter {
  readBarrier(): Promise<Readonly<{ state: string; generation: string; revision: number }> | null>;
  readTaskSignaturePage(input: Readonly<{
    generation: string;
    cursor: string | null;
    limit: number;
  }>): Promise<TournamentSignaturePage>;
  readApprovalSignaturePage(input: Readonly<{
    cursor: string | null;
    limit: number;
    reviewContractVersion: string;
    promptSetSha256: string;
    primaryModel: string;
    adversarialModel: string;
  }>): Promise<TournamentSignaturePage>;
}

const HASH = /^[a-f0-9]{64}$/u;
const PAGE_LIMIT = 500;
const MAX_PAGES = 100;

async function loadPages(
  reader: (cursor: string | null) => Promise<TournamentSignaturePage>,
  signatures: Set<string>,
): Promise<number> {
  let cursor: string | null = null;
  let malformed = 0;
  const seenCursors = new Set<string>();
  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
    const page = await reader(cursor);
    if (!page || !Array.isArray(page.signatures) || page.signatures.length > PAGE_LIMIT
      || !(page.nextCursor === null || typeof page.nextCursor === 'string')) {
      throw new Error('semantic_history_page_invalid');
    }
    for (const signature of page.signatures) {
      if (typeof signature === 'string' && HASH.test(signature)) signatures.add(signature);
      else malformed += 1;
    }
    if (page.nextCursor === null) return malformed;
    if (!page.nextCursor || seenCursors.has(page.nextCursor)) throw new Error('semantic_history_cursor_invalid');
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  throw new Error('semantic_history_page_limit');
}

export async function loadHistoricalTournamentSignatures(
  adapter: TournamentSemanticHistoryAdapter,
  expectedBarrier: TournamentReadyBarrier,
  approvalIdentity: Readonly<{
    reviewContractVersion: string;
    promptSetSha256: string;
    primaryModel: string;
    adversarialModel: string;
  }>,
): Promise<Readonly<{ signatures: ReadonlySet<string>; malformed: number }>> {
  if (!expectedBarrier || expectedBarrier.state !== 'ready' || !expectedBarrier.generation
    || !Number.isSafeInteger(expectedBarrier.revision) || expectedBarrier.revision < 0) {
    throw new Error('semantic_history_barrier_invalid');
  }
  if (!approvalIdentity || !approvalIdentity.reviewContractVersion
    || !HASH.test(approvalIdentity.promptSetSha256)
    || !approvalIdentity.primaryModel || !approvalIdentity.adversarialModel
    || approvalIdentity.primaryModel === approvalIdentity.adversarialModel) {
    throw new Error('semantic_history_approval_identity_invalid');
  }
  const signatures = new Set<string>();
  let malformed = await loadPages(
    (cursor) => adapter.readTaskSignaturePage({
      generation: expectedBarrier.generation,
      cursor,
      limit: PAGE_LIMIT,
    }),
    signatures,
  );
  malformed += await loadPages(
    (cursor) => adapter.readApprovalSignaturePage({ cursor, limit: PAGE_LIMIT, ...approvalIdentity }),
    signatures,
  );
  const current = await adapter.readBarrier();
  if (!current || current.state !== 'ready'
    || current.generation !== expectedBarrier.generation
    || current.revision !== expectedBarrier.revision) {
    throw new Error('semantic_history_generation_drift');
  }
  return Object.freeze({ signatures, malformed });
}
