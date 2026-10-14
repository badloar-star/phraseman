jest.mock('@expo/vector-icons/Ionicons', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: 'Modal',
  Platform: { OS: 'ios' },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

// зачем (координатор 14.10): ReportErrorButton тянет SheetSwipeClose → react-native-gesture-handler (нативный модуль не разбирается в jest); тест проверяет только подписи категорий, поэтому шторку-свайп заменяем заглушкой
jest.mock('../components/modal_fx/SheetSwipeClose', () => ({
  __esModule: true,
  default: () => null,
  SheetSwipeRoot: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import fs from 'fs';
import path from 'path';
import { reportErrorCategoriesForLang } from '../components/ReportErrorButton';

const PLANNED_LANGS = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const LEGACY_LANGS = ['ru', 'uk', 'es'] as const;

describe('ReportErrorButton localized categories', () => {
  it('returns planned locale labels without borrowing RU / UK / ES category text', () => {
    for (const screen of ['lesson_4', 'lesson_words', 'theory', 'flashcards', 'home'] as const) {
      const legacyLabels = new Set(
        LEGACY_LANGS.flatMap(lang => reportErrorCategoriesForLang(screen, lang).map(cat => cat.label)),
      );

      for (const lang of PLANNED_LANGS) {
        const categories = reportErrorCategoriesForLang(screen, lang);
        expect(categories.length).toBeGreaterThan(0);
        expect(categories.every(cat => cat.label.trim().length > 0)).toBe(true);
        expect(categories.every(cat => !legacyLabels.has(cat.label))).toBe(true);
      }
    }
  });

  it('keeps Spanish general report labels in Spanish instead of mixed fallback copy', () => {
    const paymentCategory = reportErrorCategoriesForLang('home', 'es')
      .find(category => category.key === 'payment_premium');
    // зачем (11.10): осколки/руны в 2.0 заменены монетами — из платёжной категории их убрали, текст остался испанским.
    expect(paymentCategory?.label).toBe('Suscripción o compra');
  });

  it('keeps report category localization away from legacy split fallbacks', () => {
    const source = fs.readFileSync(path.join(__dirname, '../components/ReportErrorButton.tsx'), 'utf8');
    expect(source).not.toMatch(/\blabel(?:RU|UK|ES)\b/);
    expect(source).not.toMatch(/\?\?\s*label(?:RU|UK|ES)\b/);
    expect(source).not.toContain('SCREEN_CATEGORIES');
    expect(source).not.toContain('Suscripción, compra u oskolki');
  });
});
