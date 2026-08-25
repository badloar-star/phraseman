import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('Home runtime animation ownership', () => {
  it('gates Home repeating motion by visible tab and foreground focus', () => {
    const source = read('app/(tabs)/home.tsx');
    expect(source).toContain("const isHomeOwner = runtimeOwnerId === 'home';");
    // Home is mounted underneath the full-screen onboarding overlay. Owning the
    // tab is not enough: heavy work and repeating animation stay off until the
    // overlay has actually finished.
    expect(source).toContain('const homeRuntimeActive = useRuntimeActive(isHomeOwner && homeOnboardingDone);');
    expect(source).toContain('if (!homeRuntimeActive || !shouldPulse)');
    expect(source).toContain('if (!homeStatsReady || !homeRuntimeActive)');
  });

  // зачем (2026-08-25): кейс сторожил, что WeeklyReviewCard получает активность
  // явным пропом и не крутит фоновых циклов. Компонент удалён целиком вместе с
  // диагнозами тренера (бандл-диета Ф2, −4.33 МБ) — гарантия «нет фоновой
  // анимации» теперь выполняется самим фактом отсутствия файла, а сторож лишь
  // падал с ENOENT. Файл как намеренно удалённый перечислен в
  // tests/retired_coach_diagnosis_full_removal_contract.test.ts.
  // Проверки главного экрана выше не тронуты — они и есть суть этого контракта.
});
