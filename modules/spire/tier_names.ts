/**
 * Имена 12 шпилей-камней во всех языках интерфейса (PM-278, T29).
 *
 * зачем: владелец назвал 12 ступеней Шпиля камнями (Гранит … Алмаз). Шпиль
 * N — ровно бывшая лига N (Медная=0 → Гранит=0 … Высшая=11 → Алмаз=11),
 * поэтому таблица устроена как имена лиг (clubTierShortName в
 * app/spire engine.ts): индекс = tier, выбор языка — тем же triLang, что у
 * лиги, чтобы Шпиль и старая лига вели себя одинаково на всех локалях.
 *
 * Порядок строк менять НЕЛЬЗЯ: tier хранится в leaderboard.spireTiers и в
 * комнатах spire_groups как число. Сторож: tests/spire_tier_names.test.ts
 * (12 имён в каждой локали, ни одного пустого, RU совпадает с T29).
 *
 * Переводы кроме RU — предложение, носителем не проверены (evidence/PM-278).
 */
import { triLang, type Lang } from '../../constants/i18n';

/** Сколько шпилей. Равно числу лиг (CLUBS.length) — условие переноса без потерь. */
export const SPIRE_TIER_COUNT = 12;

export type SpireTierNameLocale = Lang;

export const SPIRE_TIER_NAMES: Readonly<Record<SpireTierNameLocale, readonly string[]>> = Object.freeze({
  ru: Object.freeze(['Гранит', 'Базальт', 'Мрамор', 'Нефрит', 'Кварц', 'Агат', 'Оникс', 'Аметист', 'Опал', 'Топаз', 'Обсидиан', 'Алмаз']),
  uk: Object.freeze(['Граніт', 'Базальт', 'Мармур', 'Нефрит', 'Кварц', 'Агат', 'Онікс', 'Аметист', 'Опал', 'Топаз', 'Обсидіан', 'Алмаз']),
  en: Object.freeze(['Granite', 'Basalt', 'Marble', 'Jade', 'Quartz', 'Agate', 'Onyx', 'Amethyst', 'Opal', 'Topaz', 'Obsidian', 'Diamond']),
  es: Object.freeze(['Granito', 'Basalto', 'Mármol', 'Jade', 'Cuarzo', 'Ágata', 'Ónix', 'Amatista', 'Ópalo', 'Topacio', 'Obsidiana', 'Diamante']),
  'pt-BR': Object.freeze(['Granito', 'Basalto', 'Mármore', 'Jade', 'Quartzo', 'Ágata', 'Ônix', 'Ametista', 'Opala', 'Topázio', 'Obsidiana', 'Diamante']),
  vi: Object.freeze(['Đá granit', 'Đá bazan', 'Cẩm thạch', 'Ngọc bích', 'Thạch anh', 'Mã não', 'Mã não đen', 'Thạch anh tím', 'Đá opal', 'Hoàng ngọc', 'Đá vỏ chai', 'Kim cương']),
  id: Object.freeze(['Granit', 'Basal', 'Marmer', 'Giok', 'Kuarsa', 'Akik', 'Oniks', 'Kecubung', 'Opal', 'Topas', 'Obsidian', 'Berlian']),
  tr: Object.freeze(['Granit', 'Bazalt', 'Mermer', 'Yeşim', 'Kuvars', 'Akik', 'Oniks', 'Ametist', 'Opal', 'Topaz', 'Obsidyen', 'Elmas']),
  pl: Object.freeze(['Granit', 'Bazalt', 'Marmur', 'Nefryt', 'Kwarc', 'Agat', 'Onyks', 'Ametyst', 'Opal', 'Topaz', 'Obsydian', 'Diament']),
});

/** Прижать tier к 0..11 — битое число из кэша не должно ронять экран. */
export function clampSpireTierIndex(tier: unknown): number {
  const n = Math.trunc(Number(tier));
  return Number.isFinite(n) ? Math.max(0, Math.min(SPIRE_TIER_COUNT - 1, n)) : 0;
}

/** Имя шпиля на языке интерфейса. */
export function spireTierName(tier: unknown, lang: Lang): string {
  const i = clampSpireTierIndex(tier);
  return triLang(lang, {
    ru: SPIRE_TIER_NAMES.ru[i],
    uk: SPIRE_TIER_NAMES.uk[i],
    es: SPIRE_TIER_NAMES.es[i],
    en: SPIRE_TIER_NAMES.en[i],
    'pt-BR': SPIRE_TIER_NAMES['pt-BR'][i],
    vi: SPIRE_TIER_NAMES.vi[i],
    id: SPIRE_TIER_NAMES.id[i],
    tr: SPIRE_TIER_NAMES.tr[i],
    pl: SPIRE_TIER_NAMES.pl[i],
  });
}
