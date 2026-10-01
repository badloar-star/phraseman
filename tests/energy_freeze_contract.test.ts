import fs from 'fs';
import path from 'path';

describe('energy freeze visual contract', () => {
  it('does not use streak freeze state to change energy icon art', () => {
    const energyBar = fs.readFileSync(path.join(__dirname, '..', 'components', 'EnergyBar.tsx'), 'utf8');
    const lessonEnergy = fs.readFileSync(path.join(__dirname, '..', 'components', 'LessonEnergyLightning.tsx'), 'utf8');
    const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');

    expect(energyBar).not.toContain('useStreakFreezeActive');
    expect(lessonEnergy).not.toContain('useStreakFreezeActive');
    expect(energyBar).not.toMatch(/variant=\{freezeActive \? 'frozen' : 'normal'\}/);
    expect(lessonEnergy).not.toMatch(/variant=\{freezeActive \? 'frozen' : 'normal'\}/);
    expect(home).not.toMatch(/<EnergyIcon[^>]*variant=\{freezeActive \? 'frozen' : 'normal'\}/);
  });

  it('does not poll storage every second from lesson energy UI', () => {
    // зачем (координатор §46, 2026-10-01): LessonEnergyLightning 2.0 — тонкая
    // обёртка над общей пилюлей EnergyBar; таймер живёт там (useEnergyCountdown,
    // только пока открыта подсказка). Запрет опроса хранилища — на обоих файлах.
    const lessonEnergy = fs.readFileSync(path.join(__dirname, '..', 'components', 'LessonEnergyLightning.tsx'), 'utf8');
    const energyBar = fs.readFileSync(path.join(__dirname, '..', 'components', 'EnergyBar.tsx'), 'utf8');

    expect(lessonEnergy).toContain("import EnergyBar from './EnergyBar'");
    expect(energyBar).toContain('useEnergyCountdown({');
    for (const source of [lessonEnergy, energyBar]) {
      expect(source).not.toContain('getTimeUntilNextRecovery');
      expect(source).not.toContain('setInterval(');
    }
  });
});
