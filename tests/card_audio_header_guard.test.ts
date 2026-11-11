// зачем (владелец 06.11, TestFlight 150: «у некоторых слов в Карточках озвучка просто шипит»):
// клип карточки, который скачался, но не является mp3 (JSON/HTML ошибки хранилища, обрезок), нативный плеер iOS играет как шум.
// Сторож контрактный (без нативного модуля): проверка заголовка mp3 стоит на ВСЕХ четырёх путях (кэш и скачивание — для
// проигрывания и для фоновой докачки), битый файл удаляется, а журнал [CARD-AUDIO] пишет нажатие и результат клипа.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const player = readFileSync(join(__dirname, '..', 'hooks', 'phrase_audio_player.ts'), 'utf8');
const useAudio = readFileSync(join(__dirname, '..', 'hooks', 'use-audio.ts'), 'utf8');

describe('аудио карточек: заголовок mp3 и журнал [CARD-AUDIO]', () => {
  it('проверка заголовка (ID3 или синхрослово MPEG) существует', () => {
    expect(player).toMatch(/function inspectAudioFile/);
    expect(player).toMatch(/0x49[\s\S]{0,40}0x44[\s\S]{0,40}0x33/);
    expect(player).toMatch(/0xff[\s\S]{0,40}0xe0/i);
  });
  it('validateOrDeleteAudioFile применён на 2 путях клипа карточки (кэш и скачивание)', () => {
    const uses = player.match(/validateOrDeleteAudioFile\(/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(3); // объявление + 2 вызова (кэш и скачивание клипа карточки)
  });
  it('битый файл удаляется и логируется', () => {
    expect(player).toMatch(/\[CARD-AUDIO\] file:invalid/);
    expect(player).toMatch(/file\.delete\(\)/);
  });
  // зачем (владелец 11.11.2026, «удали всю озвучку» → «дочисти что надо»): клипов карточек больше нет, журнал
  // нажатия/результата клипа ушёл вместе с веткой клипа. Сторожим обратное — шипящему клипу неоткуда взяться:
  // карточка идёт сразу в голос устройства, а маршрут пишется в [PACK-AUDIO] speak:route.
  it('карточка не играет клип: сразу голос устройства, маршрут в журнале', () => {
    expect(useAudio).not.toMatch(/playCardClipUrl/);
    expect(useAudio).toMatch(/void speakCardWithDevice\(cardLanguage\)/);
    expect(useAudio).toMatch(/\[PACK-AUDIO\] speak:route/);
  });
});
