import fs from 'fs';
import path from 'path';

describe('Arena invites Firestore index', () => {
  test('supports the incoming pending invites query', () => {
    const config = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'firestore.indexes.json'), 'utf8'),
    ) as {
      indexes: Array<{
        collectionGroup: string;
        fields: Array<{ fieldPath: string; order: string }>;
      }>;
    };

    expect(config.indexes).toContainEqual({
      collectionGroup: 'arena_invites',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'friendStableUid', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'createdAt', order: 'DESCENDING' },
      ],
    });
  });
});
