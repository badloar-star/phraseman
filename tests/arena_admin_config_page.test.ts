import * as fs from 'fs';
import * as path from 'path';
import { arenaBuildConfigDoc } from '../functions/src/arena_config_contract';

/**
 * Экран конфига Арены в админке.
 *
 * зачем: Q1 (координатор 01.10) — Арена удалена (D74/D78/D83), карточка
 * «Арена» в Пульте и мёртвая admin/arena-config.html убраны. Сторож теперь
 * охраняет ОТСУТСТВИЕ: карточка не должна вернуться «по привычке».
 * Серверные adminArenaConfigGet/Set пока живы (их ведёт задача в
 * docs/phraseman-2.0/PROGRESS.md) — но звать их из админки больше нечем.
 */

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'admin/v2/legacy.html'), 'utf8');

describe('карточка «Арена» убрана из Пульта (Q1)', () => {
  it('нет разметки карточки и её кнопок', () => {
    expect(page).not.toContain('id="cp-arena-card"');
    expect(page).not.toContain('id="cp-arena-save"');
    expect(page).not.toContain('id="cp-arena-reason"');
  });

  it('нет JS карточки и вызовов конфига Арены', () => {
    expect(page).not.toContain('const ARENA_BASE_FLAGS');
    expect(page).not.toContain('window.loadControlPanelArena');
    expect(page).not.toContain('window.saveControlPanelArena');
    expect(page).not.toContain("'adminArenaConfigGet'");
    expect(page).not.toContain("'adminArenaConfigSet'");
  });

  it('мёртвая admin/arena-config.html удалена', () => {
    expect(fs.existsSync(path.join(ROOT, 'admin/arena-config.html'))).toBe(false);
  });
});

// зачем: сборка конфига (arena_config_contract) осталась — её ведёт админка
// пула Шпиля, версии подставляет сборка, а не форма.
describe('Arena config build contract', () => {
  test('версии магазина и соперничеств подставляет сборка', () => {
    const doc = arenaBuildConfigDoc({});
    expect(doc.arenaCosmeticCatalogVersion).toBe('arena-cosmetics.v1');
    expect(doc.arenaRivalRuntimeVersion).toBe('arena-rival.v1');
  });
});
