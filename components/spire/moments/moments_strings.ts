// ═══════════════════════════════════════════════════════════════════════════
// moments_strings.ts — тексты «моментов вовлечения» Пика (v3): повышение, удержался, понижение (туман). 9 языков.
//
// зачем (владелец 14.10: «перенести полноценно все модалы и экраны, точно по макетам»): тексты — ровно из эталона docs/design/v2-app/engagement-moments-v3-all.html
// (m01/m02/m03), язык интерфейса/обучения — переменная. Переводы кроме RU — предложение, носителем не проверены (как tier_names).
// Падежи: название лиги в «Остаёшься в {Гранит→Граните}» — предложный падеж для ru/uk/pl (таблица ниже), остальные языки строят фразу без падежа.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { clampSpireTierIndex } from '../../../modules/spire/tier_names';
import { pluralWord, type PluralForms } from '../../../constants/plural';

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
  promoPlace: ['{n} место. Поднимаешься', '{n} місце. Піднімаєшся', 'Place {n}. You’re moving up', 'Puesto {n}. Subes de liga', 'Posição {n}. Você sobe de liga', 'Hạng {n}. Bạn thăng hạng', 'Peringkat {n}. Kamu naik liga', '{n}. sıra. Yükseliyorsun', '{n}. miejsce. Awansujesz'],
  // зачем (координатор 17.10, эталон #four-tiles (в)): бейдж места на плитке «Пик» Главной.
  // Переводчик 17.10: плитка ~74 dp, бейдж 11 pt растёт влево — id «Peringkat 12» (~92 dp) и pl «12. miejsce» залезали на соседнюю
  // плитку; короткие общепринятые формы: id «Ke-12» (как «peringkat ke-12»), pl «12. msc.» (сокращение из таблиц результатов).
  // зачем (координатор 17.10): сбой системного «Поделиться» — короткая человеческая фраза, без системных слов
  shareFailed: ['Не получилось поделиться, попробуй ещё раз', 'Не вдалося поділитися, спробуй ще раз', 'Couldn’t share — try again', 'No se pudo compartir, inténtalo de nuevo', 'Não deu para compartilhar, tente de novo', 'Chưa chia sẻ được, thử lại nhé', 'Belum bisa dibagikan, coba lagi', 'Paylaşılamadı, tekrar dene', 'Nie udało się udostępnić, spróbuj jeszcze raz'],
  placeBadge: ['{n} место', '{n} місце', 'Place {n}', 'Puesto {n}', '{n}º lugar', 'Hạng {n}', 'Ke-{n}', '{n}. sıra', '{n}. msc.'],
  floorTag: ['Этаж {n}', 'Поверх {n}', 'Floor {n}', 'Piso {n}', 'Andar {n}', 'Tầng {n}', 'Lantai {n}', 'Kat {n}', 'Piętro {n}'],
  promoBonus: ['+{n} {nw} за повышение', '+{n} {nw} за підвищення', '+{n} {nw} for moving up', '+{n} {nw} por subir', '+{n} {nw} por subir', '+{n} {nw} vì thăng hạng', '+{n} {nw} karena naik', 'Yükseldiğin için +{n} {nw}', '+{n} {nw} za awans'],
  // зачем (m01 вариант B «Короткая», лист приёмки CHECKLIST_m01): надпись, заголовок, строка итога и текст «Поделиться»; нейтральные по роду формулировки
  promoShortOverline: ['Топ-5 · {league}', 'Топ-5 · {league}', 'Top 5 · {league}', 'Top 5 · {league}', 'Top 5 · {league}', 'Top 5 · {league}', '5 besar · {league}', 'İlk 5 · {league}', 'Top 5 · {league}'],
  promoShortTitle: ['Поднимаешься', 'Піднімаєшся', 'You’re moving up', 'Subes de liga', 'Você sobe de liga', 'Bạn thăng hạng', 'Kamu naik liga', 'Yükseliyorsun', 'Awansujesz'],
  promoShortBody: ['{place} место · {coins} {cw} за неделю', '{place} місце · {coins} {cw} за тиждень', 'Place {place} · {coins} {cw} this week', 'Puesto {place} · {coins} {cw} esta semana', 'Posição {place} · {coins} {cw} na semana', 'Hạng {place} · {coins} {cw} trong tuần', 'Peringkat {place} · {coins} {cw} minggu ini', '{place}. sıra · bu hafta {coins} {cw}', '{place}. miejsce · {coins} {cw} w tygodniu'],
  promoShortPlaceOnly: ['{place} место', '{place} місце', 'Place {place}', 'Puesto {place}', 'Posição {place}', 'Hạng {place}', 'Peringkat {place}', '{place}. sıra', '{place}. miejsce'],
  promoShareText: ['Поднимаюсь в лигу {league} в Phraseman: {place} место, {coins} {cw} за неделю.', 'Піднімаюсь у лігу {league} у Phraseman: {place} місце, {coins} {cw} за тиждень.', 'Moving up to {league} in Phraseman: place {place}, {coins} {cw} this week.', 'Subo a {league} en Phraseman: puesto {place}, {coins} {cw} esta semana.', 'Subindo para {league} no Phraseman: posição {place}, {coins} {cw} na semana.', 'Thăng hạng {league} trong Phraseman: hạng {place}, {coins} {cw} trong tuần.', 'Naik ke {league} di Phraseman: peringkat {place}, {coins} {cw} minggu ini.', 'Phraseman’da {league} ligine yükseliyorum: {place}. sıra, bu hafta {coins} {cw}.', 'Awansuję do ligi {league} w Phraseman: {place}. miejsce, {coins} {cw} w tygodniu.'],
  // ── m02 · удержался ──
  staySay: ['Держимся.', 'Тримаємось.', 'Holding steady.', 'Aguantamos.', 'Seguimos firmes.', 'Giữ vững nhé.', 'Kita bertahan.', 'Tutunuyoruz.', 'Trzymamy się.'],
  stayTitle: ['Остаёшься в {league}', 'Залишаєшся в {league}', 'You stay in {league}', 'Sigues en {league}', 'Você continua em {league}', 'Bạn ở lại {league}', 'Kamu tetap di {league}', '{league} liginde kalıyorsun', 'Zostajesz w {league}'],
  stayBody: ['{place} место · {coins} {cw} за неделю. До топ-5 не хватило {gap}.', '{place} місце · {coins} {cw} за тиждень. До топ-5 не вистачило {gap}.', 'Place {place} · {coins} {cw} this week. You were {gap} short of the top 5.', 'Puesto {place} · {coins} {cw} esta semana. Te faltaron {gap} para el top 5.', 'Posição {place} · {coins} {cw} na semana. Faltaram {gap} para o top 5.', 'Hạng {place} · {coins} {cw} trong tuần. Còn thiếu {gap} để vào top 5.', 'Peringkat {place} · {coins} {cw} minggu ini. Kurang {gap} untuk masuk 5 besar.', '{place}. sıra · bu hafta {coins} {cw}. İlk 5’e {gap} eksik kaldı.', '{place}. miejsce · {coins} {cw} w tygodniu. Do top 5 zabrakło {gap}.'],
  stayBodyNoGap: ['{place} место · {coins} {cw} за неделю.', '{place} місце · {coins} {cw} за тиждень.', 'Place {place} · {coins} {cw} this week.', 'Puesto {place} · {coins} {cw} esta semana.', 'Posição {place} · {coins} {cw} na semana.', 'Hạng {place} · {coins} {cw} trong tuần.', 'Peringkat {place} · {coins} {cw} minggu ini.', '{place}. sıra · bu hafta {coins} {cw}.', '{place}. miejsce · {coins} {cw} w tygodniu.'],
  // ── m03 · понижение (туман): монета спит и просыпается ЖЕСТОМ, но в ТЕКСТАХ монета не описана как живая (владелец 14.10: «только формулировка, анимацию сна, сердечки и эмоции оставить») ──
  downTitle: ['Неделя закончилась: {league}', 'Тиждень закінчився: {league}', 'The week is over: {league}', 'La semana terminó: {league}', 'A semana acabou: {league}', 'Tuần đã kết thúc: {league}', 'Minggu telah berakhir: {league}', 'Hafta bitti: {league}', 'Tydzień się skończył: {league}'],
  downBody: ['Неделя в пятёрке последних по монетам — спускаемся в {league}. Ранг, монеты и фразы на месте.', 'Тиждень у п’ятірці останніх за монетами — спускаємось у {league}. Ранг, монети й вислови на місці.', 'A week in the bottom five by coins — you move down to {league}. Your rank, coins and phrases are safe.', 'Una semana entre los cinco últimos por monedas: bajamos a {league}. Tu rango, monedas y frases siguen ahí.', 'Uma semana entre os cinco últimos em moedas — descemos para {league}. Seu rank, moedas e frases continuam aí.', 'Một tuần ở nhóm 5 người cuối theo xu — xuống {league}. Hạng, xu và cụm từ vẫn còn nguyên.', 'Seminggu di lima terbawah menurut koin — turun ke {league}. Peringkat, koin, dan frasa tetap aman.', 'Bir hafta jetonlara göre son beşteydin — {league} ligine iniyoruz. Rütben, jetonların ve ifadelerin yerinde.', 'Tydzień w ostatniej piątce według monet — schodzimy do ligi {league}. Ranga, monety i frazy zostają.'],
  downWakeTitle: ['Новая неделя', 'Новий тиждень', 'A new week', 'Nueva semana', 'Nova semana', 'Tuần mới', 'Minggu baru', 'Yeni hafta', 'Nowy tydzień'],
  downWakeBody: ['{league} · все с 1 этажа.', '{league} · усі з 1 поверху.', '{league} · everyone starts on floor 1.', '{league} · todos desde el piso 1.', '{league} · todos a partir do andar 1.', '{league} · mọi người từ tầng 1.', '{league} · semua mulai dari lantai 1.', '{league} · herkes 1. kattan başlar.', '{league} · wszyscy od piętra 1.'],
  downWake: ['Играть', 'Грати', 'Play', 'Jugar', 'Jogar', 'Chơi', 'Main', 'Oyna', 'Graj'],
  downLater: ['Напомнить вечером', 'Нагадати ввечері', 'Remind me tonight', 'Avísame esta noche', 'Me lembre à noite', 'Nhắc tôi tối nay', 'Ingatkan nanti malam', 'Akşam hatırlat', 'Przypomnij wieczorem'],
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

