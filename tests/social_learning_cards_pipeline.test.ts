import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

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
