/**
 * LeagueRulesSheet — шторка «Как устроена лига».
 *
 * зачем (владелец, 2026-08-24): «когда юзер заходит в лигу, надо модал-лист
 * снизу, который расскажет что такое лига, как тут повышаться и понижаться и
 * всё остальное; текст продуман и взвешен, с юморком, красивый стиль; кнопка
 * вопрос кругленькая в правом верхнем углу его вызывает».
 *
 * Показ: автоматически ОДИН раз (feature_intro_registry — ключ живёт по
 * аккаунту и переживает перезапуск) и в любой момент по кнопке «?».
 *
 * Стиль строго по дому: RN Modal + reanimated drag-to-dismiss по паттерну
 * ExplainSheet (тяга вниз 1:1, вверх резина ×0.12, закрытие 88px/velocity 900),
 * тон вместо обводки, никаких подписей-расшифровок мелким шрифтом.
 * Движение: кривая 0.32/0.72/0/1 (та же, что у остальных листов дома).
 *
 * Валюта лиги зовётся «рунами» — так решил владелец 2026-08-24, и так же
 * теперь подписана строка таблицы (LeagueLeaderboardRow показывает ассет руны
 * вместо букв «XP»). Прежняя редакция этой шапки ссылалась на константу
 * RUNES_LEAGUE_START_WEEK_ID и «неделю перехода» — в коде такой константы нет
 * и не было, переход не поэтапный. Слова «очки» в текстах лиги быть не должно.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from './ThemeContext';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import TonalSurface from './TonalSurface';

const SHEET_HIDDEN = 340;

type RuleSection = Readonly<{
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: (lang: Lang) => string;
  body: (lang: Lang) => string;
}>;

/**
 * Разделы объяснялки.
 *
 * зачем (владелец, 2026-08-24, третья редакция): «тексты непонятны человеку»
 * и «не пиши объяснения вообще, только фразы по 3-4 слова, броские как
 * реклама». Две предыдущие попытки провалились по разным причинам: первая
 * ушла в панибратство («камбэк — законный жанр»), вторая стала премиальной,
 * но нечитаемой — «счёт ведут руны» не говорит, что ДЕЛАТЬ, «верхние 15%» —
 * процент от неизвестного человеку числа, «зона вылета» — термин ниоткуда.
 *
 * Поэтому здесь НЕ объяснения. Смысл несёт заголовок раздела, тело — короткий
 * рекламный удар в 3-5 слов. Регистр взят у уже утверждённого владельцем
 * экрана кошелька рун («Руны приходят за дело») — одна интонация на всё
 * приложение, а не своя в каждой шторке.
 *
 * Что при этом обязано читаться без терминов:
 *  • откуда руны — «Занимаешься — получаешь руны» (решение владельца: связь
 *    называем прямо, иначе весь остальной текст висит в воздухе);
 *  • повышение/понижение — «людьми», без процентов: наверху списка и внизу
 *    списка, а не «верхние 15%» (решение владельца);
 *  • «зона вылета» вычищена как термин — вместо неё «внизу списка».
 *
 * Цифры вычищены почти полностью — они и делали текст «непонятным человеку».
 * Осталось «два часа» в заголовке (LEAGUE_HOT_HOURS_WINDOW_MS) и «вдвойне»
 * (LEAGUE_HOT_HOURS_MULTIPLIER): это единственное место, где число реально
 * меняет поведение игрока. Вилка бонуса лиг 10-110% убрана сознательно — её
 * точные проценты человек видит на карточках лиг, здесь важен сам факт.
 * Правило «неделя без единой руны — спуск» (ветки iScored/inZeroZone в
 * league_engine) свёрнуто в «Ноль за неделю — вниз»: факт сохранён, термина нет.
 */
