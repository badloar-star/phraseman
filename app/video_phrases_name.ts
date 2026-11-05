// video_phrases_name.ts — название раздела «Видеофразы» одним словом на 9 языках.
// зачем (слово владельца ~21:00: «РАЗДЕЛ ФРАЗЫ ИЗ ВИДЕО ПЕРЕИМЕНОВАТЬ В 1 СЛОВО»; выбор «Видеофразы»): плитка Главной на ранге 0 и фильтр источника карточек зовут раздел одинаково;
// одно слово без пробела — влезает в плитку без переноса и сжатия. Сторож: tests/video_phrases_name_one_word.test.ts.
export const VIDEO_PHRASES_NAME = {
  ru: 'Видеофразы',
  uk: 'Відеофрази',
  en: 'Videophrases',
  es: 'Videofrases',
  'pt-BR': 'Videofrases',
  vi: 'Videocâu',
  id: 'Videofrasa',
  tr: 'Videocümleler',
  pl: 'Wideofrazy',
} as const;

export default function __VideoPhrasesNameRouteShim() {
  return null;
}
