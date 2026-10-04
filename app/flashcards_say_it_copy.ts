/*
 * «Скажи по-…» для режима «Устно» (вспомнить и произнести) — под ИЗУЧАЕМЫЙ язык, 9 языков интерфейса.
 *
 * зачем (DQA / PM-134, 04.10): подпись была зашита «Скажи по-английски» и врала тем, кто учит испанский,
 * французский или немецкий. Неизвестный язык обучения → английский (как и весь раздел карточек по умолчанию).
 */
import { triLang, type Lang } from '../constants/i18n';
import type { RuntimeStudyTarget } from './target_storage_keys';

type SayItTarget = 'en' | 'es' | 'fr' | 'de';

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
};

export function sayItInStudyLanguage(lang: Lang, studyTarget: RuntimeStudyTarget): string {
  const target: SayItTarget = studyTarget === 'es' || studyTarget === 'fr' || studyTarget === 'de' ? studyTarget : 'en';
  return triLang(lang, SAY_IT[target]);
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
