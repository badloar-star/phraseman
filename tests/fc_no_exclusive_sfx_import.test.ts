/**
 * cards-2.0 (E9): grep-тест изоляции доменов (§6 мастер-плана).
 * Домен карточек (app/flashcards/**, сессия ошибок, церемония пака,
 * настройки раздела) НЕ должен импортировать `exclusive_short_sfx` —
 * тот принадлежит чужим доменам (achievements, arena_match_found, level_up,
 * activity_complete, league_result). Сам файл живёт и не трогается.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

/** Файлы/директории домена карточек, где импорт запрещён. */
const CARD_DOMAIN_TARGETS = [
  'app/flashcards',
  'app/mistake_practice_session.tsx',
  'app/pack_opening.tsx',
  'app/flashcards_collection.tsx',
  'app/flashcards_card_editor.tsx',
  'app/settings_edu.tsx',
];

/** Матчит только реальные импорты (import/require), не упоминания в комментариях. */
const IMPORT_RE = /(from\s+['"][^'"]*exclusive_short_sfx['"]|require\(\s*['"][^'"]*exclusive_short_sfx['"]\s*\))/;

function collectFiles(target: string): string[] {
  const abs = path.join(ROOT, target);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [abs];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs)) {
    const p = path.join(abs, entry);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...collectFiles(path.relative(ROOT, p)));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

describe('домен карточек не импортирует exclusive_short_sfx', () => {
  const files = CARD_DOMAIN_TARGETS.flatMap(collectFiles);

  it('целевые файлы домена существуют (санити)', () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
    expect(files.some((f) => f.endsWith('SoundService.ts'))).toBe(true);
    expect(files.some((f) => f.endsWith('mistake_practice_session.tsx'))).toBe(true);
  });

  it.each(CARD_DOMAIN_TARGETS)('%s — без импорта exclusive_short_sfx', (target) => {
    for (const file of collectFiles(target)) {
      const src = fs.readFileSync(file, 'utf8');
      const bad = src.split('\n').filter((line) => IMPORT_RE.test(line));
      expect({ file: path.relative(ROOT, file), badLines: bad }).toEqual({
        file: path.relative(ROOT, file),
        badLines: [],
      });
    }
  });

});

/** E13 (§7): финальная ревизия SoundService — только expo-audio, только fc_* SFX. */
describe('E13: аудио-ревизия домена карточек', () => {
  const AV_IMPORT_RE = /(from\s+['"]expo-av['"]|require\(\s*['"]expo-av['"]\s*\))/;

  it.each(CARD_DOMAIN_TARGETS)('%s — без импорта expo-av (только expo-audio)', (target) => {
    for (const file of collectFiles(target)) {
      const src = fs.readFileSync(file, 'utf8');
      const bad = src.split('\n').filter((line) => AV_IMPORT_RE.test(line));
      expect({ file: path.relative(ROOT, file), badLines: bad }).toEqual({
        file: path.relative(ROOT, file),
        badLines: [],
      });
    }
  });

  it('SoundService играет только семейство fc_* из assets/sounds/fc/', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/flashcards/SoundService.ts'), 'utf8');
    const requires = [...src.matchAll(/require\(['"]([^'"]+\.(?:mp3|wav|m4a))['"]\)/g)].map(
      (m) => m[1],
    );
    expect(requires.length).toBeGreaterThan(0);
    for (const p of requires) {
      expect(p).toMatch(/assets\/sounds\/fc\/fc_[a-z0-9_]+\.mp3$/);
    }
  });
});
