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

// зачем (владелец 15.10, D196): точки остатка заменены ЦИФРОЙ общего дневного счётчика (MicAllowanceBadge / VoiceAllowanceBadge) на каждом микрофоне; модель точек остаётся для старых мест,
// но ни один микрофон приложения больше не рисует две разные цифры. Этот сторож держит, что значок подключён на ВСЕХ микрофонах (иначе «везде» тихо станет «в одном»).
describe('цифра остатка голоса: подключена ВСЕ микрофоны', () => {
  it.each([
    ['урок', ['app', 'lesson1.tsx']],
    ['тренировка ошибок', ['app', 'mistake_practice_session.tsx']],
    ['карточки «Устно»', ['app', 'flashcards', 'SpeakMicButton.tsx']],
    ['ИИ-диалог', ['app', 'ai_dialog_session.tsx']],
    ['диалоги V2', ['components', 'dialogs', 'DialogueV2SessionScreen.tsx']],
    ['свободный разговор', ['components', 'dialogs', 'DialogueV2FreeformScreen.tsx']],
  ])('%s показывает цифру остатка', (_surface, segments) => {
    const source = read(...segments);
    expect(source).toContain('<MicAllowanceBadge');
    expect(source).not.toContain('<SpeakingQuotaDots');
  });

  it('кнопка зажатия курса показывает цифру через allowance и не держит старый гейт и точки', () => {
    const source = read('app', 'flashcards', 'SpeakHoldButton.tsx');
    expect(source).toContain('<VoiceAllowanceBadge remaining={allowance.remaining}');
    expect(source).not.toContain('hooks/useSpeakingAttemptGate');
    expect(source).not.toContain('components/SpeakingQuotaDots');
    expect(source).not.toContain('const SESSION_AUTHORIZED_QUOTA');
  });

  it('соседи по транспортному ряду карточек выровнены с учётом точек', () => {
    // marginBottom боковых кнопок = всё, что нарисовано под кругом: подпись
    // (4+18) + распорка прежнего ряда точек (4+5). Разойдётся — ряд станет кривым.
    const source = read('app', 'flashcards', 'SpeakHoldButton.tsx');
    expect(source).toContain('export const SPEAK_HOLD_LABEL_HEIGHT = 31;');
    // зачем (Карточки 2.0, Устно по макету practice): боковых кнопок в транспортном ряду больше нет — «Верно» и «Дальше» стоят в нижней панели,
    // а микрофон — отдельный SpeakMicButton; выравнивать соседей по высоте подписи не с чем. Константа остаётся у SpeakHoldButton.
    expect(read('app', 'flashcards_speaking_session.tsx')).toContain("import SpeakMicButton from './flashcards/SpeakMicButton';");
    expect(read('app', 'flashcards_speaking_session.tsx')).not.toContain('SPEAK_HOLD_LABEL_HEIGHT');
  });
});

describe('выход с пейвола называется одинаково везде', () => {
  it('единственный пейвол Plus не пишет «Продолжить бесплатно»', () => {
    // 2026-09-30: CTA-блок A–G удалён; выход с пейвола — крестик «Закрыть».
    const source = read('components', 'paywall', 'PaywallPlusCopy.ts');
    expect(source).not.toContain('Продолжить бесплатно');
    expect(source).not.toContain('Continue for free');
  });

  it('слово «живые» ушло из выгод онбординга', () => {
    // Прямой запрет владельца 2026-09-13 на это слово в текстах интерфейса.
    const source = read('components', 'CleanOnboarding.tsx');
    expect(source).not.toContain('Живые диалоги');
  });
});
