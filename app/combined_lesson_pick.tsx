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
 * — без adjustsFontSizeToFit: длинное название режется многоточием;
 * — кнопка «Начать» стоит на месте с ПЕРВОГО кадра и только меняет подпись,
 *   иначе раскладка прыгала бы при первом выборе.
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';
import { hapticTap } from '../hooks/use-haptics';
import {
  COMBINED_LESSON_MAX_TOPICS,
  COMBINED_LESSON_MIN_TOPICS,
} from './combined_lesson_pool';
import { getCourseLevelForLesson } from './course_levels';

const TOPIC_COUNT = 32;

export default function CombinedLessonPickScreen() {
  const { theme: t, f } = useTheme();
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
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Шапка */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 }}>
          <Pressable
            testID="combo-pick-back"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás',
              'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
            onPress={() => { hapticTap(); router.back(); }}
            style={{ width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard }}
          >
            <Ionicons name="chevron-back" size={24} color={t.textSecond} />
          </Pressable>
          <Text
            maxFontSizeMultiplier={1.3}
            style={{ flex: 1, color: t.textPrimary, fontSize: f.h1, fontWeight: '800', letterSpacing: -0.5 }}
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
            style={{ flex: 1, color: t.textSecond, fontSize: f.body, fontWeight: '600' }}
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
                      ? t.accent
                      : i < COMBINED_LESSON_MIN_TOPICS
                        ? t.bgSurface
                        : t.bgCard,
                }}
              />
            ))}
          </View>
        </View>

        {/* Список тем */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 9 }}
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
                  height: 60,
                  paddingHorizontal: 16,
                  borderRadius: 18,
                  backgroundColor: selected ? t.bgSurface : t.bgCard,
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
                    backgroundColor: selected ? t.accent : t.bgSurface,
                  }}
                >
                  {selected ? <Ionicons name="checkmark" size={18} color={t.correctText} /> : null}
                </View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.3}
                  style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}
                >
                  {name}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }}
                >
                  {getCourseLevelForLesson(lessonId)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Кнопка на месте с первого кадра: меняется подпись, а не геометрия */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <Pressable
            testID="combo-pick-start"
            accessibilityRole="button"
            accessibilityState={{ disabled: !enough }}
            accessibilityLabel={startLabel}
            disabled={!enough}
            onPress={start}
            style={{
              height: 58,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: enough ? t.accent : t.bgCard,
            }}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={{
                color: enough ? t.correctText : t.textMuted,
                fontSize: f.body,
                fontWeight: '800',
              }}
            >
              {startLabel}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}
