// ═══════════════════════════════════════════════════════════════════════════
// moments_strings.ts — тексты «моментов вовлечения» Пика (v3): повышение, удержался, понижение (туман). 9 языков.
//
// зачем (владелец 14.10: «перенести полноценно все модалы и экраны, точно по макетам»): тексты — ровно из эталона docs/design/v2-app/engagement-moments-v3-all.html
// (m01/m02/m03), язык интерфейса/обучения — переменная. Переводы кроме RU — предложение, носителем не проверены (как tier_names).
// Падежи: название лиги в «Остаёшься в {Гранит→Граните}» — предложный падеж для ru/uk/pl (таблица ниже), остальные языки строят фразу без падежа.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { clampSpireTierIndex } from '../../../modules/spire/tier_names';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  // ── общее ──
  play: ['Играть', 'Грати', 'Play', 'Jugar', 'Jogar', 'Chơi', 'Main', 'Oyna', 'Graj'],
  skip: ['Пропустить', 'Пропустити', 'Skip', 'Omitir', 'Pular', 'Bỏ qua', 'Lewati', 'Geç', 'Pomiń'],
  // ── m01 · повышение ──
  promoWeekOverline: ['Итог недели · {league}', 'Підсумок тижня · {league}', 'Week result · {league}', 'Resultado de la semana · {league}', 'Resultado da semana · {league}', 'Kết quả tuần · {league}', 'Hasil minggu · {league}', 'Hafta sonucu · {league}', 'Wynik tygodnia · {league}'],
  promoCounting: ['Считаем монеты недели…', 'Рахуємо монети тижня…', 'Counting this week’s coins…', 'Contando las monedas de la semana…', 'Contando as moedas da semana…', 'Đang tính xu của tuần…', 'Menghitung koin minggu ini…', 'Haftanın jetonları sayılıyor…', 'Liczymy monety z tygodnia…'],
  promoBorder: ['Граница топ-5 — под тобой', 'Межа топ-5 — під тобою', 'The top-5 line is below you', 'La línea del top 5 queda debajo de ti', 'A linha do top 5 ficou abaixo de você', 'Vạch top 5 nằm dưới bạn', 'Garis 5 besar ada di bawahmu', 'İlk 5 çizgisi senin altında', 'Granica top 5 jest pod tobą'],
  zoneTop5: ['ТОП-5', 'ТОП-5', 'TOP 5', 'TOP 5', 'TOP 5', 'TOP 5', 'TOP 5', 'İLK 5', 'TOP 5'],
  promoRoomOverline: ['Топ-5 комнаты', 'Топ-5 кімнати', 'Room top 5', 'Top 5 de la sala', 'Top 5 da sala', 'Top 5 của phòng', '5 besar ruangan', 'Odanın ilk 5’i', 'Top 5 pokoju'],
  promoPlace: ['{n} место. Поднимаешься', '{n} місце. Піднімаєшся', 'Place {n}. You’re moving up', 'Puesto {n}. Subes', 'Posição {n}. Você sobe', 'Hạng {n}. Bạn thăng hạng', 'Peringkat {n}. Kamu naik', '{n}. sıra. Yükseliyorsun', '{n}. miejsce. Awansujesz'],
  floorTag: ['Этаж {n}', 'Поверх {n}', 'Floor {n}', 'Piso {n}', 'Andar {n}', 'Tầng {n}', 'Lantai {n}', 'Kat {n}', 'Piętro {n}'],
  promoBonus: ['+{n} монет за повышение', '+{n} монет за підвищення', '+{n} coins for moving up', '+{n} monedas por subir', '+{n} moedas por subir', '+{n} xu vì thăng hạng', '+{n} koin karena naik', 'Yükselme için +{n} jeton', '+{n} monet za awans'],
  // ── m02 · удержался ──
  staySay: ['Держимся.', 'Тримаємось.', 'Holding on.', 'Aguantamos.', 'Seguimos firmes.', 'Giữ vững nhé.', 'Bertahan.', 'Tutunuyoruz.', 'Trzymamy się.'],
  stayTitle: ['Остаёшься в {league}', 'Залишаєшся в {league}', 'You stay in {league}', 'Sigues en {league}', 'Você continua em {league}', 'Bạn ở lại {league}', 'Kamu tetap di {league}', 'Ligin: {league} — yerinde kalıyorsun', 'Zostajesz w {league}'],
  stayBody: ['{place} место · {coins} монет за неделю. До топ-5 не хватило {gap}.', '{place} місце · {coins} монет за тиждень. До топ-5 не вистачило {gap}.', 'Place {place} · {coins} coins this week. You were {gap} short of the top 5.', 'Puesto {place} · {coins} monedas esta semana. Te faltaron {gap} para el top 5.', 'Posição {place} · {coins} moedas na semana. Faltaram {gap} para o top 5.', 'Hạng {place} · {coins} xu trong tuần. Còn thiếu {gap} để vào top 5.', 'Peringkat {place} · {coins} koin minggu ini. Kurang {gap} untuk masuk 5 besar.', '{place}. sıra · bu hafta {coins} jeton. İlk 5’e {gap} eksik kaldı.', '{place}. miejsce · {coins} monet w tygodniu. Do top 5 zabrakło {gap}.'],
  // ── m03 · понижение (туман): монета спит и просыпается ЖЕСТОМ, но в ТЕКСТАХ монета не описана как живая (владелец 14.10: «только формулировка, анимацию сна, сердечки и эмоции оставить») ──
  downTitle: ['Новая неделя', 'Новий тиждень', 'A new week', 'Nueva semana', 'Nova semana', 'Tuần mới', 'Minggu baru', 'Yeni hafta', 'Nowy tydzień'],
  downBody: ['Неделя в пятёрке последних по монетам — спускаемся в {league}. Ранг, монеты и фразы на месте.', 'Тиждень у п’ятірці останніх за монетами — спускаємось у {league}. Ранг, монети й фрази на місці.', 'A week in the bottom five by coins — we move down to {league}. Your rank, coins and phrases are safe.', 'Una semana entre los cinco últimos por monedas: bajamos a {league}. Tu rango, monedas y frases siguen ahí.', 'Uma semana entre os cinco últimos em moedas — descemos para {league}. Seu rank, moedas e frases continuam aí.', 'Một tuần ở nhóm 5 người cuối theo xu — xuống {league}. Hạng, xu và cụm từ vẫn còn nguyên.', 'Seminggu di lima terbawah menurut koin — turun ke {league}. Peringkat, koin, dan frasa tetap aman.', 'Bir hafta jetonlara göre son beşteydin — {league} ligine iniyoruz. Rütben, jetonların ve ifadelerin yerinde.', 'Tydzień w ostatniej piątce wg monet — schodzimy do {league}. Ranga, monety i frazy zostają.'],
  downWakeTitle: ['Новая неделя', 'Новий тиждень', 'A new week', 'Nueva semana', 'Nova semana', 'Tuần mới', 'Minggu baru', 'Yeni hafta', 'Nowy tydzień'],
  downWakeBody: ['{league} · все с 1 этажа.', '{league} · усі з 1 поверху.', '{league} · everyone starts on floor 1.', '{league} · todos desde el piso 1.', '{league} · todos a partir do andar 1.', '{league} · mọi người từ tầng 1.', '{league} · semua mulai dari lantai 1.', '{league} · herkes 1. kattan başlar.', '{league} · wszyscy od piętra 1.'],
  downWake: ['Играть', 'Грати', 'Play', 'Jugar', 'Jogar', 'Chơi', 'Main', 'Oyna', 'Graj'],
  downLater: ['Напомнить вечером', 'Нагадати ввечері', 'Remind me tonight', 'Recordar por la tarde', 'Lembrar à noite', 'Nhắc tôi buổi tối', 'Ingatkan nanti malam', 'Akşam hatırlat', 'Przypomnij wieczorem'],
  downTapHint: ['Тапни монету', 'Торкнись монети', 'Tap the coin', 'Toca la moneda', 'Toque na moeda', 'Chạm vào đồng xu', 'Ketuk koin', 'Jetona dokun', 'Dotknij monety'],
} as const satisfies Readonly<Record<string, Nine>>;

