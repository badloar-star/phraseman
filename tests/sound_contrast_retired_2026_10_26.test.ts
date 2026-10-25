// зачем (перепись цветов Тем c49e258d4: «живой литерал остался один» — V2Chip с палитрой турниров в sound_contrast_mode_v1): режим sound_contrast
// удалён («Удалённый режим (не назначать)»), маршрутизатор режимов его компонент не подключает — человек его не видит. Сторож держит это так:
// если режим вернут в маршрутизатор, палитру турниров (v2_theme) нужно сначала перевести на токены текущей темы (контраст ≥ 4,5 на 174 сочетаниях).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('sound_contrast — удалённый режим, палитра турниров не на экране', () => {
  it('маршрутизатор режимов не подключает компонент sound_contrast', () => {
    const router = read('modules/learning-v2/modes/mode_router_v1.tsx');
    expect(router).not.toMatch(/SoundContrastModeV1|sound_contrast_mode_v1/);
    expect(router).toContain('sound_contrast: "Удалённый режим (не назначать)"');
  });

  it('плеер и экраны не импортируют компонент напрямую', () => {
    for (const rel of ['app/learning_v2_direct_session_player_v1.tsx', 'app/learning-v2/session/[id].tsx']) {
      expect(read(rel)).not.toMatch(/sound_contrast_mode_v1/);
    }
  });
});
