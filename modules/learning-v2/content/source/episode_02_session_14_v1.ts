import { EPISODE_02_SESSION_13_SOURCE } from './episode_02_session_13_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rewrite = <T,>(value: T): T => {
  const visit = (item: unknown): unknown => typeof item === 'string'
    ? item.replaceAll('e02-s13', 'e02-s14').replaceAll('public', 'obvious').replaceAll('Public', 'Obvious')
    : Array.isArray(item) ? item.map(visit)
      : item && typeof item === 'object'
        ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, nested]) => [key, visit(nested)]))
        : item;
  return visit(value) as T;
};
const source = rewrite(clone(EPISODE_02_SESSION_13_SOURCE)) as SessionSource & {
  requiredSessionOrdinal: number; generationInputFingerprint: string;
};
source.requiredSessionOrdinal = 14;
source.generationInputFingerprint = 'full-b1-exact-diagnostic-obvious-e02-s14-v1';

const obvious = source.newVocabulary?.[0];
if (!obvious) throw new Error('episode_02_session_14_obvious_card_missing');
obvious.meaning = {
  ru: 'очевидный: легко понять или заметить', uk: 'очевидний: легко зрозуміти або помітити',
  es: 'obvio: fácil de comprender o notar', 'pt-BR': 'óbvio: fácil de entender ou perceber',
  vi: 'rõ ràng: dễ hiểu hoặc dễ nhận thấy', id: 'jelas: mudah dipahami atau diperhatikan',
  tr: 'açık: kolayca anlaşılabilen ya da fark edilen', pl: 'oczywisty: łatwy do zrozumienia lub zauważenia',
};
const guidance = {
  ru: 'Найдите obvious: это легко понять или заметить.', uk: 'Знайдіть obvious: це легко зрозуміти або помітити.',
  es: 'Encuentra obvious: es fácil de comprender o notar.', 'pt-BR': 'Encontre obvious: é fácil de entender ou perceber.',
  vi: 'Tìm obvious: dễ hiểu hoặc dễ nhận thấy.', id: 'Temukan obvious: mudah dipahami atau diperhatikan.',
  tr: 'obvious sözcüğünü bulun: kolayca anlaşılır ya da fark edilir.', pl: 'Znajdź obvious: łatwo to zrozumieć lub zauważyć.',
};
const feedback = {
  short: {ru:'short — «короткий», а obvious — «очевидный, легко понятный».',uk:'short — «короткий», а obvious — «очевидний, легко зрозумілий».',es:'short significa «corto»; obvious significa «fácil de comprender».','pt-BR':'short significa «curto»; obvious significa «fácil de entender».',vi:'short là «ngắn»; obvious là «dễ hiểu và dễ nhận thấy».',id:'short berarti «pendek»; obvious berarti «mudah dipahami».',tr:'short «kısa» demektir; obvious ise «kolayca anlaşılır»dır.',pl:'short znaczy „krótki”, a obvious — „łatwy do zrozumienia”.'},
  aware: {ru:'aware — «осведомлённый», а obvious — «очевидный, легко понятный».',uk:'aware — «обізнаний», а obvious — «очевидний, легко зрозумілий».',es:'aware significa «consciente»; obvious significa «fácil de comprender».','pt-BR':'aware significa «ciente»; obvious significa «fácil de entender».',vi:'aware là «nhận biết»; obvious là «dễ hiểu».',id:'aware berarti «menyadari»; obvious berarti «mudah dipahami».',tr:'aware «farkında» demektir; obvious ise «kolayca anlaşılır»dır.',pl:'aware znaczy „świadomy”, a obvious — „łatwy do zrozumienia”.'},
  concerned: {ru:'concerned — «обеспокоенный», а obvious — «очевидный, легко понятный».',uk:'concerned — «стурбований», а obvious — «очевидний, легко зрозумілий».',es:'concerned significa «preocupado»; obvious significa «fácil de comprender».','pt-BR':'concerned significa «preocupado»; obvious significa «fácil de entender».',vi:'concerned là «lo lắng»; obvious là «dễ hiểu».',id:'concerned berarti «khawatir»; obvious berarti «mudah dipahami».',tr:'concerned «endişeli» demektir; obvious ise «kolayca anlaşılır»dır.',pl:'concerned znaczy „zaniepokojony”, a obvious — „łatwy do zrozumienia”.'},
} as const;
for (const [stage, stageGuidance] of Object.entries({
  recognize: guidance,
  retrieve_meaning: { ...guidance, ru: 'Вспомните: obvious — очевидный, его легко понять.', uk: 'Пригадайте: obvious — очевидний, його легко зрозуміти.' },
  build_form: { ...guidance, ru: 'Выберите целое слово obvious.', uk: 'Оберіть ціле слово obvious.' },
}) as Array<[keyof typeof obvious.contacts, typeof guidance]>) {
  const contact = obvious.contacts[stage];
  contact.guidance = stageGuidance;
  contact.distractors = contact.distractors.map((distractor) => ({ ...distractor, feedback: feedback[distractor.value as keyof typeof feedback] }));
}

export const EPISODE_02_SESSION_14_SOURCE: SessionSource = Object.freeze(source);
