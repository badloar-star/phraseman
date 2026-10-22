/**
 * зачем: PM-203-A2 — любой файл, создающий аудиоплеер (createAudioPlayer /
 * useAudioPlayer), обязан жить под арбитром аудио
 * (modules/audio/audio_runtime_arbiter.ts) либо брать готовый управляемый плеер
 * (hooks/use_managed_spoken_audio_player). Иначе новый плеер заговорит поверх
 * диалога/записи микрофона/другого урока. Короткие SFX и празднования идут через
 * собственный арбитр звуков (sound_arbiter), их перечисляем явно с причиной.
 * Нарушители, которых рефакторить сейчас не время, записаны с TODO — список
 * может только сжиматься (сторож падает, если запись в allowlist больше не нужна).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'modules'];
const PLAYER_CALL = /\b(?:createAudioPlayer|useAudioPlayer)\s*\(/;
const ARBITER_MARK = /audio_runtime_arbiter|use_managed_spoken_audio_player/;

const ALLOWLIST: Readonly<Record<string, string>> = {
  'modules/audio/expo_sfx_backend.ts':
    'SFX: короткие эффекты интерфейса, свой sound_arbiter/sound_director; не речь и не диалог',
  // зачем (15.10): эффекты V2 — тот же класс, что expo_sfx_backend; рантайм сам не играет речь, а уважает её (isVoiceActive, пауза 250 мс после речи), запись микрофона и выключатель звуков
  'modules/sound_v2/sound_v2_runtime.ts':
    'SFX V2: короткие эффекты интерфейса; гейт речи/записи/выключателя — в самом рантайме (проверяет audio_never_permanently_silent_contract)',
  'modules/audio/celebrationScenePlayer.ts':
    'празднование: сцена-звук, управляется sound_arbiter; не претендует на «голосовой» канал',
};

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|probe)\.tsx?$/.test(entry.name)) out.push(full);
  }
}

/** Код без комментариев: упоминание в комментарии — не создание плеера. */
const stripComments = (text: string): string => text
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

function playerFiles(): Array<{ rel: string; arbitrated: boolean }> {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), files);
  const out: Array<{ rel: string; arbitrated: boolean }> = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (!PLAYER_CALL.test(stripComments(text))) continue;
    out.push({
      rel: path.relative(ROOT, file).split(path.sep).join('/'),
      arbitrated: ARBITER_MARK.test(text),
    });
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

describe('PM-203: плееры аудио живут под арбитром', () => {
  const found = playerFiles();

  it('находит известные файлы с плеерами (сторож не пустой)', () => {
    console.log('[PM-203] player files:', found.length, 'unarbitrated:', found.filter((f) => !f.arbitrated).map((f) => f.rel).join(', '));
    expect(found.length).toBeGreaterThanOrEqual(10);
  });

  it('каждый файл с плеером импортирует арбитр/управляемый плеер либо есть в allowlist с причиной', () => {
    const violations = found
      .filter((f) => !f.arbitrated && !(f.rel in ALLOWLIST))
      .map((f) => f.rel);
    expect(violations).toEqual([]);
  });

  it('allowlist не устаревает: каждая запись реально без арбитра и с непустой причиной', () => {
    const byRel = new Map(found.map((f) => [f.rel, f] as const));
    for (const [rel, reason] of Object.entries(ALLOWLIST)) {
      expect(reason.trim().length).toBeGreaterThan(10);
      const entry = byRel.get(rel);
      expect(entry).toBeDefined();
      expect(entry?.arbitrated).toBe(false);
    }
  });
});
