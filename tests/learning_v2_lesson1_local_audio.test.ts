import fs from 'node:fs';
import path from 'node:path';

// зачем (переписано 04.10 по смыслу): прежний тест требовал, чтобы КАЖДАЯ запись старой статической озвучки попала в обновление по воздуху.
// Сегодня код урока 1 не подключает статические m4a вовсе (озвучка — опубликованные mp3 из кэша, см. тест выше), и обычный профиль app.json
// их больше не перечисляет. Сторож держит новую границу: ни один исходник не подключает m4a урока 1 через require/import — иначе файл
// попал бы в сборку, но не в обновление по воздуху, и озвучка пропала бы у обновлённых клиентов. Старые m4a в assets — осиротевшие (убрать отдельно).
test('no source requires the retired static Lesson 1 m4a recordings', () => {
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '__tests__') walk(rel);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        if (/(?:require|import)[^\r\n]*audio\/learning-v2\/lesson1\/[^\r\n]*\.m4a/.test(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))) offenders.push(rel);
      }
    }
  };
  for (const dir of ['app', 'components', 'modules', 'hooks']) walk(dir);
  expect(offenders).toEqual([]);
});

// зачем (владелец 22.10: «аудио убрали и сменили на TTS»): занятие говорит только голосом телефона через общий useAudio —
// без плеера записей, без прямого expo-speech и без сетевых адресов звука.
test('the active session speaks only with the device voice through the shared audio hook', () => {
  const source = fs.readFileSync(path.join(
    process.cwd(),
    'app/learning-v2/session/[id].tsx',
  ), 'utf8');
  expect(source).not.toMatch(/from ["']expo-audio["']/);
  expect(source).not.toContain('learningV2Lesson1AudioSource');
  expect(source).toContain('const { speak: speakLessonAudio, stop: stopLessonAudio } = useAudio();');
  expect(source).toContain('systemTtsOnly: true');
  expect(source).not.toContain('expo-speech');
  expect(source).not.toContain('Speech.speak');
  expect(source).not.toMatch(/https?:\/\//);
});
