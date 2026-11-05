// зачем: P0 владельца 05.11 — в локалях кроме ru/uk нельзя упоминать русский язык/кириллицу (читатель-американец, испанец… русского не знает).
// Точечные замены для старой (не plain) теории; plain-теория исправлена в источниках. Сторож: scripts/classic_locale_leak_check.mjs.
const LOCALES = new Set(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
const REPL = [
  [/and not on the assumption that the Russian or English past tense always follows the same pattern/g, 'and not on the assumption that the past tense always follows the same pattern in every language'],
  [/y no en la suposición de que el pretérito en ruso o inglés siempre sigue el mismo patrón/g, 'y no en la suposición de que el pretérito siempre sigue el mismo patrón en todos los idiomas'],
  [/Russian «масло» can be two Italian words: /g, 'Italian has two separate words where some languages use one: '],
  [/aunque en ruso ambos mensajes podrían considerarse en pasado/g, 'aunque ambos mensajes podrían considerarse pasado'],
  [/pretérito perfeito em russo ou inglês sempre segue o mesmo padrão/g, 'pretérito perfeito sempre segue o mesmo padrão em todas as línguas'],
  [/thì quá khứ trong tiếng Nga hoặc tiếng Anh luôn tuân theo cùng một quy tắc/g, 'thì quá khứ luôn tuân theo cùng một quy tắc ở mọi ngôn ngữ'],
  [/Rusça veya İngilizce geçmiş zamanın her zaman aynı kalıbı izlediği varsayımına değil/g, 'geçmiş zamanın her dilde her zaman aynı kalıbı izlediği varsayımına değil'],
  [/czas przeszły w języku rosyjskim lub angielskim zawsze opiera się na tym samym schemacie/g, 'czas przeszły zawsze opiera się na tym samym schemacie w każdym języku'],
  [/bentuk lampau bahasa Rusia atau Inggris selalu mengikuti pola yang sama/g, 'bentuk lampau selalu mengikuti pola yang sama di setiap bahasa'],
  [/, mesmo que em russo ambas as mensagens possam ser consideradas no passado/g, ''],
  [/, ngay cả khi trong tiếng Nga cả hai thông điệp đều có thể được gọi là thì quá khứ/g, ''],
  [/, Rusçada her iki mesaj da geçmiş zaman olarak adlandırılabilse bile/g, ''],
  [/, nawet jeśli w języku rosyjskim oba komunikaty można by nazwać czasem przeszłym/g, ''],
  [/, meskipun dalam bahasa Rusia kedua pesan tersebut dapat disebut sebagai bentuk lampau/g, ''],
  [/а не на догадку, что русское или английское прошедшее всегда соответствует одному шаблону/g, 'а не на догадку, что прошедшее время всегда строится по одному шаблону'],
  [/а не на здогад, що російське чи англійське минуле завжди відповідає одному шаблону/g, 'а не на здогад, що минулий час завжди будується за одним шаблоном'],
];
export function scrubTheory(node) {
  let n = 0;
  const walk = (v) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    for (const k of Object.keys(v)) {
      if (LOCALES.has(k) && typeof v[k] === 'string') {
        let s = v[k]; for (const [rx, to] of REPL) s = s.replace(rx, to);
        if (s !== v[k]) { v[k] = s; n++; }
      } else walk(v[k]);
    }
  };
  walk(node);
  return n;
}
