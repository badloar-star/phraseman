/**
 * Комбинированный урок — выбор тем.
 *
 * зачем (владелец 2026-09-17): вход в механику «несколько тем вперемешку».
 * Человек отмечает 2–5 тем и жмёт «Начать»; урок дальше идёт точь-в-точь как
 * обычный, только фразы чередуются между темами.
 *
 * Законы владельца, соблюдённые здесь:
 * — ни одной обводки контейнера: строки отделены тоном, а не рамкой;
 * — ни одной подписи-расшифровки мелким шрифтом под названием;
 * — без adjustsFontSizeToFit: длинное название переносится на вторую строку;
 * — кнопка «Начать» стоит на месте с ПЕРВОГО кадра и только меняет подпись,
 *   иначе раскладка прыгала бы при первом выборе.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { lessonNamesForLang } from '../constants/lessons';
import { hapticTap } from '../hooks/use-haptics';
import {
  COMBINED_LESSON_MAX_TOPICS,
  COMBINED_LESSON_MIN_TOPICS,
} from './combined_lesson_pool';
import { getCourseLevelForLesson } from './course_levels';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { PracticeBackButton } from '../components/practice/PracticeChrome';
import { PracticeCta } from '../components/practice/PracticeStates';
import { safeRouterBack } from './navigation_back';

const TOPIC_COUNT = 32;

export default function CombinedLessonPickScreen() {
  const { liquidGlassThemeId } = useTheme();
  // зачем (владелец 2026-09-30): «Смешать темы» 1:1 по макету learn.html (A15–A17), Liquid Glass; только вид.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const router = useRouter();
  const names = useMemo(() => lessonNamesForLang(lang), [lang]);

  // зачем: порядок выбора сохраняем — он же будет порядком чипов, и человек
  // видит свой выбор в том виде, в каком его делал.
  const [picked, setPicked] = useState<number[]>([]);

  const toggleTopic = useCallback((lessonId: number) => {
    hapticTap();
    // Мгновенный локальный апдейт: ни сети, ни диска в этом действии нет,
    // поэтому отклик всегда в том же кадре (Optimistic UI по умолчанию).
    setPicked((prev) => {
      if (prev.includes(lessonId)) return prev.filter((id) => id !== lessonId);
      if (prev.length >= COMBINED_LESSON_MAX_TOPICS) {
        // Ранний выход обязан называть причину — иначе тап «молча ничего не делает».
        if (__DEV__) {
          console.log('[COMBO-PICK] toggle:ignored_max', JSON.stringify({ lessonId, picked: prev.length }));
        }
        return prev;
      }
      return [...prev, lessonId];
    });
  }, []);

  const enough = picked.length >= COMBINED_LESSON_MIN_TOPICS;
  const missing = Math.max(0, COMBINED_LESSON_MIN_TOPICS - picked.length);

  const start = useCallback(() => {
    if (!enough) {
      if (__DEV__) console.log('[COMBO-PICK] start:blocked', JSON.stringify({ picked: picked.length }));
      return;
    }
    hapticTap();
    if (__DEV__) console.log('[COMBO-PICK] start:ok', JSON.stringify({ topics: picked }));
    router.push({
      pathname: '/lesson1',
      params: { combo: picked.join(','), from: 'combined_lesson' },
    });
  }, [enough, picked, router]);

  // зачем (владелец 2026-09-17): на кнопке ПРОСТО «Начать» — без числа и без
  // слова «вопросов». Слово было моей отсебятиной из макета: в уроках это не
  // вопросы, а фразы, и приложение нигде так не говорит (constants/i18n.ts —
  // «Все фразы раунда», «N фраз — осваиваем»). Кнопка действия называет
  // действие, объём работы ей объявлять не нужно.
  const startLabel = enough
    ? triLang(lang, {
        ru: 'Начать',
        en: 'Start',
        uk: 'Почати',
        es: 'Empezar',
        'pt-BR': 'Começar',
        vi: 'Bắt đầu',
        id: 'Mulai',
        tr: 'Başla',
        pl: 'Zacznij',
      })
    : triLang(lang, {
        ru: `Выберите ещё ${missing}`,
        en: `Pick ${missing} more`,
        uk: `Оберіть ще ${missing}`,
        es: `Elige ${missing} más`,
        'pt-BR': `Escolha mais ${missing}`,
        vi: `Chọn thêm ${missing}`,
        id: `Pilih ${missing} lagi`,
        tr: `${missing} tane daha seç`,
        pl: `Wybierz jeszcze ${missing}`,
      });

  return (
    // зачем (владелец 2026-09-17: «почему комби на пол экрана открылось»):
    // ScreenGradient — это КОНТЕЙНЕР с children, а не фоновый слой. Пустым
    // тегом <ScreenGradient /> он не растягивал экран, и содержимое жило в
    // половине окна. Оборачиваем всё внутрь, как в app/lesson_menu.tsx:1098.
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }}>
        {/* Шапка */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
          <PracticeBackButton
            glass={glass}
            color={glass.text}
            testID="combo-pick-back"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás',
              'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
            onPress={() => { hapticTap(); safeRouterBack(router, '/(tabs)/lessons' as never); }}
          />
          <Text
            maxFontSizeMultiplier={1.3}
            style={{ flex: 1, color: glass.text, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 }}
          >
            {triLang(lang, {
              ru: 'Смешать темы', en: 'Mix topics', uk: 'Змішати теми', es: 'Mezclar temas',
              'pt-BR': 'Misturar temas', vi: 'Trộn chủ đề', id: 'Campur topik', tr: 'Konuları karıştır', pl: 'Wymieszaj tematy',
            })}
          </Text>
        </View>

        {/* Счётчик выбора: точки нарисованы всегда, поэтому строка не прыгает */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={{ flex: 1, color: glass.secondary, fontSize: 16, lineHeight: 22, fontWeight: '700' }}
          >
            {picked.length === 0
              ? triLang(lang, {
                  ru: `Отметьте от ${COMBINED_LESSON_MIN_TOPICS} до ${COMBINED_LESSON_MAX_TOPICS} тем`,
                  en: `Pick ${COMBINED_LESSON_MIN_TOPICS} to ${COMBINED_LESSON_MAX_TOPICS} topics`,
                  uk: `Позначте від ${COMBINED_LESSON_MIN_TOPICS} до ${COMBINED_LESSON_MAX_TOPICS} тем`,
                  es: `Elige de ${COMBINED_LESSON_MIN_TOPICS} a ${COMBINED_LESSON_MAX_TOPICS} temas`,
                  'pt-BR': `Escolha de ${COMBINED_LESSON_MIN_TOPICS} a ${COMBINED_LESSON_MAX_TOPICS} temas`,
                  vi: `Chọn từ ${COMBINED_LESSON_MIN_TOPICS} đến ${COMBINED_LESSON_MAX_TOPICS} chủ đề`,
                  id: `Pilih ${COMBINED_LESSON_MIN_TOPICS} sampai ${COMBINED_LESSON_MAX_TOPICS} topik`,
                  tr: `${COMBINED_LESSON_MIN_TOPICS}–${COMBINED_LESSON_MAX_TOPICS} konu seç`,
                  pl: `Wybierz od ${COMBINED_LESSON_MIN_TOPICS} do ${COMBINED_LESSON_MAX_TOPICS} tematów`,
                })
              : triLang(lang, {
                  ru: `Выбрано ${picked.length}`, en: `Picked ${picked.length}`,
                  uk: `Обрано ${picked.length}`, es: `Elegidos ${picked.length}`,
                  'pt-BR': `Escolhidos ${picked.length}`, vi: `Đã chọn ${picked.length}`,
                  id: `Dipilih ${picked.length}`, tr: `${picked.length} seçildi`, pl: `Wybrano ${picked.length}`,
                })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: COMBINED_LESSON_MAX_TOPICS }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 4,
                  backgroundColor:
                    i < picked.length
                      ? glass.cta
                      : i < COMBINED_LESSON_MIN_TOPICS
                        ? glass.selected
                        : glass.opaqueControl,
                }}
              />
            ))}
          </View>
        </View>

        {/* Список тем */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {Array.from({ length: TOPIC_COUNT }).map((_, index) => {
            const lessonId = index + 1;
            const selected = picked.includes(lessonId);
            const atCap = !selected && picked.length >= COMBINED_LESSON_MAX_TOPICS;
            const name = names[index] ?? `${lessonId}`;
            return (
              <Pressable
                key={lessonId}
                testID={`combo-pick-topic-${lessonId}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled: atCap }}
                accessibilityLabel={name}
                disabled={atCap}
                onPress={() => toggleTopic(lessonId)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  // зачем: фиксированная высота — длинные названия иначе
                  // переносятся и строки скачут при прокрутке.
                  minHeight: 60,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  // guard-ok: 1 px полупрозрачная кромка строки `.tp` макета (исключение PhraseMan 2.0).
                  borderWidth: StyleSheet.hairlineWidth, // guard-ok
                  borderColor: glass.line,
                  backgroundColor: selected ? glass.opaqueControl : glass.opaqueCard,
                  opacity: atCap ? 0.42 : 1,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 11,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? glass.cta : glass.opaqueControl,
                  }}
                >
                  {selected ? <Ionicons name="checkmark" size={18} color={glass.ctaInk} /> : null}
                </View>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={{ flex: 1, color: glass.text, fontSize: 16, lineHeight: 21, fontWeight: '700' }}
                >
                  {name}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={{ color: glass.mutedText, fontSize: 13, fontWeight: '700' }}
                >
                  {getCourseLevelForLesson(lessonId)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Кнопка на месте с первого кадра: меняется подпись, а не геометрия */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <PracticeCta
            glass={glass}
            testID="combo-pick-start"
            label={startLabel}
            disabled={!enough}
            onPress={start}
          />
        </View>
      </View>
    </ScreenGradient>
  );
}
