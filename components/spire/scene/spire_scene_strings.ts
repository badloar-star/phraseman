// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_strings.ts — тексты «Сцены» Пика (V2 «Пьедестал перед башней») на 9 языках интерфейса.
//
// зачем (владелец 22.10 выбрал V2, эталон docs/design/v2-app/peak-scene-v2.html под замком): тексты сцены — ровно из эталона
// («Новая неделя · Гранит», «ступень 7 из 8», «+10 за ступень», «Ещё 2 места до повышения», «Энергия через», «Ищем комнату…»).
// Общие слова Пика («Этаж», «до конца недели», «из», «Все участники») берутся из spire_strings.ts, здесь — только новые.
// Порядок в кортеже: ru, uk, en, es, pt-BR, vi, id, tr, pl. Пик открыт для ru/uk; остальные — предложение, носителем не проверены.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];

const S = {
  newWeek: ['Новая неделя', 'Новий тиждень', 'New week', 'Nueva semana', 'Nova semana', 'Tuần mới', 'Minggu baru', 'Yeni hafta', 'Nowy tydzień'],
  step: ['ступень', 'сходинка', 'step', 'escalón', 'degrau', 'bậc', 'langkah', 'basamak', 'stopień'],
  perStep: ['за ступень', 'за сходинку', 'per step', 'por escalón', 'por degrau', 'mỗi bậc', 'per langkah', 'basamak başına', 'za stopień'],
  perFloor: ['за этаж', 'за поверх', 'per floor', 'por piso', 'por andar', 'mỗi tầng', 'per lantai', 'kat başına', 'za piętro'],
  energyIn: ['Энергия через', 'Енергія через', 'Energy in', 'Energía en', 'Energia em', 'Năng lượng sau', 'Energi dalam', 'Enerji gelmesine', 'Energia za'],
  playIn: ['Играть через {t}', 'Грати через {t}', 'Play in {t}', 'Jugar en {t}', 'Jogar em {t}', 'Chơi sau {t}', 'Main dalam {t}', '{t} sonra oyna', 'Graj za {t}'],
  searching: ['Ищем…', 'Шукаємо…', 'Searching…', 'Buscando…', 'Procurando…', 'Đang tìm…', 'Mencari…', 'Aranıyor…', 'Szukamy…'],
  searchingRoom: ['Ищем комнату…', 'Шукаємо кімнату…', 'Finding a room…', 'Buscando sala…', 'Procurando sala…', 'Đang tìm phòng…', 'Mencari ruang…', 'Oda aranıyor…', 'Szukamy pokoju…'],
  yourLevelRoom: ['комната твоего уровня', 'кімната твого рівня', 'a room at your level', 'una sala de tu nivel', 'uma sala do seu nível', 'phòng đúng trình độ của bạn', 'ruang setingkatmu', 'seviyene uygun oda', 'pokój na twoim poziomie'],
  place: ['{n} место', '{n} місце', 'Place {n}', 'Puesto {n}', '{n}º lugar', 'Hạng {n}', 'Peringkat {n}', '{n}. sıra', '{n}. miejsce'],
  minUnit: ['мин', 'хв', 'min', 'min', 'min', 'phút', 'mnt', 'dk', 'min'],
} as const satisfies Record<string, Nine>;

// зачем: сторож полноты (tests/spire_scene_contract.test.ts) проверяет 9 языков в каждом ключе и одинаковые подстановки
export const SPIRE_SCENE_STRINGS: Readonly<Record<string, Nine>> = S;
export type SpireSceneStringKey = keyof typeof S;

export function spireSceneText(lang: Lang, key: SpireSceneStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const [ru, uk, en, es, ptBR, vi, id, tr, pl] = S[key];
  const raw = triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
  return vars ? raw.replace(/\{([a-z]+)\}/giu, (m, name: string) => (name in vars ? String(vars[name]) : m)) : raw;
}

const slavic = (n: number, forms: readonly [string, string, string]): string => {
  const a = n % 10;
  const b = n % 100;
  return a === 1 && b !== 11 ? forms[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? forms[1] : forms[2];
};

/**
 * «2 места до повышения» (своё место под пьедесталом) и «Ещё 2 места до повышения» (вечер конца недели) — с формой слова под число.
 * зачем: эталон V2, обе строки; падежи ru/uk/pl считаются, у остальных — единственное/множественное.
 */
export function spireScenePromoText(lang: Lang, n: number, more: boolean): string {
  return triLang(lang, {
    ru: `${more ? 'Ещё ' : ''}${n} ${slavic(n, ['место', 'места', 'мест'])} до повышения`,
    uk: `${more ? 'Ще ' : ''}${n} ${slavic(n, ['місце', 'місця', 'місць'])} до підвищення`,
    en: `${n}${more ? ' more' : ''} ${n === 1 ? 'place' : 'places'} to promotion`,
    es: `${more ? 'Faltan ' : ''}${n} ${n === 1 ? 'puesto' : 'puestos'} para el ascenso`,
    'pt-BR': `${more ? 'Faltam ' : ''}${n} ${n === 1 ? 'lugar' : 'lugares'} para a subida`,
    vi: `${more ? 'Còn ' : ''}${n} hạng nữa để thăng hạng`,
    id: `${more ? 'Tinggal ' : ''}${n} peringkat lagi untuk naik`,
    tr: `Terfiye ${n} sıra${more ? ' kaldı' : ''}`,
    pl: `${more ? 'Jeszcze ' : ''}${n} ${slavic(n, ['miejsce', 'miejsca', 'miejsc'])} do awansu`,
  });
}
