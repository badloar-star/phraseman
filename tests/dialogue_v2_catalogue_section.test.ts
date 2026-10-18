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
const { groupDialogueV2CatalogueItemsByWorld, titleBrokeMidWord, glueRankNumber, counterBelowAllReasonAfterLayout }: typeof import('../components/dialogs/DialogueV2CatalogueSection') = require(
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
    const textStart = source.indexOf('{glueRankNumber(labels.lockedAtRank(item.rankRequired), item.rankRequired)}\n');
    const textEnd = source.indexOf('</Text>', textStart);
    expect(textStart).toBeGreaterThan(-1);
    const inline = source.slice(textStart, textEnd);
    expect(inline).toContain('{NO_BREAK_SPACE}');
    expect(inline).toContain('<RNImage');
    expect(inline).toContain("onLoad={() => logMemCoin('dialogue-catalogue-locked', 16)}");
    // монета больше не отдельный элемент ряда рядом с текстом
    expect(source).not.toContain("<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>");
  });

  // 18.10 (Макеты 4a2237e12, dialogs-006 при 1,3): «Повседневно/е» рвалось посреди слова — тогда счётчик уходит под название (без ужатия);
  // «ранге 1 🪙» не разрывается между словом и числом.
  test('mid-word title break is detected and the rank number is glued to its word', () => {
    expect(titleBrokeMidWord([{ text: 'Повседневно' }, { text: 'е' }])).toBe(true);
    expect(titleBrokeMidWord([{ text: 'Каждый ' }, { text: 'день' }])).toBe(false);
    expect(titleBrokeMidWord([{ text: 'Повседневное' }])).toBe(false);
    expect(titleBrokeMidWord([{ text: 'Day-' }, { text: 'to-day' }])).toBe(false);
    expect(glueRankNumber('Откроется на ранге 1', 1)).toBe('Откроется на ранге 1');
    expect(glueRankNumber('Se desbloquea en el rango 12', 12)).toBe('Se desbloquea en el rango 12');
    expect(glueRankNumber('Wird ab Rang 3 freigeschaltet', 3)).toBe('Wird ab Rang 3 freigeschaltet');
    expect(glueRankNumber('3. rütbede açılır', 3)).toBe('3. rütbede açılır');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2CatalogueSection.tsx'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(source).toContain('{countStacked ? countNode : null}');
    expect(source).toContain('{countStacked ? null : countNode}');
    expect(source).toContain("fontVariant: ['tabular-nums'], flexShrink: 0");
    expect(source).not.toContain('adjustsFontSizeToFit');
  });

  // 18.10 (координатор 05:06/05:19): раскрытая шапка рвала «Повседневно/е»; решение «счётчик под название» одно на весь список
  // и действует в обоих видах (поведение — tests/dialogue_v2_catalogue_counter_uniform.test.tsx).
  test('counter placement is one list-level decision for both views', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2CatalogueSection.tsx'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(source).toContain('const countStacked = counterBelowAllReason !== null;');
    expect(source).not.toContain('!expanded && stackedCountWorldIds');
    expect(source).toContain('setCounterBelowAllReason((current) => current ?? reason);');
    // заголовок с onTextLayout один на оба вида — раскрытая шапка проходит ту же проверку titleBrokeMidWord
    expect(source.match(/onTextLayout=/g)?.length).toBe(1);
    expect(source).toContain('counterBelowAllReasonAfterLayout(counterBelowAllReason, world.id, expanded, event.nativeEvent.lines)');
    expect(source).toContain('[DIALOGUE-V2] catalogue:counter_below_all reason=${reason}');
  });

  // 18.10 (координатор 05:19, Макеты 680f1372c): однородность — раскладка всех карточек решается одним значением на список.
  test('one mid-word break anywhere moves every counter below, once, in both views', () => {
    const split = [{ text: 'Повседневно' }, { text: 'е' }];
    const whole = [{ text: 'Поездки' }];
    // Все названия переносятся по словам — решение не принимается, счётчики справа у всех.
    let reason: string | null = null;
    for (const [id, lines] of [['everyday', whole], ['travel', whole]] as const) reason = counterBelowAllReasonAfterLayout(reason, id, false, lines);
    expect(reason).toBeNull();
    // Разрыв у одной карточки — причина названа её id; соседние раскладки и раскрытие решение не меняют (без мигания).
    reason = counterBelowAllReasonAfterLayout(reason, 'everyday', false, split);
    expect(reason).toBe('everyday');
    reason = counterBelowAllReasonAfterLayout(reason, 'travel', false, whole);
    reason = counterBelowAllReasonAfterLayout(reason, 'travel', true, split);
    expect(reason).toBe('everyday');
    // Разрыв только в раскрытой шапке тоже решает за весь список.
    expect(counterBelowAllReasonAfterLayout(null, 'everyday', true, split)).toBe('everyday#open');
    // Место счётчика у карточки зависит только от решения списка — одно и то же для каждой карточки в обоих видах.
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2CatalogueSection.tsx'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(source).not.toMatch(/const countStacked = [^;]*(world\.id|expanded)/);
  });
});
