/**
 * [SPIRE-GOLD] Тексты тоста, когда сервер не засчитал золото ступени (Ревизор 25.10: «число не должно падать без объяснения»).
 * Черновик 8 · Моменты, вычитка — 10 · Переводчик. Интерфейс на «ты» (замок владельца informal_address_ru_uk_guard).
 */
import type { PlannedTriLangCopy } from '../../constants/i18n';

// зачем (сторож spire_game_source_contract: префикс во всех файлах app/spire): тексты без журнала, метка — для поиска
export const SPIRE_GOLD_COPY_TAG = '[SPIRE]';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string } & PlannedTriLangCopy>;

/** Потолок дня выбран на другом устройстве или раньше: золото ступени не засчитано. */
export const SPIRE_GOLD_TOAST_DAILY_CAP: L9 = {
  ru: 'Золото на сегодня уже собрано — ×2 этого этапа не засчитано',
  uk: 'Золото на сьогодні вже зібране — ×2 цього етапу не зараховано',
  en: "Today's gold is already collected — this stage's ×2 didn't count",
  es: 'El oro de hoy ya está reunido: el ×2 de esta etapa no cuenta',
  'pt-BR': 'O ouro de hoje já foi coletado — o ×2 desta etapa não contou',
  vi: 'Vàng hôm nay đã nhận đủ — ×2 của giai đoạn này không được tính',
  id: 'Emas hari ini sudah terkumpul — ×2 di tahap ini tidak dihitung',
  tr: 'Bugünün altını zaten toplandı — bu aşamanın ×2’si sayılmadı',
  pl: 'Dzisiejsze złoto już zebrane — ×2 tego etapu się nie liczy',
};

/** Сервер ещё не начисляет золото или не признал его в этой ступени. */
export const SPIRE_GOLD_TOAST_NOT_COUNTED: L9 = {
  ru: 'Золото этого этапа не засчитано — ×2 убрано',
  uk: 'Золото цього етапу не зараховано — ×2 прибрано',
  en: "This stage's gold didn't count — ×2 removed",
  es: 'El oro de esta etapa no cuenta: se quitó el ×2',
  'pt-BR': 'O ouro desta etapa não contou — ×2 removido',
  vi: 'Vàng của giai đoạn này không được tính — đã bỏ ×2',
  id: 'Emas di tahap ini tidak dihitung — ×2 dihapus',
  tr: 'Bu aşamanın altını sayılmadı — ×2 kaldırıldı',
  pl: 'Złoto tego etapu się nie liczy — usunięto ×2',
};

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
