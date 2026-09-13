import fs from 'fs';
import path from 'path';

// Тест проверяет чистую модель остатка и исходники, а не рендер RN-дерева,
// поэтому react-native подменяется минимальной заглушкой (как в соседних
// контрактах экранов) — иначе StyleSheet.create падает на импорте.
jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles },
}));

import { speakingQuotaDotsModel } from '../components/SpeakingQuotaDots';
import type { RevenueDailyQuotaResult } from '../app/revenue_daily_quota';

/**
 * зачем (владелец, 2026-09-13): «ТРИ ТОЧКИ НА МИКРОФОНЕ ВООБЩЕ ВО ВСЕХ МЕСТАХ
 * ГДЕ ЕСТЬ МИКРОФОН — УРОКИ, КАРТОЧКИ, ДИАЛОГИ». До этого остаток дневных
 * голосовых попыток не был виден нигде, и отказ читался как поломка.
 *
 * Второе требование того же сообщения: «БЕЗ СДВИНУТЫХ ТЕКСТОВ КНОПОК, ВСЁ РОВНО»
 * — поэтому ряд точек обязан занимать высоту ВСЕГДА, даже когда точек нет.
 * Этот сторож держит и арифметику остатка, и неизменность геометрии, и то, что
 * все три поверхности подключены (иначе «во всех местах» тихо станет «в одном»).
 */
const root = path.join(__dirname, '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

const quota = (patch: Partial<RevenueDailyQuotaResult>): RevenueDailyQuotaResult => ({
  status: 'allowed', used: 0, limit: 3, extra: 0, resetAt: null, period: null, bypass: null, ...patch,
});

describe('speaking quota dots: модель остатка', () => {
  it('рисует лимит точками и гасит израсходованные', () => {
    expect(speakingQuotaDotsModel(quota({ limit: 3, used: 0 }))).toEqual({ total: 3, remaining: 3 });
    expect(speakingQuotaDotsModel(quota({ limit: 3, used: 1 }))).toEqual({ total: 3, remaining: 2 });
    expect(speakingQuotaDotsModel(quota({ limit: 3, used: 3, status: 'exhausted' }))).toEqual({ total: 3, remaining: 0 });
  });

  it('дневной пропуск расширяет ряд, а не заменяет его', () => {
    // Купленные +3 обязаны быть ВИДНЫ: человек заплатил жемчугом именно за них.
    expect(speakingQuotaDotsModel(quota({ limit: 3, used: 3, extra: 3 }))).toEqual({ total: 6, remaining: 3 });
  });

  it('молчит там, где остаток неизвестен или его нет', () => {
    // Plus / «Фри»-флаг: лимита нет — ряд точек был бы ложью.
    expect(speakingQuotaDotsModel(quota({ limit: null }))).toBeNull();
    // Квота ещё не прочитана или PhoneState недоступен — честнее не показывать.
    expect(speakingQuotaDotsModel(quota({ status: 'waiting' }))).toBeNull();
    expect(speakingQuotaDotsModel(quota({ status: 'unavailable' }))).toBeNull();
    expect(speakingQuotaDotsModel(quota({ status: 'stale_account' }))).toBeNull();
  });

  it('никогда не отдаёт отрицательный или раздутый остаток', () => {
    // Гонка «превью отстало от чека» не должна рисовать минус или лишние точки.
    expect(speakingQuotaDotsModel(quota({ limit: 3, used: 9 }))).toEqual({ total: 3, remaining: 0 });
    expect(speakingQuotaDotsModel(quota({ limit: 3, used: -2 }))).toEqual({ total: 3, remaining: 3 });
    expect(speakingQuotaDotsModel(quota({ limit: 0 }))).toBeNull();
  });
});

describe('speaking quota dots: геометрия не двигается', () => {
  const source = read('components', 'SpeakingQuotaDots.tsx');

  it('когда точек нет — на их месте распорка той же высоты', () => {
    expect(source).toContain('spacer');
    expect(source).toContain('height: metrics.height');
    // Без этого «нет точек» схлопнуло бы ряд и подпись/иконка прыгнули бы.
    expect(source).toMatch(/model === null[\s\S]{0,400}height: metrics\.height/);
  });

  it('не перехватывает тапы и не мешает скринридеру', () => {
    expect(source).toContain('pointerEvents="none"');
    expect(source).toContain('accessibilityElementsHidden');
  });

  it('не запрещённые приёмы: без обводок и без ужатия шрифта', () => {
    expect(source).not.toContain('borderWidth');
    expect(source).not.toContain('adjustsFontSizeToFit');
  });
});

describe('speaking quota dots: подключены ВСЕ микрофоны', () => {
  it.each([
    ['урок', ['components', 'SpeakingButton.tsx']],
    ['карточки', ['app', 'flashcards', 'SpeakHoldButton.tsx']],
    ['диалог', ['app', 'ai_dialog_session.tsx']],
  ])('%s показывает остаток попыток', (_surface, segments) => {
    const source = read(...segments);
    expect(source).toContain('SpeakingQuotaDots');
    expect(source).toMatch(/<SpeakingQuotaDots[\s\S]{0,400}quota=\{/);
  });

  it('карточная сессия, оплаченная квотой тренировок, не врёт голосовым остатком', () => {
    const source = read('app', 'flashcards', 'SpeakHoldButton.tsx');
    expect(source).toContain('SESSION_AUTHORIZED_QUOTA');
    expect(source).toContain('sessionAuthorized ? SESSION_AUTHORIZED_QUOTA : speakingGate.quota');
  });

  it('соседи по транспортному ряду карточек выровнены с учётом точек', () => {
    // marginBottom боковых кнопок = всё, что нарисовано под кругом: подпись
    // (4+18) + ряд точек (4+5). Разойдётся — ряд станет кривым.
    const source = read('app', 'flashcards', 'SpeakHoldButton.tsx');
    expect(source).toContain('export const SPEAK_HOLD_LABEL_HEIGHT = 31;');
    expect(read('app', 'flashcards_speaking_session.tsx')).toContain('marginBottom: SPEAK_HOLD_LABEL_HEIGHT');
  });
});

describe('выход с пейвола называется одинаково везде', () => {
  it('пейволы A–G больше не пишут «Продолжить бесплатно»', () => {
    const source = read('components', 'paywall', 'PaywallCtaBlock.tsx');
    expect(source).toContain('Продолжить на обычном аккаунте');
    expect(source).not.toContain('Продолжить бесплатно');
    expect(source).not.toContain('Continue for free');
  });

  it('слово «живые» ушло из выгод онбординга', () => {
    // Прямой запрет владельца 2026-09-13 на это слово в текстах интерфейса.
    const source = read('components', 'CleanOnboarding.tsx');
    expect(source).not.toContain('Живые диалоги');
  });
});
