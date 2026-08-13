import fs from 'fs';
import path from 'path';

describe('admin onboarding source statistics pagination contract', () => {
  const root = process.cwd();
  const adminHtml = fs.readFileSync(path.join(root, 'admin', 'legacy.html'), 'utf8');
  const fetchSource = adminHtml.match(
    /async function onboardingSourceFetchRows[\s\S]*?(?=\n  function onboardingSourceRowsCard)/,
  )?.[0] ?? '';
  const firestoreIndexes = JSON.parse(
    fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8'),
  ) as {
    indexes?: Array<{
      collectionGroup?: string;
      queryScope?: string;
      fields?: Array<{ fieldPath?: string; order?: string }>;
    }>;
  };

  it('queries only source answers and paginates through the complete selected period', () => {
    expect(fetchSource).toContain("where('action', '==', 'onboarding_source_select')");
    expect(fetchSource).toContain("orderBy('createdAtMs', 'asc')");
    expect(fetchSource).toContain('startAfter(cursor)');
    expect(fetchSource).toContain('while (true)');
    expect(fetchSource).not.toContain('limit(3000)');
  });

  it('declares the composite index required by the exact source-answer query', () => {
    expect(firestoreIndexes.indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        collectionGroup: 'app_activity',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'action', order: 'ASCENDING' },
          { fieldPath: 'createdAtMs', order: 'ASCENDING' },
        ],
      }),
    ]));
  });
});
