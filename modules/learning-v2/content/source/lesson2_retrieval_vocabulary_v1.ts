import type {
  LocalizedSource,
  SessionVocabularySourceV1,
} from "./session_shard_from_source_v1";

const localized = (
  ru: string,
  uk: string,
  es: string,
  pt: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): LocalizedSource => ({ ru, uk, es, "pt-BR": pt, vi, id, tr, pl });

const RETRIEVAL_GUIDANCE = localized(
  "Вспомните уже знакомое слово.",
  "Пригадайте вже знайоме слово.",
  "Recuerda la palabra ya conocida.",
  "Lembre a palavra já conhecida.",
  "Hãy nhớ lại từ đã học.",
  "Ingat kembali kata yang sudah dipelajari.",
  "Daha önce öğrendiğiniz sözcüğü hatırlayın.",
  "Przypomnij sobie poznane już słowo.",
);

const vocabulary = (
  target: string,
  meaning: LocalizedSource,
): SessionVocabularySourceV1 => ({
  id: `lesson2-retrieval-${target}`,
  target,
  meaning,
  features: ["prior_lexical_retrieval"],
  contacts: {
    recognize: { guidance: RETRIEVAL_GUIDANCE, distractors: [] },
    retrieve_meaning: { guidance: RETRIEVAL_GUIDANCE, distractors: [] },
    build_form: { guidance: RETRIEVAL_GUIDANCE, distractors: [] },
  },
});

export const LESSON2_RETRIEVAL_VOCABULARY_V1 = Object.freeze([
  vocabulary("responsible", localized(
    "ответственный: выполняет обязанности, и на него можно положиться",
    "відповідальний: виконує обов’язки, і на нього можна покластися",
    "responsable: cumple sus deberes y es digno de confianza",
    "responsável: cumpre seus deveres e merece confiança",
    "có trách nhiệm: làm tròn bổn phận và đáng tin cậy",
    "bertanggung jawab: menjalankan kewajiban dan dapat dipercaya",
    "sorumlu: görevlerini yerine getirir ve güvenilirdir",
    "odpowiedzialny: wypełnia obowiązki i można mu zaufać",
  )),
  vocabulary("independent", localized(
    "самостоятельный: действует и решает без чужой помощи или контроля",
    "самостійний: діє та вирішує без чужої допомоги чи контролю",
    "independiente: actúa y decide sin ayuda ni control ajenos",
    "independente: age e decide sem ajuda ou controle de outra pessoa",
    "độc lập: hành động và quyết định mà không cần người khác giúp hay kiểm soát",
    "mandiri: bertindak dan memutuskan tanpa bantuan atau kendali orang lain",
    "bağımsız: başkasının yardımı ya da denetimi olmadan hareket eder ve karar verir",
    "niezależny: działa i decyduje bez cudzej pomocy lub kontroli",
  )),
  vocabulary("dependent", localized(
    "зависимый: нуждается в чужой помощи, поддержке или решении",
    "залежний: потребує чужої допомоги, підтримки чи рішення",
    "dependiente: necesita ayuda, apoyo o decisiones de otra persona",
    "dependente: precisa da ajuda, apoio ou decisão de outra pessoa",
    "phụ thuộc: cần sự giúp đỡ, hỗ trợ hoặc quyết định của người khác",
    "bergantung: membutuhkan bantuan, dukungan, atau keputusan orang lain",
    "bağımlı: başkasının yardımına, desteğine ya da kararına ihtiyaç duyar",
    "zależny: potrzebuje cudzej pomocy, wsparcia lub decyzji",
  )),
  vocabulary("familiar", localized(
    "знакомый: известный по прошлому опыту",
    "знайомий: відомий із попереднього досвіду",
    "familiar: conocido por experiencia previa",
    "familiar: conhecido pela experiência anterior",
    "quen thuộc: đã biết từ trải nghiệm trước",
    "familiar: sudah dikenal dari pengalaman sebelumnya",
    "tanıdık: önceki deneyimden bilinen",
    "znajomy: znany z wcześniejszego doświadczenia",
  )),
] as const);
