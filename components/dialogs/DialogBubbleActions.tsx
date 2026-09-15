/**
 * DialogBubbleActions — три круглые кнопки на нижней кромке пузыря собеседника:
 * озвучить · перевести · почему так.
 *
 * зачем (владелец 2026-09-14, приёмка макета): «а кнопочка озвучит перевести и
 * лампочка вот так же как в варианте Б но все три обязательно кнопки». До этого
 * под фразой стояли широкие плашки «Показать перевод» — владелец отверг их как
 * «кашу» и потребовал компактные элементы. Кнопки лежат НА кромке пузыря
 * (отрицательный marginBottom у контейнера сообщения), в тоне поверхности, без
 * обводок — читаются как часть сообщения, а не как отдельная панель.
 *
 * Компонент тупой: он не знает ни про сеть, ни про кэш перевода. Всё решает
 * экран, который передаёт состояния (переведено сейчас / грузится / есть ли
 * объяснение).
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang, type Lang } from '../../constants/i18n';

interface DialogBubbleActionsProps {
  lang: Lang;
  /** Перевод сейчас показан вместо оригинала. */
  translationShown: boolean;
  /** Перевод этой реплики грузится (кнопка приглушена, тап игнорируется). */
  translating: boolean;
  /** Есть ли что показать в шторке «Почему так» — иначе кнопка скрыта. */
  hasExplanation: boolean;
  /** Шторка «Почему так» открыта для этой реплики (кнопка подсвечена). */
  explanationOpen: boolean;
  onSpeak: () => void;
  onTranslate: () => void;
  onExplain: () => void;
  testID?: string;
}

export default function DialogBubbleActions({
  lang,
  translationShown,
  translating,
  hasExplanation,
  explanationOpen,
  onSpeak,
  onTranslate,
  onExplain,
  testID,
}: DialogBubbleActionsProps) {
  const { theme: t } = useTheme();

  const button = (
    key: string,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    options?: { active?: boolean; dimmed?: boolean },
  ) => (
    <Pressable
      key={key}
      onPress={() => {
        if (options?.dimmed) return;
        hapticTap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(options?.dimmed), selected: Boolean(options?.active) }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: options?.active ? t.accentBg : t.bgSurface2,
          opacity: options?.dimmed ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
      testID={testID ? `${testID}-${key}` : undefined}
    >
      <Ionicons name={icon} size={17} color={options?.active ? t.accent : t.textMuted} />
    </Pressable>
  );

  return (
    <View style={styles.row} testID={testID}>
      {button(
        'speak',
        'volume-medium',
        triLang(lang, {
          ru: 'Озвучить реплику', uk: 'Озвучити репліку', en: 'Play the line', es: 'Escuchar la frase',
          'pt-BR': 'Ouvir a fala', vi: 'Nghe câu này', id: 'Putar kalimat', tr: 'Cümleyi dinle', pl: 'Odtwórz wypowiedź',
        }),
        onSpeak,
      )}
      {button(
        'translate',
        translationShown ? 'swap-horizontal' : 'language-outline',
        translationShown
          ? triLang(lang, {
              ru: 'Скрыть перевод', uk: 'Сховати переклад', en: 'Hide translation', es: 'Ocultar traducción',
              'pt-BR': 'Ocultar tradução', vi: 'Ẩn bản dịch', id: 'Sembunyikan terjemahan', tr: 'Çeviriyi gizle', pl: 'Ukryj tłumaczenie',
            })
          : triLang(lang, {
              ru: 'Показать перевод', uk: 'Показати переклад', en: 'Show translation', es: 'Mostrar traducción',
              'pt-BR': 'Mostrar tradução', vi: 'Hiện bản dịch', id: 'Tampilkan terjemahan', tr: 'Çeviriyi göster', pl: 'Pokaż tłumaczenie',
            }),
        onTranslate,
        { active: translationShown, dimmed: translating },
      )}
      {hasExplanation
        ? button(
            'why',
            'bulb',
            triLang(lang, {
              ru: 'Почему так', uk: 'Чому так', en: 'Why it sounds like this', es: 'Por qué se dice así',
              'pt-BR': 'Por que se diz assim', vi: 'Vì sao nói vậy', id: 'Kenapa begitu', tr: 'Neden böyle', pl: 'Dlaczego tak',
            }),
            onExplain,
            { active: explanationOpen },
          )
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    // зачем (макет, вариант Б): кнопки сидят НА нижней кромке пузыря и слегка
    // выступают за неё — читаются как часть сообщения, а не как отдельная
    // панель под ним. Отрицательный отступ делает выступ; пузырь снаружи
    // компенсирует его своим paddingBottom, поэтому текст не наезжает.
    marginBottom: -17,
    marginRight: -4,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
