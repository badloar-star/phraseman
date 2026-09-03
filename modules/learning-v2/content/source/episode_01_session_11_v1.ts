/** Dedicated Full B1 Session 11 lexical contrast; historical question content is excluded. */
import { EPISODE_01_SESSION_10_SOURCE } from './episode_01_session_10_v1';
import { LESSON1_SESSION_11_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [
    ['e01-s10', 'e01-s11'], ['Session 10', 'Session 11'],
    ['old', 'smart'], ['Old', 'Smart'], ['kind', 'strong'], ['Kind', 'Strong'], ['funny', 'quiet'], ['Funny', 'Quiet'],
  ];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') {
      let text = item;
      for (const [from, to] of pairs) text = text.replaceAll(from, to);
      return text;
    }
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};

const authored = {
  ...replace(clone(EPISODE_01_SESSION_10_SOURCE)),
  requiredSessionOrdinal: 11,
  generationInputFingerprint: 'full-b1-exact-i-am-he-she-it-is-e01-s11-v2',
  modeNativePlanId: LESSON1_SESSION_11_MODE_NATIVE_PLAN_ID_V2,
} as any;

const meanings = [
  L('умный', 'розумний', 'inteligente', 'inteligente', 'thông minh', 'cerdas', 'akıllı', 'mądry'),
  L('сильный', 'сильний', 'fuerte', 'forte', 'mạnh mẽ', 'kuat', 'güçlü', 'silny'),
  L('тихий', 'тихий', 'callada', 'quieto', 'yên lặng', 'tenang', 'sessiz', 'cicha'),
] as const;
const phraseMeanings = [...meanings, L('готова', 'готова', 'lista', 'pronta', 'sẵn sàng', 'siap', 'hazır', 'gotowa')] as const;
const feedback = (target: string, wrong: string) => L(
  `Вы выбрали ${wrong}, но это не ${target}. Сравните написание и звук: в задании нужен именно ${target}.`, `Ви вибрали ${wrong}, але це не ${target}. Порівняйте написання й звук: у вправі потрібне саме ${target}.`, `Elegiste ${wrong}, pero no es ${target}. Compara la escritura y el sonido: aquí se necesita ${target}.`, `Você escolheu ${wrong}, mas não é ${target}. Compare a escrita e o som: aqui é preciso ${target}.`, `Bạn chọn ${wrong}, nhưng đó không phải ${target}. Hãy so sánh cách viết và âm: bài này cần ${target}.`, `Kamu memilih ${wrong}, tetapi itu bukan ${target}. Bandingkan tulisan dan bunyinya: tugas ini memerlukan ${target}.`, `${wrong} seçildi, ancak bu ${target} değildir. Yazılışını ve sesini karşılaştırın: burada ${target} gerekir.`, `Wybrano ${wrong}, ale to nie jest ${target}. Porównaj zapis i brzmienie: tutaj potrzebne jest ${target}.`,
);

for (const [index, item] of (authored.newVocabulary as any[]).entries()) {
  const meaning = meanings[index]!;
  item.meaning = meaning;
  item.contacts.recognize.guidance = L(`Слушайте ${item.target}: это «${meaning.ru}».`, `Послухайте ${item.target}: це «${meaning.uk}».`, `Escucha ${item.target}: significa «${meaning.es}».`, `Ouça ${item.target}: significa “${meaning['pt-BR']}”.`, `Nghe ${item.target}: nghĩa là “${meaning.vi}”.`, `Dengarkan ${item.target}: artinya “${meaning.id}”.`, `${item.target} sözcüğünü dinleyin: “${meaning.tr}” demektir.`, `Posłuchaj ${item.target}: znaczy „${meaning.pl}”.`);
  item.contacts.retrieve_meaning.guidance = L(`Выберите ${item.target}: «${meaning.ru}».`, `Оберіть ${item.target}: «${meaning.uk}».`, `Elige ${item.target}: «${meaning.es}».`, `Escolha ${item.target}: “${meaning['pt-BR']}”.`, `Chọn ${item.target}: “${meaning.vi}”.`, `Pilih ${item.target}: “${meaning.id}”.`, `${item.target} sözcüğünü seçin: “${meaning.tr}”.`, `Wybierz ${item.target}: „${meaning.pl}”.`);
  item.contacts.build_form.guidance = L(`Выберите целое слово ${item.target}.`, `Оберіть ціле слово ${item.target}.`, `Elige la palabra completa ${item.target}.`, `Escolha a palavra inteira ${item.target}.`, `Chọn từ đầy đủ ${item.target}.`, `Pilih kata lengkap ${item.target}.`, `Tam ${item.target} sözcüğünü seçin.`, `Wybierz całe słowo ${item.target}.`);
  for (const contact of Object.values(item.contacts) as any[]) for (const trap of contact.distractors) trap.feedback = feedback(item.target, trap.value);
}
for (const [index, phrase] of (authored.phrases as any[]).entries()) {
  const meaning = phraseMeanings[index]!;
  phrase.russian = meaning.ru;
  for (const locale of Object.keys(meaning)) {
    phrase.localizedDetails[locale].meaning = (meaning as any)[locale];
    phrase.localizedDetails[locale].explanation = `${phrase.english}: ${phrase.english.split(' ')[0]} identifies the person, is links that person to the description.`;
  }
}

export const EPISODE_01_SESSION_11_SOURCE: SessionSource = Object.freeze(authored);
