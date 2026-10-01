import fs from 'node:fs';

// зачем: PM-206-A1 «Системные ответы и учебное аудио разделены». Снятие фанфар не должно
// задеть озвучку фраз, а настройка «звуки интерфейса» — выключать речь (SETTINGS_AUDIO.md).
// Проба проверяет разделение по исходникам — два канала, две настройки, два арбитра:
//  системные звуки: SOUND_EVENTS → SoundArbiter/SoundDirector → настройка uiSounds;
//  учебная речь:    claimSpokenAudio → SpokenAudioArbiter → настройка voiceOut.
const read = (p: string) => fs.readFileSync(p, 'utf8');
// зачем: упоминание в комментарии («см. hooks/phrase_audio_player.ts») — не зависимость.
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
const problems: string[] = [];
const need = (ok: boolean, msg: string) => { if (!ok) problems.push(msg); };

// 1) две независимые настройки
const settings = read('modules/audio/sound_settings.ts');
need(/effectsEnabled:\s*settings\.uiSounds/.test(settings), 'effectsEnabled должен идти от settings.uiSounds');
need(/voiceEnabled:\s*settings\.voiceOut/.test(settings), 'voiceEnabled должен идти от settings.voiceOut');

// 2) каталог системных звуков содержит только короткие эффекты из assets/audio/sfx/
const catalog = read('modules/audio/sound_events.ts');
const requires = [...catalog.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]);
need(requires.length >= 50, `каталог звуков подозрительно мал: ${requires.length}`);
for (const r of requires) {
  need(r.startsWith('../../assets/audio/sfx/'), `в каталоге системных звуков не-sfx файл: ${r}`);
}
need(!/expo-speech|phrase_audio|tts/i.test(catalog.replace(/\/\/[^\n]*/g, '')), 'каталог системных звуков ссылается на речь/озвучку');

// 3) системный канал не знает про речь; речевой канал не играет системные id
const sfxSide = ['modules/audio/sound_director.ts', 'modules/audio/sound_arbiter.ts', 'modules/audio/expo_sfx_backend.ts'];
for (const f of sfxSide) {
  const src = code(f);
  need(!/expo-speech|claimSpokenAudio|phrase_audio_player|use-audio/.test(src), `${f}: системный канал зависит от учебной речи`);
}
need(/if \(!this\.effectsEnabled\) return \{ kind: 'drop', reason: 'disabled' \}/.test(read('modules/audio/sound_arbiter.ts')),
  'SoundArbiter обязан отбрасывать звук при выключенных эффектах');
need(/if \(!this\.voiceEnabled\(\) \|\| this\.recordingActive\(\)\) return null;/.test(read('modules/audio/audio_runtime_arbiter.ts')),
  'SpokenAudioArbiter обязан отказывать при выключенной озвучке');

const spokenPlayers = [
  'hooks/phrase_audio_player.ts',
  'hooks/use-audio.ts',
  'hooks/use_managed_spoken_audio_player.ts',
  'app/flashcards/SoundService.ts',
];
for (const f of spokenPlayers) {
  const src = code(f);
  need(/claimSpokenAudio/.test(src), `${f}: учебная речь обязана брать claimSpokenAudio`);
  need(!/sound_events|sound_director|soundDirector/.test(src), `${f}: учебная речь не должна идти через системные звуки`);
}

console.log(`[PM-206-A1] sfx files=${requires.length} sfxModules=${sfxSide.length} spokenPlayers=${spokenPlayers.length}`);
if (problems.length) {
  for (const p of problems) console.log(`  - ${p}`);
  throw new Error(`PM-206-A1: ${problems.length} проблем`);
}
console.log('PM-206-A1 SYSTEM VS LEARNING AUDIO: PASS');
