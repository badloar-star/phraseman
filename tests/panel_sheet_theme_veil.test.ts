// зачем (решение владельца 15.10, 10А / cards-gap-022): общая шторка PanelSheet (выбор набора, карточка, «Мои наборы», ошибки) красится тем же мягким переливом в тоне темы,
// что и остальные шторки (HybridSheetShell): токен selected → прозрачный, от верхнего левого угла. Плоской заливкой opaqueSheet шторка не остаётся.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const src = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'components/mistakes-panel/PanelSheet.tsx'), 'utf8'));
const hybrid = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'components/modal_fx/HybridSheetShell.tsx'), 'utf8'));

describe('шторка PanelSheet — перелив в тоне темы как у остальных шторок', () => {
  it('без нейтрального градиента берётся selected → прозрачный, 0,0 → 0,8·1', () => {
    expect(src).toContain("colors={[g.selected, 'transparent']}");
    expect(src).toContain('start={{ x: 0, y: 0 }}');
    expect(src).toContain('end={{ x: 0.8, y: 1 }}');
  });
  it('тот же перелив у HybridSheetShell (эталон «остальных шторок»)', () => {
    expect(hybrid).toContain("[glass.selected, 'transparent']");
    expect(hybrid).toContain('end={{ x: 0.8, y: 1 }}');
  });
});
