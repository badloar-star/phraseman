import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import sharp from 'sharp';

type ValidationResult = {
  ok: boolean;
  value: Record<string, unknown> | null;
  errors: string[];
};

type SchemaModule = {
  CARD_STATUSES: string[];
  validateCardManifest(input: unknown): ValidationResult;
  canMutateRevision(status: string): boolean;
};

type PathsModule = {
  resolveInside(root: string, relativePath: string): string;
  revisionKey(contentId: string, revision: number): string;
};

type PromptsModule = {
  buildAtlasPrompt(card: Record<string, unknown>): string;
  buildReplacementPrompt(card: Record<string, unknown>, itemId: string): string;
};

type CliModule = {
  NETWORK_POLICY: 'offline_only';
  prepareCardBrief(options: {
    card: Record<string, unknown>;
    outputRoot: string;
  }): Promise<{ revisionDir: string; checkpointPath: string }>;
};

type ImportAtlasModule = {
  importAtlas(options: {
    card: Record<string, unknown>;
    atlasPath: string;
    revisionDir: string;
  }): Promise<{
    cells: Array<{ itemId: string; path: string; sha256: string; width: number; height: number }>;
    checkpointPath: string;
  }>;
};

type RenderResult = { layoutPath: string; svgPath: string; jpegPath: string; sha256: string };
type RenderModule = {
  renderLearningSlide(options: {
    card: Record<string, unknown>;
    cellPaths: Record<string, string>;
    outputPath: string;
  }): Promise<RenderResult>;
  renderInstallSlide(options: {
    card: Record<string, unknown>;
    appScreenshotPath: string;
    heroCellPath: string;
    outputPath: string;
  }): Promise<RenderResult>;
};

const root = process.cwd();
const importEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

async function loadModules(): Promise<{ schema: SchemaModule; paths: PathsModule }> {
  const schemaPath = path.join(root, 'tools', 'social-learning-cards', 'src', 'schema.mjs');
  const pathsPath = path.join(root, 'tools', 'social-learning-cards', 'src', 'paths.mjs');
  const [schema, paths] = await Promise.all([
    importEsm(pathToFileURL(schemaPath).href),
    importEsm(pathToFileURL(pathsPath).href),
  ]);
  return { schema: schema as SchemaModule, paths: paths as PathsModule };
}

async function loadPrompts(): Promise<PromptsModule> {
  const promptsPath = path.join(root, 'tools', 'social-learning-cards', 'src', 'prompts.mjs');
  return (await importEsm(pathToFileURL(promptsPath).href)) as PromptsModule;
}

async function loadCli(): Promise<CliModule> {
  const cliPath = path.join(root, 'tools', 'social-learning-cards', 'src', 'cli.mjs');
  return (await importEsm(pathToFileURL(cliPath).href)) as CliModule;
}

async function loadImportAtlas(): Promise<ImportAtlasModule> {
  const modulePath = path.join(root, 'tools', 'social-learning-cards', 'src', 'import-atlas.mjs');
  return (await importEsm(pathToFileURL(modulePath).href)) as ImportAtlasModule;
}

async function loadRender(): Promise<RenderModule> {
  const modulePath = path.join(root, 'tools', 'social-learning-cards', 'src', 'render.mjs');
  return (await importEsm(pathToFileURL(modulePath).href)) as RenderModule;
}

function readFixture(): Record<string, unknown> {
  const fixturePath = path.join(
    root,
    'functions',
    'src',
    'contracts',
    'social_learning_card_manifest_v1.fixture.json',
  );
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
}

describe('social learning card manifest contract', () => {
  it('accepts the shared version-one fixture without coercion', async () => {
    const { schema } = await loadModules();
    const fixture = readFixture();

    const result = schema.validateCardManifest(fixture);

    expect(result).toEqual({ ok: true, value: fixture, errors: [] });
    expect(schema.CARD_STATUSES).toEqual([
      'idea',
      'copy_ready',
      'waiting_dalle',
      'images_ready',
      'review',
      'ready',
      'published',
      'collecting',
      'scored',
    ]);
  });

  it.each([8, 10])('rejects a manifest containing %i learning items', async (count) => {
    const { schema } = await loadModules();
    const fixture = readFixture();
    const items = (fixture.items as unknown[]).slice(0, count);
    if (count === 10) items.push({ ...(items[0] as object), id: 'item_10', english: 'extra' });

    const result = schema.validateCardManifest({ ...fixture, items });

    expect(result.ok).toBe(false);
    expect(result.value).toBeNull();
    expect(result.errors.join('\n')).toContain('/items');
  });

  it('rejects duplicate labels and unknown fields', async () => {
    const { schema } = await loadModules();
    const fixture = readFixture();
    const items = (fixture.items as Array<Record<string, unknown>>).map((item) => ({ ...item }));
    items[1].english = items[0].english;

    const result = schema.validateCardManifest({ ...fixture, unexpected: true, items });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('additionalProperties');
    expect(result.errors.join('\n')).toContain('duplicate_english');
  });

  it('does not allow immutable revision statuses to be changed', async () => {
    const { schema } = await loadModules();

    expect(schema.canMutateRevision('copy_ready')).toBe(true);
    expect(schema.canMutateRevision('published')).toBe(false);
    expect(schema.canMutateRevision('collecting')).toBe(false);
    expect(schema.canMutateRevision('scored')).toBe(false);
  });
});

