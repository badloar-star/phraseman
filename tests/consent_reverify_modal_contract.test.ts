import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'ConsentReverifyHost.tsx'), 'utf8');

describe('consent reverify modal contract', () => {
  it('asks a yes/no 16+ question instead of a birth-year wheel', () => {
    expect(source).toContain('Тебе уже есть 16?');
    expect(source).toContain('testID="reverify-age-yes"');
    expect(source).toContain('testID="reverify-age-no"');
    expect(source).not.toContain('YearWheel');
    expect(source).not.toContain('Год рождения');
    // «Да» пишет тот же возрастной прокси, что онбординг новых пользователей.
    expect(source).toContain('new Date().getFullYear() - MIN_FULL_ACCESS_AGE');
  });

  it('blocks under-16 with an exit-only dead end and no persistence', () => {
    expect(source).toContain('Увы…');
    expect(source).toContain('testID="reverify-exit"');
    // iOS: exitApp() запрещён Apple (no-op) → честный Alert; Android — exitApp().
    expect(source).toContain("Platform.OS === 'ios'");
    expect(source).toContain('BackHandler.exitApp()');
    // «Нет» НИЧЕГО не сохраняет: латч reverify_done пишется только в шорткатах
    // гейта (решения уже есть) и в submit-ветке «Да» (multiSet). При следующем
    // запуске модал показывается снова (защита от случайного тапа «Нет»).
    const latchWrites = source.match(/AsyncStorage\.setItem\(REVERIFY_DONE_KEY, '1'\)/g) ?? [];
    expect(latchWrites.length).toBe(2);
    expect(source).toContain("[REVERIFY_DONE_KEY, '1']");
  });

  it('never shows to users already marked (onboarding, previous modal, cloud)', () => {
    // Уже видел модал → латч.
    expect(source).toContain("if (reverifyDone === '1') return;");
    // Новый юзер, отмеченный онбордингом: сначала ЖДЁМ гидрацию снапшотов
    // (иначе гонка с bootstrap _layout → ложный показ), потом шорткат-латч.
    expect(source).toContain('hydrateAgeGateFromStorage()');
    expect(source).toContain('hydrateAnalyticsConsentFromStorage()');
    expect(source).toContain('hasAgeDecision() && hasAnalyticsConsentDecision()');
    // Реинсталл/новое устройство: восстановление из облачного user_consents
    // ДО решения показать модал.
    expect(source).toContain('restoreConsentStateFromCloud()');
    expect(source.indexOf('restoreConsentStateFromCloud()')).toBeLessThan(source.indexOf('setVisible(true)'));
  });

  it('persists terms+privacy acceptance before recording to cloud', () => {
    // Латч Terms/Privacy пишется в submit ДО recordConsentToCloud (облако
    // читает его из storage) — тем же ключом, что и онбординг.
    expect(source).toContain("[LEGAL_ACCEPTED_STORAGE_KEY, '1']");
    const legalIdx = source.indexOf("[LEGAL_ACCEPTED_STORAGE_KEY, '1']");
    const cloudIdx = source.indexOf('void recordConsentToCloud()');
    expect(legalIdx).toBeGreaterThan(-1);
    expect(cloudIdx).toBeGreaterThan(legalIdx);
  });

  it('keeps analytics consent compact and non-anonymous', () => {
    expect(source).toContain('Разрешить собирать аналитику?');
    expect(source).toContain('Необязательно. Выбор можно изменить в настройках.');
    expect(source).toContain("allow: L('Разрешить'");
    expect(source).toContain("notNow: L('Не сейчас'");
    expect(source).not.toContain('Можно собирать анонимные данные');
    expect(source).not.toContain('анонимную статистику');
    expect(source).not.toContain('Если разрешишь, мы будем собирать');
  });
});
