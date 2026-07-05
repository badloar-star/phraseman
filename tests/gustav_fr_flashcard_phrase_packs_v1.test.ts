import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const RUN_ID = '2026-07-04_fr_flashcard_phrase_packs_v1';
const BUILD_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID, 'build');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID, 'review');
const OPERATOR_PATH = path.join(ROOT, 'docs', 'gustav', 'OPERATOR.md');

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

describe('Gustav French flashcard phrase packs v1', () => {
  beforeAll(() => {
    childProcess.execFileSync('node', ['scripts/gustav_build_fr_flashcard_phrase_packs_v1.mjs'], {
      cwd: ROOT,
      stdio: 'ignore',
    });
  });

  it('materializes the five selected packs with phrase cards, not topic shells', () => {
    const candidate = readJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_candidates.json'));

    expect(candidate.schemaVersion).toBe('gustav-fr-flashcard-phrase-pack-candidates-v1');
    expect(candidate.studyTarget).toBe('fr');
    expect(candidate.activationApproved).toBe(false);
    expect(candidate.productionReady).toBe(false);
    expect(candidate.contentCandidateReady).toBe(true);
    expect(candidate.packCount).toBe(5);
    expect(candidate.cardCount).toBe(100);
    expect(candidate.packs.map((pack: any) => pack.id)).toEqual([
      'fr_cafe_terrace_life',
      'fr_pronouns_and_politeness',
      'fr_apero_social_life',
      'fr_pharmacy_healthcare',
      'fr_texting_reactions',
    ]);

    for (const pack of candidate.packs) {
      expect(pack.cards).toHaveLength(20);
      expect(pack.codeName).toBeTruthy();
      expect(pack.titleRu).toBeTruthy();
      expect(pack.titleUk).toBeTruthy();
      expect(pack.descriptionRu.length).toBeGreaterThanOrEqual(120);
      expect(pack.descriptionUk.length).toBeGreaterThanOrEqual(120);
      expect(pack.descriptionRu).not.toMatch(/contains phrases|this pack teaches/i);
      expect(pack.descriptionUk).not.toMatch(/contains phrases|this pack teaches/i);
    }
  });

  it('locks the marketplace description style rule in Gustav-wide operator rules', () => {
    const operator = fs.readFileSync(OPERATOR_PATH, 'utf8');
    const descriptionStyleGate = readJson(path.join(BUILD_DIR, 'fr_flashcard_description_style_gate.json'));

    expect(operator).toContain('Marketplace flashcard descriptions must keep the English product-copy');
    expect(operator).toContain('scene first, conflict/tension');
    expect(operator).toContain('BLOCK_PRODUCT_COPY_DRIFT');
    expect(descriptionStyleGate.status).toBe('PASS');
    expect(descriptionStyleGate.rows).toHaveLength(10);
    expect(descriptionStyleGate.rows.every((row: any) => row.pass)).toBe(true);
  });

  it('keeps every phrase card source-backed with RU/UK learning fields', () => {
    const candidate = readJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_candidates.json'));
    const targetTexts = new Set<string>();

    for (const pack of candidate.packs) {
      for (const card of pack.cards) {
        expect(card.targetText).toMatch(/[A-Za-zÀ-ÿ]/);
        expect(targetTexts.has(card.targetText.toLocaleLowerCase('fr-FR'))).toBe(false);
        targetTexts.add(card.targetText.toLocaleLowerCase('fr-FR'));
        for (const field of [
          'ru',
          'uk',
          'literalRu',
          'literalUk',
          'explanationRu',
          'explanationUk',
          'exampleFr',
          'exampleRu',
          'exampleUk',
          'register',
          'level',
        ]) {
          expect(card[field]).toBeTruthy();
        }
        expect(card.evidence.length).toBeGreaterThanOrEqual(1);
        for (const source of card.evidence) {
          expect(source.sourceId).toMatch(/^(le_robert|tv5monde|ameli)_/);
          expect(source.url).toMatch(/^https:\/\//);
          expect(source.accessedDate).toBe('2026-07-04');
          expect(source.verified).toBeTruthy();
        }
      }
    }
  });

  it('builds server/admin/runtime/rollback dry-run artifacts while keeping activation closed', () => {
    const serverManifest = readJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_server_manifest.json'));
    const runtimeIsolation = readJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_runtime_isolation.json'));
    const adminManifest = readJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_admin_workflow_manifest.json'));
    const rollbackManifest = readJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_rollback_manifest.json'));

    expect(serverManifest.status).toBe('PASS_DRY_RUN');
    expect(serverManifest.uploadPerformed).toBe(false);
    expect(serverManifest.allowedStoragePathPrefixes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
    expect(serverManifest.entries.map((entry: any) => entry.sourceLocale).sort()).toEqual(['ru', 'uk']);
    for (const entry of serverManifest.entries) {
      expect(entry.surface).toBe('flashcard');
      expect(entry.serverPath).toMatch(new RegExp(`^course-packs/fr/${entry.sourceLocale}/flashcard/fr_flashcard_phrase_packs_v1\\.draft/official_marketplace_packs/[a-f0-9]{64}\\.json$`));
      expect(entry.rollbackScope).toBe(`course-packs/fr/${entry.sourceLocale}/`);
      expect(entry.uploadAllowed).toBe(false);
      expect(entry.runtimeDownloadsEnabled).toBe(false);
      expect(fs.existsSync(path.join(ROOT, entry.localArtifactPath))).toBe(true);
    }

    expect(runtimeIsolation.status).toBe('PASS');
    expect(runtimeIsolation.probes.every((probe: any) => probe.pass)).toBe(true);
    expect(adminManifest.status).toBe('PASS_DRY_RUN');
    expect(adminManifest.adminWriteAllowed).toBe(false);
    expect(adminManifest.runtimeAdapter).toMatchObject({
      module: 'app/french_flashcard_remote_runtime.ts',
      marketplaceLoader: 'parseFrenchMarketplacePayload',
      sourceGate: 'app/flashcards_target_gate.ts',
      cacheScope: 'flashcards_v2::fr::flashcards_market_built_cards_v1',
    });
    expect(adminManifest.runtimeAdapter.activationPrecondition).toContain('explicit approval receipt');
    expect(adminManifest.requiredSurfaces).toEqual(expect.arrayContaining([
      'pack_status',
      'description_style_gate',
      'source_evidence_review',
      'server_manifest_preview',
      'runtime_adapter_gate',
      'activation_request',
      'rollback',
    ]));
    expect(adminManifest.evidenceArtifacts.runtimeIsolation).toBe('docs/gustav/runs/2026-07-04_fr_flashcard_phrase_packs_v1/build/fr_flashcard_phrase_pack_runtime_isolation.json');
    expect(rollbackManifest.status).toBe('PASS_DRY_RUN');
    expect(rollbackManifest.rollbackExecuted).toBe(false);
    expect(rollbackManifest.rollbackScopes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
  });

  it('passes production-candidate gates while keeping real activation closed', () => {
    const duplicateAudit = readJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_duplicate_audit.json'));
    const finalGate = readJson(path.join(BUILD_DIR, 'fr_flashcard_phrase_pack_final_gate.json'));
    const review = readJson(path.join(REVIEW_DIR, 'fr_flashcard_phrase_pack_review.json'));

    expect(duplicateAudit.status).toBe('PASS');
    expect(finalGate.status).toBe('PRODUCTION_CANDIDATE_READY_ACTIVATION_HOLD');
    expect(finalGate.contentCandidateReady).toBe(true);
    expect(finalGate.productionCandidateReady).toBe(true);
    expect(finalGate.productionReady).toBe(false);
    expect(finalGate.activationApproved).toBe(false);
    expect(finalGate.gates).toMatchObject({
      packCount: 'PASS',
      cardCount: 'PASS',
      requiredFields: 'PASS',
      sourceEvidence: 'PASS',
      duplicateAudit: 'PASS',
      descriptionStyle: 'PASS',
      serverPackDryRun: 'PASS_DRY_RUN',
      runtimeStorageIsolation: 'PASS',
      adminWorkflowSurface: 'PASS_DRY_RUN',
      rollback: 'PASS_DRY_RUN',
      runtimeActivation: 'HOLD_CLOSED',
    });
    expect(finalGate.holdGates).toEqual(expect.arrayContaining([
      'liveServerUpload',
      'adminActivation',
      'runtimeActivation',
      'rollbackExecution',
    ]));
    expect(review.verdict).toBe('PASS_PRODUCTION_CANDIDATE_ACTIVATION_HOLD');
    expect(review.holds).toEqual(expect.arrayContaining([
      'live_server_upload_not_performed',
      'admin_activation_not_performed',
      'runtime_activation_not_open',
      'rollback_not_executed',
    ]));
  });
});
