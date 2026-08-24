import {
  assertLearningV2SessionContentQuality,
  evaluateLearningV2SessionContentQuality,
  learningV2SessionContentFingerprint,
  type LearningV2ContentQualityReviewReceipt,
} from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import type {
  LocalizedSource,
  SessionSource,
} from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { upgradeLesson1SessionDistractorsV2 } from "../modules/learning-v2/content/source/lesson1_distractor_catalog_v2";

type LocaleCopy = Readonly<
  Record<"ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl", string>
>;

const LOCALE_COPY: LocaleCopy = Object.freeze({
  ru: "По-русски мысль может обойтись без связки. В английском она обязательна: I am here. Вариант I here распадается на отдельные слова. Правильно сказать I am here, потому что am соединяет человека и его состояние. Так фраза сразу звучит законченно.",
  uk: "Українською думка може обійтися без дієслова-зв’язки. В англійській воно обов’язкове: I am here. Варіант I here розпадається на окремі слова. Правильно сказати I am here, бо am поєднує людину з її станом. Так вислів одразу звучить завершено.",
  es: "En español la persona ya está incluida en estoy. En inglés hay que decir I am here. La variante I here queda rota porque falta el verbo que une las dos partes. I am here es la forma completa y natural. Así se expresa una situación presente sin añadir nada más.",
  "pt-BR":
    "Em português a pessoa já aparece dentro de estou. Em inglês é preciso dizer I am here. A forma I here fica quebrada porque falta o verbo que liga as duas partes. I am here é a construção completa e natural. Assim se descreve uma situação presente sem acrescentar outro verbo.",
  vi: "Trong tiếng Việt có thể diễn đạt ý này mà không cần một động từ nối giống hệt tiếng Anh. Tiếng Anh phải nói I am here. Cụm I here bị rời rạc vì thiếu từ nối giữa người nói và trạng thái. I am here là câu đầy đủ và tự nhiên. Cách này diễn tả tình trạng hiện tại mà không cần thêm động từ khác.",
  id: "Dalam bahasa Indonesia gagasan ini dapat disampaikan tanpa kata penghubung yang sama. Dalam bahasa Inggris bentuk lengkapnya I am here. Bentuk I here terputus karena tidak ada kata yang menghubungkan orang dan keadaannya. I am here adalah ungkapan yang utuh dan alami. Pola ini menyatakan keadaan sekarang tanpa kata kerja tambahan.",
  tr: "Türkçede bu düşünce ayrı bir bağ fiili olmadan kurulabilir. İngilizcede I am here demek gerekir. I here biçimi, kişiyi durumuna bağlayan sözcük olmadığı için parçalanır. Doğal ve tamamlanmış ifade I am here olur. Bu yapı şimdiki durumu başka bir fiil eklemeden anlatır.",
  pl: "Po polsku tę myśl można wyrazić bez osobnego łącznika. Po angielsku trzeba powiedzieć I am here. Wariant I here rozpada się, bo brakuje słowa łączącego osobę z jej stanem. Pełna i naturalna forma to I am here. Taka konstrukcja opisuje obecną sytuację bez dodatkowego czasownika.",
});

function localized(values: LocaleCopy): LocalizedSource {
  return {
    ru: values.ru,
    uk: values.uk,
    es: values.es,
    rest: {
      "pt-BR": values["pt-BR"],
      vi: values.vi,
      id: values.id,
      tr: values.tr,
      pl: values.pl,
    },
  };
}

