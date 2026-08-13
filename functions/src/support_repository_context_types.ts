export interface SupportRepositoryChunk {
  readonly path: string;
  readonly line: number;
  readonly text: string;
}

export interface SupportRepositorySnapshot {
  readonly schemaVersion: 2;
  readonly generatedAt: string;
  readonly repository: string;
  readonly commit: string;
  readonly dirty: boolean;
  readonly appVersion: string;
  readonly appBuild: string;
  readonly sourceFingerprint: string;
  readonly filesDiscovered: number;
  readonly filesIndexed: number;
  readonly requiredFilesIncluded: readonly string[];
  readonly rootsIncluded: Readonly<Record<string, number>>;
  readonly historyFactsIncluded?: readonly string[];
  readonly chunks: readonly SupportRepositoryChunk[];
}

export interface SupportRepositoryEvidence extends SupportRepositoryChunk {
  readonly evidenceId: string;
  readonly relevanceScore: number;
  readonly queryCoverage: number;
  readonly matchedConcepts: readonly string[];
}

export interface SupportRepositoryContext {
  readonly generatedAt: string;
  readonly commit: string;
  readonly dirty: boolean;
  readonly appVersion: string;
  readonly appBuild: string;
  readonly sourceFingerprint: string;
  readonly trustworthy: boolean;
  readonly trustReason: string;
  readonly queryConcepts: readonly string[];
  readonly evidence: readonly SupportRepositoryEvidence[];
}
