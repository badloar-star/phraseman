import { EPISODE_02_SESSION_11_SOURCE } from './episode_02_session_11_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rewrite = <T,>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [
    ['e02-s11', 'e02-s12'], ['urgent', 'private'], ['Urgent', 'Private'],
  ];
  const visit = (candidate: unknown): unknown => typeof candidate === 'string'
    ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), candidate)
    : Array.isArray(candidate)
      ? candidate.map(visit)
      : candidate && typeof candidate === 'object'
        ? Object.fromEntries(Object.entries(candidate as Record<string, unknown>).map(([key, item]) => [key, visit(item)]))
        : candidate;
  return visit(value) as T;
};

const source = rewrite(clone(EPISODE_02_SESSION_11_SOURCE)) as SessionSource & {
  requiredSessionOrdinal: number;
  generationInputFingerprint: string;
};
source.requiredSessionOrdinal = 12;
source.generationInputFingerprint = 'full-b1-exact-guided-private-e02-s12-v1';

const privateWord = source.newVocabulary?.[0];
if (!privateWord) throw new Error('episode_02_session_12_private_card_missing');
privateWord.meaning = {
  ru: 'личный: предназначенный не для всех', uk: 'приватний: призначений не для всіх',
  es: 'privado: destinado a una persona o a pocas personas', 'pt-BR': 'privado: destinado a uma pessoa ou a poucas pessoas',
  vi: 'riêng tư: chỉ dành cho một người hoặc vài người', id: 'pribadi: hanya untuk satu orang atau beberapa orang',
  tr: 'özel: yalnızca bir ya da birkaç kişi için olan', pl: 'prywatny: przeznaczony dla jednej osoby lub kilku osób',
};
const privateGuidance = {
  ru: 'Найдите private: это не для всех.', uk: 'Знайдіть private: це не для всіх.',
  es: 'Encuentra private: no es para todo el mundo.', 'pt-BR': 'Encontre private: não é para todo mundo.',
  vi: 'Tìm private: không dành cho mọi người.', id: 'Temukan private: bukan untuk semua orang.',
  tr: 'private sözcüğünü bulun: herkes için değildir.', pl: 'Znajdź private: to nie jest dla wszystkich.',
};
const privateFeedbackByDistractor = {
  short: { ru: 'short — «короткий», а private — «личный, не для всех».', uk: 'short — «короткий», а private — «приватний, не для всіх».', es: 'short significa «corto»; private significa «no destinado a todos».', 'pt-BR': 'short significa «curto»; private significa «não destinado a todos».', vi: 'short là «ngắn»; private là «không dành cho mọi người».', id: 'short berarti «pendek»; private berarti «bukan untuk semua orang».', tr: 'short «kısa» demektir; private ise «herkes için olmayan»dır.', pl: 'short znaczy „krótki”, a private — „nie dla wszystkich”.' },
  aware: { ru: 'aware — «осведомлённый», а private — «личный, не для всех».', uk: 'aware — «обізнаний», а private — «приватний, не для всіх».', es: 'aware significa «consciente»; private significa «no destinado a todos».', 'pt-BR': 'aware significa «ciente»; private significa «não destinado a todos».', vi: 'aware là «nhận biết»; private là «không dành cho mọi người».', id: 'aware berarti «menyadari»; private berarti «bukan untuk semua orang».', tr: 'aware «farkında» demektir; private ise «herkes için olmayan»dır.', pl: 'aware znaczy „świadomy”, a private — „nie dla wszystkich”.' },
  concerned: { ru: 'concerned — «обеспокоенный», а private — «личный, не для всех».', uk: 'concerned — «стурбований», а private — «приватний, не для всіх».', es: 'concerned significa «preocupado»; private significa «no destinado a todos».', 'pt-BR': 'concerned significa «preocupado»; private significa «não destinado a todos».', vi: 'concerned là «lo lắng»; private là «không dành cho mọi người».', id: 'concerned berarti «khawatir»; private berarti «bukan untuk semua orang».', tr: 'concerned «endişeli» demektir; private ise «herkes için olmayan»dır.', pl: 'concerned znaczy „zaniepokojony”, a private — „nie dla wszystkich”.' },
} as const;
for (const [stage, guidance] of Object.entries({
  recognize: privateGuidance,
  retrieve_meaning: { ...privateGuidance, ru: 'Вспомните: private — личный, не для всех.', uk: 'Пригадайте: private — приватний, не для всіх.' },
  build_form: { ...privateGuidance, ru: 'Выберите целое слово private.', uk: 'Оберіть ціле слово private.' },
}) as Array<[keyof typeof privateWord.contacts, typeof privateGuidance]>) {
  const contact = privateWord.contacts[stage];
  contact.guidance = guidance;
  contact.distractors = contact.distractors.map((distractor) => ({
    ...distractor,
    feedback: privateFeedbackByDistractor[distractor.value as keyof typeof privateFeedbackByDistractor],
  }));
}

export const EPISODE_02_SESSION_12_SOURCE: SessionSource = Object.freeze(source);
