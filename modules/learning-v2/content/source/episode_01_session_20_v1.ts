/** Full B1 Session 20: guided affirmative application. */
import { EPISODE_01_SESSION_19_SOURCE } from './episode_01_session_19_v1';
import { LESSON1_SESSION_20_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => { const pairs: readonly (readonly [string, string])[] = [['e01-s19', 'e01-s20'], ['together', 'lost'], ['Together', 'Lost'], ['alone', 'prepared'], ['Alone', 'Prepared'], ['nearby', 'careful'], ['Nearby', 'Careful']]; const v=(x:unknown):unknown=>typeof x==='string'?pairs.reduce((s,[a,b])=>s.replaceAll(a,b),x):Array.isArray(x)?x.map(v):x&&typeof x==='object'?Object.fromEntries(Object.entries(x as Record<string,unknown>).map(([k,c])=>[k,v(c)])):x; return v(value) as T; };
const authored = replace(clone(EPISODE_01_SESSION_19_SOURCE)) as any;
authored.requiredSessionOrdinal=20; authored.generationInputFingerprint='full-b1-exact-guided-application-e01-s20-v1'; authored.modeNativePlanId=LESSON1_SESSION_20_MODE_NATIVE_PLAN_ID_V2;
authored.title=L('Три новых состояния','Три нові стани','Tres estados nuevos','Três estados novos','Ba trạng thái mới','Tiga keadaan baru','Üç yeni durum','Trzy nowe stany');
authored.summary=L('Примени знакомые формы с lost, prepared и careful.','Застосуй знайомі форми з lost, prepared і careful.','Aplica las formas conocidas con lost, prepared y careful.','Use as formas conhecidas com lost, prepared e careful.','Dùng các dạng quen thuộc với lost, prepared và careful.','Gunakan bentuk yang dikenal dengan lost, prepared, dan careful.','Bilinen biçimleri lost, prepared ve careful ile kullan.','Zastosuj znane formy z lost, prepared i careful.');
authored.learningGoal=L('Выбрать точное новое описание в знакомой фразе.','Обрати точний новий опис у знайомій фразі.','Elegir la nueva descripción exacta en una frase conocida.','Escolher a nova descrição exata numa frase conhecida.','Chọn mô tả mới chính xác trong câu quen thuộc.','Memilih deskripsi baru yang tepat dalam kalimat yang dikenal.','Bilinen cümlede doğru yeni tanımı seçmek.','Wybrać dokładny nowy opis w znanym zdaniu.');
const meanings=[L('потеряны','заблукали','perdidos','perdidos','bị lạc','tersesat','kaybolmuş','zagubieni'),L('готовы','підготовлені','preparados','preparados','đã chuẩn bị','siap','hazır','przygotowani'),L('осторожны','обережні','cuidadosos','cuidadosos','cẩn thận','berhati-hati','dikkatli','ostrożni')];
for(const [i,m] of meanings.entries())authored.newVocabulary[i]!.meaning=m;
const examples=['We are lost','We are prepared','We are careful'];
for(const [i,p] of authored.introPages.entries()){const e=examples[i]!;for(const locale of Object.keys(p.body)){const opening=String(p.body[locale]).split('.').slice(0,2).join('.').trim();p.body[locale]=`${opening}. ${e}.`;}p.question.choices[0]=L(e,e,e,e,e,e,e,e);p.question.explanation=p.body;p.bodyRuns=Object.fromEntries(Object.entries(p.body).map(([locale,text])=>[locale,[{text,semantic:'explanation'}]]));}
export const EPISODE_01_SESSION_20_SOURCE: SessionSource=Object.freeze(authored);
