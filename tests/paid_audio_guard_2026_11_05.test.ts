// Governance-ID: TG-09E2E8CBBE64
// зачем (владелец 05.11: «Аудио не генерим за деньги»): любой скрипт, который ходит во внешний ПЛАТНЫЙ синтез речи (ElevenLabs, OpenAI audio/speech,
// Google/Azure TTS), обязан иметь замок ALLOW_PAID_AUDIO=1 и без него завершаться, ничего не отправляя. Новый скрипт без замка ломает этот сторож.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.join(__dirname, '..');
const scriptsDir = path.join(root, 'scripts');

const PAID_API = /api\.elevenlabs\.io|\/v1\/audio\/speech|audio\.speech\.create|texttospeech\.googleapis|api\.openai\.com\/v1\/audio|cognitiveservices\.azure|polly\.[a-z0-9-]+\.amazonaws/i;
// файлы, где строки с адресами лишь описаны (сам замок и общий сторож расходов), а не вызываются
const NOT_CALLERS = new Set(['paid_audio_guard.mjs', 'openai-dev-guard.mjs']);

// комментарии не считаются вызовом: адрес API часто упомянут в шапке файла
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length)).replace(/^\s*\/\/.*$/gm, (m) => ' '.repeat(m.length));
}

const topLevelScripts = fs.readdirSync(scriptsDir)
  .filter((name) => /\.(mjs|cjs|js|ts|py)$/.test(name))
  .filter((name) => !NOT_CALLERS.has(name));

describe('замок платной озвучки', () => {
  const callers = topLevelScripts.filter((name) => PAID_API.test(withoutComments(fs.readFileSync(path.join(scriptsDir, name), 'utf8'))));

  it('нашлись скрипты с платным синтезом (иначе проверка пуста)', () => {
    expect(callers.length).toBeGreaterThanOrEqual(10);
  });

  it.each(callers)('%s: платный вызов защищён ALLOW_PAID_AUDIO', (name) => {
    const text = withoutComments(fs.readFileSync(path.join(scriptsDir, name), 'utf8'));
    expect(text).toMatch(/ALLOW_PAID_AUDIO|requireAllowPaidAudio/);
    // замок стоит ДО первого платного обращения
    const guardAt = text.search(/requireAllowPaidAudio\(|ALLOW_PAID_AUDIO/);
    const callAt = text.search(PAID_API);
    expect(guardAt).toBeGreaterThanOrEqual(0);
    expect(guardAt).toBeLessThan(callAt);
  });

  it('общий замок отказывает без флага и пропускает с флагом', () => {
    const run = (flag: string) => spawnSync(process.execPath, ['--input-type=module', '-e',
      "import { requireAllowPaidAudio } from './scripts/paid_audio_guard.mjs'; requireAllowPaidAudio('probe'); console.log('PASSED');"], {
      cwd: root, encoding: 'utf8', env: { ...process.env, ALLOW_PAID_AUDIO: flag },
    });
    const off = run('');
    expect(off.status).toBe(3);
    expect(off.stdout).not.toContain('PASSED');
    expect(off.stderr).toContain('ОТКАЗ');
    const on = run('1');
    expect(on.status).toBe(0);
    expect(on.stdout).toContain('PASSED');
  });

  it('озвучка директорского дайджеста (платный OpenAI TTS) не подключена: не экспортируется из index.ts', () => {
    const index = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');
    expect(index).not.toContain('admin_director_digest_audio');
    expect(index).not.toContain('adminGenerateDirectorDigestAudio');
  });

  it('Cloud Functions: серверная озвучка карточек — единственное осознанное исключение (решение владельца 05.11)', () => {
    const worker = fs.readFileSync(path.join(root, 'functions/src/card_tts_worker.ts'), 'utf8');
    expect(worker).toMatch(/gpt-4o-mini-tts|audio\/speech/);
  });
});
