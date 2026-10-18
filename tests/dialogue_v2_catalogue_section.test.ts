import fs from 'fs';
import path from 'path';
import type { DialogueV2CatalogueLearnerItem } from '../components/dialogs/DialogueV2CatalogueSection';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
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

  // 18.10 (Макеты e051906a7, dialogs-006): монета ранга — inline-картинка ВНУТРИ Text строки ранга, через неразрывный пробел:
  // сразу после текста на любой длине и при переносе (на es при 1,3 отдельная монета в ряду уезжала к правому краю).
  test('rank coin is an inline RN Image inside the rank Text, glued by a no-break space', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2CatalogueSection.tsx'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(source).toContain("import { Image as RNImage, Text, View } from 'react-native';");
    expect(source).not.toContain("from 'expo-image'");
    expect(source).toContain("const NO_BREAK_SPACE = '\\u00a0';");
    const textStart = source.indexOf('{labels.lockedAtRank(item.rankRequired)}\n');
    const textEnd = source.indexOf('</Text>', textStart);
    expect(textStart).toBeGreaterThan(-1);
    const inline = source.slice(textStart, textEnd);
    expect(inline).toContain('{NO_BREAK_SPACE}');
    expect(inline).toContain('<RNImage');
    expect(inline).toContain("onLoad={() => logMemCoin('dialogue-catalogue-locked', 16)}");
    // монета больше не отдельный элемент ряда рядом с текстом
    expect(source).not.toContain("<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>");
  });
});
