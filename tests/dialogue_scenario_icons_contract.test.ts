// зачем (владелец 13.10): у каждой сценки Диалогов свой значок; таблица покрывает все выпущенные сценки, имена — из Ionicons.
import fs from 'node:fs';
import path from 'node:path';
import { DIALOGUE_SCENARIO_ICON, dialogueScenarioIcon } from '../components/dialogs/dialogue_scenario_icons';

const root = path.join(__dirname, '..');
const glyphs: Record<string, number> = JSON.parse(
  fs.readFileSync(path.join(root, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'), 'utf8'),
);

describe('значки сценок Диалогов', () => {
  it('каждое имя есть в наборе Ionicons', () => {
    expect(Object.entries(DIALOGUE_SCENARIO_ICON).filter(([, n]) => !(n in glyphs))).toEqual([]);
  });

  it('таблица покрывает каждую выпущенную сценку кандидата', () => {
    const candidate = JSON.parse(fs.readFileSync(path.join(root, 'content/dialogues-v2/release-candidate/dialogue_v2_content_candidate.v1.json'), 'utf8'));
    const ids = [...new Set((candidate.packets as Array<{ sourceScenarioId: string }>).map((p) => p.sourceScenarioId))];
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id) => !(id in DIALOGUE_SCENARIO_ICON))).toEqual([]);
  });

  it('неизвестная сценка — запасной значок мира; известная — свой', () => {
    expect(dialogueScenarioIcon('unknown_99', 'cafe')).toBe('cafe');
    expect(dialogueScenarioIcon('travel_02', 'airplane')).toBe('key');
  });

  it('строка каталога берёт значок сценки с запасным значком мира', () => {
    const src = fs.readFileSync(path.join(root, 'components/dialogs/DialogueV2CatalogueSection.tsx'), 'utf8');
    expect(src).toContain('<Ionicons name={dialogueScenarioIcon(item.id, worldIcon(item.worldId))} size={20} color={glass.text} />');
  });
});