// зачем (Ревизор P19 → координатор 15.10): «21 монет», «22 монет», en «1 coins» — слово после числа было зашито. Форма слова «монета»
// под число: именительный («+21 монета», «22 монеты за неделю») и винительный для «на/o N …» («обгоняет на 1 монету», pl «o 1 monetę»).
// Правило выбора формы — общее для приложения (constants/plural.ts: pl «21 monet»), здесь только слова.
const COIN_NOM: Readonly<Record<string, PluralForms>> = {
  ru: { one: 'монета', few: 'монеты', many: 'монет' }, uk: { one: 'монета', few: 'монети', many: 'монет' }, pl: { one: 'moneta', few: 'monety', many: 'monet' },
  en: { one: 'coin', few: 'coins', many: 'coins' }, es: { one: 'moneda', few: 'monedas', many: 'monedas' }, 'pt-BR': { one: 'moeda', few: 'moedas', many: 'moedas' },
  vi: { one: 'xu', few: 'xu', many: 'xu' }, id: { one: 'koin', few: 'koin', many: 'koin' }, tr: { one: 'jeton', few: 'jeton', many: 'jeton' },
};
const COIN_ACC: Readonly<Record<string, PluralForms>> = {
  ...COIN_NOM,
  ru: { one: 'монету', few: 'монеты', many: 'монет' }, uk: { one: 'монету', few: 'монети', many: 'монет' }, pl: { one: 'monetę', few: 'monety', many: 'monet' },
};

