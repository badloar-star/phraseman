// зачем (аудит Optimistic UI «Настроек», 12.10, координатор): переключатели не врут при сбое записи — откат с сообщением, поздний сбой не трогает свежий выбор, немых catch нет.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Настройки: Optimistic UI', () => {
  it('звук карточек: сеттеры пробрасывают сбой и возвращают кэш, экран откатывает только свой тап', () => {
    const sound = read('app/flashcards/SoundService.ts');
    expect(sound).toContain('if (cachedSfxOn === on) cachedSfxOn = previous;');
    expect(sound).toContain('if (cachedAutoSpeakOn === on) cachedAutoSpeakOn = previous;');
    expect(sound.match(/throw e;/g)?.length).toBeGreaterThanOrEqual(2);
    const edu = read('app/settings_edu.tsx');
    expect(edu).toContain('setFcSfx((current) => (current === value ? !value : current))');
    expect(edu).toContain('setFcAutoSpeak((current) => (current === value ? !value : current))');
  });

  it('уведомления: откат с сообщением и номером записи; немого catch у расписания нет', () => {
    const src = read('app/settings_notifications.tsx');
    expect(src).toContain('const prefsSeqRef = useRef(0);');
    expect(src).toContain('const scheduleSeqRef = useRef(0);');
    expect(src).toContain('[NOTIF-SCHEDULE] persist_failed rollback=1');
    expect(src).toContain('[NOTIF-PREFS] persist_failed rollback=skipped');
    expect(src.match(/rollbackToast\(\);/g)?.length).toBe(2);
    const at = src.indexOf('const persistSchedule');
    expect(src.slice(at, at + 1800).includes('} catch {')).toBe(false);
  });

  it('тактильный отклик и «Очистить кэш»: откат с сообщением, причина в журнале', () => {
    const src = read('app/(tabs)/settings.tsx');
    expect(src).toContain('const hapticSeqRef = useRef(0);');
    expect(src).toContain('[OPT-UI] settings tap_haptics rollback');
    expect(src).toContain('[CACHE-RESET] clear_failed_in_ui reason=');
    expect(src).not.toContain(".catch(() => { setClearCacheState('failed'); });");
  });
});
