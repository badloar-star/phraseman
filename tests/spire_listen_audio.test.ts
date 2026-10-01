// Сторож PM-286-A2: задание Шпиля «на слух» звучит голосом телефона (D47), без скачивания.
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { resolveSpireListenAudio } from '../modules/spire/listen_audio';

const DRAFT = path.resolve(__dirname, '../content/arena-multilingual/generated/en/spire_listen_dictate_draft.jsonl');

describe('resolveSpireListenAudio', () => {
  it('device-tts → текст фразы и язык речи', () => {
    const r = resolveSpireListenAudio({ audioUri: 'device-tts:en:208be34b55c3475d', phrase: 'magazine' }, 'en');
    expect(r).toEqual({ ok: true, engine: 'device_tts', text: 'magazine', speechLanguage: 'en-US', lang: 'en' });
  });

  it('es/fr/de получают свой язык речи (D133)', () => {
    expect(resolveSpireListenAudio({ audioUri: 'device-tts:de:ab12', phrase: 'Hallo' }, 'de')).toMatchObject({ ok: true, speechLanguage: 'de-DE' });
    expect(resolveSpireListenAudio({ audioUri: 'device-tts:fr:ab12', phrase: 'Bonjour' }, 'fr')).toMatchObject({ ok: true, speechLanguage: 'fr-FR' });
    expect(resolveSpireListenAudio({ audioUri: 'device-tts:es:ab12', phrase: 'Hola' }, 'es')).toMatchObject({ ok: true, speechLanguage: 'es-ES' });
  });

  it('отказы называют причину, а не молчат', () => {
    expect(resolveSpireListenAudio({ audioUri: 'https://x/a.mp3', phrase: 'a' }, 'en')).toMatchObject({ ok: false, reason: 'not_device_tts' });
    expect(resolveSpireListenAudio({ audioUri: 'device-tts:it:ab12', phrase: 'ciao' }, 'it')).toMatchObject({ ok: false, reason: 'unsupported_lang' });
    expect(resolveSpireListenAudio({ audioUri: 'device-tts:en:ab12', phrase: 'a' }, 'de')).toMatchObject({ ok: false, reason: 'lang_mismatch' });
    expect(resolveSpireListenAudio({ audioUri: 'device-tts:en:ab12', phrase: '  ' }, 'en')).toMatchObject({ ok: false, reason: 'empty_text' });
  });

  it('каждое задание черновика en (listen/dictate из Learning V2) разрешается в голос телефона', () => {
    const lines = readFileSync(DRAFT, 'utf8').split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const bad = lines
      .map((line) => JSON.parse(line) as { taskId: string; studyTarget: string; payload: { audioUri?: string; phrase?: string } })
      .map((task) => ({ id: task.taskId, r: resolveSpireListenAudio(task.payload, task.studyTarget) }))
      .filter((x) => !x.r.ok);
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
