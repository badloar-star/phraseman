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

// зачем (баг 02.10, прод: модель перестаёт присылать «coaching» со 2-го хода — цели диалога стоят):
// история хранит прошлые ответы как {"replies":…}; инструкция обязана требовать разбор на каждом ходе.
import { dialogueV2CoachingPromptLines } from './dialogue_v2_turn_coaching';

describe('ход диалога V2: разбор обязателен на каждом ходе', () => {
  it('инструкция предупреждает, что укороченная история — не формат ответа', () => {
    const lines = dialogueV2CoachingPromptLines('ru').join('\n');
    expect(lines).toMatch(/every response you write MUST include the full "coaching" object/);
  });
});

// зачем (баг 02.10, прод-лог: модель пропускала «coaching» на ходах 1–3 и после инструкции):
// ход с разбором запрашивает строгую схему, где «coaching» — обязательное поле ответа.
import { dialogueV2CoachingResponseFormat } from './dialogue_v2_turn_coaching';

describe('ход диалога V2: строгая схема ответа с обязательным разбором', () => {
  it('схема требует replies и coaching со всеми семью полями', () => {
    const format = dialogueV2CoachingResponseFormat() as {
      type: string;
      json_schema: { strict: boolean; schema: { required: string[]; properties: { coaching: { required: string[] } } } };
    };
    expect(format.type).toBe('json_schema');
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.schema.required).toEqual(['replies', 'coaching']);
    expect(format.json_schema.schema.properties.coaching.required).toEqual([
      'replyTranslations', 'replyExplanations', 'betterPhrasing', 'hint', 'mood', 'activeObjectiveId', 'dialogueEnded',
    ]);
  });

  it('продовый генератор включает схему для хода с разбором', () => {
    expect(production).toMatch(/response_format: coachingRequested \? dialogueV2CoachingResponseFormat\(\) : \{ type: 'json_object' \}/);
  });
});
