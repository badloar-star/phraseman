// ═════════════════════════════════════════════════════════════════════
// voice_display_name.ts — человеческое имя голоса озвучки вместо технического id (settings-gap-034, координатор 12.10).
//
// зачем: на Android у голосов expo-speech поле name — это идентификатор движка («en-au-x-aua-local», «en-us-x-iom-network»),
// и в строке «Голос озвучки (EN)» Настроек человек видел эту строку. iOS отдаёт настоящие имена («Samantha») — их не трогаем.
// Техническое имя превращаем в «язык (регион) · №»: «English (Australia) · 2». Номер — порядок голоса среди голосов того же
// языка и региона в списке устройства (по идентификатору), чтобы два австралийских голоса не выглядели одинаково.
// Чистый модуль без импортов: 9 языков интерфейса, неизвестный язык интерфейса → английские названия, неизвестный язык/регион → код.
// ═════════════════════════════════════════════════════════════════════

export type VoiceNameInput = Readonly<{ identifier: string; name?: string; quality?: string; language: string }>;

type UiTable = Readonly<Record<string, string>>;
const UI_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type UiLang = (typeof UI_LANGS)[number];

const row = (ru: string, uk: string, en: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string): UiTable =>
  ({ ru, uk, en, es, 'pt-BR': pt, vi, id, tr, pl });

const LANGUAGE_NAMES: Readonly<Record<string, UiTable>> = {
  en: row('Английский', 'Англійська', 'English', 'Inglés', 'Inglês', 'Tiếng Anh', 'Inggris', 'İngilizce', 'Angielski'),
  es: row('Испанский', 'Іспанська', 'Spanish', 'Español', 'Espanhol', 'Tiếng Tây Ban Nha', 'Spanyol', 'İspanyolca', 'Hiszpański'),
  fr: row('Французский', 'Французька', 'French', 'Francés', 'Francês', 'Tiếng Pháp', 'Prancis', 'Fransızca', 'Francuski'),
  de: row('Немецкий', 'Німецька', 'German', 'Alemán', 'Alemão', 'Tiếng Đức', 'Jerman', 'Almanca', 'Niemiecki'),
  it: row('Итальянский', 'Італійська', 'Italian', 'Italiano', 'Italiano', 'Tiếng Ý', 'Italia', 'İtalyanca', 'Włoski'),
  pt: row('Португальский', 'Португальська', 'Portuguese', 'Portugués', 'Português', 'Tiếng Bồ Đào Nha', 'Portugis', 'Portekizce', 'Portugalski'),
};

const REGION_NAMES: Readonly<Record<string, UiTable>> = {
  US: row('США', 'США', 'United States', 'Estados Unidos', 'Estados Unidos', 'Hoa Kỳ', 'Amerika Serikat', 'ABD', 'USA'),
  GB: row('Великобритания', 'Велика Британія', 'United Kingdom', 'Reino Unido', 'Reino Unido', 'Anh', 'Inggris Raya', 'Birleşik Krallık', 'Wielka Brytania'),
  AU: row('Австралия', 'Австралія', 'Australia', 'Australia', 'Austrália', 'Úc', 'Australia', 'Avustralya', 'Australia'),
  IN: row('Индия', 'Індія', 'India', 'India', 'Índia', 'Ấn Độ', 'India', 'Hindistan', 'Indie'),
  CA: row('Канада', 'Канада', 'Canada', 'Canadá', 'Canadá', 'Canada', 'Kanada', 'Kanada', 'Kanada'),
  IE: row('Ирландия', 'Ірландія', 'Ireland', 'Irlanda', 'Irlanda', 'Ireland', 'Irlandia', 'İrlanda', 'Irlandia'),
  NZ: row('Новая Зеландия', 'Нова Зеландія', 'New Zealand', 'Nueva Zelanda', 'Nova Zelândia', 'New Zealand', 'Selandia Baru', 'Yeni Zelanda', 'Nowa Zelandia'),
  ZA: row('ЮАР', 'ПАР', 'South Africa', 'Sudáfrica', 'África do Sul', 'Nam Phi', 'Afrika Selatan', 'Güney Afrika', 'RPA'),
  NG: row('Нигерия', 'Нігерія', 'Nigeria', 'Nigeria', 'Nigéria', 'Nigeria', 'Nigeria', 'Nijerya', 'Nigeria'),
  ES: row('Испания', 'Іспанія', 'Spain', 'España', 'Espanha', 'Tây Ban Nha', 'Spanyol', 'İspanya', 'Hiszpania'),
  MX: row('Мексика', 'Мексика', 'Mexico', 'México', 'México', 'Mexico', 'Meksiko', 'Meksika', 'Meksyk'),
  FR: row('Франция', 'Франція', 'France', 'Francia', 'França', 'Pháp', 'Prancis', 'Fransa', 'Francja'),
  DE: row('Германия', 'Німеччина', 'Germany', 'Alemania', 'Alemanha', 'Đức', 'Jerman', 'Almanya', 'Niemcy'),
  AT: row('Австрия', 'Австрія', 'Austria', 'Austria', 'Áustria', 'Áo', 'Austria', 'Avusturya', 'Austria'),
  CH: row('Швейцария', 'Швейцарія', 'Switzerland', 'Suiza', 'Suíça', 'Thụy Sĩ', 'Swiss', 'İsviçre', 'Szwajcaria'),
  IT: row('Италия', 'Італія', 'Italy', 'Italia', 'Itália', 'Ý', 'Italia', 'İtalya', 'Włochy'),
  BR: row('Бразилия', 'Бразилія', 'Brazil', 'Brasil', 'Brasil', 'Brazil', 'Brasil', 'Brezilya', 'Brazylia'),
  PT: row('Португалия', 'Португалія', 'Portugal', 'Portugal', 'Portugal', 'Bồ Đào Nha', 'Portugal', 'Portekiz', 'Portugalia'),
};