function denseLocalized(values: LocaleCopy): LocalizedSource {
  return localized({
    ru: `${values.ru} Проверяйте всю конструкцию целиком: человек I, обязательная связка am, затем место или состояние.`,
    uk: `${values.uk} Перевіряйте всю конструкцію: людина I, обов’язкова зв’язка am, а потім місце або стан.`,
    es: `${values.es} Comprueba siempre la estructura completa: la persona I, la unión obligatoria am y después el lugar o el estado.`,
    "pt-BR": `${values["pt-BR"]} Confira sempre a estrutura completa: a pessoa I, a ligação obrigatória am e depois o lugar ou o estado.`,
    vi: `${values.vi} Hãy luôn kiểm tra cả cấu trúc: người nói I, từ nối bắt buộc am, rồi mới đến nơi chốn hoặc trạng thái.`,
    id: `${values.id} Periksa selalu seluruh strukturnya: orang I, penghubung wajib am, kemudian tempat atau keadaan.`,
    tr: `${values.tr} Her zaman yapının tamamını kontrol edin: kişi I, zorunlu bağlantı am, ardından yer ya da durum.`,
    pl: `${values.pl} Zawsze sprawdzaj całą konstrukcję: osobę I, obowiązkowy łącznik am, a potem miejsce lub stan.`,
  });
}

function fieldLocalized(ru: string, latin: string): LocalizedSource {
  return localized({
    ru,
    uk: `Чітке природне формулювання однієї конкретної думки: ${latin}`,
    es: `Explicación clara y natural: ${latin}`,
    "pt-BR": `Explicação clara e natural: ${latin}`,
    vi: `Cách giải thích rõ ràng và tự nhiên: ${latin}`,
    id: `Penjelasan yang jelas dan alami: ${latin}`,
    tr: `Açık ve doğal bir anlatım: ${latin}`,
    pl: `Jasne i naturalne wyjaśnienie: ${latin}`,
  });
}

function englishLocalized(value: string): LocalizedSource {
  return localized({
    ru: value,
    uk: value,
    es: value,
    "pt-BR": value,
    vi: value,
    id: value,
    tr: value,
    pl: value,
  });
}

function candidate(): SessionSource {
  const page = (kind: "concept" | "formula" | "trap", ordinal: number) => ({
    kind,
    title: fieldLocalized(
      `Живой заголовок ${ordinal} раскрывает одну мысль`,
      `one concrete idea ${ordinal}`,
    ),
    body: denseLocalized(LOCALE_COPY),
    question: {
      prompt: fieldLocalized(
        `Какая фраза звучит правильно ${ordinal}?`,
        `which phrase is correct ${ordinal}?`,
      ),
      choices: [
        englishLocalized("I am here"),
        englishLocalized("I here"),
        englishLocalized("Am I here"),
      ] as const,
      correctChoiceIndex: 0 as const,
      explanation: fieldLocalized(
        "I am here — полная фраза: am связывает I с признаком; в I here связка потеряна, а Am I here уже является вопросом.",
        "I am here is complete; I here loses am; Am I here is already a question",
      ),
    },
  });
  const words = [
    "ready",
    "here",
    "fine",
    "calm",
    "busy",
    "early",
    "safe",
    "sure",
    "warm",
    "cold",
    "tired",
    "happy",
    "hungry",
    "quiet",
    "free",
  ];
  return upgradeLesson1SessionDistractorsV2({
    packageId: "quality-gate-fixture",
    targetLanguage: "en",
    episodeOrdinal: 1,
    requiredSessionOrdinal: 1,
    canDoOutcomeId: "quality-gate-fixture",
    generationInputFingerprint: "quality-gate-fixture",
    title: fieldLocalized("Я здесь", "I am here"),
    summary: fieldLocalized(
      "Живые фразы о состоянии и месте",
      "living phrases about state and place",
    ),
    learningGoal: fieldLocalized(
      "Говорить о себе через I am",
      "speak about yourself with I am",
    ),
    introPages: [page("concept", 1), page("formula", 2), page("trap", 3)],
    phrases: words.map((word, index) => ({
      id: `quality-gate-${index + 1}`,
      english: `I am ${word}`,
      russian: `Я ${word}`,
      explanation:
        "Живая самостоятельная фраза для обычной ситуации. Она сохраняет одну понятную мысль и закрепляет форму I am без лишней грамматики.",
      words: [
        {
          correct: "I",
          category: "pronoun",
          distractors: [
            {
              value: "me",
              reasonCode: "wrong_pronoun",
              why: "Me является формой дополнения, а здесь нужно подлежащее I.",
            },
            {
              value: "my",
              reasonCode: "wrong_pronoun",
              why: "My показывает принадлежность и не может заменить подлежащее I.",
            },
            {
              value: "mine",
              reasonCode: "wrong_pronoun",
              why: "Mine заменяет принадлежащий предмет, а не говорящего человека.",
            },
          ],
        },
        {
          correct: "am",
          category: "to-be",
          distractors: [
            {
              value: "is",
              reasonCode: "agreement",
              why: "Is сочетается с he, she или it, но не с подлежащим I.",
            },
            {
              value: "are",
              reasonCode: "agreement",
              why: "Are сочетается с you, we или they, но не с подлежащим I.",
            },
            {
              value: "be",
              reasonCode: "infinitive",
              why: "Be является начальной формой, а в готовой фразе с I нужна форма am.",
            },
          ],
        },
        {
          correct: word,
          category: "adjective",
          distractors: [
            {
              value: `${word}s`,
              reasonCode: "wrong_form",
              why: "Окончание s здесь не нужно: признак после am не согласуется по числу.",
            },
            {
              value: `${word}ly`,
              reasonCode: "wrong_form",
              why: "Форма на ly обычно описывает способ действия, а здесь нужен признак состояния.",
            },
            {
              value: `very ${word}`,
              reasonCode: "extra_word",
              why: "Дополнительное very меняет исходную фразу и не требуется для ответа.",
            },
          ],
        },
      ],
      features: ["copula_be", "first_person_singular", "state_adjective"],
    })),
  });
}