const SECTIONS: readonly RuleSection[] = [
  {
    id: 'what',
    icon: 'people-outline',
    title: (lang) => triLang(lang, {
      ru: 'Неделя с нуля',
      uk: 'Тиждень з нуля',
      es: 'La semana desde cero',
      'pt-BR': 'A semana do zero',
      vi: 'Tuần mới từ số không',
      id: 'Sepekan dari nol',
      tr: 'Hafta sıfırdan',
      pl: 'Tydzień od zera',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Занимаешься — получаешь руны.',
      uk: 'Займаєшся — отримуєш руни.',
      es: 'Practicas y ganas runas.',
      'pt-BR': 'Você pratica, ganha runas.',
      vi: 'Học là có rune.',
      id: 'Berlatih, dapat rune.',
      tr: 'Çalışırsın, rün kazanırsın.',
      pl: 'Ćwiczysz — masz runy.',
    }),
  },
  {
    id: 'promotion',
    icon: 'trending-up',
    title: (lang) => triLang(lang, {
      ru: 'Наверх или вниз',
      uk: 'Угору або вниз',
      es: 'Arriba o abajo',
      'pt-BR': 'Para cima ou para baixo',
      vi: 'Lên hoặc xuống',
      tr: 'Yukarı ya da aşağı',
      id: 'Naik atau turun',
      pl: 'W górę albo w dół',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Верх — выше. Ноль — вниз.',
      uk: 'Верх — вище. Нуль — вниз.',
      es: 'Arriba subes. Cero baja.',
      'pt-BR': 'Topo sobe. Zero desce.',
      vi: 'Đầu bảng lên. Số 0 xuống.',
      id: 'Puncak naik. Nol turun.',
      tr: 'Zirve yükselir. Sıfır düşer.',
      pl: 'Góra — awans. Zero — spadek.',
    }),
  },
  {
    id: 'chest',
    icon: 'cube-outline',
    title: (lang) => triLang(lang, {
      ru: 'Сундук комнаты',
      uk: 'Скриня кімнати',
      es: 'El cofre de la sala',
      'pt-BR': 'O baú da sala',
      vi: 'Rương của phòng',
      id: 'Peti ruangan',
      tr: 'Odanın sandığı',
      pl: 'Skrzynia pokoju',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Общая цель — награда всем.',
      uk: 'Спільна мета — нагорода всім.',
      es: 'Meta común, premio para todos.',
      'pt-BR': 'Meta comum, prêmio para todos.',
      vi: 'Mục tiêu chung, thưởng cho tất cả.',
      id: 'Target bersama, hadiah untuk semua.',
      tr: 'Ortak hedef, herkese ödül.',
      pl: 'Wspólny cel, nagroda dla wszystkich.',
    }),
  },
  {
    id: 'boosts',
    icon: 'flame-outline',
    title: (lang) => triLang(lang, {
      ru: 'Последние два часа',
      uk: 'Останні дві години',
      es: 'Las últimas dos horas',
      'pt-BR': 'As duas últimas horas',
      vi: 'Hai giờ cuối',
      id: 'Dua jam terakhir',
      tr: 'Son iki saat',
      pl: 'Ostatnie dwie godziny',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Внизу списка — руны вдвойне.',
      uk: 'Внизу списку — руни вдвічі.',
      es: 'Abajo de la lista, runas dobles.',
      'pt-BR': 'No fim da lista, runas em dobro.',
      vi: 'Cuối bảng, rune nhân đôi.',
      id: 'Di dasar daftar, rune ganda.',
      tr: 'Listenin dibinde rünler iki kat.',
      pl: 'Na dole listy — runy podwójne.',
    }),
  },
  {
    id: 'bonus',
    icon: 'ribbon-outline',
    title: (lang) => triLang(lang, {
      ru: 'Чем выше лига',
      uk: 'Що вища ліга',
      es: 'Cuanto más alta la liga',
      'pt-BR': 'Quanto mais alta a liga',
      vi: 'Hạng càng cao',
      id: 'Makin tinggi liga',
      tr: 'Lig ne kadar yüksekse',
      pl: 'Im wyższa liga',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Опыт быстрее. Навсегда.',
      uk: 'Досвід швидше. Назавжди.',
      es: 'Más experiencia. Para siempre.',
      'pt-BR': 'Mais experiência. Para sempre.',
      vi: 'Kinh nghiệm nhanh hơn. Mãi mãi.',
      id: 'Pengalaman lebih cepat. Selamanya.',
      tr: 'Deneyim daha hızlı. Kalıcı.',
      pl: 'Doświadczenie szybciej. Na stałe.',
    }),
  },
];

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  lang: Lang;
}>;

