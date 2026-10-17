// ═══════════════════════════════════════════════════════════════════════════
// spire_strings.ts — тексты экрана «Шпиль» на 9 языках интерфейса (пакет C).
//
// зачем: тексты взяты из макета spire.html «как есть» и идут через тот же triLang,
// что и соседние разделы «Сообщества». Порядок в кортеже: ru, uk, en, es, pt-BR,
// vi, id, tr, pl. Переводы кроме RU — предложение, носителем не проверены.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const S = {
  title: ['Пик', 'Пік', 'Peak', 'Pico', 'Pico', 'Đỉnh', 'Puncak', 'Zirve', 'Szczyt'], // зачем (владелец 13.10): «Шпиль» переименован в «Пик»
  untilEnd: ['до конца недели', 'до кінця тижня', 'until the week ends', 'hasta el fin de semana', 'até o fim da semana', 'đến hết tuần', 'sampai akhir minggu', 'haftanın sonuna', 'do końca tygodnia'],
  dayUnit: ['д', 'д', 'd', 'd', 'd', 'ngày', 'hr', 'gün', 'd'],
  hourUnit: ['ч', 'год', 'h', 'h', 'h', 'giờ', 'jam', 'sa', 'godz'],
  friendsWeek: ['Друзья на этой неделе', 'Друзі цього тижня', 'Friends this week', 'Amigos esta semana', 'Amigos nesta semana', 'Bạn bè tuần này', 'Teman minggu ini', 'Bu hafta arkadaşlar', 'Znajomi w tym tygodniu'],
  roomWeek: ['Комната недели', 'Кімната тижня', 'Room of the week', 'Sala de la semana', 'Sala da semana', 'Phòng của tuần', 'Ruang minggu ini', 'Haftanın odası', 'Pokój tygodnia'],
  allMembers: ['Все участники', 'Усі учасники', 'All participants', 'Todos los participantes', 'Todos os participantes', 'Tất cả người tham gia', 'Semua peserta', 'Tüm katılımcılar', 'Wszyscy uczestnicy'],
  // зачем (владелец 13.10, D177): главная кнопка Пика — «Играть», без «подняться/ступень»; ключ climb оставлен ради совместимости
  climb: ['Играть', 'Грати', 'Play', 'Jugar', 'Jogar', 'Chơi', 'Main', 'Oyna', 'Graj'],
  floor: ['Этаж', 'Поверх', 'Floor', 'Piso', 'Andar', 'Tầng', 'Lantai', 'Kat', 'Piętro'],
  guard: ['Страж', 'Вартовий', 'Guardian', 'Guardián', 'Guardião', 'Người canh', 'Penjaga', 'Muhafız', 'Strażnik'],
  summit: ['Вершина', 'Вершина', 'Summit', 'Cima', 'Topo', 'Đỉnh', 'Puncak', 'Zirve', 'Szczyt'],
  aboveClouds: ['Над облаками', 'Над хмарами', 'Above the clouds', 'Sobre las nubes', 'Acima das nuvens', 'Trên mây', 'Di atas awan', 'Bulutların üstünde', 'Nad chmurami'],
  stepsShort: ['ступ.', 'сход.', 'steps', 'esc.', 'deg.', 'bậc', 'lgk', 'bsm', 'st.'],
  coinsPerFloor: ['монет за этаж', 'монет за поверх', 'coins per floor', 'monedas por piso', 'moedas por andar', 'xu mỗi tầng', 'koin per lantai', 'jeton kat başına', 'monet za piętro'],
  youHere: ['Ты здесь', 'Ти тут', 'You are here', 'Estás aquí', 'Você está aqui', 'Bạn ở đây', 'Kamu di sini', 'Buradasın', 'Jesteś tutaj'],
  outOf: ['из', 'з', 'of', 'de', 'de', 'trên', 'dari', '/', 'z'],
  passed: ['Пройден', 'Пройдено', 'Cleared', 'Superado', 'Concluído', 'Đã qua', 'Selesai', 'Geçildi', 'Ukończone'],
  lockedTitle: ['Пик откроется чуть позже', 'Пік відкриється трохи пізніше', 'Peak opens a little later', 'El Pico se abrirá un poco más tarde', 'O Pico abrirá um pouco mais tarde', 'Đỉnh sẽ mở muộn hơn một chút', 'Puncak akan dibuka sedikit lebih lama', 'Zirve biraz daha geç açılacak', 'Szczyt otworzy się nieco później'],
  zoneUp: ['Зона повышения', 'Зона підвищення', 'Promotion zone', 'Zona de ascenso', 'Zona de subida', 'Vùng thăng hạng', 'Zona naik', 'Yükselme bölgesi', 'Strefa awansu'],
  zoneStay: ['Остаются', 'Залишаються', 'Stay', 'Se quedan', 'Permanecem', 'Ở lại', 'Bertahan', 'Kalanlar', 'Zostają'],
  zoneDown: ['Зона понижения', 'Зона пониження', 'Demotion zone', 'Zona de descenso', 'Zona de descida', 'Vùng xuống hạng', 'Zona turun', 'Düşme bölgesi', 'Strefa spadku'],
  you: ['Ты', 'Ти', 'You', 'Tú', 'Você', 'Bạn', 'Kamu', 'Sen', 'Ty'],
  back: ['Назад', 'Назад', 'Back', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz'],
} as const satisfies Record<string, Nine>;

// зачем (координатор 12.10): сторож полноты словаря (tests/spire_strings_completeness.test.ts) читает таблицу целиком — 9 языков в каждом ключе, одинаковые {подстановки}, числа как в константах.
export const SPIRE_STRINGS: Readonly<Record<string, Nine>> = S;

export type SpireStringKey = keyof typeof S;

/** Строка Шпиля на языке интерфейса (через тот же triLang, что и соседние разделы). */
export function spireText(lang: Lang, key: SpireStringKey): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = S[key];
  return triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

/** «до конца недели 2 д 14 ч» */
export function spireTimeLeftText(lang: Lang, days: number, hours: number): string {
  // зачем (снимки Макетов spire-004/011/013…, «0 д 2 ч»): одинокая «ч» уходила на вторую строку. Число и единица, а также «д» и следующее число склеены
  // неразрывными пробелами (U+00A0): срок «0 д 2 ч» переносится целиком, а не обрывается посреди.
  const nb = '\u00A0';
  return `${spireText(lang, 'untilEnd')} ${days}${nb}${spireText(lang, 'dayUnit')}${nb}${hours}${nb}${spireText(lang, 'hourUnit')}`;
}
