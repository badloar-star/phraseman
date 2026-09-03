import { EPISODE_02_SESSION_10_SOURCE } from './episode_02_session_10_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const source=JSON.parse(JSON.stringify(EPISODE_02_SESSION_10_SOURCE))as SessionSource&{requiredSessionOrdinal:number;generationInputFingerprint:string};
const visit=(x:unknown):unknown=>typeof x==='string'?x.replaceAll('e02-s10','e02-s11').replaceAll('impossible','urgent').replaceAll('Impossible','Urgent'):Array.isArray(x)?x.map(visit):x&&typeof x==='object'?Object.fromEntries(Object.entries(x as Record<string,unknown>).map(([k,v])=>[k,visit(v)])):x;
const rewritten=visit(source)as typeof source;rewritten.requiredSessionOrdinal=11;rewritten.generationInputFingerprint='full-b1-exact-diagnostic-urgent-e02-s11-v1';
// Session 11 is a new lexical sense, not a string replacement.  Keep the
// inherited mode geometry, but author the urgent card and its diagnostics in
// every learner locale from scratch.
const urgent = rewritten.newVocabulary?.[0];
if (!urgent) throw new Error('episode_02_session_11_urgent_card_missing');
urgent.meaning={
  ru:'срочный: требующий немедленного внимания', uk:'терміновий: такий, що потребує негайної уваги',
  es:'urgente: que necesita atención inmediata', 'pt-BR':'urgente: que precisa de atenção imediata',
  vi:'khẩn cấp: cần được chú ý ngay', id:'mendesak: perlu perhatian segera',
  tr:'acil: hemen ilgilenilmesi gereken', pl:'pilny: wymagający natychmiastowej uwagi',
};
const urgentGuidance={
  ru:'Найдите слово urgent: это то, что нельзя откладывать.', uk:'Знайдіть слово urgent: це те, що не можна відкладати.',
  es:'Encuentra urgent: es algo que no puede esperar.', 'pt-BR':'Encontre urgent: é algo que não pode esperar.',
  vi:'Tìm urgent: đó là việc không thể chờ.', id:'Temukan urgent: ini sesuatu yang tidak bisa menunggu.',
  tr:'urgent sözcüğünü bulun: bekleyemeyecek bir şeydir.', pl:'Znajdź urgent: to coś, co nie może czekać.',
};
const urgentFeedbackByDistractor={
  short:{ru:'short — «короткий», а urgent — «срочный, требующий внимания сейчас».',uk:'short — «короткий», а urgent — «терміновий, що потребує уваги зараз».',es:'short significa «corto»; urgent significa «que necesita atención ahora».','pt-BR':'short significa «curto»; urgent significa «que precisa de atenção agora».',vi:'short là «ngắn»; urgent là «cần được chú ý ngay».',id:'short berarti «pendek»; urgent berarti «perlu perhatian segera».',tr:'short «kısa» demektir; urgent ise «hemen ilgilenilmesi gereken»dir.',pl:'short znaczy „krótki”, a urgent — „wymagający uwagi teraz”.'},
  aware:{ru:'aware — «осведомлённый», а urgent — «срочный, требующий внимания сейчас».',uk:'aware — «обізнаний», а urgent — «терміновий, що потребує уваги зараз».',es:'aware significa «consciente»; urgent significa «que necesita atención ahora».','pt-BR':'aware significa «ciente»; urgent significa «que precisa de atenção agora».',vi:'aware là «nhận biết»; urgent là «cần được chú ý ngay».',id:'aware berarti «menyadari»; urgent berarti «perlu perhatian segera».',tr:'aware «farkında» demektir; urgent ise «hemen ilgilenilmesi gereken»dir.',pl:'aware znaczy „świadomy”, a urgent — „wymagający uwagi teraz”.'},
  concerned:{ru:'concerned — «обеспокоенный», а urgent — «срочный, требующий внимания сейчас».',uk:'concerned — «стурбований», а urgent — «терміновий, що потребує уваги зараз».',es:'concerned significa «preocupado»; urgent significa «que necesita atención ahora».','pt-BR':'concerned significa «preocupado»; urgent significa «que precisa de atenção agora».',vi:'concerned là «lo lắng»; urgent là «cần được chú ý ngay».',id:'concerned berarti «khawatir»; urgent berarti «perlu perhatian segera».',tr:'concerned «endişeli» demektir; urgent ise «hemen ilgilenilmesi gereken»dir.',pl:'concerned znaczy „zaniepokojony”, a urgent — „wymagający uwagi teraz”.'},
} as const;
for (const [stage, guidance] of Object.entries({
  recognize: urgentGuidance,
  retrieve_meaning: { ...urgentGuidance, ru:'Вспомните: urgent — срочный, его нельзя откладывать.', uk:'Пригадайте: urgent — терміновий, його не можна відкладати.' },
  build_form: { ...urgentGuidance, ru:'Выберите целое слово urgent.', uk:'Оберіть ціле слово urgent.' },
}) as Array<[keyof typeof urgent.contacts, typeof urgentGuidance]>) {
  const contact=urgent.contacts[stage];
  contact.guidance=guidance;
  contact.distractors=contact.distractors.map((distractor)=>({
    ...distractor,
    feedback: urgentFeedbackByDistractor[distractor.value as keyof typeof urgentFeedbackByDistractor],
  }));
}
export const EPISODE_02_SESSION_11_SOURCE:SessionSource=Object.freeze(rewritten);
