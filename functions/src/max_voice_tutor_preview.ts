import {
  canDoProgress,
  levelFromMastery,
  pickNextGoal,
  type CanDoGoal,
  type MaxTextLanguage,
} from './max_voice_can_do_goals';
import {
  duePhrases,
  selectTutorLessonType,
  type TutorLessonType,
  type TutorMemory,
} from './max_voice_tutor_memory';

export interface MaxVoiceTutorPreview {
  name: string;
  lessonOrdinal: number;
  lessonType: TutorLessonType;
  dueCount: number;
  homeworkCount: number;
  nextTopic: string;
  goal: { id: string; level: string; title: CanDoGoal['title']; mastery: number } | null;
  displayTitle: string;
  outcome: string;
}

type PreviewLanguage = MaxTextLanguage;

function previewLanguage(value: string): PreviewLanguage {
  return value === 'ru' || value === 'uk' || value === 'es' || value === 'pt-BR'
    || value === 'vi' || value === 'id' || value === 'tr' || value === 'pl'
    ? value
    : 'en';
}

const CONFIDENT_SPEAKING: Record<PreviewLanguage, string> = {
  en: 'Confident speaking', ru: 'Свободная речь', uk: 'Вільне мовлення',
  es: 'Hablar con confianza', 'pt-BR': 'Falar com confiança', vi: 'Nói chuyện tự tin',
  id: 'Berbicara dengan percaya diri', tr: 'Özgüvenli konuşma', pl: 'Pewne mówienie',
};

function localizedGoalTitle(goal: CanDoGoal | null, lang: PreviewLanguage): string {
  if (!goal) return CONFIDENT_SPEAKING[lang];
  return goal.title[lang] || goal.title.en;
}

const TITLE_PATTERNS: Record<PreviewLanguage, Record<TutorLessonType, readonly string[]>> = {
  ru: {
    new_material: ['Первый шаг: {goal}', 'Слова в дело: {goal}', 'Начинаем говорить: {goal}'],
    review_and_scene: ['Без подсказок: {goal}', 'Проверка в разговоре: {goal}', 'Сцена из жизни: {goal}'],
    free_talk: ['Разговор без сценария: {goal}', 'Говорим по-настоящему: {goal}', 'Свободный эфир: {goal}'],
  },
  uk: {
    new_material: ['Перший крок: {goal}', 'Слова в дію: {goal}', 'Починаємо говорити: {goal}'],
    review_and_scene: ['Без підказок: {goal}', 'Перевірка в розмові: {goal}', 'Сцена з життя: {goal}'],
    free_talk: ['Розмова без сценарію: {goal}', 'Говоримо по-справжньому: {goal}', 'Вільний ефір: {goal}'],
  },
  en: {
    new_material: ['First step: {goal}', 'Words into action: {goal}', 'Start speaking: {goal}'],
    review_and_scene: ['No hints: {goal}', 'Conversation check: {goal}', 'A real-life scene: {goal}'],
    free_talk: ['Off-script: {goal}', 'Real conversation: {goal}', 'Open mic: {goal}'],
  },
  es: {
    new_material: ['Primer paso: {goal}', 'Palabras en acción: {goal}', 'Empieza a hablar: {goal}'],
    review_and_scene: ['Sin pistas: {goal}', 'Prueba en conversación: {goal}', 'Escena de la vida real: {goal}'],
    free_talk: ['Sin guion: {goal}', 'Conversación real: {goal}', 'Micrófono abierto: {goal}'],
  },
  'pt-BR': {
    new_material: ['Primeiro passo: {goal}', 'Palavras em ação: {goal}', 'Comece a falar: {goal}'],
    review_and_scene: ['Sem dicas: {goal}', 'Teste na conversa: {goal}', 'Cena da vida real: {goal}'],
    free_talk: ['Sem roteiro: {goal}', 'Conversa de verdade: {goal}', 'Microfone aberto: {goal}'],
  },
  vi: {
    new_material: ['Bước đầu tiên: {goal}', 'Đưa từ vào thực tế: {goal}', 'Bắt đầu nói: {goal}'],
    review_and_scene: ['Không gợi ý: {goal}', 'Kiểm tra trong hội thoại: {goal}', 'Tình huống thực tế: {goal}'],
    free_talk: ['Không kịch bản: {goal}', 'Hội thoại thật: {goal}', 'Tự do trò chuyện: {goal}'],
  },
  id: {
    new_material: ['Langkah pertama: {goal}', 'Kata menjadi aksi: {goal}', 'Mulai berbicara: {goal}'],
    review_and_scene: ['Tanpa petunjuk: {goal}', 'Uji dalam percakapan: {goal}', 'Adegan nyata: {goal}'],
    free_talk: ['Tanpa naskah: {goal}', 'Percakapan nyata: {goal}', 'Bicara bebas: {goal}'],
  },
  tr: {
    new_material: ['İlk adım: {goal}', 'Sözcükleri kullan: {goal}', 'Konuşmaya başla: {goal}'],
    review_and_scene: ['İpucu olmadan: {goal}', 'Konuşmada sınama: {goal}', 'Gerçek yaşam sahnesi: {goal}'],
    free_talk: ['Senaryosuz: {goal}', 'Gerçek konuşma: {goal}', 'Serbest konuşma: {goal}'],
  },
  pl: {
    new_material: ['Pierwszy krok: {goal}', 'Słowa w praktyce: {goal}', 'Zacznij mówić: {goal}'],
    review_and_scene: ['Bez podpowiedzi: {goal}', 'Próba w rozmowie: {goal}', 'Scena z życia: {goal}'],
    free_talk: ['Bez scenariusza: {goal}', 'Prawdziwa rozmowa: {goal}', 'Swobodna rozmowa: {goal}'],
  },
};

