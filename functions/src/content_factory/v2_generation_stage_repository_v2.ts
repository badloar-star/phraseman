/**
 * One server-owned stage repository for the canonical Learning V2 generator.
 * Planning, claiming, owner materialization and preview must never diverge into
 * separate collections.
 */
export const V2_GENERATION_STAGE_COLLECTION_V2 =
  "content_factory_stages" as const;
