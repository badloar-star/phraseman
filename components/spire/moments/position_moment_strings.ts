// ═══════════════════════════════════════════════════════════════════════════
// position_moment_strings.ts — тексты момента m05 «Позиция выросла / обогнали / последний шанс», 9 языков.
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m05; образец engagement-moments-v3-all.html `rise3` / `overtake3` / `last3`): остальные строки (ступень пройдена, монет, Энергия через {t},
// «Играй без ожидания», «с Plus», «К башне») берутся из spire_game_strings / step_moment_strings. Тост «обгон» написан БЕЗ рода («{имя} обгоняет тебя» вместо «обошла»): пол соперника в данных нет, угадывать нельзя.
// Переводы кроме RU — предложение, носителем не проверены.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { withMomentCoinWords } from './moments_strings';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  counting: ['Считаем место…', 'Рахуємо місце…', 'Counting your place…', 'Contando tu puesto…', 'Contando sua posição…', 'Đang tính hạng…', 'Menghitung peringkat…', 'Sıran hesaplanıyor…', 'Liczymy miejsce…'],
  inTop5: ['Ты в топ-5', 'Ти в топ-5', 'You’re in the top 5', 'Estás en el top 5', 'Você está no top 5', 'Bạn vào top 5', 'Kamu masuk 5 besar', 'İlk 5’tesin', 'Jesteś w top 5'],
  playMore: ['Играть ещё', 'Грати ще', 'Play more', 'Jugar más', 'Jogar mais', 'Chơi tiếp', 'Main lagi', 'Biraz daha oyna', 'Graj dalej'],
  overtake: ['{name} обгоняет тебя', '{name} випереджає тебе', '{name} is passing you', '{name} te adelanta', '{name} está passando você', '{name} đang vượt bạn', '{name} menyalipmu', '{name} seni geçiyor', '{name} wyprzedza cię'],
  overtakeSub: ['на {n} {nwa} недели', 'на {n} {nwa} тижня', 'by {n} {nwa} this week', 'por {n} {nwa} esta semana', 'por {n} {nwa} esta semana', 'hơn {n} {nwa} tuần này', 'selisih {n} {nwa} minggu ini', 'bu hafta {n} {nwa} farkla', 'o {n} {nwa} w tym tygodniu'],
  lastOver: ['Воскресенье · до итога', 'Неділя · до підсумку', 'Sunday · until results', 'Domingo · hasta el resultado', 'Domingo · até o resultado', 'Chủ nhật · đến lúc chốt', 'Hari Minggu · sebelum hasil', 'Pazar · sonuca kadar', 'Niedziela · do wyniku'],
  lastBody: ['До топ-5 — {gap}. Энергия вернётся через {t}.', 'До топ-5 — {gap}. Енергія повернеться через {t}.', '{gap} to the top 5. Energy is back in {t}.', 'Para el top 5: {gap}. La energía vuelve en {t}.', 'Para o top 5: {gap}. A energia volta em {t}.', 'Đến top 5 còn {gap}. Năng lượng quay lại sau {t}.', 'Kurang {gap} ke 5 besar. Energi kembali dalam {t}.', 'İlk 5’e {gap} kaldı. Enerji {t} sonra geri gelir.', 'Do top 5 — {gap}. Energia wróci za {t}.'],
  gapCoins: ['{n} {nw}', '{n} {nw}', '{n} {nw}', '{n} {nw}', '{n} {nw}', '{n} {nw}', '{n} {nw}', '{n} {nw}', '{n} {nw}'],
  plusLink: ['Играй без ожидания с Plus', 'Грай без очікування з Plus', 'Play without waiting with Plus', 'Juega sin esperar con Plus', 'Jogue sem esperar com Plus', 'Chơi không chờ với Plus', 'Main tanpa menunggu dengan Plus', 'Plus ile beklemeden oyna', 'Graj bez czekania z Plus'],
} as const satisfies Readonly<Record<string, Nine>>;

export type PositionMomentStringKey = keyof typeof S;
export const POSITION_MOMENT_STRING_KEYS = Object.keys(S) as readonly PositionMomentStringKey[];
export const POSITION_MOMENT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function positionMomentText(lang: Lang, key: PositionMomentStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const raw = (S[key] as Nine)[LANG_INDEX[lang] ?? LANG_INDEX.en];
  // зачем (Ревизор P19, 15.10): {nw}/{nwa} — слово «монета» в форме под {n} («на 1 монету», «22 монеты»), а не зашитое «монет».
  const filled = withMomentCoinWords(lang, vars);
  if (!filled) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in filled ? String(filled[name]) : whole));
}

/** «h:mm:ss» → «03:12:40» (отсчёт до конца недели). */
export function positionClockHms(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${two(Math.floor(total / 3600))}:${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}`;
}
