import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем (координатор 05.10, Сверка 04:45: «Повысить ранг · 6 000» на визитке списывал монеты одним тапом, 7845 → 1845):
// визитка НЕ тратит. Единственное место траты повышения ранга — экран подтверждения app/coin_rank.tsx
// (coins.html №3/№4). Сторож не даёт вернуть прямой путь траты в визитку.
const ROOT = join(__dirname, '..');
const read = (relative: string) => normalizeEol(readFileSync(join(ROOT, relative), 'utf8'));
const stripComments = (source: string) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const profileCardFiles = [
  'components/PlayerProfileModal.tsx',
  ...readdirSync(join(ROOT, 'components/profile-card'))
    .filter((name) => /\.(ts|tsx)$/.test(name))
    .map((name) => `components/profile-card/${name}`),
];

describe('profile card rank upgrade goes through the confirmation screen only', () => {
  it.each(profileCardFiles)('%s neither takes nor calls the spend function upgrade()', (file) => {
    const code = stripComments(read(file));
    // Ревью opus 05.10: проверка по тексту вызова обходилась переименованием ({ upgrade: doUpgrade }, r.upgrade()).
    // Трату можно достать ТОЛЬКО через хук useCoinRankUpgrade или функцию upgradeCoinRank — их подключение как
    // значения и запрещено (переименованием не обойти); разрешён лишь импорт ТИПА. Слово «upgrade» как ключ
    // перевода или testID кнопки остаётся допустимым.
    expect(code).not.toMatch(/\bupgradeCoinRank\b/);
    expect(code).not.toMatch(/\.upgrade\s*\(/);
    expect(code).not.toContain('handleUpgrade');
    expect(code).not.toMatch(/\buseCoinRankUpgrade\b/);
    const valueImports = code.match(/import\s+(?!type\b)[^;]*from\s+['"][^'"]*(use_coin_rank_upgrade|coin_rank_upgrade_v1)['"]/g);
    expect(valueImports).toBeNull();
  });

  it('the card button closes the card and opens the coin_rank confirmation screen', () => {
    const modal = stripComments(read('components/PlayerProfileModal.tsx'));
    expect(modal).toMatch(/onUpgrade=\{openRankUpgradeConfirm\}/);
    const body = modal.slice(modal.indexOf('const openRankUpgradeConfirm = useCallback('));
    const handler = body.slice(0, body.indexOf('}, ['));
    expect(handler).toContain('onClose();');
    expect(handler).toContain("router.push('/coin_rank' as never);");
  });

  it('the confirmation screen still owns the only spend call', () => {
    const screen = stripComments(read('app/coin_rank.tsx'));
    expect(screen).toMatch(/useCoinRankUpgrade\(\)/);
    expect(screen).toMatch(/onPress=\{handleUpgrade\}/);
  });

  it('the card shows the rank number as stored (0…19), without +1', () => {
    const modal = stripComments(read('components/PlayerProfileModal.tsx'));
    expect(modal).not.toMatch(/rankRow\.rank \+ 1/);
    expect(modal).toContain('${t4(L, PC.rank)} ${rankRow.rank}');
    // Плашка ранга и церемония «было → стало» на визитке (ревью opus: правка была только в тексте «Поделиться»).
    for (const file of profileCardFiles) {
      expect(stripComments(read(file))).not.toMatch(/\brank \+ 1\b/);
    }
  });

  it('double tap does not push the confirmation screen twice', () => {
    const modal = stripComments(read('components/PlayerProfileModal.tsx'));
    const body = modal.slice(modal.indexOf('const openRankUpgradeConfirm = useCallback('));
    const handler = body.slice(0, body.indexOf('}, ['));
    expect(handler).toMatch(/if \(rankUpgradeNavigatedRef\.current\) return;\s*rankUpgradeNavigatedRef\.current = true;/);
  });

  // Координатор 05.10: после закрытия и повторного открытия визитки кнопка снова ведёт на /coin_rank — флаг
  // защиты от двойного тапа не должен «залипать».
  it('after closing and reopening the card the button navigates to /coin_rank again', () => {
    const modal = stripComments(read('components/PlayerProfileModal.tsx'));
    expect(modal).toMatch(/useEffect\(\(\) => \{\s*rankUpgradeNavigatedRef\.current = false;\s*\}, \[player\]\);/);
    const body = modal.slice(modal.indexOf('const openRankUpgradeConfirm = useCallback('));
    const handler = body.slice(0, body.indexOf('}, ['));
    expect(handler).toMatch(/setTimeout\(\(\) => \{ rankUpgradeNavigatedRef\.current = false; \}, RANK_UPGRADE_TAP_GUARD_MS\);/);
  });
});
