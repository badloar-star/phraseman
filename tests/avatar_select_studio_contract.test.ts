import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const readProjectFile = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

// зачем (D57/PM-063): app/avatar_select.tsx удалён целиком (старая студия
// аватаров) — семь из восьми проверок этого файла читали именно тот экран
// и тестировали отменённое правило. Единственная оставшаяся проверка живого
// компонента CustomizationHero.tsx сохранена ниже.
describe('avatar customization studio structure', () => {
  it('renders a theme-accented hero with one animated aura', () => {
    const hero = readProjectFile('components', 'customization', 'CustomizationHero.tsx');
    expect(hero).toContain('themeAccent');
    expect(hero).toContain('animateAura={props.motionEnabled && !reduceMotion}');
    expect(hero).not.toContain('previewLabel');
  });
});
