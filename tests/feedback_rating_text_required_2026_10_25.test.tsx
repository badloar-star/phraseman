// ЗАМОК ВЛАДЕЛЬЦА 25.10: «оценку без текста отправить нельзя» — поведение общей карточки оценки на всех трёх видах (default, compact-stars, liquid-glass-rate).
// Звёзды без слова из 3+ букв не уходят: кнопка неактивна, а даже вызванная принудительно отправка блокируется и пишет [RATING-SUBMIT] blocked reason=no_word.
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';

const mockEnqueue = jest.fn(async (_key: string, _input: unknown) => true);
const mockInfo = jest.fn();
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s, absoluteFill: {}, absoluteFillObject: {} },
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../components/GlassSurface', () => ({ glassFill: (c: string) => c }));
jest.mock('../components/ThemeContext', () => ({
  FONT_SCALE: { medium: 1 },
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#888888' }),
    f: new Proxy({}, { get: () => 16 }),
    liquidGlassThemeId: 'graphite',
    fontSize: 'medium',
    uiScale: 1,
  }),
}));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../app/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../app/stable_id', () => ({ getStableId: async () => 'acc-test' }));
jest.mock('../app/feedback_client', () => ({ FEEDBACK_AI_SUMMARY_CONSENT_VERSION: 'v-test', submitFeedbackEntry: jest.fn(async () => null) }));
jest.mock('../app/feedback_outbox', () => ({
  enqueueFeedbackEntry: (key: string, input: unknown) => mockEnqueue(key, input),
  flushFeedbackOutbox: async () => undefined,
}));
jest.mock('../constants/liquidGlassThemePalette', () => ({ liquidGlassTokens: () => new Proxy({}, { get: () => '#777777' }) }));
jest.mock('../components/v2/ShadowSurface', () => ({ plateBoxShadow: () => [] }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: (...a: unknown[]) => mockInfo(...a), error: jest.fn(), warn: jest.fn() } }));
jest.mock('../app/dev_dialog_state', () => ({ isDevDialogFeedbackSent: () => false }));

import FeedbackRatingCard from '../components/FeedbackRatingCard';
import { FEEDBACK_NEED_WORD_PLACEHOLDER } from '../components/feedback_rating_copy';

const flush = async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); };
const loggedBlocks = () => mockInfo.mock.calls.filter((c) => c[0] === '[RATING-SUBMIT]' && String(c[1]).startsWith('blocked')).map((c) => String(c[1]));
const loggedAttempts = () => mockInfo.mock.calls.filter((c) => c[0] === '[RATING-SUBMIT]' && String(c[1]).startsWith('attempt')).map((c) => String(c[1]));

for (const presentation of ['default', 'compact-stars', 'liquid-glass-rate'] as const) {
  describe(`карточка оценки · ${presentation}`, () => {
    beforeEach(() => { mockEnqueue.mockClear(); mockInfo.mockClear(); });
    afterEach(() => { cleanup(); });

    const open = async () => {
      await render(
        <FeedbackRatingCard kind="lesson" entityId="lesson-7" lang="ru" title="Оцените" placeholder="Что понравилось?" sendLabel="Отправить" thanksLabel="Спасибо" ratingA11yLabel="Оценка" presentation={presentation} />,
      );
      if (presentation === 'liquid-glass-rate') await fireEvent.press(screen.getByTestId('feedback-rating-card-header'));
    };
    const send = () => screen.getByTestId('feedback-rating-card-send');

    it('5★ без текста отправить нельзя: кнопка неактивна, принудительное нажатие блокируется и пишется в журнал', async () => {
      await open();
      await fireEvent.press(screen.getByTestId('feedback-rating-card-star-5'));
      expect(send().props.disabled).toBe(true);
      await fireEvent.press(send());
      await flush();
      expect(mockEnqueue).not.toHaveBeenCalled();
      expect(loggedAttempts().length).toBe(1);
      expect(loggedBlocks()).toEqual(['blocked {"screen":"lesson","stars":5,"len":0,"reason":"no_word"}']);
    });

    it.each(['ок', '.', '👍', '   ', 'ok'])('«%s» — не слово из 3+ букв: не уходит', async (text) => {
      await open();
      await fireEvent.press(screen.getByTestId('feedback-rating-card-star-3'));
      await fireEvent.changeText(screen.getByTestId('feedback-rating-card-input'), text);
      expect(send().props.disabled).toBe(true);
      await fireEvent.press(send());
      await flush();
      expect(mockEnqueue).not.toHaveBeenCalled();
      expect(loggedBlocks().length).toBe(1);
    });

    it('со словом из 3+ букв уходит один раз вместе со звёздами; в журнале только длина, не текст', async () => {
      await open();
      await fireEvent.press(screen.getByTestId('feedback-rating-card-star-4'));
      await fireEvent.changeText(screen.getByTestId('feedback-rating-card-input'), '  отлично  ');
      expect(send().props.disabled).toBe(false);
      await fireEvent.press(send());
      await flush();
      expect(mockEnqueue).toHaveBeenCalledTimes(1);
      const sent = mockEnqueue.mock.calls[0]?.[1] as { message: string; rating: number };
      expect(sent.message).toBe('отлично');
      expect(sent.rating).toBe(4);
      expect(loggedBlocks()).toEqual([]);
      expect(loggedAttempts()).toEqual(['attempt {"screen":"lesson","stars":4,"len":7}']);
      expect(JSON.stringify(mockInfo.mock.calls)).not.toContain('отлично');
    });

    it('поле комментария видно сразу; после выбора звёзд плейсхолдер подсказывает про слово', async () => {
      await open();
      expect(screen.getByTestId('feedback-rating-card-input').props.placeholder).toBe('Что понравилось?');
      await fireEvent.press(screen.getByTestId('feedback-rating-card-star-2'));
      expect(screen.getByTestId('feedback-rating-card-input').props.placeholder).toBe(FEEDBACK_NEED_WORD_PLACEHOLDER.ru);
    });
  });
}