/** Имя — технический идентификатор движка (Android), а не имя человека: без пробелов, начинается с кода языка через дефис/подчёркивание. */
export function isTechnicalVoiceName(name: string, identifier: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed === identifier) return /^[a-z]{2,3}[-_]/i.test(trimmed);
  return !/\s/.test(trimmed) && /^[a-z]{2,3}[-_][a-z0-9]+([-_#][a-z0-9_#]+)*$/i.test(trimmed);
}

function uiLangOf(lang: string | undefined): UiLang {
  return (UI_LANGS as readonly string[]).includes(lang ?? '') ? (lang as UiLang) : 'en';
}

/** «en-AU» / «en_au» / «en-au-x-aua-local» → { language: 'en', region: 'AU' }. */
export function parseVoiceLocale(language: string, fallbackIdentifier: string): { language: string; region: string | null } {
  const source = (language || fallbackIdentifier || '').trim();
  const [lang = '', region = ''] = source.split(/[-_]/);
  const normalizedRegion = /^[a-z]{2}$/i.test(region) ? region.toUpperCase() : null;
  return { language: lang.toLowerCase(), region: normalizedRegion };
}

/** Порядковый номер голоса среди голосов того же языка-региона (по идентификатору, с 1); null — голос один или списка нет. */
export function voiceOrdinal(voice: VoiceNameInput, voices: readonly VoiceNameInput[] | undefined): number | null {
  if (!voices || voices.length === 0) return null;
  const key = (v: VoiceNameInput) => {
    const parsed = parseVoiceLocale(v.language, v.identifier);
    return `${parsed.language}-${parsed.region ?? ''}`;
  };
  const target = key(voice);
  const siblings = voices.filter((v) => key(v) === target).map((v) => v.identifier).sort();
  if (siblings.length < 2) return null;
  const index = siblings.indexOf(voice.identifier);
  return index >= 0 ? index + 1 : null;
}

/** Человеческая подпись технического голоса: «English (Australia) · 2». Неизвестный язык/регион — заглавным кодом («EN-AU»). */
/**
 * compact (settings-gap-034, 13.10): в строке «Голос озвучки (EN)» язык уже назван — показываем только регион и номер
 * («Австралия · 2»): полный вид «English (Australia) · 2» не помещался и переносил название строки на две строки.
 * Нет региона — язык, как в полном виде.
 */
export function technicalVoiceDisplayName(
  voice: VoiceNameInput,
  uiLang?: string,
  voices?: readonly VoiceNameInput[],
  compact = false,
): string {
  const ui = uiLangOf(uiLang);
  const { language, region } = parseVoiceLocale(voice.language, voice.identifier);
  const languageName = LANGUAGE_NAMES[language]?.[ui] ?? (language ? language.toUpperCase() : voice.identifier);
  const regionName = region ? (REGION_NAMES[region]?.[ui] ?? region) : null;
  const ordinal = voiceOrdinal(voice, voices);
  const suffix = ordinal ? ` · ${ordinal}` : '';
  if (compact && regionName) return `${regionName}${suffix}`;
  return `${languageName}${regionName ? ` (${regionName})` : ''}${suffix}`;
}
