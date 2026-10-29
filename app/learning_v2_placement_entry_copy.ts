// learning_v2_placement_entry_copy.ts — тексты подсказки на закрытых уроках/занятиях «Откроется после…» (9 языков).
// зачем (жалоба №8, владелец 28.10 через координатора): «Проверить уровень» в курсе и короткая плашка «Откроется после…» вместо немого
// покачивания замка. Тексты — Переводчик 28.10 (простые, без метафор, кнопки в одну строку). В карусели — «занятие», в списке «Все уроки»
// — «урок» (координатор 28.10). Карусельное слово (session / sesja / buổi) — то, что уже стоит на картах карусели.
// Владелец 29.10 (макет одобрен): «хорошо, но это же кнопка "Не хочу с начала" — пусть так и называется, если это она» — подписи
// «Проверить уровень» нет, кнопка везде seasonText(lang, 'notFromStart') (переводы уже есть).
import type { Lang } from '../constants/i18n';

type Locale = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type Copy = Readonly<Record<Locale, string>>;

const OPENS_AFTER_LESSON: Copy = {
  ru: 'Откроется после урока {n}', uk: 'Відкриється після уроку {n}', en: 'Unlocks after lesson {n}', es: 'Se desbloquea tras la lección {n}',
  'pt-BR': 'Libera depois da lição {n}', vi: 'Mở sau bài {n}', id: 'Terbuka setelah pelajaran {n}', tr: '{n}. dersten sonra açılır',
  pl: 'Odblokuje się po lekcji {n}',
};
const OPENS_AFTER_SESSION: Copy = {
  ru: 'Откроется после занятия {n}', uk: 'Відкриється після заняття {n}', en: 'Unlocks after session {n}', es: 'Se desbloquea tras la sesión {n}',
  'pt-BR': 'Libera depois da sessão {n}', vi: 'Mở sau buổi {n}', id: 'Terbuka setelah sesi {n}', tr: '{n}. oturumdan sonra açılır',
  pl: 'Odblokuje się po sesji {n}',
};

const pick = (copy: Copy, lang: Lang): string => copy[(lang in copy ? lang : 'en') as Locale];

/** Плашка на закрытом: `kind` — урок в «Все уроки» или занятие в карусели; `previous` — номер того, после которого откроется. */
export function placementOpensAfterText(lang: Lang, kind: 'lesson' | 'session', previous: number): string {
  return pick(kind === 'lesson' ? OPENS_AFTER_LESSON : OPENS_AFTER_SESSION, lang).replace('{n}', String(previous));
}

export default function __RouteShim() { return null; }
