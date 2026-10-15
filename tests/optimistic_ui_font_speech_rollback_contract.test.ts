// зачем (аудит Optimistic UI Дизайна 15.10, №2 и №4): размер шрифта и скорость озвучки меняются мгновенно, а при сбое записи откатываются правильно.
// №2 — запись размера шрифта обязана иметь catch с журналом и откатом (не затирая более свежий выбор);
// №4 — откат скорости озвучки берёт значение на НАЧАЛО жеста (onSlidingStart), а не промежуточное.
import { normalizeEol } from './helpers/read_source';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

describe('Optimistic UI: размер шрифта и скорость озвучки', () => {
  it('размер шрифта: запись на диск с catch, журналом и откатом только если выбор не сменился', () => {
    const src = read('components/ThemeContext.tsx');
    const start = src.indexOf('const setFontSize = useCallback');
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, src.indexOf('}, []);', start));
    expect(body).toContain("AsyncStorage.setItem('app_font_size', s).catch(");
    expect(body).toContain("DebugLogger.error('ThemeContext:font_size_persist_failed'");
    expect(body).toContain('current === s ? previous : current');
    expect(body).not.toMatch(/void AsyncStorage\.setItem\('app_font_size'/);
  });

  it('скорость озвучки: значение на начало жеста запоминается и передаётся в откат', () => {
    const src = read('app/settings_edu.tsx');
    expect(src).toContain('onSlidingStart={() => { speechRateStartRef.current = normalizeSpeechRate(latestSettingsRef.current.speechRate); }}');
    expect(src).toContain("update('speechRate', rate, startRate);");
    expect(src).toContain('baseline?: boolean | number | null');
    expect(src).toContain('{ ...latestSettingsRef.current, [key]: baseline }');
  });
});
