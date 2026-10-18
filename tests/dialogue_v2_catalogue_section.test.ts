import fs from 'fs';
import path from 'path';
import type { DialogueV2CatalogueLearnerItem } from '../components/dialogs/DialogueV2CatalogueSection';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
// зачем (R129): монета закрытой строки — expo-image (декод под размер вида)
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('../components/feedback/PressableScale', () => ({ PressableScale: 'PressableScale' }));
jest.mock('../components/dialogs/glass/DialogueGlassKit', () => ({ useDialogueGlass: () => ({}), dialogueGlassCardStyle: () => ({}) }));
jest.mock('../app/smooth_layout', () => ({ animateNextLayoutTransition: () => undefined }));

// The component's native dependencies are deliberately mocked above; loading
// after those mocks keeps this node-level catalogue contract deterministic.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { groupDialogueV2CatalogueItemsByWorld }: typeof import('../components/dialogs/DialogueV2CatalogueSection') = require(
  '../components/dialogs/DialogueV2CatalogueSection',
);

describe('DialogueV2CatalogueSection', () => {
  test('groups released learner-facing rows by the supplied world order without deciding access', () => {
    const rows: readonly DialogueV2CatalogueLearnerItem[] = [
      {
        id: 'work_01',
        worldId: 'work',
        title: 'Согласовать время',
        cefr: 'A1',
        rankRequired: 1,
        status: 'available',
      },
      {
        id: 'social_02',
        worldId: 'social',
        title: 'Поддержать разговор',
        cefr: 'A1',
        rankRequired: 2,
        status: 'locked',
      },
      {
        id: 'social_01',
        worldId: 'social',
        title: 'Поздороваться в чате',
        cefr: 'A1',
        rankRequired: 1,
        status: 'done',
      },
      {
        id: 'outside_01',
        worldId: 'outside',
        title: 'Не отображать',
        cefr: 'A1',
        rankRequired: 1,
        status: 'available',
      },
    ];

    expect(groupDialogueV2CatalogueItemsByWorld(rows, [
      { id: 'social', title: 'Общение' },
      { id: 'work', title: 'Дела' },
    ])).toEqual([
      {
        world: { id: 'social', title: 'Общение' },
        items: [rows[1], rows[2]],
      },
      {
        world: { id: 'work', title: 'Дела' },
        items: [rows[0]],
      },
    ]);
  });

  test('keeps locked rows rank-only and delegates every row press to its caller', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2CatalogueSection.tsx'),
      'utf8',
    );

    expect(source).toContain("status: 'available' | 'done' | 'locked';");
    expect(source).toContain('onPress={() => onPressItem(item)}');
    expect(source).toContain("name=\"lock-closed\"");
    expect(source).toContain('coinRankRowForDisplay(item.rankRequired).source');
    // 04.10 (dialogs.html A4 `.stack`): строки раскрытой категории через 9.
    expect(source).toContain('<View style={{ marginTop: 18, gap: 9 }}>');
    expect(source).not.toContain('hasPremiumAccess');
    expect(source).not.toContain('purchase');
    // Строка ранга локализуется вызывающим (labels.lockedAtRank), не зашивается здесь.
    expect(source).not.toContain('Откроется на ранге');
    expect(source).toContain('labels.lockedAtRank(item.rankRequired)');
  });
});