function titleFor(goal: CanDoGoal | null, lessonType: TutorLessonType, ordinal: number, lang: PreviewLanguage): string {
  // The first three lessons are the first impression of MAX and deserve fully
  // authored names instead of a templated grammar label.
  if (goal?.id === 'a1_greet' && lang === 'ru') {
    if (lessonType === 'new_material') return 'Первый контакт';
    if (lessonType === 'review_and_scene') return 'Знакомство без подсказок';
    return 'Разговор, который не оборвётся';
  }
  if (goal?.id === 'a1_greet' && lang === 'uk') {
    if (lessonType === 'new_material') return 'Перший контакт';
    if (lessonType === 'review_and_scene') return 'Знайомство без підказок';
    return 'Розмова, що не обірветься';
  }
  const patterns = TITLE_PATTERNS[lang][lessonType];
  return patterns[(Math.max(1, ordinal) - 1) % patterns.length]
    .replace('{goal}', localizedGoalTitle(goal, lang));
}

/**
 * Название цели внутри живой фразы: с маленькой буквы и без кавычек.
 *
 * зачем (владелец 2026-08-29): «убери дурацкие тексты, замени на нормальные,
 * не механические». Прежний шаблон вставлял заголовок цели в кавычках —
 * «Закрепишь цель „Поздороваться и попрощаться“ в короткой сцене». Так не
 * пишет ни один живой человек. Названия целей — это глаголы в инфинитиве
 * («поздороваться и попрощаться», «представиться»), и они читаются
 * естественно, если встроить их в предложение, а не процитировать.
 */
function goalInSentence(goal: CanDoGoal | null, lang: PreviewLanguage): string {
  const title = localizedGoalTitle(goal, lang);
  if (!title) return title;
  // Аббревиатуры и имена собственные оставляем как есть: строчная буква
  // испортила бы их. Признак — вторая буква тоже заглавная.
  if (title.length > 1 && title[1] === title[1].toUpperCase() && title[1] !== title[1].toLowerCase()) {
    return title;
  }
  return title[0].toLowerCase() + title.slice(1);
}