export default function LeagueRulesSheet({ visible, onClose, lang }: Props) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: 220 });
    sheetY.value = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const dismissSheet = useCallback(() => {
    void hapticTap();
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(closeRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY]);

  const closeAfterSwipe = useCallback(() => {
    closeRef.current();
  }, []);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
              if (finished) runOnJS(closeAfterSwipe)();
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, swipeOffDistance],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar',
    vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });

  const title = triLang(lang, {
    ru: 'Как устроена лига',
    uk: 'Як влаштована ліга',
    es: 'Cómo funciona la liga',
    'pt-BR': 'Como a liga funciona',
    vi: 'Giải đấu hoạt động thế nào',
    id: 'Cara kerja liga',
    tr: 'Lig nasıl işler',
    pl: 'Jak działa liga',
  });

  const ctaLabel = triLang(lang, {
    ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido', 'pt-BR': 'Entendi',
    vi: 'Đã hiểu', id: 'Paham', tr: 'Anladım', pl: 'Jasne',
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                shadowColor: t.accent,
                maxHeight: viewportHeight * 0.86,
                paddingBottom: 16 + bottomInset,
              },
              sheetStyle,
            ]}
          >
            <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />

            <View style={[styles.grab, { backgroundColor: t.border }]} />

            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.numMd }]}>
              {title}
            </Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* guard-ok: ровно 5 статичных секций, список не растёт — FlatList здесь дороже самой отрисовки */}
              {SECTIONS.map((section) => (
                <View key={section.id} style={styles.row}>
                  <View style={[styles.medal, { backgroundColor: t.bgPrimary }]}>
                    <Ionicons name={section.icon} size={20} color={t.gold} />
                  </View>
                  <View style={styles.rowBody}>
                    {/* зачем: f.body и f.sub в шкале равны (14), поэтому иерархию
                        внутри секции держат вес и тон, а не кегль: заголовок —
                        bodyLg/900 основным цветом, текст — body/500 вторичным. */}
                    <Text style={[styles.rowTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                      {section.title(lang)}
                    </Text>
                    <Text
                      style={[
                        styles.rowText,
                        // guard-ok: тело раздела объяснялки, а не подпись-расшифровка под названием пункта
                        { color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.55 },
                      ]}
                    >
                      {section.body(lang)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              onPress={dismissSheet}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: t.accent,
                  // Тактильный отклик нажатия — правило дома (кнопка обязана «слышать» палец).
                  transform: [{ scale: pressed ? 0.975 : 1 }],
                },
              ]}
            >
              {/* зачем: t.correctText — домовой токен текста НА акценте (см. AiConsentSheetModal);
                  хардкод белого проваливал бы контраст в светлых темах. */}
              <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.body }]}>
                {ctaLabel}
              </Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,8,18,0.68)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowOpacity: 0.18,
    shadowRadius: 18, // мягкая тень листа; ниже — уже не читается край шторки на тёмной подложке
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  grab: { width: 34, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title: { fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 6 },
  row: { flexDirection: 'row', gap: 13, marginBottom: 18 },
  medal: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '800', marginBottom: 4 },
  rowText: { fontWeight: '500' },
  cta: {
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaText: { fontWeight: '900' },
});
