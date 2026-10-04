import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(
  path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2CatalogueSection.tsx'),
  'utf8',
);

describe('Dialogue V2 catalogue liquid-glass contract', () => {
  it('enters with worlds collapsed and reveals only the tapped released world', () => {
    expect(source).toContain("useState<string | null>(null)");
    expect(source).toContain('const expanded = activeWorldId === world.id;');
    expect(source).toContain('onPress={() => toggleWorld(world.id)}');
    expect(source).toContain('setActiveWorldId((current) => current === worldId ? null : worldId);');
    expect(source).toContain('animateNextLayoutTransition();');
    expect(source).toContain('{expanded ? (');
  });

  it('uses opaque glass world cards and preserves rank-only locks', () => {
    expect(source).toContain('dialogueGlassCardStyle(glass, 24)');
    // зачем (сверка с dialogs.html A1–A2, 04.10; правило владельца «всё по макетам»): карточка категории
    // несёт «пройдено N / всего M» и полоску — считается из статусов строк, без сети.
    expect(source).toContain("const doneCount = worldItems.filter((item) => item.status === 'done').length;");
    expect(source).toContain('dialogue-v2-world-count-');
    expect(source).toContain('coinRankRowForDisplay(item.rankRequired).source');
    expect(source).not.toContain('hasPremiumAccess');
    expect(source).not.toMatch(/purchase|runes|premium_modal/i);
  });
});
