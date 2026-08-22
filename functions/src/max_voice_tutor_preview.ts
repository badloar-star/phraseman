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

function outcomeFor(goal: CanDoGoal | null, lessonType: TutorLessonType, lang: PreviewLanguage): string {
  const title = localizedGoalTitle(goal, lang);
  const patterns: Record<PreviewLanguage, Record<TutorLessonType, string>> = {
    en: { new_material: 'Learn new phrases and start speaking: “{goal}”.', review_and_scene: 'Lock in “{goal}” through a short scene.', free_talk: 'Use “{goal}” naturally without a prepared script.' },
    ru: { new_material: 'Разберёшь новые фразы и начнёшь говорить: «{goal}».', review_and_scene: 'Закрепишь цель «{goal}» в короткой сцене.', free_talk: 'Используешь цель «{goal}» без готового сценария.' },
    uk: { new_material: 'Розбереш нові фрази й почнеш говорити: «{goal}».', review_and_scene: 'Закріпиш ціль «{goal}» у короткій сцені.', free_talk: 'Використаєш ціль «{goal}» без готового сценарію.' },
    es: { new_material: 'Aprenderás frases nuevas y empezarás a hablar: «{goal}».', review_and_scene: 'Consolidarás «{goal}» en una escena breve.', free_talk: 'Usarás «{goal}» sin un guion preparado.' },
    'pt-BR': { new_material: 'Você aprenderá frases novas e começará a falar: “{goal}”.', review_and_scene: 'Você consolidará “{goal}” em uma cena curta.', free_talk: 'Você usará “{goal}” sem um roteiro pronto.' },
    vi: { new_material: 'Bạn sẽ học cụm từ mới và bắt đầu nói: “{goal}”.', review_and_scene: 'Bạn sẽ củng cố “{goal}” trong một tình huống ngắn.', free_talk: 'Bạn sẽ dùng “{goal}” tự nhiên mà không cần kịch bản.' },
    id: { new_material: 'Kamu akan mempelajari frasa baru dan mulai berbicara: “{goal}”.', review_and_scene: 'Kamu akan menguatkan “{goal}” dalam adegan singkat.', free_talk: 'Kamu akan memakai “{goal}” tanpa naskah.' },
    tr: { new_material: 'Yeni ifadeler öğrenip konuşmaya başlayacaksın: “{goal}”.', review_and_scene: '“{goal}” hedefini kısa bir sahnede pekiştireceksin.', free_talk: '“{goal}” hedefini hazır senaryo olmadan kullanacaksın.' },
    pl: { new_material: 'Poznasz nowe zwroty i zaczniesz mówić: „{goal}”.', review_and_scene: 'Utrwalisz „{goal}” w krótkiej scence.', free_talk: 'Użyjesz „{goal}” bez gotowego scenariusza.' },
  };
  return patterns[lang][lessonType].replace('{goal}', title);
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
