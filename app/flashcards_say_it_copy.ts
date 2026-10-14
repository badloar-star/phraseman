/*
 * «Скажи по-…» для режима «Устно» (вспомнить и произнести) — под ИЗУЧАЕМЫЙ язык, 9 языков интерфейса.
 *
 * зачем (DQA / PM-134, 04.10): подпись была зашита «Скажи по-английски» и врала тем, кто учит испанский,
 * французский или немецкий. Неизвестный язык обучения → нейтральное «Скажи вслух» (с логом [FC-SAY-IT]).
 */
import { triLang, type Lang } from '../constants/i18n';
import type { RuntimeStudyTarget } from './target_storage_keys';

type SayItTarget = 'en' | 'es' | 'fr' | 'de' | 'it';

type SayItCopy = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;

const SAY_IT: Readonly<Record<SayItTarget, SayItCopy>> = {
  en: {
    ru: 'Скажи по-английски', uk: 'Скажи англійською', en: 'Say it in English', es: 'Dilo en inglés',
    'pt-BR': 'Diga em inglês', vi: 'Nói bằng tiếng Anh', id: 'Ucapkan dalam bahasa Inggris',
    tr: 'İngilizce söyle', pl: 'Powiedz po angielsku',
  },
  es: {
    ru: 'Скажи по-испански', uk: 'Скажи іспанською', en: 'Say it in Spanish', es: 'Dilo en español',
    'pt-BR': 'Diga em espanhol', vi: 'Nói bằng tiếng Tây Ban Nha', id: 'Ucapkan dalam bahasa Spanyol',
    tr: 'İspanyolca söyle', pl: 'Powiedz po hiszpańsku',
  },
  fr: {
    ru: 'Скажи по-французски', uk: 'Скажи французькою', en: 'Say it in French', es: 'Dilo en francés',
    'pt-BR': 'Diga em francês', vi: 'Nói bằng tiếng Pháp', id: 'Ucapkan dalam bahasa Prancis',
    tr: 'Fransızca söyle', pl: 'Powiedz po francusku',
  },
  de: {
    ru: 'Скажи по-немецки', uk: 'Скажи німецькою', en: 'Say it in German', es: 'Dilo en alemán',
    'pt-BR': 'Diga em alemão', vi: 'Nói bằng tiếng Đức', id: 'Ucapkan dalam bahasa Jerman',
    tr: 'Almanca söyle', pl: 'Powiedz po niemiecku',
  },
  // зачем (D188, 14.10): итальянский открыт — без своей строки он получал нейтральное «Скажи вслух».
  it: {
    ru: 'Скажи по-итальянски', uk: 'Скажи італійською', en: 'Say it in Italian', es: 'Dilo en italiano',
    'pt-BR': 'Diga em italiano', vi: 'Nói bằng tiếng Ý', id: 'Ucapkan dalam bahasa Italia',
    tr: 'İtalyanca söyle', pl: 'Powiedz po włosku',
  },
};

const SAY_IT_ALOUD: SayItCopy = {
  ru: 'Скажи вслух', uk: 'Скажи вголос', en: 'Say it aloud', es: 'Dilo en voz alta',
  'pt-BR': 'Diga em voz alta', vi: 'Nói thành tiếng', id: 'Ucapkan dengan lantang', tr: 'Sesli söyle', pl: 'Powiedz na głos',
};

function isSayItTarget(value: RuntimeStudyTarget): value is SayItTarget {
  return value === 'en' || value === 'es' || value === 'fr' || value === 'de' || value === 'it';
}

export function sayItInStudyLanguage(lang: Lang, studyTarget: RuntimeStudyTarget): string {
  if (isSayItTarget(studyTarget)) return triLang(lang, SAY_IT[studyTarget]);
  // зачем: неизвестный язык обучения — общий вариант без названия языка, а не ложный «по-английски».
  console.warn('[FC-SAY-IT] unknown study target → neutral «say it aloud»', JSON.stringify({ studyTarget: studyTarget ?? null }));
  return triLang(lang, SAY_IT_ALOUD);
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
