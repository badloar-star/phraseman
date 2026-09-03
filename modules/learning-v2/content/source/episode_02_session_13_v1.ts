import { EPISODE_02_SESSION_12_SOURCE } from './episode_02_session_12_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const replace = <T,>(value: T): T => {
  const visit = (item: unknown): unknown => typeof item === 'string'
    ? item.replaceAll('e02-s12', 'e02-s13').replaceAll('private', 'public').replaceAll('Private', 'Public')
    : Array.isArray(item) ? item.map(visit)
      : item && typeof item === 'object'
        ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, nested]) => [key, visit(nested)]))
        : item;
  return visit(value) as T;
};
const source = replace(copy(EPISODE_02_SESSION_12_SOURCE)) as SessionSource & {
  requiredSessionOrdinal: number; generationInputFingerprint: string;
};
source.requiredSessionOrdinal = 13;
source.generationInputFingerprint = 'full-b1-exact-diagnostic-public-e02-s13-v1';

const publicWord = source.newVocabulary?.[0];
if (!publicWord) throw new Error('episode_02_session_13_public_card_missing');
publicWord.meaning = {
  ru: 'публичный: открытый для всех', uk: 'публічний: відкритий для всіх',
  es: 'público: abierto a todas las personas', 'pt-BR': 'público: aberto para todas as pessoas',
  vi: 'công khai: mở cho mọi người', id: 'publik: terbuka untuk semua orang',
  tr: 'herkese açık: herkesin erişebileceği', pl: 'publiczny: otwarty dla wszystkich',
};
const publicGuidance = {
  ru: 'Найдите public: это открыто для всех.', uk: 'Знайдіть public: це відкрите для всіх.',
  es: 'Encuentra public: está abierto a todas las personas.', 'pt-BR': 'Encontre public: está aberto para todas as pessoas.',
  vi: 'Tìm public: nó mở cho mọi người.', id: 'Temukan public: ini terbuka untuk semua orang.',
  tr: 'public sözcüğünü bulun: herkesin erişimine açıktır.', pl: 'Znajdź public: jest otwarte dla wszystkich.',
};
const publicFeedbackByDistractor = {
  short: { ru: 'short — «короткий», а public — «открытый для всех».', uk: 'short — «короткий», а public — «відкритий для всіх».', es: 'short significa «corto»; public significa «abierto a todos».', 'pt-BR': 'short significa «curto»; public significa «aberto para todos».', vi: 'short là «ngắn»; public là «mở cho mọi người».', id: 'short berarti «pendek»; public berarti «terbuka untuk semua orang».', tr: 'short «kısa» demektir; public ise «herkese açık»tır.', pl: 'short znaczy „krótki”, a public — „otwarty dla wszystkich”.' },
  aware: { ru: 'aware — «осведомлённый», а public — «открытый для всех».', uk: 'aware — «обізнаний», а public — «відкритий для всіх».', es: 'aware significa «consciente»; public significa «abierto a todos».', 'pt-BR': 'aware significa «ciente»; public significa «aberto para todos».', vi: 'aware là «nhận biết»; public là «mở cho mọi người».', id: 'aware berarti «menyadari»; public berarti «terbuka untuk semua orang».', tr: 'aware «farkında» demektir; public ise «herkese açık»tır.', pl: 'aware znaczy „świadomy”, a public — „otwarty dla wszystkich”.' },
  concerned: { ru: 'concerned — «обеспокоенный», а public — «открытый для всех».', uk: 'concerned — «стурбований», а public — «відкритий для всіх».', es: 'concerned significa «preocupado»; public significa «abierto a todos».', 'pt-BR': 'concerned significa «preocupado»; public significa «aberto para todos».', vi: 'concerned là «lo lắng»; public là «mở cho mọi người».', id: 'concerned berarti «khawatir»; public berarti «terbuka untuk semua orang».', tr: 'concerned «endişeli» demektir; public ise «herkese açık»tır.', pl: 'concerned znaczy „zaniepokojony”, a public — „otwarty dla wszystkich”.' },
} as const;
for (const [stage, guidance] of Object.entries({
  recognize: publicGuidance,
  retrieve_meaning: { ...publicGuidance, ru: 'Вспомните: public — открытый для всех.', uk: 'Пригадайте: public — відкритий для всіх.' },
  build_form: { ...publicGuidance, ru: 'Выберите целое слово public.', uk: 'Оберіть ціле слово public.' },
}) as Array<[keyof typeof publicWord.contacts, typeof publicGuidance]>) {
  const contact = publicWord.contacts[stage];
  contact.guidance = guidance;
  contact.distractors = contact.distractors.map((distractor) => ({
    ...distractor,
    feedback: publicFeedbackByDistractor[distractor.value as keyof typeof publicFeedbackByDistractor],
  }));
}

export const EPISODE_02_SESSION_13_SOURCE: SessionSource = Object.freeze(source);