export type MomentStringKey = keyof typeof S;

/** Предложный падеж названий 12 лиг: «Остаёшься в Граните». Индекс = tier 0…11. Только ru/uk/pl: остальные языки фразу падежом не строят. */
const LEAGUE_LOCATIVE: Readonly<Record<'ru' | 'uk' | 'pl', readonly string[]>> = {
  ru: ['Граните', 'Базальте', 'Мраморе', 'Нефрите', 'Кварце', 'Агате', 'Ониксе', 'Аметисте', 'Опале', 'Топазе', 'Обсидиане', 'Алмазе'],
  uk: ['Граніті', 'Базальті', 'Мармурі', 'Нефриті', 'Кварці', 'Агаті', 'Оніксі', 'Аметисті', 'Опалі', 'Топазі', 'Обсидіані', 'Алмазі'],
  pl: ['Granicie', 'Bazalcie', 'Marmurze', 'Nefrycie', 'Kwarcu', 'Agacie', 'Onyksie', 'Ametyście', 'Opalu', 'Topazie', 'Obsydianie', 'Diamencie'],
};

/** Название лиги для фразы «Остаёшься в …»: ru/uk/pl — предложный падеж, остальные — имя как есть. */
export function momentLeagueIn(lang: Lang, tier: unknown, plainName: string): string {
  const table = lang === 'ru' || lang === 'uk' || lang === 'pl' ? LEAGUE_LOCATIVE[lang] : null;
  return table ? table[clampSpireTierIndex(tier)] : plainName;
}

/** Целое число с неразрывным пробелом тысяч («1 180»): те же правила, что у подиума. */
export function momentNumber(n: number): string {
  const value = Math.max(0, Math.trunc(Number(n)) || 0);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Текст момента на языке интерфейса; `{ключ}` в строке заменяется значением из vars. Неизвестный язык — английский. */
export function momentText(lang: Lang, key: MomentStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const row = S[key] as Nine;
  const raw = row[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export const MOMENT_STRING_KEYS = Object.keys(S) as readonly MomentStringKey[];