function outcomeFor(goal: CanDoGoal | null, lessonType: TutorLessonType, lang: PreviewLanguage): string {
  const goalText = goalInSentence(goal, lang);
  const patterns: Record<PreviewLanguage, Record<TutorLessonType, string>> = {
    en: {
      new_material: 'Today you learn to {goal} — and say it out loud yourself.',
      review_and_scene: 'A short scene where you {goal} without any hints.',
      free_talk: 'A real conversation. You will {goal} along the way, off-script.',
    },
    ru: {
      new_material: 'Сегодня учимся {goal} — и сразу говорим это вслух.',
      review_and_scene: 'Короткая сцена: нужно {goal} без подсказок.',
      free_talk: 'Живой разговор без сценария — по ходу нужно {goal}.',
    },
    uk: {
      new_material: 'Сьогодні вчимося {goal} — і одразу говоримо це вголос.',
      review_and_scene: 'Коротка сцена: треба {goal} без підказок.',
      free_talk: 'Жива розмова без сценарію — дорогою треба {goal}.',
    },
    es: {
      new_material: 'Hoy aprendes a {goal} y lo dices en voz alta.',
      review_and_scene: 'Una escena breve: tienes que {goal} sin pistas.',
      free_talk: 'Una conversación real, sin guion: por el camino vas a {goal}.',
    },
    'pt-BR': {
      new_material: 'Hoje você aprende a {goal} e já fala em voz alta.',
      review_and_scene: 'Uma cena curta: você precisa {goal} sem dicas.',
      free_talk: 'Uma conversa de verdade, sem roteiro: no caminho você vai {goal}.',
    },
    vi: {
      new_material: 'Hôm nay bạn học cách {goal} và nói ra thành tiếng.',
      review_and_scene: 'Một tình huống ngắn: bạn phải {goal} mà không có gợi ý.',
      free_talk: 'Trò chuyện thật, không kịch bản — trên đường đi bạn sẽ {goal}.',
    },
    id: {
      new_material: 'Hari ini kamu belajar {goal} dan langsung mengucapkannya.',
      review_and_scene: 'Adegan singkat: kamu harus {goal} tanpa petunjuk.',
      free_talk: 'Percakapan nyata tanpa naskah — di tengah jalan kamu akan {goal}.',
    },
    tr: {
      new_material: 'Bugün {goal} öğreniyorsun ve hemen yüksek sesle söylüyorsun.',
      review_and_scene: 'Kısa bir sahne: ipucu olmadan {goal} gerekiyor.',
      free_talk: 'Senaryosuz gerçek bir sohbet — yol boyunca {goal} gerekecek.',
    },
    pl: {
      new_material: 'Dziś uczysz się {goal} i od razu mówisz to na głos.',
      review_and_scene: 'Krótka scenka: trzeba {goal} bez podpowiedzi.',
      free_talk: 'Prawdziwa rozmowa bez scenariusza — po drodze trzeba {goal}.',
    },
  };
  return patterns[lang][lessonType].replace('{goal}', goalText);
}

export function buildTutorPreview(input: {
  memory: TutorMemory;
  cefr: string;
  interfaceLang: string;
  tutorName: string;
  nowMs: number;
}): MaxVoiceTutorPreview {
  const progress = canDoProgress(input.memory.goalMastery);
  const goalLevel = progress.done > 0
    ? levelFromMastery(input.memory.goalMastery, input.cefr)
    : input.cefr;
  const goal = pickNextGoal(input.memory.goalMastery, goalLevel);
  const lessonType = selectTutorLessonType(input.memory, input.nowMs);
  const lessonOrdinal = input.memory.callCount + 1;
  const lang = previewLanguage(input.interfaceLang);

  return {
    name: input.tutorName,
    lessonOrdinal,
    lessonType,
    dueCount: duePhrases(input.memory, input.nowMs).length,
    homeworkCount: input.memory.homework.length,
    nextTopic: input.memory.nextTopic,
    goal: goal
      ? {
          id: goal.id,
          level: goal.level,
          title: goal.title,
          mastery: input.memory.goalMastery[goal.id] ?? 0,
        }
      : null,
    displayTitle: titleFor(goal, lessonType, lessonOrdinal, lang),
    outcome: outcomeFor(goal, lessonType, lang).slice(0, 180),
  };
}
