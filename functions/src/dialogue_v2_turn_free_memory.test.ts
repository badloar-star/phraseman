// зачем (баг 01.10, прод: Free, social_01 — первый ход access_unavailable): чтение памяти диалогов
// для Free отвечает dialogue_v2_memory_plus_required, и ядро хода превращало это в отказ доступа.
// Доступ к диалогам даёт ранг монеты (D124) — Free идёт с пустой памятью, без чтения.
import { readFileSync } from 'fs';
import { join } from 'path';

const production = readFileSync(join(__dirname, 'dialogue_v2_turn_production_callable.ts'), 'utf8');
const memoryWriter = readFileSync(join(__dirname, 'dialogue_v2_memory_writer.ts'), 'utf8');

describe('ход диалога V2 у Free: память не требуется', () => {
  it('причина бага: чтение памяти — только для Plus', () => {
    expect(memoryWriter).toMatch(/'dialogue_v2_memory_plus_required'/);
  });

  it('Free получает пустую память до чтения Firestore', () => {
    const resolver = production.slice(production.indexOf('resolveStructuredMemory: async ('));
    const freeReturn = resolver.indexOf('if (!isPremium) return FREE_EMPTY_STRUCTURED_MEMORY;');
    const memoryRead = resolver.indexOf('executeDialogueV2MemoryRead(');
    expect(freeReturn).toBeGreaterThan(0);
    expect(memoryRead).toBeGreaterThan(freeReturn);
    expect(production).toMatch(/const FREE_EMPTY_STRUCTURED_MEMORY = Object\.freeze\(\{ sharedSummary: null, scenarioCheckpoint: null \}\);/);
  });
});
