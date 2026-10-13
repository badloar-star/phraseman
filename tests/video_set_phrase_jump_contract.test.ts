// зачем (владелец 13.10, образец cards-v2.html videoSet() «▶ В видео»): в наборе из видео тап по фразе с отметкой времени РАСКРЫВАЕТ кнопку
// «▶ В видео», а не открывает ролик сразу; кнопка открывает ролик на секунде фразы; без отметки времени кнопки нет, строка только озвучивает.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const view = read('app/flashcards/VideoSetView.tsx');
const collection = read('app/flashcards_collection.tsx');

describe('набор из видео: кнопка «▶ В видео» у фразы', () => {
  it('тап по фразе с временем раскрывает кнопку, без времени — озвучка', () => {
    expect(view).toContain('if (onOpenMoment && time) toggleJump(card); else onSpeak(card.en);');
    expect(view).not.toContain('if (onOpenMoment && time) onOpenMoment(card); else onSpeak(card.en);');
    expect(view).toContain('const [openCardId, setOpenCardId] = useState<string | null>(null);');
    expect(view).toContain('animateNextLayoutTransition();');
  });

  it('кнопка рисуется только у раскрытой фразы с отметкой времени и обработчиком; название «В видео» на 9 языках', () => {
    expect(view).toContain('onOpenMoment && time && openCardId === card.id');
    expect(view).toContain('testID={`video-set-jump-${card.id}`}');
    for (const label of ["ru: 'В видео'", "uk: 'У відео'", "en: 'In the video'", "es: 'En el vídeo'", "'pt-BR': 'No vídeo'", "vi: 'Trong video'", "id: 'Di video'", "tr: 'Videoda'", "pl: 'W filmie'"]) {
      expect(view).toContain(label);
    }
    expect(view).not.toContain('Показать фразу в видео');
  });

  it('кнопка открывает ролик на секунде фразы тем же путём, что и раньше (HomeV2VideoPlayerModal startSec), без новых запросов', () => {
    expect(view).toContain('onOpenMoment(card);');
    expect(collection).toContain('startSec={videoMoment.startSec}');
    expect(collection).toContain('resolveVideoMoment(videoMomentPack, card)');
    expect(view).not.toMatch(/\bfetch\(|getDoc\(|httpsCallable\(/);
  });

  it('журнал [VIDEO-PHRASE-JUMP]: раскрытие, время и источник, открытие, отсутствие обработчика', () => {
    expect(view).toContain("'[VIDEO-PHRASE-JUMP]'");
    for (const phrase of ['раскрыта', 'свёрнута', 'videoStartSec, без запросов', 'открываю видео', 'обработчика нет']) expect(view).toContain(phrase);
  });
});