function approvedReceipt(
  source: SessionSource,
): LearningV2ContentQualityReviewReceipt {
  return {
    schemaVersion: "learning-v2-content-quality-review.v1",
    sessionOrdinal: source.requiredSessionOrdinal,
    subjectFingerprint: learningV2SessionContentFingerprint(source),
    introStyle: { decision: "approved", reviewerId: "intro-reviewer" },
    phraseSelection: { decision: "approved", reviewerId: "phrase-reviewer" },
    localeAuthorship: Object.fromEntries(
      Object.keys(LOCALE_COPY).map((locale) => [
        locale,
        { decision: "approved", reviewerId: `native-${locale}` },
      ]),
    ) as LearningV2ContentQualityReviewReceipt["localeAuthorship"],
  };
}

describe("Learning V2 strict content quality gate", () => {
  test("rejects thin template-like intro copy before review", () => {
    const source = candidate();
    (source.introPages[0].body as { ru: string }).ru =
      "I am here. Просто запомните эту формулу.";
    const report = evaluateLearningV2SessionContentQuality(
      source,
      approvedReceipt(source),
    );
    expect(report.ok).toBe(false);
    expect(
      report.issues.map((issue: { code: string }) => issue.code),
    ).toContain("intro_body_too_thin");
  });

  test("rejects weak phrase selection and shallow distractors", () => {
    const source = candidate();
    (source.phrases[0] as { english: string }).english = "Me too";
    (source.phrases[0].words[0].distractors[0] as { why: string }).why =
      "Неверно.";
    const report = evaluateLearningV2SessionContentQuality(
      source,
      approvedReceipt(source),
    );
    expect(report.ok).toBe(false);
    expect(report.issues.map((issue: { code: string }) => issue.code)).toEqual(
      expect.arrayContaining([
        "phrase_not_standalone",
        "distractor_reason_too_thin",
      ]),
    );
  });

  test.each([
    ["ru", "Это меняет точный смысл готовой фразы."],
    ["uk", "Це змінює точний зміст готової фрази."],
    ["es", "Eso cambia el sentido preciso de la frase completa."],
    ["pt-BR", "Isso muda o sentido exato da frase completa."],
    ["vi", "Vì vậy nghĩa chính xác của cả câu sẽ đổi."],
    ["id", "Karena itu arti tepat dari seluruh kalimat berubah."],
    ["tr", "Böylece bütün cümlenin kesin anlamı değişir."],
    ["pl", "Przez to zmienia się dokładny sens całego zdania."],
  ] as const)(
    "rejects the forbidden generic meaning template in %s",
    (_locale, forbiddenCopy) => {
      const source = candidate();
      (source.phrases[0] as { explanation: string }).explanation =
        forbiddenCopy;
      const codes = evaluateLearningV2SessionContentQuality(
        source,
        approvedReceipt(source),
      ).issues.map((issue) => issue.code);
      expect(codes).toContain("generic_feedback_template");
    },
  );

  test("rejects leaked English service tails and learner chronology in intro copy", () => {
    const source = candidate();
    (source.introPages[0].body as { es: string }).es +=
      " For example — «I am here» means this exact idea.";
    (source.introPages[1].body as { ru: string }).ru +=
      " Как мы уже учили раньше, эти формы нужно соединить.";
    const report = evaluateLearningV2SessionContentQuality(
      source,
      approvedReceipt(source),
    );
    expect(report.ok).toBe(false);
    expect(report.issues.map((issue: { code: string }) => issue.code)).toEqual(
      expect.arrayContaining([
        "intro_locale_service_tail",
        "intro_learning_chronology",
      ]),
    );
  });

  test("does not confuse an immediate instruction with course chronology", () => {
    const source = candidate();
    (source.introPages[0].body as { ru: string }).ru +=
      " Теперь нужно выбрать форму, которая выражает этот смысл.";
    const codes = evaluateLearningV2SessionContentQuality(
      source,
      approvedReceipt(source),
    ).issues.map((issue) => issue.code);
    expect(codes).not.toContain("intro_learning_chronology");
  });

  test.each([
    ["ru", " Это урок о форме be."],
    ["uk", " Це урок про форму be."],
    ["es", " Esta sesión explica la forma be."],
    ["pt-BR", " Esta sessão explica a forma be."],
    ["vi", " Buổi học này giải thích dạng be."],
    ["id", " Sesi ini menjelaskan bentuk be."],
    ["tr", " Bu oturum be biçimini açıklar."],
    ["pl", " Ta sesja wyjaśnia formę be."],
  ] as const)(
    "rejects localized course narration in %s intro copy",
    (locale, leakedCopy) => {
      const source = candidate();
      (source.introPages[0].body as unknown as Record<string, string>)[
        locale
      ] += leakedCopy;
      const codes = evaluateLearningV2SessionContentQuality(
        source,
        approvedReceipt(source),
      ).issues.map((issue) => issue.code);
      expect(codes).toContain("intro_meta_narration");
    },
  );

  test("rejects missing, stale, self-approved, or incomplete review receipts", () => {
    const source = candidate();
    expect(
      evaluateLearningV2SessionContentQuality(source).issues.map(
        (issue: { code: string }) => issue.code,
      ),
    ).toContain("quality_review_missing");

    const receipt = approvedReceipt(source);
    (receipt as { subjectFingerprint: string }).subjectFingerprint = "stale";
    (receipt.phraseSelection as { reviewerId: string }).reviewerId =
      receipt.introStyle.reviewerId;
    delete (receipt.localeAuthorship as unknown as Record<string, unknown>).tr;
    const codes = evaluateLearningV2SessionContentQuality(
      source,
      receipt,
    ).issues.map((issue: { code: string }) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "quality_review_stale",
        "quality_review_not_independent",
        "locale_review_missing",
      ]),
    );
  });

  test("allows gold-style material only after every automatic and human gate passes", () => {
    const source = candidate();
    const receipt = approvedReceipt(source);
    expect(evaluateLearningV2SessionContentQuality(source, receipt)).toEqual({
      ok: true,
      issues: [],
    });
    expect(() =>
      assertLearningV2SessionContentQuality(source, receipt),
    ).not.toThrow();
  });
});
