/** Full B1 Session 34: guided contraction extension with afraid. */
import { EPISODE_01_SESSION_33_SOURCE } from './episode_01_session_33_v1';
import { LESSON1_SESSION_25_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => { const pairs: readonly (readonly [string, string])[] = [['e01-s33', 'e01-s34'], ['okay', 'afraid'], ['Okay', 'Afraid'], ['steady', 'uneasy'], ['Steady', 'Uneasy'], ['secure', 'settled'], ['Secure', 'Settled']]; const visit = (item: unknown): unknown => typeof item === 'string' ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item) : Array.isArray(item) ? item.map(visit) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])) : item; return visit(value) as T; };
const authored = replace(clone(EPISODE_01_SESSION_33_SOURCE)) as any;
authored.requiredSessionOrdinal = 34;
authored.generationInputFingerprint = 'full-b1-exact-guided-contraction-e01-s34-v1';
authored.modeNativePlanId = LESSON1_SESSION_25_MODE_NATIVE_PLAN_ID_V2;
authored.reviewConstructIds = ['full_form_choice'];
authored.title = L('Afraid — с is', 'Afraid — з is', 'Afraid — con is', 'Afraid — com is', 'Afraid — với is', 'Afraid — dengan is', 'Afraid — is ile', 'Afraid — z is');
authored.summary = L('Услышь afraid и выбери точное утверждение.', 'Почуй afraid і обери точне твердження.', 'Escucha afraid y elige la afirmación exacta.', 'Ouça afraid e escolha a afirmação exata.', 'Nghe afraid và chọn câu khẳng định chính xác.', 'Dengarkan afraid dan pilih pernyataan yang tepat.', 'Afraid sözcüğünü dinle ve doğru olumlu cümleyi seç.', 'Usłysz afraid i wybierz dokładne twierdzenie.');
const meanings = [L('испуганный', 'наляканий', 'asustado', 'com medo', 'sợ hãi', 'takut', 'korkmuş', 'przestraszony'), L('неспокойный', 'неспокійний', 'inquieto', 'inquieto', 'bất an', 'gelisah', 'tedirgin', 'niespokojny'), L('устроившийся', 'влаштований', 'acomodado', 'acomodado', 'ổn định', 'mapan', 'yerleşmiş', 'ustalony')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
export const EPISODE_01_SESSION_34_SOURCE: SessionSource = Object.freeze(authored);
