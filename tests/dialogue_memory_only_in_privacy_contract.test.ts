/**
 * Приказ владельца 11.10: «ПАМЯТЬ ДИАЛОГОВ — ОСТАВЬ ТОЛЬКО В НАСТРОЙКАХ ПРИВАТНОСТИ, НО НЕ В САМОМ РАЗДЕЛЕ».
 * Экран /dialogue_v2_memory и сервер памяти остаются (это контроль данных); меняется только точка входа.
 */
import { readFileSync } from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

describe('«Память диалогов» — только в Настройках → Приватность', () => {
  test('в разделе «Диалоги» строки памяти нет, «Свободный разговор» остаётся', () => {
    const tools = read('components/dialogs/DialogueV2PlusTools.tsx');
    expect(tools).not.toMatch(/id:\s*'memory'/);
    expect(tools).not.toContain('onOpenMemory');
    // 25.10 (Ревизор, прогон 05:00): хаб v4 (6765d7bc5, 22.10) заменил список инструментов `id: 'freeform'` одной плиткой «Свободный разговор» — смысл прежний, меняется только метка
    expect(tools).toContain('testID="dialogue-v2-plus-tool-freeform"');
    expect(tools).toContain('onPress={onOpenFreeform}');
    const container = read('components/dialogs/DialogueV2CatalogueContainer.tsx');
    expect(container).not.toContain('/dialogue_v2_memory');
    expect(container).not.toContain('onOpenMemory');
  });

  test('в Приватности есть пункт, ведущий на экран памяти, без подписи под названием', () => {
    const privacy = read('app/privacy_settings.tsx');
    const at = privacy.indexOf('testID="privacy-dialogue-memory"');
    expect(at).toBeGreaterThan(-1);
    const row = privacy.slice(at, privacy.indexOf('/>', privacy.indexOf("router.push('/dialogue_v2_memory'", at)));
    expect(row).toContain("router.push('/dialogue_v2_memory'");
    expect(row).toContain('Память диалогов');
    expect(row).not.toMatch(/\bsub=/);
  });

  test('сам экран памяти остался и возвращается назад по стеку', () => {
    const screen = read('app/dialogue_v2_memory.tsx');
    expect(screen).toContain('safeRouterBack(');
  });
});
