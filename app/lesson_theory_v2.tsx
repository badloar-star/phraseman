import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { safeRouterBack } from './navigation_back';
import { registerXP } from './xp_manager';
import { lessonTheoryXpClaimedKey } from './target_storage_keys';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLang } from '../components/LangContext';
import { legacyRuUk } from '../constants/i18n';
import TheoryLessonView, {
  type TheorySection,
  type TheoryBlock,
  type TheoryDrill,
} from '../components/theory/TheoryLessonView';
import { LESSON1_THEORY, type L1Section, type L1Block } from './theory_content_lesson1';

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : (value ?? '');
}

type ContentLang = 'ru' | 'uk';

/**
 * Дополнительные интерактивы (drill) по номеру раздела урока 1.
 *
 * Контент теории L1 хранит только статические блоки (body/formula/examples/fix/
 * tip). Владелец просит «множество тренировок внутри теории» — поэтому адаптер
 * дописывает готовые drill-блоки в конец нужных секций. Сами drill-данные уже на
 * выбранном языке-подсказке через объект { ru } (introText в компонентах сам
 * подберёт строку под текущий lang).
 */
function drillsForSection(num: string): TheoryDrill[] {
  switch (num) {
    // 02 — главная формула: выбор формы To Be.
    case '02':
      return [
        {
          type: 'choice',
          before: 'She',
          after: 'ready',
          options: ['am', 'is', 'are'],
          answer: 'is',
          why: { ru: 'She — это he/she/it, поэтому is.' },
        },
      ];

    // 05 — he/she/it (is): собрать фразу руками.
    case '05':
      return [
        {
          type: 'word_bank',
          prompt: { ru: 'Она готова' },
          answer: ['She', 'is', 'ready'],
          slotLabels: [{ ru: 'кто' }, { ru: 'связка' }, { ru: 'описание' }],
          distractors: ['He', 'busy'],
        },
      ];

    // 14 — частые ошибки: найди лишнее (с I всегда am, are неверно).
    case '14':
      return [
        {
          type: 'spot_slip',
          chips: ['I', 'are', 'ready'],
          answerIndex: 1,
          hint: { ru: 'Тут не та форма. Тапни лишнее.' },
          fix: { ru: 'С I всегда am: I am ready.' },
        },
      ];

    // 15 — финал: бинарный выбор верного варианта.
    case '15':
      return [
        {
          type: 'binary',
          question: { ru: 'Где верно?' },
          optionA: 'He are busy',
          optionB: 'He is busy',
          correct: 'B',
          explain: { ru: 'С he/she/it нужно is.' },
        },
      ];

    default:
      return [];
  }
}

/** Конвертирует один L1Block (двуязычный контент) в TheoryBlock движка. */
function adaptBlock(block: L1Block, key: ContentLang): TheoryBlock | null {
  switch (block.kind) {
    case 'body':
    case 'tip':
      return {
        kind: block.kind,
        text: key === 'uk' ? (block.uk ?? block.ru ?? '') : (block.ru ?? ''),
      };

    case 'formula':
      // Движок сам красит средний элемент массива (am / is / are) акцентом.
      return { kind: 'formula', formula: block.formula ?? [] };

    case 'examples':
      return {
        kind: 'examples',
        examples: (block.examples ?? []).map((e) => ({
          en: e.en,
          ru: key === 'uk' ? e.uk : e.ru,
          hi: e.hi,
        })),
      };

    case 'fix':
      return { kind: 'fix', fixes: block.fixes ?? [] };

    default:
      return null;
  }
}

/** Преобразует один L1Section + язык в TheorySection движка (с дописанными drill). */
function adaptSection(section: L1Section, key: ContentLang): TheorySection {
  const blocks: TheoryBlock[] = [];
  for (const block of section.blocks) {
    const adapted = adaptBlock(block, key);
    if (adapted) blocks.push(adapted);
  }
  // Интерактивы — после статических блоков (examples и т.п.).
  for (const drill of drillsForSection(section.num)) {
    blocks.push({ kind: 'drill', drill });
  }
  return {
    num: section.num,
    title: key === 'uk' ? section.titleUk : section.titleRu,
    exampleCount: section.exampleCount,
    defaultOpen: section.defaultOpen,
    blocks,
  };
}

/** Полный адаптер: LESSON1_THEORY + язык интерфейса → TheorySection[]. */
function adaptLesson1Theory(key: ContentLang): TheorySection[] {
  return LESSON1_THEORY.sections.map((s) => adaptSection(s, key));
}

/**
 * Экран теории урока (новый движок «дорогой минимализм») для входа из тайла
 * «Теория». Урок 1 рендерится новым TheoryLessonView с полным контентом +
 * интерактивами. Для остальных уроков (контента пока нет) — редирект на старый
 * lesson_help.tsx, чтобы ничего не падало.
 */
export default function LessonTheoryV2Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();

  const lessonId = Number(firstParam(params.id) || '1');

  // Контент только для урока 1. Остальные — на legacy-путь.
  const hasNewTheory = lessonId === 1;

  useEffect(() => {
    if (!hasNewTheory) {
      router.replace({ pathname: '/lesson_help', params: { id: String(lessonId) } });
    }
  }, [hasNewTheory, lessonId, router]);

  // Язык контента: только ru / uk (остальные → ru как fallback).
  const contentKey: ContentLang = legacyRuUk(lang) === 'uk' ? 'uk' : 'ru';

  const sections = useMemo(
    () => (hasNewTheory ? adaptLesson1Theory(contentKey) : []),
    [hasNewTheory, contentKey],
  );

  const title = contentKey === 'uk' ? LESSON1_THEORY.titleUk : LESSON1_THEORY.titleRu;
  const subtitle =
    contentKey === 'uk'
      ? 'am, is, are — каркас англійської фрази'
      : 'am, is, are — каркас английской фразы';

  const goBack = useCallback(() => safeRouterBack(router, '/lesson_menu'), [router]);

  const handleClaimXP = useCallback(async () => {
    try {
      const key = lessonTheoryXpClaimedKey(lessonId, studyTarget);
      const already = await AsyncStorage.getItem(key);
      if (already === '1') return;
      const userName = (await AsyncStorage.getItem('user_name')) ?? '';
      await registerXP(25, 'vocabulary_learned', userName, lang, lessonId, {
        eventId: [
          'vocabulary',
          String(studyTarget ?? 'na').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 40) || 'na',
          String(lessonId),
          'theory',
          'claim',
        ].join(':'),
        payload: { lessonId, studyTarget, surface: 'lesson_theory' },
      });
      await AsyncStorage.setItem(key, '1');
    } catch {
      // Награда не должна ронять экран; повтор возможен при следующем заходе.
    }
  }, [lessonId, studyTarget, lang]);

  if (!hasNewTheory) return null;

  return (
    <TheoryLessonView
      lessonId={lessonId}
      kicker="Грамматика"
      title={title}
      subtitle={subtitle}
      sections={sections}
      xpAmount={25}
      onClaimXP={handleClaimXP}
      onBack={goBack}
    />
  );
}
