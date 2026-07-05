import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'collectibles');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_collectible_cards_v1.mjs');
const DALLE_RUNNER_PATH = path.join(ROOT, 'scripts', 'gustav_generate_fr_collectible_dalle_images.mjs');
const SPEC_PATH = path.join(ROOT, 'specs', 'gustav-french-collectible-cards-v1.md');

function readJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(OUT_DIR, fileName), 'utf8')) as T;
}

function readJsonl<T>(fileName: string): T[] {
  return fs.readFileSync(path.join(OUT_DIR, fileName), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

describe('Gustav French collectible cards v1', () => {
  it('keeps the French collectible candidate shape equal to English while production remains closed', () => {
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const dalleRunner = fs.readFileSync(DALLE_RUNNER_PATH, 'utf8');
    const spec = fs.readFileSync(SPEC_PATH, 'utf8');
    const catalog = readJson<any>('fr_collectible_catalog_v1.json');
    const audit = readJson<any>('fr_collectible_english_blueprint_audit_v1.json');
    const sources = readJson<any>('fr_collectible_source_evidence_manifest_v1.json');
    const handoff = readJson<any>('fr_collectible_admin_handoff_v1.json');
    const finalGate = readJson<any>('fr_collectible_final_gate_v1.json');
    const dalleQueue = readJsonl<any>('fr_collectible_dalle_queue_v1.jsonl');

    expect(spec).toContain('30 sets');
    expect(spec).toContain('French-Native Content');
    expect(script).toContain('englishCatalogModified: false');
    expect(script).toContain('lessonFilesModified: false');
    expect(script).toContain('generatedInThisBuild: false');
    expect(dalleRunner).toContain('requireOpenAiDevSpendGuard');
    expect(dalleRunner).toContain('requireCodexOpenAiTtsOnly');
    expect(dalleRunner).toContain('Expected 330 French collectible DALL-E queue items');
    expect(dalleRunner).toContain('writesOnlyCodexTmpAndCollectibleDalliAssets: true');
    expect(dalleRunner).toContain("fit: 'cover'");

    expect(catalog.schemaVersion).toBe('gustav-fr-collectible-cards-catalog-v1');
    expect(catalog.studyTarget).toBe('fr');
    expect(catalog.targetContentLang).toBe('fr');
    expect(catalog.sourceLocales).toEqual(['ru', 'uk']);
    expect(catalog.activationApproved).toBe(false);
    expect(catalog.sets).toHaveLength(30);
    expect(JSON.stringify(catalog)).not.toContain('sourceEnglish');
    expect(JSON.stringify(catalog)).not.toContain('sourceEnglishCardId');
    expect(JSON.stringify(catalog)).not.toContain('sourceEnglishSetId');
    expect(JSON.stringify(catalog)).not.toContain('sourceTitleEn');

    const allCards = catalog.sets.flatMap((set: any) => set.cards);
    const allSecrets = catalog.sets.map((set: any) => set.secret);
    const allRows = [...allCards, ...allSecrets];
    expect(allCards).toHaveLength(300);
    expect(allSecrets).toHaveLength(30);
    expect(allRows).toHaveLength(330);

    const rarityCounts = allCards.reduce((acc: Record<string, number>, row: any) => {
      acc[row.rarity] = (acc[row.rarity] || 0) + 1;
      return acc;
    }, {});
    expect(rarityCounts).toEqual({ common: 150, rare: 90, epic: 45, legendary: 15 });

    const ids = new Set<string>();
    for (const set of catalog.sets) {
      expect(set.setId).toMatch(/^fr_set\d{2}_/);
      expect(set.setId).not.toMatch(/animals|food|weather|money|british|american/);
      expect(set.cards).toHaveLength(10);
      expect(set.secret.kind).toBe('secret');
      expect(set.secret.id).toMatch(/^fr_/);
      const perSetCounts = set.cards.reduce((acc: Record<string, number>, row: any) => {
        acc[row.rarity] = (acc[row.rarity] || 0) + 1;
        return acc;
      }, {});
      if (set.type === 'A') {
        expect(perSetCounts).toEqual({ common: 5, rare: 3, epic: 2 });
      } else {
        expect(perSetCounts).toEqual({ common: 5, rare: 3, epic: 1, legendary: 1 });
      }
    }

    for (const row of allRows) {
      expect(ids.has(row.id)).toBe(false);
      ids.add(row.id);
      expect(row.id).toMatch(/^fr_/);
      expect(row.studyTarget).toBe('fr');
      expect(row.targetContentLang).toBe('fr');
      expect(row.fr).toMatch(/[A-Za-zÀ-ÿœŒçÇ]/);
      expect(row.fr).not.toMatch(/\b(hold your horses|piece of cake|red flag|when pigs fly)\b/i);
      expect(row.ru).toMatch(/[А-Яа-яЁё]/);
      expect(row.literalRu).toMatch(/[А-Яа-яЁё]/);
      expect(row.meaningRu).toMatch(/[А-Яа-яЁё]/);
      expect(row.exampleFr).toContain(row.fr);
      expect(row.exampleRu).toMatch(/[А-Яа-яЁё]/);
      expect(row.originRu).toMatch(/[А-Яа-яЁё]/);
      expect(row.sourceEvidence.length).toBeGreaterThanOrEqual(2);
      expect(row.sourceVerificationStatus).toBe('QUEUED_FOR_LIVE_SOURCE_CHECK');
      expect(row.reviewerStatus).toBe('needs_llm_trusted_source_review');
      expect(row.acceptedForProduction).toBe(false);
      expect(row.activationApproved).toBe(false);
      expect(row.sourceEnglishCardId).toBeUndefined();
      expect(row.sourceEnglishSetId).toBeUndefined();
      for (const evidence of row.sourceEvidence) {
        expect(evidence.url).toMatch(/^https:\/\//);
        expect(evidence.liveFetchedInThisBuild).toBe(false);
      }
    }

    expect(audit.status).toBe('PASS_BLUEPRINT_SHAPE_PARITY_CANDIDATE_READY');
    expect(audit.parity).toMatchObject({
      sets: true,
      cards: true,
      secrets: true,
      rarity: true,
      perSetShape: true,
    });
    expect(audit.frenchCounts).toMatchObject({
      sets: 30,
      cards: 300,
      secrets: 30,
      rows: 330,
      rarity: { common: 150, rare: 90, epic: 45, legendary: 15 },
    });
    expect(audit.blueprintMapping).toHaveLength(30);
    expect(audit.blueprintMapping[0]).toMatchObject({
      englishSourceSetId: 'set01_animals',
      parityOnly: true,
    });
    expect(audit.blueprintMapping[0].rows[0]).toMatchObject({
      englishSourceCardId: 'animals_01',
      rarity: 'common',
      parityOnly: true,
    });

    expect(sources.status).toBe('HOLD_LIVE_SOURCE_FETCH_NOT_EXECUTED');
    expect(sources.rows).toHaveLength(330);
    expect(sources.summary).toMatchObject({
      rows: 330,
      rowsWithAtLeastTwoTrustedSources: 330,
      liveFetchedRows: 0,
      readyForProductionActivation: false,
      activationApproved: false,
    });

    expect(dalleQueue).toHaveLength(330);
    for (const item of dalleQueue) {
      expect(item.cardId).toMatch(/^fr_/);
      expect(item.setId).toMatch(/^fr_set\d{2}_/);
      expect(item.prompt).toContain('matching the approved PhraseMan Collectibles raster style guide');
      expect(item.prompt).not.toContain('English Collectibles');
      expect(item.prompt).toContain('warm cinematic 3D storybook illustration style');
      expect(item.prompt).toContain('1024x819 landscape collectible art frame');
      expect(item.prompt).toContain('no flat SVG look');
      expect(item.prompt).not.toContain('transparent background');
      expect(item.prompt).not.toContain('Flat children-book vector-like');
      expect(item.prompt).toContain(item.fr);
      expect(item.sourcePath).toMatch(/^\.codex-tmp\/collectibles-dalli\/sources\/fr_set/);
      expect(item.targetPath).toMatch(/^assets\/images\/collectibles\/dalli\/fr_set/);
      expect(item.generatedInThisBuild).toBe(false);
      expect(item.activationApproved).toBe(false);
    }

    expect(handoff.status).toBe('READY_FOR_ADMIN_DRAFT_PRODUCTION_HOLD');
    expect(handoff.summary).toMatchObject({
      sets: 30,
      rows: 330,
      regularCards: 300,
      secretCards: 30,
      dalleQueueItems: 330,
      productionReady: false,
      activationApproved: false,
      liveUploadPerformed: false,
      runtimeApplyPerformed: false,
    });

    expect(finalGate.status).toBe('HOLD_CANDIDATE_READY_ASSETS_AND_LIVE_SOURCE_CHECK_OPEN');
    expect(finalGate.productionReady).toBe(false);
    expect(finalGate.summary).toMatchObject({
      sets: 30,
      rows: 330,
      regularCards: 300,
      secretCards: 30,
      dalleQueueItems: 330,
      dalleQueueReady: true,
      activationApproved: false,
    });
    const actualGeneratedWebpAssets = dalleQueue.filter((item: any) =>
      fs.existsSync(path.join(ROOT, item.targetPath)),
    ).length;
    expect(finalGate.summary.generatedWebpAssets).toBe(actualGeneratedWebpAssets);
    expect(finalGate.generatedWebpAssetPaths).toHaveLength(actualGeneratedWebpAssets);
    expect(finalGate.holdGates).toEqual(expect.arrayContaining([
      'live_source_verification_all_330',
      'dalle_generation_all_330',
      'image_upload_url_map',
      'runtime_server_target_isolation_apply',
      'explicit_activation_approval',
    ]));
    expect(finalGate.safety).toMatchObject({
      activationApproved: false,
      liveUploadPerformed: false,
      runtimeApplyPerformed: false,
      englishCatalogModified: false,
      lessonFilesModified: false,
    });
  });
});
