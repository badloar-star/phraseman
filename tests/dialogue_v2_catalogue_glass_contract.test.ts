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
    // зачем (разбор красных 15.10): aee10c22a — тот же тумблер мира, плюс шапка хаба сворачивается, пока категория открыта
    expect(source).toContain('const next = activeWorldId === worldId ? null : worldId;');
    expect(source).toContain('setActiveWorldId(next);');
    expect(source).toContain('collapseActions?.setCategoryOpen(next !== null);');
    expect(source).toContain('animateNextLayoutTransition();');
    expect(source).toContain('{expanded ? (');
  });

  it('uses opaque glass world cards and preserves rank-only locks', () => {
    // 04.10: свёрнутая категория — `.card.c2` хаба (r22), раскрытая — карточка кадра A4 (r24).
    expect(source).toContain('dialogueGlassCardStyle(glass, expanded ? 24 : 22)');
    // зачем (сверка с dialogs.html A1–A2, 04.10; правило владельца «всё по макетам»): карточка категории
    // несёт «пройдено N / всего M» и полоску — считается из статусов строк, без сети.
    expect(source).toContain("const doneCount = worldItems.filter((item) => item.status === 'done').length;");
    expect(source).toContain('dialogue-v2-world-count-');
    expect(source).toContain('coinRankRowForDisplay(item.rankRequired).source');
    expect(source).not.toContain('hasPremiumAccess');
    expect(source).not.toMatch(/purchase|runes|premium_modal/i);
  });
});
