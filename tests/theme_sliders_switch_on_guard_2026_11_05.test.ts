// зачем (владелец 05.11 ~20:55: «ТЕМЫ БЛЯТЬ ПОЛЗУНКИ ПРЯМО СЕЙЧАС НЕМЕДЛЕННО КАК ПО МАКЕТУ КАК ЗАПЛАНИРОВАНО»):
// страж включения ползунков. 1) боевой флаг theme_sliders_v1 включён; 2) в боевом интерфейсе нет ни одного перехода к старому списку
// именных тем (/settings_themes) — только «Оформление»; 3) каждый, у кого была старая именная тема, после миграции получает tune:H:S
// с тем же оттенком акцента (вид не прыгает), ничего не теряется. Dev-витрины (components/dev, app/dev_*) могут ссылаться на старый экран.
import fs from 'node:fs';
import path from 'node:path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { oklchOfHex, parseThemeTuneId, THEME_TUNE_STANDARD } from '../constants/theme_tune';
import { migrateThemeIdToTune } from '../app/theme_tune_migration';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' || rel === 'components/dev') continue;
      walk(rel, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.startsWith('dev_') && !/\.test\./.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

const hueDiff = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

describe('ползунки «Оформление» включены, старых именных тем в интерфейсе нет', () => {
  it('боевой флаг theme_sliders_v1 включён', () => {
    expect(read('constants/theme_sliders_flag.ts')).toMatch(/const BASE_FLAG = true;/);
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect((require('../constants/theme_sliders_flag') as { THEME_SLIDERS_V1_ENABLED: boolean }).THEME_SLIDERS_V1_ENABLED).toBe(true);
    });
  });

  it('строка Настроек — «Оформление» → /settings_appearance, без имени темы и без ветки к старым темам', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toMatch(/testID="settings-themes-row"[\s\S]*?title=\{L\('Оформление'[\s\S]*?onPress=\{\(\) => router\.push\('\/settings_appearance' as any\)\}/);
    expect(settings).not.toContain('settings_themes');
    expect(settings).not.toContain('currentThemeLabel');
  });

  it('ни один боевой экран не открывает /settings_themes (push/replace/navigate/href/pathname)', () => {
    const NAV = /(?:\.(?:push|replace|navigate)\(\s*\(?\s*[^)]*['"`]\/?settings_themes['"`])|(?:pathname:\s*['"`]\/?settings_themes['"`])|(?:href=\{?\s*['"`]\/?settings_themes)/;
    const offenders = [...walk('app'), ...walk('components'), ...walk('hooks')].filter((rel) => NAV.test(read(rel)));
    expect(offenders).toEqual([]);
  });

  it('экран «Оформление» не уходит назад сам при включённом флаге; кадр «Новая тема» в историях не включает именную тему', () => {
    expect(read('app/settings_appearance.tsx')).toContain('if (!THEME_SLIDERS_V1_ENABLED) return null;');
    const cta = read('components/stories/templates/use_story_cta_action.ts');
    expect(cta).toMatch(/if \(THEME_SLIDERS_V1_ENABLED\) \{[^\n]*\[THEME-SLIDERS\][^\n]*return; \}/);
  });
});

describe('миграция старых именных тем в tune:H:S (флаг включён по-настоящему, без моков)', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it.each(['light', 'dark'] as const)('каждая старая тема (%s) → валидный tune, оттенок акцента сохранён', (appearance) => {
    expect(LIQUID_GLASS_THEME_IDS.length).toBeGreaterThan(10);
    for (const oldId of LIQUID_GLASS_THEME_IDS) {
      const r = migrateThemeIdToTune({ resolvedId: oldId, appearance, isNewUser: false });
      const tune = parseThemeTuneId(r.id);
      expect({ oldId, ok: tune !== null, migrated: r.migrated }).toEqual({ oldId, ok: true, migrated: true });
      expect(r.reason).toBe('nearest_of_old_theme');
      const before = oklchOfHex(liquidGlassTokens(oldId, { level: 'max', appearance }).accent)!; // light-accent-ok: сравнение оттенка акцента до/после миграции
      const after = oklchOfHex(liquidGlassTokens(r.id, { level: 'max', appearance }).accent)!; // light-accent-ok: сравнение оттенка акцента до/после миграции
      expect(before).not.toBeNull();
      expect(after).not.toBeNull();
      // цветная тема остаётся того же цвета (±20°); нейтральная (графит и т.п.) — не ярче стандарта
      if (before.C >= 0.03) expect({ oldId, appearance, diff: hueDiff(before.H, after.H) <= 20 }).toEqual({ oldId, appearance, diff: true });
      else expect({ oldId, S: tune!.S <= THEME_TUNE_STANDARD.S }).toEqual({ oldId, S: true });
    }
  });

  it('ползунок «Оттенок» реально меняет акцент в светлом и в «Максимуме» (раньше молча оставался графитовым 250°)', () => {
    for (const appearance of ['light', 'dark'] as const) {
      for (const H of [30, 140, 300]) {
        const a = oklchOfHex(liquidGlassTokens(`tune:${H}:80`, { level: 'max', appearance }).accent)!; // light-accent-ok: проверка оттенка акцента
        expect({ appearance, H, ok: hueDiff(a.H, H) <= 20 }).toEqual({ appearance, H, ok: true });
      }
    }
  });

  it('повторный запуск ничего не меняет (tune остаётся tune), новичок получает стандарт', () => {
    const first = migrateThemeIdToTune({ resolvedId: 'rose', appearance: 'dark', isNewUser: false });
    expect(migrateThemeIdToTune({ resolvedId: first.id, appearance: 'dark', isNewUser: false })).toEqual({ id: first.id, migrated: false, reason: 'already_tune' });
    expect(migrateThemeIdToTune({ resolvedId: 'graphite', appearance: 'light', isNewUser: true }).id).toBe(`tune:${THEME_TUNE_STANDARD.H}:${THEME_TUNE_STANDARD.S}`);
  });
});
