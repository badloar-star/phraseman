// ─── Витрина движения · шард «Проверка рун» ───
// зачем (владелец, 2026-08-27): «новый раздел в дев хабе, в нём каждая кнопка
// вызывает соответствующий экран из соответствующего раздела с рандомными
// цифрами». КАЖДЫЙ экран, начисляющий руны, получает СВОЮ строку — не один
// общий пункт: экраны разные, и счётчик на каждом рисуется по-своему.
//
// Все восемь пунктов открывают НАСТОЯЩИЙ экран (тот же компонент, что видят
// игроки) с флагом devRunesSeed — витрина подставляет свежее случайное число
// на каждый тап, счётчики стартуют с него, а диск и сеть не трогаются вовсе
// (см. hooks/usePracticeRunes → devFakeStartRunes и app/dev_practice_runes_seed.ts).
//
// Список обязан совпадать с набором экранов, которые реально зовут
// usePracticeRunes. Добавили руны на новый экран — добавьте строку сюда;
// это сторожит tests/runes_check_showcase_contract.test.ts.
import type { ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

export const SECTION: ShowcaseSection = {
  id: 'runes_check',
  order: 55,
  title: cs('runes_check_section_title'),
  items: [
    { id: 'runes-check-lesson', title: cs('runes_check_lesson'), kind: 'route', route: '/lesson1', devRunesSeed: true, detail: cs('runes_check_detail') },
    { id: 'runes-check-lesson-complete', title: cs('runes_check_lesson_complete'), kind: 'route', route: '/lesson_complete', devRunesSeed: true, detail: cs('runes_check_detail') },
    { id: 'runes-check-words', title: cs('runes_check_words'), kind: 'route', route: '/lesson_words', devRunesSeed: true, detail: cs('runes_check_detail') },
    { id: 'runes-check-irregular-verbs', title: cs('runes_check_irregular_verbs'), kind: 'route', route: '/lesson_irregular_verbs', devRunesSeed: true, detail: cs('runes_check_detail') },
    { id: 'runes-check-mistake-practice', title: cs('runes_check_mistake_practice'), kind: 'route', route: '/mistake_practice_session', devRunesSeed: true, detail: cs('runes_check_detail') },
    { id: 'runes-check-blitz', title: cs('runes_check_blitz'), kind: 'route', route: '/flashcards_blitz_session', devRunesSeed: true, detail: cs('runes_check_detail') },
    { id: 'runes-check-speaking', title: cs('runes_check_speaking'), kind: 'route', route: '/flashcards_speaking_session', devRunesSeed: true, detail: cs('runes_check_detail') },
    { id: 'runes-check-swipe', title: cs('runes_check_swipe'), kind: 'route', route: '/flashcards_swipe', devRunesSeed: true, detail: cs('runes_check_detail') },
  ],
};
