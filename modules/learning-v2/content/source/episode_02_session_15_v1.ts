import { EPISODE_02_SESSION_14_SOURCE } from './episode_02_session_14_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rewrite = <T,>(value: T): T => {
  const visit = (item: unknown): unknown => typeof item === 'string'
    ? item.replaceAll('e02-s14', 'e02-s15').replaceAll('obvious', 'silent').replaceAll('Obvious', 'Silent')
    : Array.isArray(item) ? item.map(visit)
      : item && typeof item === 'object'
        ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, nested]) => [key, visit(nested)]))
        : item;
  return visit(value) as T;
};
const source = rewrite(clone(EPISODE_02_SESSION_14_SOURCE)) as SessionSource & {
  requiredSessionOrdinal: number; generationInputFingerprint: string;
};
source.requiredSessionOrdinal = 15;
source.generationInputFingerprint = 'full-b1-exact-diagnostic-silent-e02-s15-v1';

const silent = source.newVocabulary?.[0];
if (!silent) throw new Error('episode_02_session_15_silent_card_missing');
silent.meaning = {
  ru: 'тихий: без звука или шума', uk: 'тихий: без звуку або шуму',
  es: 'silencioso: sin sonido ni ruido', 'pt-BR': 'silencioso: sem som ou barulho',
  vi: 'yên lặng: không có âm thanh hay tiếng ồn', id: 'sunyi: tanpa suara atau kebisingan',
  tr: 'sessiz: ses ya da gürültü olmadan', pl: 'cichy: bez dźwięku lub hałasu',
};
const guidance = {
  ru: 'Найдите silent: без звука или шума.', uk: 'Знайдіть silent: без звуку або шуму.',
  es: 'Encuentra silent: sin sonido ni ruido.', 'pt-BR': 'Encontre silent: sem som ou barulho.',
  vi: 'Tìm silent: không có âm thanh hay tiếng ồn.', id: 'Temukan silent: tanpa suara atau kebisingan.',
  tr: 'silent sözcüğünü bulun: ses ya da gürültü yoktur.', pl: 'Znajdź silent: bez dźwięku lub hałasu.',
};
const feedback = {
  short:{ru:'short — «короткий», а silent — «тихий, без шума».',uk:'short — «короткий», а silent — «тихий, без шуму».',es:'short significa «corto»; silent significa «sin ruido».','pt-BR':'short significa «curto»; silent significa «sem barulho».',vi:'short là «ngắn»; silent là «không có tiếng ồn».',id:'short berarti «pendek»; silent berarti «tanpa kebisingan».',tr:'short «kısa» demektir; silent ise «gürültüsüz»dür.',pl:'short znaczy „krótki”, a silent — „bez hałasu”.'},
  aware:{ru:'aware — «осведомлённый», а silent — «тихий, без шума».',uk:'aware — «обізнаний», а silent — «тихий, без шуму».',es:'aware significa «consciente»; silent significa «sin ruido».','pt-BR':'aware significa «ciente»; silent significa «sem barulho».',vi:'aware là «nhận biết»; silent là «không có tiếng ồn».',id:'aware berarti «menyadari»; silent berarti «tanpa kebisingan».',tr:'aware «farkında» demektir; silent ise «gürültüsüz»dür.',pl:'aware znaczy „świadomy”, a silent — „bez hałasu”.'},
  concerned:{ru:'concerned — «обеспокоенный», а silent — «тихий, без шума».',uk:'concerned — «стурбований», а silent — «тихий, без шуму».',es:'concerned significa «preocupado»; silent significa «sin ruido».','pt-BR':'concerned significa «preocupado»; silent significa «sem barulho».',vi:'concerned là «lo lắng»; silent là «không có tiếng ồn».',id:'concerned berarti «khawatir»; silent berarti «tanpa kebisingan».',tr:'concerned «endişeli» demektir; silent ise «gürültüsüz»dür.',pl:'concerned znaczy „zaniepokojony”, a silent — „bez hałasu”.'},
} as const;
for (const [stage, stageGuidance] of Object.entries({
  recognize: guidance,
  retrieve_meaning: { ...guidance, ru: 'Вспомните: silent — тихий, без шума.', uk: 'Пригадайте: silent — тихий, без шуму.' },
  build_form: { ...guidance, ru: 'Выберите целое слово silent.', uk: 'Оберіть ціле слово silent.' },
}) as Array<[keyof typeof silent.contacts, typeof guidance]>) {
  const contact = silent.contacts[stage];
  contact.guidance = stageGuidance;
  contact.distractors = contact.distractors.map((distractor) => ({ ...distractor, feedback: feedback[distractor.value as keyof typeof feedback] }));
}
export const EPISODE_02_SESSION_15_SOURCE: SessionSource = Object.freeze(source);