/** Число из переменной шаблона: 1180, «1 180» (с неразрывным пробелом тысяч) → 1180; не число → null. */
function countOf(value: string | number | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/** Слово «монета» в форме под число: `acc` — винительный («на 1 монету»), иначе именительный («+21 монета»). */
export function momentCoinWord(lang: Lang, count: number, acc = false): string {
  const table = acc ? COIN_ACC : COIN_NOM;
  return pluralWord(lang, count, table[lang] ?? table.en!);
}

/** Добавляет слова под числа: `{nw}` — к `{n}`, `{cw}` — к `{coins}`, `{nwa}` — винительный к `{n}`. */
export function withMomentCoinWords(lang: Lang, vars?: Readonly<Record<string, string | number>>): Readonly<Record<string, string | number>> | undefined {
  if (!vars) return vars;
  const out: Record<string, string | number> = { ...vars };
  const n = countOf(vars.n);
  const coins = countOf(vars.coins);
  if (n !== null) { out.nw = momentCoinWord(lang, n); out.nwa = momentCoinWord(lang, n, true); }
  if (coins !== null) out.cw = momentCoinWord(lang, coins);
  return out;
}

/** Текст момента на языке интерфейса; `{ключ}` в строке заменяется значением из vars. Неизвестный язык — английский. */
export function momentText(lang: Lang, key: MomentStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const row = S[key] as Nine;
  const raw = row[LANG_INDEX[lang] ?? LANG_INDEX.en];
  const filled = withMomentCoinWords(lang, vars);
  if (!filled) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in filled ? String(filled[name]) : whole));
}

export const MOMENT_STRING_KEYS = Object.keys(S) as readonly MomentStringKey[];
