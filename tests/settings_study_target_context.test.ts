// зачем (§AUTH-0110, координатор 12.10): Настройки держали свой useState<StudyTarget>('en') — первый кадр у всех 'en', смена цели
// подхватывалась только по фокусу. Сторож: изучаемый язык Настроек — из общего StudyTargetContext (снимок + событие смены).
import fs from 'node:fs';
import path from 'node:path';

const settings = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'), 'utf8');

describe('Settings reads the study target from StudyTargetContext', () => {
  it('uses useStudyTarget() and has no private study-target state', () => {
    expect(settings).toContain("import { useStudyTarget } from '../../components/StudyTargetContext';");
    expect(settings).toMatch(/const \{ studyTarget, refresh: loadStudyTarget \} = useStudyTarget\(\);/);
    expect(settings).not.toMatch(/useState<StudyTarget>\(/);
    expect(settings).not.toContain('getStoredStudyTarget(');
  });

  it('logs the study target switch under [LANG-SWITCH]', () => {
    expect(settings).toContain('[LANG-SWITCH] settings study_target=');
  });
});