describe('social learning card paths', () => {
  it('resolves a revision path inside its output root', async () => {
    const { paths } = await loadModules();
    const outputRoot = path.join(root, 'output', 'social-learning-cards');

    expect(paths.revisionKey('slc_pilot_01_taste', 1)).toBe('slc_pilot_01_taste/revision_001');
    expect(paths.resolveInside(outputRoot, 'slc_pilot_01_taste/revision_001')).toBe(
      path.join(outputRoot, 'slc_pilot_01_taste', 'revision_001'),
    );
  });

  it.each(['../outside', '..\\outside', 'C:\\outside'])('rejects unsafe path %s', async (unsafePath) => {
    const { paths } = await loadModules();
    const outputRoot = path.join(root, 'output', 'social-learning-cards');

    expect(() => paths.resolveInside(outputRoot, unsafePath)).toThrow(/path_(traversal|absolute)/);
  });
});

describe('DALL-E file brief generation', () => {
  it('builds one text-free atlas prompt containing every cell contract', async () => {
    const prompts = await loadPrompts();
    const fixture = readFixture();

    const prompt = prompts.buildAtlasPrompt(fixture);

    expect(prompt).toContain('EXACT 3x3 GRID');
    expect(prompt).toContain('NO TEXT');
    expect(prompt).toContain('adult audience aged 20-50');
    expect(prompt).toContain('same woman');
    for (const item of fixture.items as Array<Record<string, string>>) {
      expect(prompt).toContain(`[${item.id}]`);
      expect(prompt).toContain(item.visualBrief);
    }
  });

  it('builds a replacement prompt for exactly one requested cell', async () => {
    const prompts = await loadPrompts();
    const fixture = readFixture();

    const prompt = prompts.buildReplacementPrompt(fixture, 'item_05');

    expect(prompt).toContain('[item_05]');
    expect(prompt).toContain('Same woman reacting to a spicy red soup');
    expect(prompt).not.toContain('[item_04]');
    expect(prompt).not.toContain('[item_06]');
    expect(() => prompts.buildReplacementPrompt(fixture, 'item_99')).toThrow('unknown_item');
  });

  it('writes prompts and a prompt-ready checkpoint without network output', async () => {
    const cli = await loadCli();
    const fixture = readFixture();
    const outputRoot = path.join(root, '.codex-tmp', 'social-learning-cards-tests', 'prepare');
    fs.rmSync(outputRoot, { recursive: true, force: true });

    const result = await cli.prepareCardBrief({ card: fixture, outputRoot });
    const checkpoint = JSON.parse(fs.readFileSync(result.checkpointPath, 'utf8'));

    expect(fs.readFileSync(path.join(result.revisionDir, 'dalle', 'atlas-prompt.txt'), 'utf8')).toContain(
      'EXACT 3x3 GRID',
    );
    expect(JSON.parse(fs.readFileSync(path.join(result.revisionDir, 'dalle', 'replacement-prompts.json'), 'utf8'))).toHaveLength(9);
    expect(checkpoint).toMatchObject({
      schemaVersion: 1,
      contentId: 'slc_pilot_01_taste',
      revision: 1,
      stage: 'prompt_ready',
      atlasPath: null,
      verifiedAt: null,
    });
    expect(cli.NETWORK_POLICY).toBe('offline_only');

    const sourceDir = path.join(root, 'tools', 'social-learning-cards', 'src');
    const source = fs
      .readdirSync(sourceDir)
      .filter((name) => name.endsWith('.mjs'))
      .map((name) => fs.readFileSync(path.join(sourceDir, name), 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/from ['"]openai|require\(['"]openai|\/v1\/images/);
    expect(source).not.toContain('process.env.OPENAI_API_KEY');
    expect(source).not.toContain('process.env.OPENAI_TTS_API_KEY');
    expect(source).not.toMatch(/\bfetch\s*\(|node:https|node:http/);
  });
});

describe('DALL-E atlas import', () => {
  const tempRoot = path.join(root, '.codex-tmp', 'social-learning-cards-tests', 'atlas');

  beforeEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(tempRoot, { recursive: true });
  });

  it('cuts a verified 3x3 RGB atlas into nine hashed cells', async () => {
    const importer = await loadImportAtlas();
    const fixture = readFixture();
    const atlasPath = path.join(tempRoot, 'atlas.png');
    const revisionDir = path.join(tempRoot, 'revision_001');
    await sharp({ create: { width: 900, height: 900, channels: 3, background: '#f4f1ea' } })
      .png()
      .toFile(atlasPath);

    const result = await importer.importAtlas({ card: fixture, atlasPath, revisionDir });

    expect(result.cells).toHaveLength(9);
    for (const cell of result.cells) {
      expect(cell).toMatchObject({ width: 300, height: 300 });
      expect(cell.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(fs.existsSync(cell.path)).toBe(true);
      const metadata = await sharp(cell.path).metadata();
      expect(metadata).toMatchObject({ width: 300, height: 300, channels: 3 });
    }
    const checkpoint = JSON.parse(fs.readFileSync(result.checkpointPath, 'utf8'));
    expect(checkpoint).toMatchObject({ stage: 'atlas_imported', atlasPath });
    expect(checkpoint.cells).toHaveLength(9);
  });

  it('rejects an atlas whose dimensions cannot be divided into the declared grid', async () => {
    const importer = await loadImportAtlas();
    const fixture = readFixture();
    const atlasPath = path.join(tempRoot, 'bad-atlas.png');
    await sharp({ create: { width: 901, height: 900, channels: 3, background: '#ffffff' } })
      .png()
      .toFile(atlasPath);

    await expect(
      importer.importAtlas({ card: fixture, atlasPath, revisionDir: path.join(tempRoot, 'revision_001') }),
    ).rejects.toThrow('atlas_dimensions_not_divisible');
  });
});

describe('two-slide renderer', () => {
  const tempRoot = path.join(root, '.codex-tmp', 'social-learning-cards-tests', 'render');

  beforeEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(tempRoot, { recursive: true });
  });

  async function createRenderInputs() {
    const fixture = readFixture();
    const cellPaths: Record<string, string> = {};
    for (const [index, item] of (fixture.items as Array<Record<string, string>>).entries()) {
      const cellPath = path.join(tempRoot, `${item.id}.png`);
      await sharp({
        create: {
          width: 300,
          height: 300,
          channels: 3,
          background: { r: 235 - index * 3, g: 230, b: 220 + index * 3 },
        },
      }).png().toFile(cellPath);
      cellPaths[item.id] = cellPath;
    }
    const screenshotPath = path.join(tempRoot, 'app-screen.png');
    await sharp({ create: { width: 600, height: 1200, channels: 3, background: '#151b24' } })
      .png()
      .toFile(screenshotPath);
    return { fixture, cellPaths, screenshotPath };
  }

  it('renders a learning slide from a measurable safe layout model', async () => {
    const renderer = await loadRender();
    const { fixture, cellPaths } = await createRenderInputs();
    const outputPath = path.join(tempRoot, 'slide_01_learning.jpg');

    const result = await renderer.renderLearningSlide({ card: fixture, cellPaths, outputPath });
    const layout = JSON.parse(fs.readFileSync(result.layoutPath, 'utf8'));
    const metadata = await sharp(result.jpegPath).metadata();

    expect(layout).toMatchObject({ width: 1080, height: 1080, safeArea: 48, title: { text: 'TASTE VOCABULARY' } });
    expect(layout.title.fontSize).toBeGreaterThanOrEqual(56);
    expect(layout.cells).toHaveLength(9);
    for (const cell of layout.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(48);
      expect(cell.y).toBeGreaterThanOrEqual(48);
      expect(cell.x + cell.width).toBeLessThanOrEqual(1032);
      expect(cell.y + cell.height).toBeLessThanOrEqual(1032);
      expect(cell.englishFontSize).toBeGreaterThanOrEqual(34);
    }
    expect(fs.readFileSync(result.svgPath, 'utf8')).toContain('TASTE VOCABULARY');
    expect(metadata).toMatchObject({ width: 1080, height: 1080, format: 'jpeg', space: 'srgb', channels: 3 });
    expect(fs.statSync(result.jpegPath).size).toBeLessThanOrEqual(1_500_000);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('renders an install slide with exact CTA and screenshot reference before rasterization', async () => {
    const renderer = await loadRender();
    const { fixture, cellPaths, screenshotPath } = await createRenderInputs();
    const outputPath = path.join(tempRoot, 'slide_02_install.jpg');

    const result = await renderer.renderInstallSlide({
      card: fixture,
      appScreenshotPath: screenshotPath,
      heroCellPath: cellPaths.item_01,
      outputPath,
    });
    const layout = JSON.parse(fs.readFileSync(result.layoutPath, 'utf8'));
    const svg = fs.readFileSync(result.svgPath, 'utf8');

    expect(layout.screenshot.path).toBe(screenshotPath);
    expect(layout.cta).toMatchObject({
      title: 'Установи Phraseman бесплатно',
      titleLines: ['Установи Phraseman', 'бесплатно'],
      subtitle: 'Первый урок — через 30 секунд',
      footer: 'Ссылка в профиле',
    });
    expect(layout.cta.fontSize).toBeGreaterThanOrEqual(34);
    expect(layout.cta.x).toBeGreaterThanOrEqual(48);
    expect(svg).toContain('Установи Phraseman</text>');
    expect(svg).toContain('бесплатно</text>');
    expect(svg).toContain('Первый урок — через 30 секунд');
    expect(svg).toContain('Ссылка в профиле');
    const metadata = await sharp(result.jpegPath).metadata();
    expect(metadata).toMatchObject({ width: 1080, height: 1080, format: 'jpeg', space: 'srgb', channels: 3 });
  });
});
